import ProjectCard from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { ProjectsInteractor } from "@/lib/interactors/projects";
import { Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
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

    const formattedUserProjects = userProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description || "No description provided",
      lastUpdated: project.updatedAt.toISOString(),
      changelogCount: 0,
    }));

    const formattedCollabProjects = collaboratedProjects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description || "No description provided",
      lastUpdated: project.updatedAt.toISOString(),
      changelogCount: 0,
    }));

    const projects = [...formattedUserProjects, ...formattedCollabProjects];

    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Projects</h1>
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium mb-4">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first project to get started
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error in ProjectsPage:", error);
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Error Loading Projects</h1>
        <p>There was an error loading your projects. Please try again later.</p>
      </div>
    );
  }
}
