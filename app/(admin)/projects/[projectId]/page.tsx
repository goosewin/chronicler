import { ChangelogCard } from "@/components/changelog-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectsInteractor } from "@/lib/interactors";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getProjectData(projectId: string) {
  const project = await ProjectsInteractor.getWithDetails(projectId);
  if (!project) {
    return null;
  }
  return project;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectData(projectId);

  if (!project) {
    notFound();
  }

  const changelogs = project.changelogs || [];
  const formattedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.description || "No description provided"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.isPublic && (
            <Link href={`/view/projects/${project.id}`}>
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View as Guest
              </Button>
            </Link>
          )}
          <Link href={`/projects/${project.id}/changelog`}>
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              New Changelog
            </Button>
          </Link>
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Edit Project
            </Button>
          </Link>
          <Link href={`/projects/${project.id}/delete`}>
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive border-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Project
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
            <CardDescription>Project details and statistics</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Repository
              </p>
              <p className="font-medium">
                {project.repositoryUrl ? (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {project.repositoryUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "Not specified"
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Provider
              </p>
              <p className="font-medium capitalize">{project.provider}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p className="font-medium">{formattedDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Changelogs
              </p>
              <p className="font-medium">{changelogs.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Visibility
              </p>
              <p className="font-medium">
                {project.isPublic ? "Public" : "Private"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Last Synced
              </p>
              <p className="font-medium">
                {project.lastSynced
                  ? new Date(project.lastSynced).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Never"}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Changelogs</h2>
          {changelogs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No changelogs have been created yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {changelogs.map((changelog) => (
                <ChangelogCard key={changelog.id} changelog={changelog} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
