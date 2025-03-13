import { requireAuth } from "@/lib/auth/utils";
import { ChangelogsInteractor } from "@/lib/interactors";
import { apiError, apiSuccess } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) return authResult.error;

    const { session } = authResult;

    // Get all changelogs for projects the user has access to
    const changelogs = await ChangelogsInteractor.getAllForUser(
      session.user.id,
    );

    return apiSuccess({ changelogs });
  } catch (error) {
    console.error("Error fetching changelogs:", error);
    return apiError("Failed to fetch changelogs");
  }
}
