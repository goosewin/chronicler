import {
  account,
  changelog,
  collaborator,
  project,
  session,
  user,
  verification,
} from "./schema";

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type Project = typeof project.$inferSelect;
export type Changelog = typeof changelog.$inferSelect;
export type Collaborator = typeof collaborator.$inferSelect;

export type NewUser = typeof user.$inferInsert;
export type NewSession = typeof session.$inferInsert;
export type NewAccount = typeof account.$inferInsert;
export type NewVerification = typeof verification.$inferInsert;
export type NewProject = typeof project.$inferInsert;
export type NewChangelog = typeof changelog.$inferInsert;
export type NewCollaborator = typeof collaborator.$inferInsert;

export interface ProjectWithChangelogs extends Project {
  changelogs?: Changelog[];
  collaborators?: Collaborator[];
  owner?: User;
}

export type ChangelogWithProject = Changelog & {
  project?: {
    id: string;
    name: string;
    repositoryUrl: string | null;
    isPublic: boolean;
  } | null;
};

export interface UserWithProjects extends User {
  projects?: Project[];
  collaboratedProjects?: Project[];
}
