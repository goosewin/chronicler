"use client";

import {
  ChangelogFilters,
  type ChangelogFilters as Filters,
} from "@/components/changelog-filters";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
  isPublic: boolean;
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

export default function PublicProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
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
        setHasAccess(projectData.hasAccess);

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
      <div className="container py-8 max-w-3xl mx-auto">
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
      <div className="container py-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Project Not Found</h1>
        <p>The project you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>

        {hasAccess && (
          <Link href={`/projects/${project.id}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Settings className="h-4 w-4" />
              View as Admin
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6">
        <ChangelogFilters onFiltersChange={setFilters} />
      </div>

      {filteredChangelogs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No changelogs found</CardTitle>
            <CardDescription>
              {changelogs.length === 0
                ? "This project doesn't have any changelogs yet"
                : "No changelogs match your filters"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredChangelogs
            .filter((changelog) => changelog.isPublished)
            .map((changelog) => (
              <Card key={changelog.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        href={`/view/projects/${project.id}/changelog/${changelog.id}`}
                        className="font-semibold text-xl hover:underline"
                      >
                        {changelog.version}
                      </Link>
                      <CardDescription className="mt-1">
                        {new Date(changelog.releaseDate).toLocaleDateString(
                          undefined,
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
                  <div className="markdown-preview-container mb-2">
                    <div className="markdown-preview">
                      <MarkdownContent
                        content={changelog.content}
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
