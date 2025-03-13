import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { LIMITS } from "@/lib/db/constants";
import { ChangelogsInteractor } from "@/lib/interactors/changelogs";
import { ProjectsInteractor } from "@/lib/interactors/projects";
import { Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      redirect("/login");
    }

    const userProjects = await ProjectsInteractor.getByUserId(session.user.id);
    const collaboratedProjects = await ProjectsInteractor.getCollaborations(
      session.user.id,
    );

    const allProjects = [...userProjects, ...collaboratedProjects];

    const recentProjects = allProjects
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5);

    const formattedProjects = recentProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description || "No description provided",
      updatedAt: project.updatedAt,
    }));

    const recentChangelogs = await ChangelogsInteractor.getRecent(
      LIMITS.HOMEPAGE_CHANGELOGS,
    );

    return (
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex flex-row gap-4">
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
            <Link href="/changelogs/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                New Changelog
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your recently updated projects</CardDescription>
            </CardHeader>
            <CardContent>
              {formattedProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects yet. Create your first project to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {formattedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link
                      href="/projects"
                      className="text-sm text-primary hover:underline"
                    >
                      View all projects
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Changelogs</CardTitle>
              <CardDescription>
                Latest updates across all projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentChangelogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No recent changelogs to display.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentChangelogs.map((changelog) => (
                    <div
                      key={changelog.id}
                      className="flex justify-between items-start"
                    >
                      <div>
                        <Link
                          href={`/projects/${changelog.projectId}/changelog/${changelog.id}`}
                          className="font-medium hover:underline"
                        >
                          {changelog.version}
                        </Link>
                        <p className="text-sm">
                          <Link
                            href={`/projects/${changelog.projectId}`}
                            className="text-muted-foreground hover:underline"
                          >
                            {changelog.project?.name}
                          </Link>
                        </p>
                        <div className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                          {changelog.content
                            .replace(/[#*`]/g, "")
                            .substring(0, 100)}
                          ...
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(changelog.releaseDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Link
                      href="/changelogs"
                      className="text-sm text-primary hover:underline"
                    >
                      View all changelogs
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in DashboardPage:", error);
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Error Loading Dashboard</h1>
        <p>
          There was an error loading your dashboard. Please try again later.
        </p>
      </div>
    );
  }
}
