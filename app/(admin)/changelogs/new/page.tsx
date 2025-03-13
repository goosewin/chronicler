"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: string;
  name: string;
  description: string;
};

export default function NewChangelogRedirectPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/projects");

        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }

        const data = await response.json();

        // The API returns a nested structure with 'owned' and 'collaborated' projects
        // We need to combine them into a single array
        if (data.projects) {
          if (Array.isArray(data.projects)) {
            // Handle case where API returns a flat array (public projects for unauthenticated users)
            setProjects(data.projects);
          } else if (data.projects.owned || data.projects.collaborated) {
            // Handle authenticated user case with owned and collaborated projects
            const ownedProjects = data.projects.owned || [];
            const collaboratedProjects = data.projects.collaborated || [];
            setProjects([...ownedProjects, ...collaboratedProjects]);
          } else {
            setProjects([]);
          }
        } else {
          setProjects([]);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        setError("Failed to load projects. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Create New Changelog
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select a Project</CardTitle>
          <CardDescription>
            Choose which project to create a changelog for
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading projects...
            </p>
          ) : error ? (
            <div className="text-destructive py-8">{error}</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t created any projects yet.
              </p>
              <Link href="/projects/new">
                <Button>Create Your First Project</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/changelog`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 rounded-md border hover:bg-muted transition-colors">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
