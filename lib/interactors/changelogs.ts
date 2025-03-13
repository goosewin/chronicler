import db from "@/lib/db/client";
import { changelog, collaborator, project } from "@/lib/db/schema";
import { Changelog, ChangelogWithProject, NewChangelog } from "@/lib/db/types";
import { and, desc, eq, or } from "drizzle-orm";

export const ChangelogsInteractor = {
  async create(data: NewChangelog): Promise<Changelog> {
    const safeData = {
      ...data,
      releaseDate:
        typeof data.releaseDate === "string"
          ? new Date(data.releaseDate)
          : data.releaseDate instanceof Date
            ? data.releaseDate
            : new Date(),
    };

    const [result] = await db.insert(changelog).values(safeData).returning();
    return result;
  },
  async getById(id: string): Promise<Changelog | undefined> {
    const [result] = await db
      .select()
      .from(changelog)
      .where(eq(changelog.id, id));
    return result;
  },
  async getWithProject(id: string): Promise<ChangelogWithProject | undefined> {
    const [changelogResult] = await db
      .select()
      .from(changelog)
      .where(eq(changelog.id, id));

    if (!changelogResult) return undefined;

    const [projectResult] = await db
      .select()
      .from(project)
      .where(eq(project.id, changelogResult.projectId));

    return {
      ...changelogResult,
      project: projectResult,
    };
  },
  async getByProjectId(projectId: string): Promise<Changelog[]> {
    return db
      .select()
      .from(changelog)
      .where(eq(changelog.projectId, projectId))
      .orderBy(desc(changelog.releaseDate));
  },
  async update(
    id: string,
    data: Partial<Changelog>,
  ): Promise<Changelog | undefined> {
    const [result] = await db
      .update(changelog)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(changelog.id, id))
      .returning();

    return result;
  },
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(changelog).where(eq(changelog.id, id));

    return result.rowCount > 0;
  },
  async getRecent(limit = 10): Promise<ChangelogWithProject[]> {
    const changelogs = await db
      .select()
      .from(changelog)
      .orderBy(desc(changelog.releaseDate))
      .limit(limit);

    const projectIds = [...new Set(changelogs.map((c) => c.projectId))];

    if (projectIds.length === 0) return [];

    const whereCondition =
      projectIds.length === 1
        ? eq(project.id, projectIds[0])
        : or(...projectIds.map((id) => eq(project.id, id)));

    const projects = await db.select().from(project).where(whereCondition);

    const projectMap = new Map(projects.map((p) => [p.id, p]));

    return changelogs.map((c) => ({
      ...c,
      project: projectMap.get(c.projectId),
    }));
  },
  async userHasAccessToProject(
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const [projectResult] = await db
      .select()
      .from(project)
      .where(and(eq(project.id, projectId), eq(project.userId, userId)));

    if (projectResult) return true;

    const [collaboratorResult] = await db
      .select()
      .from(collaborator)
      .where(
        and(
          eq(collaborator.projectId, projectId),
          eq(collaborator.userId, userId),
        ),
      );

    return !!collaboratorResult;
  },
};
