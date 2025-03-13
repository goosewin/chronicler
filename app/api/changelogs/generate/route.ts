import { checkProjectAccess, requireAuth } from "@/lib/auth/utils";
import { Project } from "@/lib/db/types";
import { createGitHubClient } from "@/lib/github/client";
import {
  Commit,
  fetchCommitsBetweenRefs,
  parseRepoDetails,
} from "@/lib/github/commits";
import { fetchPullRequestCommits as fetchPRCommits } from "@/lib/github/pull-requests";
import { fetchReleaseCommits as fetchRelCommits } from "@/lib/github/releases";
import { mastra } from "@/lib/mastra";
import { apiError, apiSuccess } from "@/lib/utils";
import { NextRequest } from "next/server";

interface CommitData {
  commits: Commit[];
  startDate: string;
  endDate: string;
  authors: string[];
}

const workflow = mastra.getWorkflow("changelogWorkflow");

export async function POST(request: NextRequest) {
  try {
    // Validate workflow is available
    if (!workflow) {
      return apiError(
        "Changelog generation service is unavailable. Please try again later.",
        503,
      );
    }

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
      startPRNumber,
      endPRNumber,
      releaseTag,
      startReleaseTag,
      endReleaseTag,
      commitHash,
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

      case "single_commit":
        if (!commitHash) {
          return apiError("Commit hash is required for single commit", 400);
        }
        commitData = await fetchSingleCommit(project, commitHash);
        break;

      case "pull_request":
        if (!prNumber) {
          return apiError("PR number is required for pull request", 400);
        }
        commitData = await fetchPRForChangelog(project, prNumber);
        break;

      case "pr_range":
        if (!startPRNumber || !endPRNumber) {
          return apiError(
            "Start and end PR numbers are required for PR range",
            400,
          );
        }
        commitData = await fetchPRRangeForChangelog(
          project,
          startPRNumber,
          endPRNumber,
        );
        break;

      case "release":
        if (!releaseTag) {
          return apiError("Release tag is required for release", 400);
        }
        commitData = await fetchReleaseForChangelog(project, releaseTag);
        break;

      case "release_range":
        if (!startReleaseTag || !endReleaseTag) {
          return apiError(
            "Start and end release tags are required for release range",
            400,
          );
        }
        commitData = await fetchReleaseRangeForChangelog(
          project,
          startReleaseTag,
          endReleaseTag,
        );
        break;

      default:
        return apiError(`Unknown generation type: ${type}`, 400);
    }

    if (!commitData || !commitData.commits || commitData.commits.length === 0) {
      return apiError("No commits found for the specified criteria", 404);
    }

    try {
      // Generate the changelog using the LLM-powered workflow
      const { start } = workflow.createRun();

      const workflowOutput = await start({
        triggerData: {
          commitData,
          title: "What's New",
          includeStats: true,
          generateSummary: true,
        },
      });

      // Define interfaces for typing
      interface WorkflowStep {
        id: string;
        output: string | null;
      }

      interface WorkflowOutput {
        steps?: WorkflowStep[];
        results?: Record<string, unknown>;
      }

      // Type assertion for better TypeScript support
      const typedOutput = workflowOutput as WorkflowOutput;

      console.log(
        "workflow output structure:",
        JSON.stringify(
          {
            hasSteps: !!typedOutput.steps,
            stepIds: typedOutput.steps?.map((s: WorkflowStep) => s.id),
            stepOutputs: typedOutput.steps?.map((s: WorkflowStep) => ({
              id: s.id,
              hasOutput: !!s.output,
            })),
            hasResults: !!typedOutput.results,
            resultKeys: typedOutput.results
              ? Object.keys(typedOutput.results)
              : [],
          },
          null,
          2,
        ),
      );

      // Extract the user-friendly changelog and summary from workflow output
      let userFriendlyChangelog = "";
      let summary = "";

      // Try to extract from results first since that's what we're getting
      if (typedOutput.results) {
        const rawChangelog = typedOutput.results[
          "generate-user-friendly-changelog"
        ] as { status: string; output: string };
        const rawSummary = typedOutput.results["generate-summary"] as {
          status: string;
          output: string;
        };

        userFriendlyChangelog =
          rawChangelog?.status === "success" ? rawChangelog.output : "";
        summary = rawSummary?.status === "success" ? rawSummary.output : "";
      }

      // Fallback to steps if needed (keeping as backup)
      if (!userFriendlyChangelog && typedOutput.steps?.length) {
        const stepChangelog = typedOutput.steps.find(
          (step: WorkflowStep) =>
            step.id === "generate-user-friendly-changelog",
        )?.output;

        const stepSummary = typedOutput.steps.find(
          (step: WorkflowStep) => step.id === "generate-summary",
        )?.output;

        userFriendlyChangelog =
          typeof stepChangelog === "string" ? stepChangelog : "";
        summary = typeof stepSummary === "string" ? stepSummary : "";
      }

      console.log("Raw workflow results:", {
        changelog: typedOutput.results?.["generate-user-friendly-changelog"],
        summary: typedOutput.results?.["generate-summary"],
      });

      console.log("Extracted values:", {
        userFriendlyChangelogLength: userFriendlyChangelog.length,
        summaryLength: summary.length,
        firstCharsOfChangelog: userFriendlyChangelog.substring(0, 100),
      });

      if (!userFriendlyChangelog) {
        return apiError("Failed to generate changelog content", 500);
      }

      return apiSuccess({
        changelog: userFriendlyChangelog,
        summary: summary,
        metadata: {
          commitCount: commitData.commits.length,
          startDate: commitData.startDate,
          endDate: commitData.endDate,
          authors: commitData.authors,
        },
      });
    } catch (workflowError) {
      console.error("Workflow execution error:", workflowError);
      return apiError(
        `Error executing changelog workflow: ${workflowError instanceof Error ? workflowError.message : String(workflowError)}`,
        500,
      );
    }
  } catch (error) {
    console.error("Error generating changelog:", error);
    return apiError(
      `Failed to generate changelog: ${error instanceof Error ? error.message : String(error)}`,
    );
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

async function fetchSingleCommit(
  project: Project,
  commitHash: string,
): Promise<CommitData> {
  try {
    // Parse the repository URL to get owner and repo name
    const { owner: repoOwner, name: repoName } = await parseRepoDetails(
      project.repositoryUrl,
      project.repositoryOwner || "",
      project.repositoryName || "",
    );

    const octokit = createGitHubClient(project.accessToken || undefined);

    // Get the single commit
    const response = await octokit.repos.getCommit({
      owner: repoOwner,
      repo: repoName,
      ref: commitHash,
    });

    const commit = {
      hash: response.data.sha,
      message: response.data.commit.message,
      author: response.data.commit.author?.name || "Unknown",
      date: response.data.commit.author?.date || new Date().toISOString(),
    };

    return {
      commits: [commit],
      startDate: commit.date,
      endDate: commit.date,
      authors: [commit.author],
    };
  } catch (error) {
    console.error("Error fetching single commit:", error);
    throw new Error(
      `Failed to fetch commit ${commitHash}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function fetchPRRangeForChangelog(
  project: Project,
  startPRNumber: string | number,
  endPRNumber: string | number,
): Promise<CommitData> {
  try {
    // Parse the repository URL to get owner and repo name
    const { owner: repoOwner, name: repoName } = await parseRepoDetails(
      project.repositoryUrl,
      project.repositoryOwner || "",
      project.repositoryName || "",
    );

    // Convert PR numbers to integers
    const startPRInt =
      typeof startPRNumber === "string"
        ? parseInt(startPRNumber, 10)
        : startPRNumber;
    const endPRInt =
      typeof endPRNumber === "string" ? parseInt(endPRNumber, 10) : endPRNumber;

    if (isNaN(startPRInt) || isNaN(endPRInt)) {
      throw new Error("Invalid PR numbers");
    }

    if (startPRInt > endPRInt) {
      throw new Error(
        "Start PR number must be less than or equal to end PR number",
      );
    }

    // Create an array of PR numbers in the range
    const prNumbers = Array.from(
      { length: endPRInt - startPRInt + 1 },
      (_, i) => startPRInt + i,
    );

    // Fetch commits for each PR in the range
    const allCommits: Commit[] = [];
    for (const prNum of prNumbers) {
      try {
        const prCommits = await fetchPRCommits(
          repoOwner,
          repoName,
          prNum,
          project.accessToken || undefined,
        );
        allCommits.push(...prCommits);
      } catch (error) {
        console.warn(`Failed to fetch commits for PR #${prNum}:`, error);
        // Continue with other PRs even if one fails
      }
    }

    if (allCommits.length === 0) {
      throw new Error(
        `No commits found for PR range ${startPRInt}-${endPRInt}`,
      );
    }

    // Find earliest and latest dates
    const dates = allCommits.map((c) => new Date(c.date).getTime());
    const startDate = new Date(Math.min(...dates)).toISOString();
    const endDate = new Date(Math.max(...dates)).toISOString();

    // Get unique authors
    const authors = [...new Set(allCommits.map((c) => c.author))];

    return { commits: allCommits, startDate, endDate, authors };
  } catch (error) {
    console.error("Error fetching PR range commits:", error);
    throw new Error(
      `Failed to fetch commits for PR range ${startPRNumber}-${endPRNumber}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function fetchReleaseRangeForChangelog(
  project: Project,
  startReleaseTag: string,
  endReleaseTag: string,
): Promise<CommitData> {
  try {
    // Parse the repository URL to get owner and repo name
    const { owner: repoOwner, name: repoName } = await parseRepoDetails(
      project.repositoryUrl,
      project.repositoryOwner || "",
      project.repositoryName || "",
    );

    const octokit = createGitHubClient(project.accessToken || undefined);

    // Instead of using releases, we'll work directly with Git tags
    // First, let's check if both tags exist
    try {
      // Check if start tag exists
      await octokit.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `tags/${startReleaseTag}`,
      });

      // Check if end tag exists
      await octokit.git.getRef({
        owner: repoOwner,
        repo: repoName,
        ref: `tags/${endReleaseTag}`,
      });
    } catch (error) {
      // Handle tag not found
      console.error("Error verifying tags:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Not Found")) {
        if (errorMessage.includes(startReleaseTag)) {
          throw new Error(
            `Start release tag '${startReleaseTag}' not found in repository`,
          );
        } else if (errorMessage.includes(endReleaseTag)) {
          throw new Error(
            `End release tag '${endReleaseTag}' not found in repository`,
          );
        } else {
          throw new Error(
            `One or both release tags not found: ${startReleaseTag}, ${endReleaseTag}`,
          );
        }
      }
      throw error;
    }

    // Since both tags exist, just use them with fetchCommitsBetweenRefs
    // This treats the tags just like any other git reference
    const commits = await fetchCommitsBetweenRefs(
      repoOwner,
      repoName,
      startReleaseTag,
      endReleaseTag,
      project.accessToken || undefined,
    );

    if (commits.length === 0) {
      throw new Error(
        `No commits found between tags ${startReleaseTag} and ${endReleaseTag}`,
      );
    }

    // Find earliest and latest dates
    const dates = commits.map((c) => new Date(c.date).getTime());
    const startDate = new Date(Math.min(...dates)).toISOString();
    const endDate = new Date(Math.max(...dates)).toISOString();

    // Get unique authors
    const authors = [...new Set(commits.map((c) => c.author))];

    return { commits, startDate, endDate, authors };
  } catch (error) {
    console.error("Error fetching release range commits:", error);
    throw new Error(
      `Failed to fetch commits for release range ${startReleaseTag}-${endReleaseTag}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
