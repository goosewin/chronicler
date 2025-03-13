import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    lastUpdated: string;
    changelogCount: number;
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const lastUpdated = new Date(project.lastUpdated);
  const formattedDate = lastUpdated.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block transition-all hover:scale-[1.01]"
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last updated {formattedDate}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
