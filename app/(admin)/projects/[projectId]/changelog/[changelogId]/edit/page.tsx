"use client";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon } from "lucide-react";
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
  commitHash: z.string().optional(),
  isPublished: z.boolean().default(true),
  projectId: z.string().min(1, { message: "Project ID is required" }),
});

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

export default function EditChangelogPage({
  params,
}: {
  params: Promise<{ projectId: string; changelogId: string }>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { projectId, changelogId } = use(params);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      version: "",
      releaseDate: new Date().toISOString(),
      content: "",
      commitHash: "",
      isPublished: true,
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
        setChangelog(data.changelog);

        form.reset({
          version: data.changelog.version,
          releaseDate: new Date(data.changelog.releaseDate).toISOString(),
          content: data.changelog.content,
          commitHash: data.changelog.commitHash || "",
          isPublished: data.changelog.isPublished,
          projectId: data.changelog.projectId,
        });

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
                onClick={() => router.push(`/projects/${projectId}/changelog/${changelogId}`)}
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
                                !field.value && "text-muted-foreground"
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
                              date > new Date() ||
                              date < new Date("1900-01-01")
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
                name="commitHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commit Hash (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="git commit hash or tag"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Git commit hash, tag, or reference for this release
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
                    <FormLabel>Changelog Content</FormLabel>
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

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Publish Changelog</FormLabel>
                      <FormDescription>
                        Make this changelog visible to all users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push(`/projects/${projectId}/changelog/${changelogId}`)}
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
