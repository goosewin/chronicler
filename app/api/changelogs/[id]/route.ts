import { auth } from "@/lib/auth";
import { Changelog } from "@/lib/db/types";
import { ChangelogsInteractor, ProjectsInteractor } from "@/lib/interactors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  params: Promise<{ id: string }>,
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

    if (!changelog.isPublished) {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const project = await ProjectsInteractor.getById(changelog.projectId);

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }

      const isOwner = project.userId === session.user.id;
      const isCollaborator = false;

      if (!isOwner && !isCollaborator) {
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
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

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
      // TODO: Check if user is a collaborator with edit rights
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let updateData: Partial<Changelog> = { ...body };

    if (typeof body.releaseDate === 'string') {
      updateData.releaseDate = new Date(body.releaseDate);
    }

    if ('description' in updateData) {
      delete updateData.description;
    }

    const updatedChangelog = await ChangelogsInteractor.update(id, updateData);
    return NextResponse.json({ changelog: updatedChangelog });
  } catch (error) {
    console.error(`Error updating changelog ${params.id}:`, error);

    return NextResponse.json(
      { error: "Failed to update changelog" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  params: Promise<{ id: string }>,
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
