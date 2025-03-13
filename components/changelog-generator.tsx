"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Define form schemas for different generation types
const commitRangeSchema = z.object({
  type: z.literal("commit_range"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  startRef: z.string().min(1, { message: "Start reference is required" }),
  endRef: z.string().min(1, { message: "End reference is required" }),
});

const pullRequestSchema = z.object({
  type: z.literal("pull_request"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  prNumber: z.string().min(1, { message: "PR number is required" }),
});

const releaseSchema = z.object({
  type: z.literal("release"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  releaseTag: z.string().min(1, { message: "Release tag is required" }),
});

// Union type for all form types
type FormValues =
  | z.infer<typeof commitRangeSchema>
  | z.infer<typeof pullRequestSchema>
  | z.infer<typeof releaseSchema>;

interface ChangelogGeneratorProps {
  projectId: string;
  onGenerated: (changelog: string) => void;
}

export function ChangelogGenerator({
  projectId,
  onGenerated,
}: ChangelogGeneratorProps) {
  const [activeTab, setActiveTab] = useState<
    "commit_range" | "pull_request" | "release"
  >("commit_range");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedChangelog, setGeneratedChangelog] = useState<string | null>(
    null,
  );

  // Create form based on active tab
  const commitRangeForm = useForm<z.infer<typeof commitRangeSchema>>({
    resolver: zodResolver(commitRangeSchema),
    defaultValues: {
      type: "commit_range",
      projectId,
      startRef: "",
      endRef: "",
    },
  });

  const pullRequestForm = useForm<z.infer<typeof pullRequestSchema>>({
    resolver: zodResolver(pullRequestSchema),
    defaultValues: {
      type: "pull_request",
      projectId,
      prNumber: "",
    },
  });

  const releaseForm = useForm<z.infer<typeof releaseSchema>>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      type: "release",
      projectId,
      releaseTag: "",
    },
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as "commit_range" | "pull_request" | "release");
    setGeneratedChangelog(null);
  };

  const generateChangelog = async (values: FormValues) => {
    setIsLoading(true);
    setGeneratedChangelog(null);

    try {
      const response = await fetch("/api/changelogs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Error parsing JSON from response:", jsonError);
        throw new Error("Failed to parse API response");
      }

      if (!response.ok) {
        throw new Error(data?.error || `Failed with status ${response.status}`);
      }

      // Check if data exists before trying to access properties
      if (data) {
        // Sometimes the API response might be wrapped in a 'data' property
        const responseData = data.data ? data.data : data;

        // Access the changelog property directly from the response
        if (responseData.changelog) {
          setGeneratedChangelog(responseData.changelog);
          toast.success("Changelog generated successfully");

          if (onGenerated) {
            onGenerated(responseData.changelog);
          }
        } else {
          console.error("Missing changelog property in API response");
          toast.error("API response is missing changelog data");
        }
      } else {
        console.error("Empty response data from API");
        toast.error("Received empty data from the API");
      }
    } catch (error) {
      console.error("Error generating changelog:", error);
      toast.error("Failed to generate changelog", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generate Changelog</CardTitle>
        <CardDescription>
          Generate a changelog from commit history, pull requests, or releases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commit_range">Commit Range</TabsTrigger>
            <TabsTrigger value="pull_request">Pull Request</TabsTrigger>
            <TabsTrigger value="release">Release</TabsTrigger>
          </TabsList>

          <TabsContent value="commit_range">
            <div className="space-y-4 mt-4">
              <FormField
                control={commitRangeForm.control}
                name="startRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Commit/Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., abc123 or v1.0.0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Starting commit hash, tag, or reference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={commitRangeForm.control}
                name="endRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Commit/Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., def456 or v1.1.0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ending commit hash, tag, or reference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                disabled={isLoading}
                onClick={commitRangeForm.handleSubmit((data) =>
                  generateChangelog(data),
                )}
              >
                {isLoading ? "Generating..." : "Generate Changelog"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="pull_request">
            <div className="space-y-4 mt-4">
              <FormField
                control={pullRequestForm.control}
                name="prNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pull Request Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 42" {...field} />
                    </FormControl>
                    <FormDescription>
                      The number of the pull request
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                disabled={isLoading}
                onClick={pullRequestForm.handleSubmit((data) =>
                  generateChangelog(data),
                )}
              >
                {isLoading ? "Generating..." : "Generate Changelog"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="release">
            <div className="space-y-4 mt-4">
              <FormField
                control={releaseForm.control}
                name="releaseTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., v1.0.0" {...field} />
                    </FormControl>
                    <FormDescription>
                      The tag name of the release
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                disabled={isLoading}
                onClick={releaseForm.handleSubmit((data) =>
                  generateChangelog(data),
                )}
              >
                {isLoading ? "Generating..." : "Generate Changelog"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {generatedChangelog && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Generated Changelog</h3>
            <div className="bg-muted p-4 rounded-md">
              <Textarea
                readOnly
                className="min-h-[200px] font-mono text-sm w-full"
                value={generatedChangelog}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => onGenerated(generatedChangelog)}>
                Use This Changelog
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
