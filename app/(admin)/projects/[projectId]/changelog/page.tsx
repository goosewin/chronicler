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
import { Textarea } from "@/components/ui/textarea";
import { Project } from "@/lib/db/types";
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
  projectId: z.string().min(1, { message: "Project ID is required" }),
  generationMetadata: z
    .object({
      source: z.string(),
      startRef: z.string().optional(),
      endRef: z.string().optional(),
      prNumber: z.string().optional(),
      releaseTag: z.string().optional(),
    })
    .optional(),
});

export default function NewChangelogPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerator, setShowGenerator] = useState(false);
  const { projectId } = use(params);
  const [date, setDate] = useState<Date>(new Date());

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

  useEffect(() => {
    const fetchProject = async () => {
      setIsLoading(true);
      try {
        const projectData = await fetch(`/api/projects/${projectId}`);
        if (!projectData.ok) {
          throw new Error("Failed to fetch project");
        }
        const data = await projectData.json();
        setProject(data.project);
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/changelogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create changelog");
      }

      toast.success("Changelog created successfully", {
        description: `Version ${values.version} has been added to the project`,
      });

      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error creating changelog:", error);
      toast.error("Failed to create changelog", {
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
    toast.success("Changelog content has been added to the form");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Changelog</h1>
      </div>

      {!isLoading && project ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>New Changelog</CardTitle>
              <CardDescription>
                Create a new changelog for {project.name}
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
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(newDate) => {
                                  if (newDate) {
                                    setDate(newDate);
                                    // Update the form with ISO string
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
                            {showGenerator
                              ? "Hide Generator"
                              : "Generate Content"}
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
                            placeholder="## What's New
                                      - Added feature X
                                      - Improved performance by 20%

                                      ## Bug Fixes
                                      - Fixed issue with login
                                      - Resolved crash on startup"
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
                    onClick={() => router.push(`/projects/${projectId}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Changelog"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <p>Project not found or you don&apos;t have access to it.</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
