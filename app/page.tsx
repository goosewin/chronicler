"use client";

import {
  ChangelogFilters,
  type ChangelogFilters as Filters,
} from "@/components/changelog-filters";
import Navbar from "@/components/layout/navbar";
import { MarkdownContent } from "@/components/markdown-content";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { GitBranch, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Changelog {
  id: string;
  version: string;
  releaseDate: string;
  content: string;
  isPublished: boolean;
  projectId: string;
  createdAt: string;
  project?: {
    name: string;
    repositoryUrl?: string;
  };
}

export default function Home() {
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    dateRange: undefined,
    sortField: "releaseDate",
    sortOrder: "desc",
  });

  useEffect(() => {
    const fetchChangelogs = async () => {
      try {
        const response = await fetch("/api/changelogs/public");
        if (!response.ok) {
          throw new Error("Failed to fetch changelogs");
        }
        const data = await response.json();
        setChangelogs(data.changelogs);
      } catch (error) {
        console.error("Error fetching changelogs:", error);
        toast.error("Failed to load changelogs");
      } finally {
        setLoading(false);
      }
    };

    fetchChangelogs();
  }, []);

  const filteredChangelogs = changelogs
    .filter((changelog) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          changelog.version.toLowerCase().includes(searchLower) ||
          changelog.content.toLowerCase().includes(searchLower) ||
          changelog.project?.name.toLowerCase().includes(searchLower)
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isAdminView={false} />
      <main className="flex-1">
        <section className="py-20 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Chronicler
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
                A modern changelog management platform for your projects. Keep
                your users informed about updates, changes, and improvements.
              </p>
            </div>
          </div>
        </section>

        <section id="changelogs" className="py-20 bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Latest Changelogs
            </h2>

            <div className="mb-8">
              <ChangelogFilters onFiltersChange={setFilters} />
            </div>

            {loading ? (
              <div className="animate-pulse space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg" />
                ))}
              </div>
            ) : filteredChangelogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {changelogs.length === 0
                    ? "No changelogs available yet."
                    : "No changelogs match your filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredChangelogs.map((changelog) => (
                  <Card key={changelog.id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link
                            href={`/view/projects/${changelog.projectId}/changelog/${changelog.id}`}
                            className="font-semibold text-xl hover:underline"
                          >
                            {changelog.version}
                          </Link>
                          <CardDescription className="mt-1">
                            <Link
                              href={`/view/projects/${changelog.projectId}`}
                              className="hover:underline"
                            >
                              {changelog.project?.name}
                            </Link>
                            {" · "}
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
                            content={changelog.content.substring(0, 300)}
                            className="text-sm text-muted-foreground"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4">
                        <Link
                          href={`/view/projects/${changelog.projectId}/changelog/${changelog.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          Read more
                        </Link>
                        {changelog.project?.repositoryUrl && (
                          <Link
                            href={changelog.project.repositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                          >
                            <GitBranch className="h-4 w-4" />
                            <span>View Repository</span>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-semibold">Chronicler</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Chronicler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
