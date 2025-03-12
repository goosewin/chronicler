import { auth } from "@/lib/auth";
import { ProjectsInteractor } from "@/lib/interactors";
import { apiError } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function getAuthSession(request: NextRequest) {
  return await auth.api.getSession({
    headers: request.headers,
  });
}

export async function requireAuth(request: NextRequest) {
  const session = await getAuthSession(request);

  if (!session?.user) {
    return { error: apiError("Unauthorized", 401) };
  }

  return { session };
}

export async function checkProjectAccess(userId: string, projectId: string) {
  const project = await ProjectsInteractor.getWithDetails(projectId);

  if (!project) {
    return { error: apiError("Project not found", 404) };
  }

  if (project.isPublic) {
    return { project };
  }

  const isOwner = project.userId === userId;
  const isCollaborator = project.collaborators?.some(
    (c: { userId: string }) => c.userId === userId,
  );

  if (!isOwner && !isCollaborator) {
    return { error: apiError("Unauthorized", 401) };
  }

  return { project };
}

export async function requireProjectOwnership(
  userId: string,
  projectId: string,
) {
  const project = await ProjectsInteractor.getById(projectId);

  if (!project) {
    return { error: apiError("Project not found", 404) };
  }

  const isOwner = project.userId === userId;

  if (!isOwner) {
    return { error: apiError("Unauthorized", 401) };
  }

  return { project };
}
