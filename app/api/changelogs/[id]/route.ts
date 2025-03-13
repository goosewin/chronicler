import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/auth/utils";
import { ChangelogsInteractor, ProjectsInteractor } from "@/lib/interactors";
import { apiError, apiSuccess } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const changelog = await ChangelogsInteractor.getById(id);

    if (!changelog) {
      return NextResponse.json(
        { error: "Changelog not found" },
        { status: 404 },
      );
    }

    // Check project access permissions
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // If user is not signed in, check if project is public
    if (!session?.user) {
      const project = await ProjectsInteractor.getById(changelog.projectId);

      if (!project?.isPublic) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      // If user is signed in, check if they have access to the project
      const project = await ProjectsInteractor.getById(changelog.projectId);

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }

      const isOwner = project.userId === session.user.id;
      const isCollaborator = false; // Implement collaborator check if needed

      if (!isOwner && !isCollaborator && !project.isPublic) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.json({ changelog });
  } catch (error) {
    console.error(`Error fetching changelog ${(await params).id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch changelog" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { session } = authResult;
    const { id } = await params;
    const body = await request.json();

    // Check if the changelog exists
    const changelog = await ChangelogsInteractor.getById(id);
    if (!changelog) {
      return apiError("Changelog not found", 404);
    }

    // Check if the user has access to the project
    const hasAccess = await ChangelogsInteractor.userHasAccessToProject(
      session.user.id,
      changelog.projectId,
    );

    if (!hasAccess) {
      return apiError("Unauthorized", 401);
    }

    const releaseDate = body.releaseDate
      ? new Date(body.releaseDate)
      : new Date();

    if (isNaN(releaseDate.getTime())) {
      return apiError("Invalid release date", 400);
    }

    // Extract generation metadata if present
    const existingMetadata = changelog.metadata || {};
    let updatedMetadata = { ...existingMetadata };

    if (body.generationMetadata) {
      updatedMetadata = {
        ...existingMetadata,
        generation: {
          source: body.generationMetadata.source,
          startRef: body.generationMetadata.startRef,
          endRef: body.generationMetadata.endRef,
          commitHash: body.generationMetadata.commitHash,
          prNumber: body.generationMetadata.prNumber,
          startPRNumber: body.generationMetadata.startPRNumber,
          endPRNumber: body.generationMetadata.endPRNumber,
          releaseTag: body.generationMetadata.releaseTag,
          startReleaseTag: body.generationMetadata.startReleaseTag,
          endReleaseTag: body.generationMetadata.endReleaseTag,
          generatedAt:
            body.generationMetadata.generatedAt || new Date().toISOString(),
        },
      };
    }

    const updatedChangelog = await ChangelogsInteractor.update(id, {
      version: body.version,
      releaseDate,
      content: body.content,
      isPublished: true,
      metadata: updatedMetadata,
    });

    return apiSuccess({ changelog: updatedChangelog });
  } catch (error) {
    console.error("Error updating changelog:", error);
    return apiError("Failed to update changelog");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const changelog = await ChangelogsInteractor.getById(id);

    if (!changelog) {
      return NextResponse.json(
        { error: "Changelog not found" },
        { status: 404 },
      );
    }

    const project = await ProjectsInteractor.getById(changelog.projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = project.userId === session.user.id;

    if (!isOwner) {
      // TODO: Check if user is a collaborator with delete rights
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ChangelogsInteractor.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting changelog ${(await params).id}:`, error);

    return NextResponse.json(
      { error: "Failed to delete changelog" },
      { status: 500 },
    );
  }
}
