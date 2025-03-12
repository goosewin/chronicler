import {
  checkProjectAccess,
  getAuthSession,
  requireAuth,
} from "@/lib/auth/utils";
import { LIMITS } from "@/lib/db/constants";
import { ChangelogsInteractor } from "@/lib/interactors";
import { apiError, apiSuccess } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = LIMITS.CHANGELOGS_PER_PAGE;
    const offset = (page - 1) * limit;

    if (!projectId) {
      return apiError("Project ID is required", 400);
    }

    const session = await getAuthSession(request);
    const userId = session?.user?.id;

    const accessResult = userId
      ? await checkProjectAccess(userId, projectId)
      : { project: null, error: apiError("Unauthorized", 401) };

    if (accessResult.error && !userId) {
      const { project } = await checkProjectAccess("anonymous", projectId);

      if (!project?.isPublic) {
        return accessResult.error;
      }
    } else if (accessResult.error) {
      return accessResult.error;
    }

    const includeUnpublished = userId != null;

    const changelogs = await ChangelogsInteractor.getByProjectId(
      projectId,
      includeUnpublished,
    );

    const paginatedChangelogs = changelogs.slice(offset, offset + limit);

    return apiSuccess({
      changelogs: paginatedChangelogs,
      pagination: {
        total: changelogs.length,
        page,
        limit,
        pages: Math.ceil(changelogs.length / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching changelogs:", error);
    return apiError("Failed to fetch changelogs");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { session } = authResult;
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return apiError("Project ID is required", 400);
    }

    const releaseDate = body.releaseDate
      ? new Date(body.releaseDate)
      : new Date();

    if (isNaN(releaseDate.getTime())) {
      return apiError("Invalid release date", 400);
    }

    const hasAccess = await ChangelogsInteractor.userHasAccessToProject(
      session.user.id,
      projectId,
    );

    if (!hasAccess) {
      return apiError("Unauthorized", 401);
    }

    const changelogData = {
      version: body.version,
      releaseDate,
      content: body.content,
      commitHash: body.commitHash || null,
      isPublished: body.isPublished === false ? false : true,
      projectId: body.projectId,
    };

    const changelog = await ChangelogsInteractor.create(changelogData);
    return apiSuccess({ changelog }, 201);
  } catch (error) {
    console.error("Error creating changelog:", error);
    return apiError("Failed to create changelog");
  }
}
