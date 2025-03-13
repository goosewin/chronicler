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

    // Generate the changelog (using simplified approach for now)
    const changelog = generateSimpleChangelog(commitData);

    return apiSuccess({
      changelog,
      metadata: {
        commitCount: commitData.commits.length,
        startDate: commitData.startDate,
        endDate: commitData.endDate,
        authors: commitData.authors,
      },
    });
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
    // The commitMessages variable is not used, so we can remove it
    // or comment it out if it might be needed in the future
    /* 
    const commitMessages = commits
      .map((commit) => {
        if (typeof commit === "string") return commit;
        if (commit && typeof commit === "object") {
    */

    // For now, return a Twilio-styled changelog using the available commit data
    // This is a temporary solution until the LLM integration is fully implemented
    return createTwilioStyleChangelog(commits, title);
  } catch (error) {
    console.error("Error generating changelog with LLM:", error);
    return `# ${title}\n\nWe've made various improvements to enhance your experience.\n\nThank you for using our product.`;
  }
}

// Temporary function to create a more user-focused changelog until LLM integration is complete
function createTwilioStyleChangelog(commits: Commit[], title: string): string {
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

  // Start with a simple title that includes commit references if available
  let changelog = `# ${title}\n\n`;

  // Group commits by category (crude implementation without LLM)
  const featureCommits = meaningfulMessages.filter(
    (msg) =>
      msg.toLowerCase().includes("feat") ||
      msg.toLowerCase().includes("add") ||
      msg.toLowerCase().includes("implement"),
  );

  const fixCommits = meaningfulMessages.filter(
    (msg) =>
      msg.toLowerCase().includes("fix") ||
      msg.toLowerCase().includes("bug") ||
      msg.toLowerCase().includes("resolve"),
  );

  const enhancementCommits = meaningfulMessages.filter(
    (msg) =>
      msg.toLowerCase().includes("improve") ||
      msg.toLowerCase().includes("update") ||
      msg.toLowerCase().includes("enhance") ||
      msg.toLowerCase().includes("optimiz"),
  );

  const otherCommits = meaningfulMessages.filter(
    (msg) =>
      !featureCommits.includes(msg) &&
      !fixCommits.includes(msg) &&
      !enhancementCommits.includes(msg),
  );

  // Add feature section if there are features
  if (featureCommits.length > 0) {
    changelog += `## New Features\n\n`;
    featureCommits.forEach((message) => {
      const formattedMessage = formatCommitMessage(message);
      changelog += `- ${formattedMessage}\n`;
    });
    changelog += `\n`;
  }

  // Add fixes section if there are fixes
  if (fixCommits.length > 0) {
    changelog += `## Bug Fixes\n\n`;
    fixCommits.forEach((message) => {
      const formattedMessage = formatCommitMessage(message);
      changelog += `- ${formattedMessage}\n`;
    });
    changelog += `\n`;
  }

  // Add enhancements section if there are enhancements
  if (enhancementCommits.length > 0) {
    changelog += `## Improvements\n\n`;
    enhancementCommits.forEach((message) => {
      const formattedMessage = formatCommitMessage(message);
      changelog += `- ${formattedMessage}\n`;
    });
    changelog += `\n`;
  }

  // Add other changes if there are any
  if (otherCommits.length > 0) {
    changelog += `## Other Changes\n\n`;
    otherCommits.forEach((message) => {
      const formattedMessage = formatCommitMessage(message);
      changelog += `- ${formattedMessage}\n`;
    });
    changelog += `\n`;
  }

  return changelog;
}

// Helper function to format commit messages
function formatCommitMessage(message: string): string {
  let formattedMessage = message.trim();

  // Extract PR number if present
  const prMatch = formattedMessage.match(/#(\d+)/);
  const prNumber = prMatch ? prMatch[1] : null;

  // Clean up common prefixes
  formattedMessage = formattedMessage
    .replace(/^feat(\([^)]+\))?:\s*/i, "")
    .replace(/^fix(\([^)]+\))?:\s*/i, "")
    .replace(/^chore(\([^)]+\))?:\s*/i, "")
    .replace(/^docs(\([^)]+\))?:\s*/i, "")
    .replace(/^style(\([^)]+\))?:\s*/i, "")
    .replace(/^refactor(\([^)]+\))?:\s*/i, "")
    .replace(/^test(\([^)]+\))?:\s*/i, "")
    .replace(/^build(\([^)]+\))?:\s*/i, "");

  // Capitalize first letter
  formattedMessage =
    formattedMessage.charAt(0).toUpperCase() + formattedMessage.slice(1);

  // Add period if needed
  if (!formattedMessage.endsWith(".")) {
    formattedMessage += ".";
  }

  // Add PR reference if available
  if (prNumber) {
    formattedMessage += ` (PR #${prNumber})`;
  }

  return formattedMessage;
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

    // Get all releases to determine their order
    const releases = await octokit.repos.listReleases({
      owner: repoOwner,
      repo: repoName,
      per_page: 100,
    });

    // Find the indices of the start and end release tags
    const releaseList = releases.data;
    const startReleaseIndex = releaseList.findIndex(
      (r: { tag_name: string }) => r.tag_name === startReleaseTag,
    );
    const endReleaseIndex = releaseList.findIndex(
      (r: { tag_name: string }) => r.tag_name === endReleaseTag,
    );

    if (startReleaseIndex === -1) {
      throw new Error(`Start release tag '${startReleaseTag}' not found`);
    }
    if (endReleaseIndex === -1) {
      throw new Error(`End release tag '${endReleaseTag}' not found`);
    }

    // Ensure start is before end (or same) in the releases list (note: GitHub orders releases newest first)
    if (startReleaseIndex < endReleaseIndex) {
      throw new Error(
        "Start release must be older than or equal to end release",
      );
    }

    // Get the release tags in the range (inclusive)
    const releaseTags = releaseList
      .slice(endReleaseIndex, startReleaseIndex + 1)
      .map((r: { tag_name: string }) => r.tag_name);

    // Fetch commits for each release in the range
    const allCommits: Commit[] = [];
    for (const tag of releaseTags) {
      try {
        const releaseCommits = await fetchRelCommits(
          repoOwner,
          repoName,
          tag,
          project.accessToken || undefined,
        );
        allCommits.push(...releaseCommits);
      } catch (error) {
        console.warn(`Failed to fetch commits for release ${tag}:`, error);
        // Continue with other releases even if one fails
      }
    }

    if (allCommits.length === 0) {
      throw new Error(
        `No commits found for release range ${startReleaseTag}-${endReleaseTag}`,
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
    console.error("Error fetching release range commits:", error);
    throw new Error(
      `Failed to fetch commits for release range ${startReleaseTag}-${endReleaseTag}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
