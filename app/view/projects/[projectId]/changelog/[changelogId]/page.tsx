import { MarkdownContent } from "@/components/markdown-content";
import { Card, CardContent } from "@/components/ui/card";
import { ChangelogsInteractor } from "@/lib/interactors/changelogs";
import { Calendar, GitBranch } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getChangelogData(changelogId: string) {
  const changelog = await ChangelogsInteractor.getWithProject(changelogId);

  if (!changelog || !changelog.isPublished || !changelog.project?.isPublic) {
    return null;
  }

  return changelog;
}

export default async function PublicChangelogPage({
  params,
}: {
  params: { projectId: string; changelogId: string };
}) {
  const { projectId, changelogId } = params;
  const changelog = await getChangelogData(changelogId);

  if (!changelog) {
    notFound();
  }

  if (changelog.projectId !== projectId) {
    notFound();
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="space-y-8">
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
            <span>
              {new Date(changelog.releaseDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <MarkdownContent content={changelog.content} />
            </div>
            {changelog.commitHash && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-2">Commit</h3>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {changelog.commitHash}
                </code>
              </div>
            )}
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
