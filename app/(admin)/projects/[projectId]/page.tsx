import { ChangelogCard } from "@/components/changelog-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectsInteractor } from "@/lib/interactors";
import { ArrowLeft, FileText } from "lucide-react";
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
          <Link href={`/projects/${project.id}/changelog`}>
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              New Changelog
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

        <Tabs defaultValue="changelogs">
          <TabsList>
            <TabsTrigger value="changelogs">Changelogs</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="changelogs" className="space-y-4 mt-6">
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
          </TabsContent>
          <TabsContent value="activity" className="space-y-4 mt-6">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No recent activity to display.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings" className="space-y-4 mt-6">
            <h2 className="text-xl font-semibold">Project Settings</h2>
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Project settings will be implemented in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
