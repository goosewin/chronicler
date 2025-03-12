import db from "@/lib/db/client";
import { collaborator, user } from "@/lib/db/schema";
import { Collaborator, NewCollaborator, User } from "@/lib/db/types";
import { and, eq } from "drizzle-orm";

export const CollaboratorsInteractor = {
  async add(data: NewCollaborator): Promise<Collaborator> {
    const [result] = await db.insert(collaborator).values(data).returning();
    return result;
  },
  async getByProjectId(
    projectId: string,
  ): Promise<(Collaborator & { user: User })[]> {
    const collaborators = await db
      .select()
      .from(collaborator)
      .where(eq(collaborator.projectId, projectId));

    if (collaborators.length === 0) {
      return [];
    }

    const userIds = collaborators.map((c) => c.userId);
    const users = await db
      .select()
      .from(user)
      .where(
        userIds.map((id) => eq(user.id, id)).reduce((acc, curr) => acc || curr),
      );

    const userMap = new Map(users.map((u) => [u.id, u]));

    return collaborators.map((c) => ({
      ...c,
      user: userMap.get(c.userId)!,
    }));
  },
  async isCollaborator(userId: string, projectId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: collaborator.id })
      .from(collaborator)
      .where(
        and(
          eq(collaborator.userId, userId),
          eq(collaborator.projectId, projectId),
        ),
      );

    return !!result;
  },
  async getRole(userId: string, projectId: string): Promise<string | null> {
    const [result] = await db
      .select({ role: collaborator.role })
      .from(collaborator)
      .where(
        and(
          eq(collaborator.userId, userId),
          eq(collaborator.projectId, projectId),
        ),
      );

    return result ? result.role : null;
  },
  async updateRole(
    userId: string,
    projectId: string,
    role: string,
  ): Promise<Collaborator | undefined> {
    const [result] = await db
      .update(collaborator)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(collaborator.userId, userId),
          eq(collaborator.projectId, projectId),
        ),
      )
      .returning();

    return result;
  },
  async remove(userId: string, projectId: string): Promise<boolean> {
    const result = await db
      .delete(collaborator)
      .where(
        and(
          eq(collaborator.userId, userId),
          eq(collaborator.projectId, projectId),
        ),
      );

    return result.rowCount > 0;
  },
};
