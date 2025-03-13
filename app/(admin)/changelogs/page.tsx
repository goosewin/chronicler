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
  project?: {
    name: string;
  };
}

export default function ChangelogsPage() {
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
        const response = await fetch("/api/changelogs/all");
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

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">All Changelogs</h1>
            <p className="text-muted-foreground mt-1">
              Recent updates across all your projects
            </p>
          </div>
        </div>
        <div className="animate-pulse space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">All Changelogs</h1>
          <p className="text-muted-foreground mt-1">
            Recent updates across all your projects
          </p>
        </div>
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
                ? "You haven't created any changelogs yet"
                : "No changelogs match your filters"}
            </CardDescription>
          </CardHeader>
          {changelogs.length === 0 && (
            <CardContent>
              <p className="mb-4">
                Go to one of your projects to create a changelog and publish
                updates for your users.
              </p>
              <Link href="/projects">
                <Button>Go to projects</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredChangelogs.map((changelog) => (
            <ChangelogCard
              key={changelog.id}
              changelog={{
                ...changelog,
                projectName: changelog.project?.name ?? "",
                project: changelog.project ?? undefined,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
