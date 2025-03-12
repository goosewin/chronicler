"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectProvider } from "@/lib/db/constants";
import { useApiMutation } from "@/lib/hooks";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ProjectFormData = {
  name: string;
  description: string;
  repositoryUrl: string;
  provider: ProjectProvider;
};

type ProjectResponse = {
  project: {
    id: string;
    name: string;
  };
};

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [provider, setProvider] = useState<ProjectProvider>(
    ProjectProvider.GitHub,
  );

  const { mutate, isLoading } = useApiMutation<
    ProjectFormData,
    ProjectResponse
  >({
    url: "/api/projects",
    successMessage: `${name} has been created successfully`,
    onSuccess: (data) => {
      router.push(`/projects/${data.project.id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!repositoryUrl.trim()) {
      toast.error("Repository URL is required");
      return;
    }

    mutate({
      name,
      description,
      repositoryUrl,
      provider,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Create New Project
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Enter the details for your new project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Project"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Repository Provider</Label>
              <Select
                value={provider}
                onValueChange={(value: string) =>
                  setProvider(value as ProjectProvider)
                }
              >
                <SelectTrigger id="provider" className="w-full">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProjectProvider.GitHub}>GitHub</SelectItem>
                  <SelectItem value={ProjectProvider.GitLab}>GitLab</SelectItem>
                  <SelectItem value={ProjectProvider.Bitbucket}>
                    Bitbucket
                  </SelectItem>
                  <SelectItem value={ProjectProvider.Custom}>Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repositoryUrl">Repository URL</Label>
              <Input
                id="repositoryUrl"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name || !repositoryUrl}
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
