import { checkProjectAccess, requireAuth } from "@/lib/auth/utils";
import { Project } from "@/lib/db/types";
import {
  Commit,
  fetchCommitsBetweenRefs,
  parseRepoDetails,
} from "@/lib/github/commits";
import { fetchPullRequestCommits as fetchPRCommits } from "@/lib/github/pull-requests";
import { fetchReleaseCommits as fetchRelCommits } from "@/lib/github/releases";
import { changelogWorkflow } from "@/lib/mastra/workflows/changelog-workflow";
import { apiError, apiSuccess } from "@/lib/utils";
import { NextRequest } from "next/server";

interface CommitData {
  commits: Commit[];
  startDate: string;
  endDate: string;
  authors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { session } = authResult;
    const body = await request.json();
    const {
      projectId,
      startRef,
      endRef,
      type,
      prNumber,
      releaseTag,
      generateSummary = false,
    } = body;

    if (!projectId) {
      return apiError("Project ID is required", 400);
    }

    const accessResult = await checkProjectAccess(session.user.id, projectId);
    if (accessResult.error) {
      return accessResult.error;
    }

    const { project } = accessResult;

    if (!type) {
      return apiError("Generation type is required", 400);
    }

    let commitData: CommitData | null = null;

    switch (type) {
      case "commit_range":
        if (!startRef || !endRef) {
          return apiError(
            "Start and end references are required for commit range",
            400,
          );
        }
        commitData = await fetchCommitRange(project, startRef, endRef);
        break;

      case "pull_request":
        if (!prNumber) {
          return apiError("PR number is required for pull request", 400);
        }
        commitData = await fetchPRForChangelog(project, prNumber);
        break;

      case "release":
        if (!releaseTag) {
          return apiError("Release tag is required for release", 400);
        }
        commitData = await fetchReleaseForChangelog(project, releaseTag);
        break;

      default:
        return apiError("Invalid generation type", 400);
    }

    if (!commitData) {
      return apiError("Failed to retrieve commit data", 500);
    }

    // Generate a title based on the type of changelog
    const title =
      type === "release"
        ? `Release ${releaseTag}`
        : type === "pull_request"
          ? `Pull Request #${prNumber}`
          : `Changelog ${startRef} to ${endRef}`;

    try {
      // Create a run for the workflow
      const { runId, start } = changelogWorkflow.createRun();

      // Start the workflow execution with type assertion to handle the result
      const result = await start({
        triggerData: {
          commitData,
          title,
          includeStats: true,
          generateSummary,
        },
      });

      console.log(`Workflow run completed with ID: ${runId}`);

      // The workflow result has a different structure than expected
      const workflowResult = result as any;

      // Check if the workflow had a successful result
      let userFriendlyChangelog = "No changelog generated";
      let summary = null;

      // If generate-technical-changelog failed but analyze-commits succeeded,
      // we can generate a basic changelog from the analyze-commits data
      if (
        workflowResult.results &&
        workflowResult.results["analyze-commits"] &&
        workflowResult.results["analyze-commits"].status === "success"
      ) {
        // Get the commit categories from the analyze step
        const analyzeResult = workflowResult.results["analyze-commits"].output;

        if (analyzeResult && analyzeResult.categories) {
          // Generate a simple changelog from the categories
          userFriendlyChangelog = generateChangelogFromCategories(
            analyzeResult.categories,
            title,
          );
        }
      } else if (
        workflowResult.steps &&
        workflowResult.steps["generate-user-friendly-changelog"]
      ) {
        // If we have a user-friendly changelog from the workflow, use that
        userFriendlyChangelog =
          workflowResult.steps["generate-user-friendly-changelog"].result ||
          userFriendlyChangelog;
        summary = workflowResult.steps["generate-summary"]?.result || null;
      }

      // Return the generated changelog
      const responseData = {
        changelog: userFriendlyChangelog,
        summary: summary,
        runId,
        metadata: {
          type,
          commitData: {
            count: commitData.commits.length,
            startDate: commitData.startDate,
            endDate: commitData.endDate,
            authors: commitData.authors,
          },
          // Add workflow metadata if available
          ...(workflowResult.metadata || {}),
        },
      };

      // The apiSuccess function returns the data directly, not wrapped in another object
      return apiSuccess(responseData);
    } catch (workflowError) {
      console.error("Error executing Mastra workflow:", workflowError);

      // Fallback to simple changelog generation if Mastra workflow fails
      const simpleChangelog = generateSimpleChangelog(commitData);

      const fallbackResponse = {
        changelog: simpleChangelog,
        summary: null,
        runId: "fallback",
        metadata: {
          type,
          commitData: {
            count: commitData.commits.length,
            startDate: commitData.startDate,
            endDate: commitData.endDate,
            authors: commitData.authors,
          },
          fallback: true,
        },
      };

      return apiSuccess(fallbackResponse);
    }
  } catch (error) {
    console.error("Error generating changelog:", error);
    return apiError("Failed to generate changelog");
  }
}

// Functions for fetching commit data from different sources
async function fetchCommitRange(
  project: Project,
  startRef: string,
  endRef: string,
): Promise<CommitData> {
  try {
    // Parse the repository URL to get owner and repo name
    const { owner: repoOwner, name: repoName } = await parseRepoDetails(
      project.repositoryUrl,
      project.repositoryOwner || "",
      project.repositoryName || "",
    );

    const commits = await fetchCommitsBetweenRefs(
      repoOwner,
      repoName,
      startRef,
      endRef,
      project.accessToken || undefined,
    );

    // Find earliest and latest dates
    const dates = commits.map((c) => new Date(c.date).getTime());
    const startDate =
      dates.length > 0
        ? new Date(Math.min(...dates)).toISOString()
        : new Date().toISOString();
    const endDate =
      dates.length > 0
        ? new Date(Math.max(...dates)).toISOString()
        : new Date().toISOString();

    // Get unique authors
    const authors = [...new Set(commits.map((c) => c.author))];

    return { commits, startDate, endDate, authors };
  } catch (error) {
    console.error("Error fetching commits between refs:", error);
    throw new Error(
      `Failed to fetch commits between refs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function fetchPRForChangelog(
  project: Project,
  prNumber: string | number,
): Promise<CommitData> {
  try {
    // Parse the repository URL to get owner and repo name
    const { owner: repoOwner, name: repoName } = await parseRepoDetails(
      project.repositoryUrl,
      project.repositoryOwner || "",
      project.repositoryName || "",
    );

    const prNumberInt =
      typeof prNumber === "string" ? parseInt(prNumber, 10) : prNumber;

    if (isNaN(prNumberInt)) {
      throw new Error("Invalid PR number");
    }

    const commits = await fetchPRCommits(
      repoOwner,
      repoName,
      prNumberInt,
      project.accessToken || undefined,
    );

    // Find earliest and latest dates
    const dates = commits.map((c: Commit) => new Date(c.date).getTime());
    const startDate =
      dates.length > 0
        ? new Date(Math.min(...dates)).toISOString()
        : new Date().toISOString();
    const endDate =
      dates.length > 0
        ? new Date(Math.max(...dates)).toISOString()
        : new Date().toISOString();

    // Get unique authors
    const authors = [...new Set(commits.map((c: Commit) => c.author))];

    return { commits, startDate, endDate, authors };
  } catch (error) {
    console.error("Error fetching PR commits:", error);
    throw new Error(
      `Failed to fetch PR commits: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function fetchReleaseForChangelog(
  project: Project,
  releaseTag: string,
): Promise<CommitData> {
  try {
    // Parse the repository URL to get owner and repo name
    const { owner: repoOwner, name: repoName } = await parseRepoDetails(
      project.repositoryUrl,
      project.repositoryOwner || "",
      project.repositoryName || "",
    );

    const commits = await fetchRelCommits(
      repoOwner,
      repoName,
      releaseTag,
      project.accessToken || undefined,
    );

    // Find earliest and latest dates
    const dates = commits.map((c: Commit) => new Date(c.date).getTime());
    const startDate =
      dates.length > 0
        ? new Date(Math.min(...dates)).toISOString()
        : new Date().toISOString();
    const endDate =
      dates.length > 0
        ? new Date(Math.max(...dates)).toISOString()
        : new Date().toISOString();

    // Get unique authors
    const authors = [...new Set(commits.map((c: Commit) => c.author))];

    return { commits, startDate, endDate, authors };
  } catch (error) {
    console.error("Error fetching release commits:", error);
    throw new Error(
      `Failed to fetch release commits: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Helper function to generate a changelog from categorized commits
function generateChangelogFromCategories(
  categories: Record<string, Commit[]>,
  title: string,
): string {
  // Get all commits from all categories
  const allCommits: Commit[] = [];

  // Collect commits from each category
  for (const [category, commits] of Object.entries(categories)) {
    if (Array.isArray(commits) && commits.length > 0) {
      // Add category context to each commit
      const categorizedCommits = commits.map((commit) => {
        if (typeof commit === "object" && commit.message) {
          // Create a new object with the correct Commit properties
          // plus an additional category property
          return {
            hash: commit.hash || "",
            message: commit.message,
            author: commit.author || "",
            date: commit.date || "",
            category,
          } as Commit & { category: string };
        }
        return commit;
      });

      allCommits.push(...categorizedCommits);
    }
  }

  // Use the LLM to generate the changelog
  return generateChangelogWithLLM(allCommits, title);
}

// Generate a changelog for the fallback case
function generateSimpleChangelog(commitData: CommitData): string {
  return generateChangelogWithLLM(commitData.commits, "What's New");
}

// Unified function to generate changelog with LLM
function generateChangelogWithLLM(commits: Commit[], title: string): string {
  // If we have no commits, return a simple message
  if (!commits || commits.length === 0) {
    return `# ${title}\n\nNo changes to report in this update.`;
  }

  try {
    // Extract commit messages for the prompt
    const commitMessages = commits
      .map((commit) => {
        if (typeof commit === "string") return commit;
        if (commit && typeof commit === "object") {
          // Include category if available for better context
          const category = (commit as { category?: string }).category ? `[${(commit as { category?: string }).category}] ` : "";
          return `${category}${commit.message || ""}`;
        }
        return "";
      })
      .filter(Boolean);

    // Here's what we would send to the LLM
    /* const prompt = `
    Generate a professional, user-friendly changelog...
    `; */

    // For now, return a Twilio-styled changelog using the available commit data
    // This is a temporary solution until the LLM integration is fully implemented
    return createTwilioStyleChangelog(commits, title);
  } catch (error) {
    console.error("Error generating changelog with LLM:", error);
    return `# ${title}\n\nWe've made various improvements to enhance your experience.\n\nThank you for using our product.`;
  }
}

// Temporary function to create a Twilio-style changelog until LLM integration is complete
// This should be replaced with actual LLM calls in production
function createTwilioStyleChangelog(commits: Commit[], title: string): string {
  const isRelease = title.toLowerCase().includes("release");

  // Extract meaningful messages
  const meaningfulMessages = commits
    .map((commit) => {
      if (typeof commit === "string") return commit;
      return commit?.message || "";
    })
    .filter(
      (message) =>
        message &&
        !message.toLowerCase().includes("merge ") &&
        !message.toLowerCase().match(/^wip\b/i),
    );

  // Start with title and intro
  let changelog = `# ${title}\n\n`;

  if (isRelease) {
    changelog += `We're excited to announce that ${title} is now available. This release includes:\n\n`;
  } else {
    changelog += `We're pleased to announce the following updates and improvements:\n\n`;
  }

  // Add a few key highlights in paragraph form if available
  // This simulates what a good LLM would do - extract the most important changes
  const highlightCount = Math.min(3, meaningfulMessages.length);
  for (let i = 0; i < highlightCount; i++) {
    const message = meaningfulMessages[i];
    // Format as a full sentence
    let formattedMessage = message.trim();
    if (!formattedMessage.endsWith(".")) {
      formattedMessage += ".";
    }

    // Capitalize first letter
    formattedMessage =
      formattedMessage.charAt(0).toUpperCase() + formattedMessage.slice(1);

    // Add to changelog
    changelog += `${formattedMessage}\n\n`;
  }

  // Add a closing note
  changelog += `Throughout the system, you'll find feature and UI enhancements, bug fixes, and more.\n\n`;
  changelog += `Thank you for using our product.`;

  return changelog;
}
