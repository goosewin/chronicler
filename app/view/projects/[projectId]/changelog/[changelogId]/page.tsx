import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { ChangelogsInteractor } from "@/lib/interactors/changelogs";
import { ProjectsInteractor } from "@/lib/interactors/projects";
import {
  Calendar,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Settings,
  Tag,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

// Simple badge component for this page
function Badge({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline";
}) {
  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    outline: "bg-transparent text-foreground",
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

export const dynamic = "force-dynamic";

// Define the metadata types
interface GenerationMetadata {
  source: string;
  startRef?: string;
  endRef?: string;
  prNumber?: string;
  releaseTag?: string;
  generatedAt?: string;
  commitHash?: string;
  startPRNumber?: string;
  endPRNumber?: string;
  startReleaseTag?: string;
  endReleaseTag?: string;
}

interface ChangelogMetadata {
  generation?: GenerationMetadata;
}

// Extend the changelog type to include metadata
interface Changelog {
  id: string;
  version: string;
  releaseDate: Date;
  content: string;
  isPublished: boolean;
  projectId: string;
  project?: {
    id: string;
    name: string;
    repositoryUrl: string | null;
    isPublic: boolean;
  } | null;
  metadata?: ChangelogMetadata;
}

// Helper function to construct GitHub URLs
function buildGitHubUrl(
  repoUrl: string | null,
  type:
    | "commit_range"
    | "single_commit"
    | "pull_request"
    | "pr_range"
    | "release"
    | "release_range",
  params: {
    startRef?: string;
    endRef?: string;
    commitHash?: string;
    prNumber?: string;
    startPRNumber?: string;
    endPRNumber?: string;
    releaseTag?: string;
    startReleaseTag?: string;
    endReleaseTag?: string;
  },
): string | null {
  if (!repoUrl) return null;

  // Normalize GitHub URL to ensure it doesn't end with .git and doesn't have trailing slash
  const baseUrl = repoUrl.replace(/\.git$/, "").replace(/\/$/, "");

  switch (type) {
    case "commit_range":
      if (!params.startRef || !params.endRef) return null;
      return `${baseUrl}/compare/${params.startRef}...${params.endRef}`;

    case "single_commit":
      if (!params.commitHash) return null;
      return `${baseUrl}/commit/${params.commitHash}`;

    case "pull_request":
      if (!params.prNumber) return null;
      return `${baseUrl}/pull/${params.prNumber}`;

    case "pr_range":
      if (!params.startPRNumber || !params.endPRNumber) return null;
      // For PR ranges, we'll just link to the first PR in the range since there's no built-in way to view a range
      return `${baseUrl}/pulls?q=is%3Apr+sort%3Acreated-asc+%23${params.startPRNumber}...%23${params.endPRNumber}`;

    case "release":
      if (!params.releaseTag) return null;
      return `${baseUrl}/releases/tag/${params.releaseTag}`;

    case "release_range":
      if (!params.startReleaseTag || !params.endReleaseTag) return null;
      // For release ranges, we'll just link to the releases page
      return `${baseUrl}/releases`;

    default:
      return null;
  }
}

async function getChangelogData(
  changelogId: string,
): Promise<Changelog | null> {
  const changelog = await ChangelogsInteractor.getWithProject(changelogId);

  if (!changelog || !changelog.project?.isPublic) {
    return null;
  }

  return changelog as Changelog;
}

function formatDate(dateString: string | Date) {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Helper function to check if a user has admin access to this changelog
async function getUserAccess(projectId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { hasAccess: false };
    }

    // Check if the user is the owner or a collaborator of this project
    const project = await ProjectsInteractor.getById(projectId);

    if (!project) {
      return { hasAccess: false };
    }

    const hasAccess =
      project.userId === session.user.id ||
      (await ProjectsInteractor.getCollaborations(session.user.id)).some(
        (p) => p.id === projectId,
      );

    return {
      hasAccess,
      userId: session.user.id,
    };
  } catch (error) {
    console.error("Error checking user access:", error);
    return { hasAccess: false };
  }
}

export default async function PublicChangelogPage({
  params,
}: {
  params: Promise<{ projectId: string; changelogId: string }>;
}) {
  const { projectId, changelogId } = await params;
  const changelog = await getChangelogData(changelogId);
  const { hasAccess } = await getUserAccess(projectId);

  if (!changelog) {
    notFound();
  }

  if (changelog.projectId !== projectId) {
    notFound();
  }

  // Extract generation metadata if it exists
  const generationMeta = changelog.metadata?.generation;

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Link
                href={`/view/projects/${projectId}`}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {changelog.project?.name}
              </Link>
              <span className="text-sm text-muted-foreground">/</span>
              <h1 className="text-2xl font-bold">{changelog.version}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(changelog.releaseDate)}</span>
            </div>
          </div>

          {hasAccess && (
            <Link href={`/projects/${projectId}/changelog/${changelogId}`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-4 w-4" />
                View as Admin
              </Button>
            </Link>
          )}
        </div>

        <Card>
          <CardContent>
            {generationMeta && (
              <div className="mb-6 flex flex-wrap gap-2">
                {generationMeta.source === "commit_range" &&
                  generationMeta.startRef &&
                  generationMeta.endRef && (
                    <Link
                      href={
                        buildGitHubUrl(
                          changelog.project?.repositoryUrl || null,
                          "commit_range",
                          {
                            startRef: generationMeta.startRef,
                            endRef: generationMeta.endRef,
                          },
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        !changelog.project?.repositoryUrl
                          ? "pointer-events-none"
                          : ""
                      }
                    >
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 hover:bg-muted cursor-pointer"
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>
                          Commits: {generationMeta.startRef.substring(0, 7)} →{" "}
                          {generationMeta.endRef.substring(0, 7)}
                        </span>
                      </Badge>
                    </Link>
                  )}

                {generationMeta.source === "single_commit" &&
                  generationMeta.commitHash && (
                    <Link
                      href={
                        buildGitHubUrl(
                          changelog.project?.repositoryUrl || null,
                          "single_commit",
                          { commitHash: generationMeta.commitHash },
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        !changelog.project?.repositoryUrl
                          ? "pointer-events-none"
                          : ""
                      }
                    >
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 hover:bg-muted cursor-pointer"
                      >
                        <GitCommit className="h-3 w-3" />
                        <span>
                          Commit: {generationMeta.commitHash.substring(0, 7)}
                        </span>
                      </Badge>
                    </Link>
                  )}

                {generationMeta.source === "pull_request" &&
                  generationMeta.prNumber && (
                    <Link
                      href={
                        buildGitHubUrl(
                          changelog.project?.repositoryUrl || null,
                          "pull_request",
                          { prNumber: generationMeta.prNumber },
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        !changelog.project?.repositoryUrl
                          ? "pointer-events-none"
                          : ""
                      }
                    >
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 hover:bg-muted cursor-pointer"
                      >
                        <GitPullRequest className="h-3 w-3" />
                        <span>PR #{generationMeta.prNumber}</span>
                      </Badge>
                    </Link>
                  )}

                {generationMeta.source === "pr_range" &&
                  generationMeta.startPRNumber &&
                  generationMeta.endPRNumber && (
                    <Link
                      href={
                        buildGitHubUrl(
                          changelog.project?.repositoryUrl || null,
                          "pr_range",
                          {
                            startPRNumber: generationMeta.startPRNumber,
                            endPRNumber: generationMeta.endPRNumber,
                          },
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        !changelog.project?.repositoryUrl
                          ? "pointer-events-none"
                          : ""
                      }
                    >
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 hover:bg-muted cursor-pointer"
                      >
                        <GitPullRequest className="h-3 w-3" />
                        <span>
                          PRs #{generationMeta.startPRNumber} → #
                          {generationMeta.endPRNumber}
                        </span>
                      </Badge>
                    </Link>
                  )}

                {generationMeta.source === "release" &&
                  generationMeta.releaseTag && (
                    <Link
                      href={
                        buildGitHubUrl(
                          changelog.project?.repositoryUrl || null,
                          "release",
                          { releaseTag: generationMeta.releaseTag },
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        !changelog.project?.repositoryUrl
                          ? "pointer-events-none"
                          : ""
                      }
                    >
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 hover:bg-muted cursor-pointer"
                      >
                        <Tag className="h-3 w-3" />
                        <span>Release {generationMeta.releaseTag}</span>
                      </Badge>
                    </Link>
                  )}

                {generationMeta.source === "release_range" &&
                  generationMeta.startReleaseTag &&
                  generationMeta.endReleaseTag && (
                    <Link
                      href={
                        buildGitHubUrl(
                          changelog.project?.repositoryUrl || null,
                          "release_range",
                          {
                            startReleaseTag: generationMeta.startReleaseTag,
                            endReleaseTag: generationMeta.endReleaseTag,
                          },
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={
                        !changelog.project?.repositoryUrl
                          ? "pointer-events-none"
                          : ""
                      }
                    >
                      <Badge
                        variant="outline"
                        className="gap-1 text-xs py-0 hover:bg-muted cursor-pointer"
                      >
                        <Tag className="h-3 w-3" />
                        <span>
                          Releases {generationMeta.startReleaseTag} →{" "}
                          {generationMeta.endReleaseTag}
                        </span>
                      </Badge>
                    </Link>
                  )}
              </div>
            )}

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownContent content={changelog.content} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Link
            href={`/view/projects/${projectId}`}
            className="hover:underline text-sm text-muted-foreground"
          >
            View all changelogs for {changelog.project?.name}
          </Link>
          {changelog.project?.repositoryUrl && (
            <Link
              href={changelog.project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:text-primary"
            >
              <GitBranch className="h-4 w-4" />
              <span>View Repository</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
