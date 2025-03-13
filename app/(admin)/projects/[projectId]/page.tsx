"use client";

import { ChangelogCard } from "@/components/changelog-card";
import {
  ChangelogFilters,
  type ChangelogFilters as Filters,
} from "@/components/changelog-filters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Github, MoreVertical, Pencil, Trash2, User } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
  provider: string;
  repositoryOwner: string | null;
  repositoryName: string | null;
  isPublic: boolean;
  lastSynced: string | null;
}

interface Changelog {
  id: string;
  version: string;
  releaseDate: string;
  content: string;
  isPublished: boolean;
  projectId: string;
  createdAt: string;
}

interface ProjectDetails {
  id: string;
  name: string;
  repositoryUrl: string;
  isPublic: boolean;
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    dateRange: undefined,
    sortField: "releaseDate",
    sortOrder: "desc",
  });
  const { projectId } = use(params);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch project details
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        if (!projectResponse.ok) {
          throw new Error("Failed to fetch project");
        }
        const projectData = await projectResponse.json();
        setProject(projectData.project);

        // Fetch changelogs
        const changelogsResponse = await fetch(
          `/api/changelogs?projectId=${projectId}`,
        );
        if (!changelogsResponse.ok) {
          throw new Error("Failed to fetch changelogs");
        }
        const changelogsData = await changelogsResponse.json();
        setChangelogs(changelogsData.changelogs);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load project data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const filteredChangelogs = changelogs
    .filter((changelog) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          changelog.version.toLowerCase().includes(searchLower) ||
          changelog.content.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .filter((changelog) => {
      // Date range filter
      if (filters.dateRange?.from && filters.dateRange?.to) {
        const date = new Date(changelog.releaseDate);
        return date >= filters.dateRange.from && date <= filters.dateRange.to;
      }
      return true;
    })
    .sort((a, b) => {
      // Sorting
      const aValue =
        filters.sortField === "version"
          ? a.version
          : new Date(a[filters.sortField]).getTime();
      const bValue =
        filters.sortField === "version"
          ? b.version
          : new Date(b[filters.sortField]).getTime();

      if (typeof aValue === "string" && typeof bValue === "string") {
        return filters.sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return filters.sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Project Not Found</h1>
        <p>The project you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{project.name}</CardTitle>
              {project.description && (
                <CardDescription>{project.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/view/projects/${project.id}`}>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  View as Guest
                </Button>
              </Link>
              <Link href={project.repositoryUrl} target="_blank">
                <Button variant="outline" className="gap-2">
                  <Github className="h-4 w-4" />
                  Repository
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <span className="sr-only">More actions</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <Link href={`/projects/${project.id}/edit`}>
                    <DropdownMenuItem>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit project
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <Link href={`/projects/${project.id}/delete`}>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete project
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Repository
            </p>
            <p className="font-medium">
              <Link
                href={project.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {project.repositoryUrl}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Changelogs</h2>
          <Link href={`/projects/${project.id}/changelog`}>
            <Button>New Changelog</Button>
          </Link>
        </div>

        <ChangelogFilters onFiltersChange={setFilters} />

        {filteredChangelogs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {changelogs.length === 0
                  ? "No changelogs have been created yet."
                  : "No changelogs match your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredChangelogs.map((changelog) => (
              <ChangelogCard
                key={changelog.id}
                changelog={{
                  ...changelog,
                  projectName: project.name,
                  project: {
                    id: project.id,
                    name: project.name,
                    repositoryUrl: project.repositoryUrl,
                    isPublic: project.isPublic,
                  } as ProjectDetails,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
