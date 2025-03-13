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

const singleCommitSchema = z.object({
  type: z.literal("single_commit"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  commitHash: z.string().min(1, { message: "Commit hash is required" }),
});

const pullRequestSchema = z.object({
  type: z.literal("pull_request"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  prNumber: z.string().min(1, { message: "PR number is required" }),
});

const pullRequestRangeSchema = z.object({
  type: z.literal("pr_range"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  startPRNumber: z.string().min(1, { message: "Start PR number is required" }),
  endPRNumber: z.string().min(1, { message: "End PR number is required" }),
});

const releaseSchema = z.object({
  type: z.literal("release"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  releaseTag: z.string().min(1, { message: "Release tag is required" }),
});

const releaseRangeSchema = z.object({
  type: z.literal("release_range"),
  projectId: z.string().min(1, { message: "Project ID is required" }),
  startReleaseTag: z
    .string()
    .min(1, { message: "Start release tag is required" }),
  endReleaseTag: z.string().min(1, { message: "End release tag is required" }),
});

// Union type for all form types
type FormValues =
  | z.infer<typeof commitRangeSchema>
  | z.infer<typeof singleCommitSchema>
  | z.infer<typeof pullRequestSchema>
  | z.infer<typeof pullRequestRangeSchema>
  | z.infer<typeof releaseSchema>
  | z.infer<typeof releaseRangeSchema>;

// Define a type for generation metadata
export interface GenerationMetadata {
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
}

interface ChangelogGeneratorProps {
  projectId: string;
  onGenerated: (changelog: string, metadata?: GenerationMetadata) => void;
}

export function ChangelogGenerator({
  projectId,
  onGenerated,
}: ChangelogGeneratorProps) {
  const [activeTab, setActiveTab] = useState<
    | "commit_range"
    | "single_commit"
    | "pull_request"
    | "pr_range"
    | "release"
    | "release_range"
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

  const singleCommitForm = useForm<z.infer<typeof singleCommitSchema>>({
    resolver: zodResolver(singleCommitSchema),
    defaultValues: {
      type: "single_commit",
      projectId,
      commitHash: "",
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

  const pullRequestRangeForm = useForm<z.infer<typeof pullRequestRangeSchema>>({
    resolver: zodResolver(pullRequestRangeSchema),
    defaultValues: {
      type: "pr_range",
      projectId,
      startPRNumber: "",
      endPRNumber: "",
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

  const releaseRangeForm = useForm<z.infer<typeof releaseRangeSchema>>({
    resolver: zodResolver(releaseRangeSchema),
    defaultValues: {
      type: "release_range",
      projectId,
      startReleaseTag: "",
      endReleaseTag: "",
    },
  });

  const handleTabChange = (value: string) => {
    setActiveTab(
      value as
        | "commit_range"
        | "single_commit"
        | "pull_request"
        | "pr_range"
        | "release"
        | "release_range",
    );
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
            // Create generation metadata based on the type
            const generationMetadata = {
              source: values.type,
              startRef: "startRef" in values ? values.startRef : undefined,
              endRef: "endRef" in values ? values.endRef : undefined,
              commitHash:
                "commitHash" in values ? values.commitHash : undefined,
              prNumber: "prNumber" in values ? values.prNumber : undefined,
              startPRNumber:
                "startPRNumber" in values ? values.startPRNumber : undefined,
              endPRNumber:
                "endPRNumber" in values ? values.endPRNumber : undefined,
              releaseTag:
                "releaseTag" in values ? values.releaseTag : undefined,
              startReleaseTag:
                "startReleaseTag" in values
                  ? values.startReleaseTag
                  : undefined,
              endReleaseTag:
                "endReleaseTag" in values ? values.endReleaseTag : undefined,
            };
            onGenerated(responseData.changelog, generationMetadata);
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
          Generate a changelog from various sources: commits, pull requests, or
          releases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="single_commit">Single Commit</TabsTrigger>
            <TabsTrigger value="commit_range">Commit Range</TabsTrigger>
            <TabsTrigger value="pull_request">Single PR</TabsTrigger>
            <TabsTrigger value="pr_range">PR Range</TabsTrigger>
            <TabsTrigger value="release">Single Release</TabsTrigger>
            <TabsTrigger value="release_range">Release Range</TabsTrigger>
          </TabsList>

          <TabsContent value="commit_range">
            <div className="space-y-4 mt-4">
              <FormField
                control={commitRangeForm.control}
                name="startRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Commit</FormLabel>
                    <FormControl>
                      <Input placeholder="abc123" {...field} />
                    </FormControl>
                    <FormDescription>
                      Starting commit hash or reference
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
                    <FormLabel>End Commit</FormLabel>
                    <FormControl>
                      <Input placeholder="def456" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ending commit hash or reference
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

          <TabsContent value="single_commit">
            <div className="space-y-4 mt-4">
              <FormField
                control={singleCommitForm.control}
                name="commitHash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commit Hash</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., abc123" {...field} />
                    </FormControl>
                    <FormDescription>
                      The hash of the commit to generate a changelog for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                disabled={isLoading}
                onClick={singleCommitForm.handleSubmit((data) =>
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
                      <Input placeholder="42" {...field} />
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

          <TabsContent value="pr_range">
            <div className="space-y-4 mt-4">
              <FormField
                control={pullRequestRangeForm.control}
                name="startPRNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start PR Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 42" {...field} />
                    </FormControl>
                    <FormDescription>
                      The number of the first pull request in the range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pullRequestRangeForm.control}
                name="endPRNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End PR Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 50" {...field} />
                    </FormControl>
                    <FormDescription>
                      The number of the last pull request in the range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                disabled={isLoading}
                onClick={pullRequestRangeForm.handleSubmit((data) =>
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
                      <Input placeholder="v1.0.0" {...field} />
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

          <TabsContent value="release_range">
            <div className="space-y-4 mt-4">
              <FormField
                control={releaseRangeForm.control}
                name="startReleaseTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Release Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., v1.0.0" {...field} />
                    </FormControl>
                    <FormDescription>
                      The tag of the first release in the range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={releaseRangeForm.control}
                name="endReleaseTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Release Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., v1.1.0" {...field} />
                    </FormControl>
                    <FormDescription>
                      The tag of the last release in the range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                disabled={isLoading}
                onClick={releaseRangeForm.handleSubmit((data) =>
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
