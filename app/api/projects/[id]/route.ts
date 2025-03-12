import {
  getAuthSession,
  requireAuth,
  requireProjectOwnership,
} from "@/lib/auth/utils";
import { ProjectsInteractor } from "@/lib/interactors";
import { apiError, apiSuccess } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const project = await ProjectsInteractor.getWithDetails(id);

    if (!project) {
      return apiError("Project not found", 404);
    }

    if (!project.isPublic) {
      const session = await getAuthSession(request);

      if (!session?.user) {
        return apiError("Unauthorized", 401);
      }

      const isOwner = project.userId === session.user.id;
      const isCollaborator = project.collaborators?.some(
        (c) => c.userId === session.user.id,
      );

      if (!isOwner && !isCollaborator) {
        return apiError("Unauthorized", 401);
      }
    }

    return apiSuccess({ project });
  } catch (error) {
    console.error(`Error fetching project ${params.id}:`, error);
    return apiError("Failed to fetch project");
  }
}

export async function PUT(
  request: NextRequest,
  params: Promise<{ id: string }>,
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { id } = await params;
    const body = await request.json();

    const ownershipResult = await requireProjectOwnership(
      authResult.session.user.id,
      id,
    );
    if (ownershipResult.error) return ownershipResult.error;

    const updatedProject = await ProjectsInteractor.update(id, body);
    return apiSuccess({ project: updatedProject });
  } catch (error) {
    console.error(`Error updating project ${(await params).id}:`, error);
    return apiError("Failed to update project");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { id } = params;

    // Check if user is the owner
    const ownershipResult = await requireProjectOwnership(
      authResult.session.user.id,
      id,
    );
    if (ownershipResult.error) return ownershipResult.error;

    await ProjectsInteractor.delete(id);
    return apiSuccess({ success: true });
  } catch (error) {
    console.error(`Error deleting project ${params.id}:`, error);
    return apiError("Failed to delete project");
  }
}
