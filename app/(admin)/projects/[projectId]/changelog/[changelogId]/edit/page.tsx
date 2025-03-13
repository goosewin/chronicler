"use client";

import {
  ChangelogGenerator,
  GenerationMetadata,
} from "@/components/changelog-generator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarIcon,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  version: z.string().min(1, { message: "Version is required" }),
  releaseDate: z.string().min(1, { message: "Release date is required" }),
  content: z.string().min(1, { message: "Content is required" }),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  generationMetadata: z
    .object({
      source: z.string(),
      startRef: z.string().optional(),
      endRef: z.string().optional(),
      commitHash: z.string().optional(),
      prNumber: z.string().optional(),
      startPRNumber: z.string().optional(),
      endPRNumber: z.string().optional(),
      releaseTag: z.string().optional(),
      startReleaseTag: z.string().optional(),
      endReleaseTag: z.string().optional(),
    })
    .optional(),
});

interface Changelog {
  id: string;
  version: string;
  releaseDate: string;
  content: string;
  isPublished: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    generation?: {
      source: string;
      startRef?: string;
      endRef?: string;
      commitHash?: string;
      prNumber?: string;
      startPRNumber?: string;
      endPRNumber?: string;
      releaseTag?: string;
      startReleaseTag?: string;
      endReleaseTag?: string;
      generatedAt?: string;
    };
  };
}

export default function EditChangelogPage({
  params,
}: {
  params: Promise<{ projectId: string; changelogId: string }>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [changelogData, setChangelogData] = useState<Changelog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const { projectId, changelogId } = use(params);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      version: "",
      releaseDate: new Date().toISOString(),
      content: "",
      projectId: projectId,
    },
  });

  useEffect(() => {
    const fetchChangelog = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/changelogs/${changelogId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch changelog");
        }

        const data = await response.json();
        setChangelogData(data.changelog);

        // Create defaultValues object with basic fields
        const defaultValues: z.infer<typeof formSchema> = {
          version: data.changelog.version,
          releaseDate: new Date(data.changelog.releaseDate).toISOString(),
          content: data.changelog.content,
          projectId: data.changelog.projectId,
        };

        // Add generation metadata if it exists
        if (data.changelog.metadata?.generation) {
          const generation = data.changelog.metadata.generation;
          defaultValues.generationMetadata = {
            source: generation.source,
            startRef: generation.startRef,
            endRef: generation.endRef,
            prNumber: generation.prNumber,
            releaseTag: generation.releaseTag,
          };
        }

        form.reset(defaultValues);
        setDate(new Date(data.changelog.releaseDate));
      } catch (error) {
        console.error("Error fetching changelog:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
        toast.error("Failed to load changelog data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChangelog();
  }, [changelogId, form]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.releaseDate) {
        const dateValue = new Date(value.releaseDate);
        if (!isNaN(dateValue.getTime())) {
          setDate(dateValue);
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.watch]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/changelogs/${changelogId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update changelog");
      }

      toast.success("Changelog updated successfully", {
        description: `Version ${values.version} has been updated`,
      });

      router.push(`/projects/${projectId}/changelog/${changelogId}`);
    } catch (error) {
      console.error("Error updating changelog:", error);
      toast.error("Failed to update changelog", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratedChangelog = (
    content: string,
    metadata?: GenerationMetadata,
  ) => {
    form.setValue("content", content);
    if (metadata) {
      form.setValue("generationMetadata", metadata);
    }
    setShowGenerator(false);
    toast.success("Changelog content updated", {
      description: "The generated changelog has been added to the editor",
    });
  };

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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/changelog/${changelogId}`}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Error</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Failed to load changelog data: {error}
              </p>
              <Button
                onClick={() =>
                  router.push(`/projects/${projectId}/changelog/${changelogId}`)
                }
                variant="secondary"
              >
                Back to Changelog
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/projects/${projectId}/changelog/${changelogId}`}>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Changelog</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Changelog</CardTitle>
          <CardDescription>
            Update the details for this changelog entry
          </CardDescription>
        </CardHeader>

        {/* Display generation metadata if it exists */}
        {changelogData?.metadata?.generation && (
          <CardContent className="pt-0 pb-4">
            <div className="bg-muted p-3 rounded-md text-sm mb-4">
              <h3 className="font-medium mb-2">Generation Info</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-muted-foreground">Source:</dt>
                  <dd className="font-medium capitalize">
                    {(() => {
                      const source = changelogData.metadata.generation.source;
                      switch (source) {
                        case "commit_range":
                          return "Commit Range";
                        case "single_commit":
                          return "Single Commit";
                        case "pull_request":
                          return "Pull Request";
                        case "pr_range":
                          return "PR Range";
                        case "release":
                          return "Release";
                        case "release_range":
                          return "Release Range";
                        default:
                          return source;
                      }
                    })()}
                  </dd>
                </div>

                {changelogData.metadata.generation.commitHash && (
                  <div className="flex items-center gap-1">
                    <GitCommit className="h-4 w-4 text-muted-foreground" />
                    <dt className="text-muted-foreground">Commit:</dt>
                    <dd className="font-mono text-xs">
                      {changelogData.metadata.generation.commitHash.substring(
                        0,
                        7,
                      )}
                    </dd>
                  </div>
                )}

                {changelogData.metadata.generation.startRef &&
                  changelogData.metadata.generation.endRef && (
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <dt className="text-muted-foreground">Commit Range:</dt>
                      <dd className="font-mono text-xs">
                        {changelogData.metadata.generation.startRef.substring(
                          0,
                          7,
                        )}{" "}
                        →{" "}
                        {changelogData.metadata.generation.endRef.substring(
                          0,
                          7,
                        )}
                      </dd>
                    </div>
                  )}

                {changelogData.metadata.generation.prNumber && (
                  <div className="flex items-center gap-1">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    <dt className="text-muted-foreground">Pull Request:</dt>
                    <dd className="font-medium">
                      # {changelogData.metadata.generation.prNumber}
                    </dd>
                  </div>
                )}

                {changelogData.metadata.generation.startPRNumber &&
                  changelogData.metadata.generation.endPRNumber && (
                    <div className="flex items-center gap-1">
                      <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                      <dt className="text-muted-foreground">PR Range:</dt>
                      <dd className="font-medium">
                        # {changelogData.metadata.generation.startPRNumber} → #{" "}
                        {changelogData.metadata.generation.endPRNumber}
                      </dd>
                    </div>
                  )}

                {changelogData.metadata.generation.releaseTag && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <dt className="text-muted-foreground">Release Tag:</dt>
                    <dd className="font-medium">
                      {changelogData.metadata.generation.releaseTag}
                    </dd>
                  </div>
                )}

                {changelogData.metadata.generation.startReleaseTag &&
                  changelogData.metadata.generation.endReleaseTag && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <dt className="text-muted-foreground">Release Range:</dt>
                      <dd className="font-medium">
                        {changelogData.metadata.generation.startReleaseTag} →{" "}
                        {changelogData.metadata.generation.endReleaseTag}
                      </dd>
                    </div>
                  )}

                {changelogData.metadata.generation.generatedAt && (
                  <div>
                    <dt className="text-muted-foreground">Generated At:</dt>
                    <dd className="font-medium">
                      {format(
                        new Date(changelogData.metadata.generation.generatedAt),
                        "PPP",
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </CardContent>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version</FormLabel>
                      <FormControl>
                        <Input placeholder="v1.0.0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Version or release name (e.g., &quot;1.0.0&quot;,
                        &quot;v2.3&quot;, &quot;April Update&quot;)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Release Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => {
                              if (newDate) {
                                setDate(newDate);
                                field.onChange(newDate.toISOString());
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        The date when this version was released
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commit Hash (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. a1b2c3d" {...field} />
                    </FormControl>
                    <FormDescription>
                      The commit hash associated with this changelog
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Changelog Content</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowGenerator(!showGenerator)}
                      >
                        {showGenerator ? "Hide Generator" : "Generate Content"}
                      </Button>
                    </div>
                    {showGenerator && (
                      <div className="my-4">
                        <ChangelogGenerator
                          projectId={projectId}
                          onGenerated={handleGeneratedChangelog}
                        />
                      </div>
                    )}
                    <FormControl>
                      <Textarea
                        className="min-h-[200px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Full changelog content in Markdown format
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  router.push(`/projects/${projectId}/changelog/${changelogId}`)
                }
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Changelog"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
