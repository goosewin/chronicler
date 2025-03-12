"use client";

import { MarkdownContent } from "@/components/markdown-content";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Edit, Tag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

// Define Changelog type
interface Changelog {
  id: string;
  version: string;
  releaseDate: string;
  content: string;
  commitHash: string | null;
  isPublished: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export default function ChangelogDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string; changelogId: string }>;
}) {
  const router = useRouter();
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { projectId, changelogId } = use(params);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchChangelog = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/changelogs/${changelogId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Changelog not found");
          } else {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to load changelog");
          }
        }

        const data = await response.json();
        setChangelog(data.changelog);
      } catch (err) {
        console.error("Error fetching changelog:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        toast.error("Failed to load changelog");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChangelog();
  }, [changelogId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/changelogs/${changelogId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete changelog");
      }

      toast.success("Changelog deleted successfully");
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error deleting changelog:", error);
      toast.error("Failed to delete changelog", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Changelog Not Found
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                The changelog you&apos;re looking for couldn&apos;t be found.
              </p>
              <Button
                onClick={() => router.push(`/projects/${projectId}`)}
                variant="secondary"
              >
                Back to Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-full max-w-[250px]" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Separator />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {changelog?.version || "Changelog Details"}
            </h1>
          </div>
        </div>

        {changelog && (
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/changelog/${changelogId}/edit`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the changelog for version "{changelog?.version}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {changelog && (
        <Card>
          <CardHeader>
            <CardTitle>{changelog.version}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Released: {formatDate(changelog.releaseDate)}</span>
              </div>
              {changelog.commitHash && (
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>Commit: {changelog.commitHash}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="prose dark:prose-invert max-w-none">
              <MarkdownContent content={changelog.content} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
