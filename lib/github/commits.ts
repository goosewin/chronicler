import { createGitHubClient } from "./client";

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export async function fetchCommitsBetweenRefs(
  repoOwner: string,
  repoName: string,
  startRef: string,
  endRef: string,
  accessToken?: string
): Promise<Commit[]> {
  const octokit = createGitHubClient(accessToken);

  try {
    // First get the commit SHAs for the refs
    const startCommit = await octokit.repos.getCommit({
      owner: repoOwner,
      repo: repoName,
      ref: startRef,
    });

    const endCommit = await octokit.repos.getCommit({
      owner: repoOwner,
      repo: repoName,
      ref: endRef,
    });

    // Then get the commits between them
    const commits = await octokit.repos.compareCommits({
      owner: repoOwner,
      repo: repoName,
      base: startCommit.data.sha,
      head: endCommit.data.sha,
    });

    return commits.data.commits.map(commit => ({
      hash: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || "Unknown",
      date: commit.commit.author?.date || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching commits between refs:", error);
    throw new Error(`Failed to fetch commits between ${startRef} and ${endRef}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function parseRepoDetails(repositoryUrl: string, owner?: string, name?: string): Promise<{ owner: string, name: string }> {
  // If owner and name are provided directly, use them
  if (owner && name) {
    return { owner, name };
  }

  // Otherwise try to parse from URL
  try {
    let urlObj: URL;
    try {
      urlObj = new URL(repositoryUrl);
    } catch {
      // Handle non-URL formats like "owner/repo"
      const parts = repositoryUrl.split('/');
      if (parts.length >= 2) {
        return {
          owner: parts[parts.length - 2],
          name: parts[parts.length - 1].replace('.git', '')
        };
      }
      throw new Error("Invalid repository URL format");
    }

    // Handle GitHub URLs
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      return {
        owner: pathParts[0],
        name: pathParts[1].replace('.git', '')
      };
    }

    throw new Error("Could not parse repository owner and name from URL");
  } catch (error) {
    console.error("Error parsing repository details:", error);
    throw new Error(`Failed to parse repository details: ${error instanceof Error ? error.message : String(error)}`);
  }
} 
