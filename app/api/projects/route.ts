import { getAuthSession, requireAuth } from "@/lib/auth/utils";
import { LIMITS } from "@/lib/db/constants";
import { ProjectsInteractor } from "@/lib/interactors";
import { apiError, apiSuccess, extractRepoInfo } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = LIMITS.PROJECTS_PER_PAGE;
    const offset = (page - 1) * limit;

    if (!session?.user) {
      const projects = await ProjectsInteractor.getPublic(limit, offset);
      return apiSuccess({ projects });
    }

    const [ownedProjects, collaboratedProjects] = await Promise.all([
      ProjectsInteractor.getByUserId(session.user.id),
      ProjectsInteractor.getCollaborations(session.user.id),
    ]);

    return apiSuccess({
      projects: {
        owned: ownedProjects,
        collaborated: collaboratedProjects,
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return apiError("Failed to fetch projects");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { session } = authResult;
    const body = await request.json();

    const { repositoryUrl } = body;
    const repoInfo = extractRepoInfo(repositoryUrl);

    const projectData = {
      ...body,
      ...repoInfo,
      userId: session.user.id,
    };

    const project = await ProjectsInteractor.create(projectData);
    return apiSuccess({ project }, 201);
  } catch (error) {
    console.error("Error creating project:", error);
    return apiError("Failed to create project");
  }
}
