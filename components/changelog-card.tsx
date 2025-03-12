"use client";

import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
  CardDescription,
  CardFooter,
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

interface ChangelogCardProps {
  changelog: {
    id: string;
    version: string;
    releaseDate: Date | string;
    content: string;
    isPublished: boolean;
    projectId: string;
    projectName?: string;
    project?: { name: string; };
  };
}

export function ChangelogCard({ changelog }: ChangelogCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const releaseDate = changelog.releaseDate instanceof Date
    ? changelog.releaseDate
    : new Date(changelog.releaseDate);

  const formattedDate = releaseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const projectName = changelog.projectName || changelog.project?.name;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/changelogs/${changelog.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete changelog");
      }

      toast.success("Changelog deleted successfully");
      router.refresh();
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

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">
                <Link
                  href={`/projects/${changelog.projectId}/changelog/${changelog.id}`}
                  className="hover:underline"
                >
                  {changelog.version}
                </Link>
                {!changelog.isPublished && (
                  <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">
                    Draft
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {projectName && (
                  <>
                    <Link
                      href={`/projects/${changelog.projectId}`}
                      className="hover:underline"
                    >
                      {projectName}
                    </Link>
                    {" · "}
                  </>
                )}
                {formattedDate}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/projects/${changelog.projectId}/changelog/${changelog.id}/edit`)
                  }
                >
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        </CardContent>
        <CardFooter className="pt-1">
          <Link
            href={`/projects/${changelog.projectId}/changelog/${changelog.id}`}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            View details
          </Link>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the changelog for version "{changelog.version}".
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
    </>
  );
} 
