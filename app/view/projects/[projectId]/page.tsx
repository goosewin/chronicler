import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { ProjectsInteractor } from "@/lib/interactors/projects";
import { Calendar, GitBranch, Settings } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getProjectData(projectId: string) {
  const project = await ProjectsInteractor.getWithDetails(projectId);

  if (!project || !project.isPublic) {
    return null;
  }

  return project;
}

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

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectData(projectId);
  const { hasAccess } = await getUserAccess(projectId);

  if (!project) {
    notFound();
  }

  const changelogs = project.changelogs || [];

  // Format the date
  const formattedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-2">
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Last updated: {formattedDate}</span>
              </div>
              {project.repositoryUrl && (
                <Link
                  href={project.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <GitBranch className="h-4 w-4" />
                  <span>View Repository</span>
                </Link>
              )}
            </div>
          </div>

          {hasAccess && (
            <Link href={`/projects/${projectId}`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Settings className="h-4 w-4" />
                View as Admin
              </Button>
            </Link>
          )}
        </div>

        {changelogs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No changelogs</CardTitle>
              <CardDescription>
                This project doesn&apos;t have any changelogs yet.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            {changelogs
              .filter((changelog) => changelog.isPublished)
              .map((changelog) => (
                <Card key={changelog.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">
                          {changelog.version}
                        </CardTitle>
                        <CardDescription>
                          {new Date(changelog.releaseDate).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="markdown-preview">
                        <MarkdownContent
                          content={changelog.content}
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                      {changelog.commitHash && (
                        <div>
                          <h3 className="font-medium">Commit</h3>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {changelog.commitHash}
                          </code>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
