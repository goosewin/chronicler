export enum ProjectProvider {
  GitHub = "github",
  GitLab = "gitlab",
  Bitbucket = "bitbucket",
  Custom = "custom",
}

export enum CollaboratorRole {
  Owner = "owner",
  Admin = "admin",
  Editor = "editor",
  Viewer = "viewer",
}

export const LIMITS = {
  CHANGELOGS_PER_PAGE: 20,
  PROJECTS_PER_PAGE: 10,
  HOMEPAGE_CHANGELOGS: 5,
};
