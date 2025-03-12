import db from "@/lib/db/client";
import { changelog, collaborator, project, user } from "@/lib/db/schema";
import { NewProject, Project, ProjectWithChangelogs } from "@/lib/db/types";
import { desc, eq } from "drizzle-orm";

export const ProjectsInteractor = {
  async create(data: NewProject): Promise<Project> {
    const [result] = await db.insert(project).values(data).returning();
    return result;
  },
  async getById(id: string): Promise<Project | undefined> {
    const [result] = await db.select().from(project).where(eq(project.id, id));
    return result;
  },
  async getWithDetails(id: string): Promise<ProjectWithChangelogs | undefined> {
    const [projectResult] = await db
      .select()
      .from(project)
      .where(eq(project.id, id));

    if (!projectResult) return undefined;

    const changelogs = await db
      .select()
      .from(changelog)
      .where(eq(changelog.projectId, id))
      .orderBy(desc(changelog.releaseDate));

    const owner = await db
      .select()
      .from(user)
      .where(eq(user.id, projectResult.userId))
      .then((results) => results[0]);

    const collaborators = await db
      .select()
      .from(collaborator)
      .where(eq(collaborator.projectId, id));

    return {
      ...projectResult,
      changelogs,
      owner,
      collaborators,
    };
  },
  async getByUserId(userId: string): Promise<Project[]> {
    return db
      .select()
      .from(project)
      .where(eq(project.userId, userId))
      .orderBy(desc(project.updatedAt));
  },
  async getCollaborations(userId: string): Promise<Project[]> {
    const collabs = await db
      .select({
        projectId: collaborator.projectId,
      })
      .from(collaborator)
      .where(eq(collaborator.userId, userId));

    if (collabs.length === 0) return [];

    const projectIds = collabs.map((c) => c.projectId);

    return db
      .select()
      .from(project)
      .where(
        projectIds
          .map((id) => eq(project.id, id))
          .reduce((acc, curr) => acc || curr),
      );
  },
  async update(
    id: string,
    data: Partial<Project>,
  ): Promise<Project | undefined> {
    const [result] = await db
      .update(project)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(project.id, id))
      .returning();

    return result;
  },
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(project).where(eq(project.id, id));

    return result.rowCount > 0;
  },
  async getPublic(limit = 10, offset = 0): Promise<Project[]> {
    return db
      .select()
      .from(project)
      .where(eq(project.isPublic, true))
      .orderBy(desc(project.updatedAt))
      .limit(limit)
      .offset(offset);
  },
};
