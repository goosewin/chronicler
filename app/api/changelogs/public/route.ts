import { ChangelogsInteractor } from "@/lib/interactors";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET() {
  try {
    const changelogs = await ChangelogsInteractor.getPublic();
    return apiSuccess({ changelogs });
  } catch (error) {
    console.error("Error fetching public changelogs:", error);
    return apiError("Failed to fetch changelogs");
  }
}
