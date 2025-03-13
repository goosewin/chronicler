import { RestEndpointMethodTypes } from "@octokit/rest";
import { createGitHubClient } from "./client";
import { Commit, fetchCommitsBetweenRefs } from "./commits";

type Release =
  RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][0];
type RepoCommit =
  RestEndpointMethodTypes["repos"]["listCommits"]["response"]["data"][0];

export async function fetchReleaseCommits(
  repoOwner: string,
  repoName: string,
  tagName: string,
  accessToken?: string,
): Promise<Commit[]> {
  const octokit = createGitHubClient(accessToken);

  try {
    // Find the release by tag - we don't use this variable, so removing it
    await octokit.repos.getReleaseByTag({
      owner: repoOwner,
      repo: repoName,
      tag: tagName,
    });

    // Get the previous release tag
    const releases = await octokit.repos.listReleases({
      owner: repoOwner,
      repo: repoName,
      per_page: 100,
    });

    const currentReleaseIndex = releases.data.findIndex(
      (r: Release) => r.tag_name === tagName,
    );

    // If this release was found and there's a previous release, compare them
    if (
      currentReleaseIndex !== -1 &&
      currentReleaseIndex < releases.data.length - 1
    ) {
      const previousReleaseTag =
        releases.data[currentReleaseIndex + 1].tag_name;

      // Get commits between the previous release and this one
      return fetchCommitsBetweenRefs(
        repoOwner,
        repoName,
        previousReleaseTag,
        tagName,
        accessToken,
      );
    }

    // If there's no previous release, get commits for this release
    // First, get the commit that the tag points to
    const tagRef = await octokit.git.getRef({
      owner: repoOwner,
      repo: repoName,
      ref: `tags/${tagName}`,
    });

    // Get the last 100 commits before this tag
    const commits = await octokit.repos.listCommits({
      owner: repoOwner,
      repo: repoName,
      sha: tagRef.data.object.sha,
      per_page: 100,
    });

    return commits.data.map((commit: RepoCommit) => ({
      hash: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || "Unknown",
      date: commit.commit.author?.date || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching release commits:", error);
    throw new Error(
      `Failed to fetch commits for release tag ${tagName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
