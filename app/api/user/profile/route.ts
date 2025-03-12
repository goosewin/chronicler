import { auth } from "@/lib/auth";
import db from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { apiError, apiSuccess } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const [userData] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id));

    if (!userData) {
      return apiError("User not found", 404);
    }

    return apiSuccess({ user: userData });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return apiError("Failed to fetch user profile");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { name, email } = body;

    if (!name && !email) {
      return apiError("No data provided for update", 400);
    }

    const updateData: { name?: string; email?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const [updatedUser] = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, session.user.id))
      .returning();

    if (!updatedUser) {
      return apiError("Failed to update user", 500);
    }

    return apiSuccess({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return apiError("Failed to update user profile");
  }
}
