import { createGitHubClient } from "./client";
import { Commit } from "./commits";

export async function fetchPullRequestCommits(
  repoOwner: string,
  repoName: string,
  prNumber: number,
  accessToken?: string
): Promise<Commit[]> {
  const octokit = createGitHubClient(accessToken);

  try {
    // Get commits from the PR
    const response = await octokit.pulls.listCommits({
      owner: repoOwner,
      repo: repoName,
      pull_number: prNumber,
    });

    return response.data.map(commit => ({
      hash: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || "Unknown",
      date: commit.commit.author?.date || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching pull request commits:", error);
    throw new Error(`Failed to fetch commits for PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`);
  }
} 
