# Chronicler Implementation Plan

## Tech Stack

- Next.js 15 (App Router)
- Neon DB (Serverless Postgres)
- Drizzle ORM
- Vercel AI SDK for LLM integration
- Tailwind CSS 4
- shadcn/ui components
- BetterAuth for authentication
- Vercel for deployment

## Database Schema

```typescript
// schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: text("created_by").notNull(), // admin user id
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["admin", "member"] })
    .notNull()
    .default("member"),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id),
  name: text("name").notNull(),
  githubRepo: text("github_repo").notNull(),
  githubToken: text("github_token"), // optional PAT for private repos
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  createdBy: text("created_by").notNull(), // user id
});

export const changelogs = pgTable("changelogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  version: text("version"),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow(),
  content: jsonb("content")
    .$type<{
      features: string[];
      fixes: string[];
      breaking: string[];
      other: string[];
    }>()
    .notNull(),
  rawCommits: text("raw_commits").array(),
  isPublished: boolean("is_published").default(false),
});
```

## App Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── callback/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx # Team projects overview
│   │   ├── admin/
│   │   │   ├── page.tsx # Admin dashboard
│   │   │   ├── teams/
│   │   │   └── projects/
│   │   ├── [teamSlug]/
│   │   │   ├── page.tsx # Team dashboard
│   │   │   ├── settings/
│   │   │   └── projects/
│   │   │       └── [projectId]/
│   │   │           ├── page.tsx # Project dashboard
│   │   │           ├── settings/
│   │   │           └── changelog/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── teams/
│   │   ├── projects/
│   │   ├── changelogs/
│   │   └── github/
│   └── changelog/ # Public changelog pages
│       ├── [teamSlug]/
│       │   └── [projectId]/
│       │       └── page.tsx
├── components/
│   ├── ui/ # shadcn components
│   ├── layout/
│   │   ├── navbar.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   ├── teams/
│   ├── projects/
│   ├── changelog-viewer/
│   └── changelog-editor/
├── lib/
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── auth.ts # BetterAuth config
│   ├── ai.ts
│   └── github.ts
└── styles/
    └── globals.css
```

## Core Features

### Admin Portal

1. Team Management

   - Create/manage teams
   - Invite team members
   - Set team permissions

2. Project Management
   - Add GitHub repositories
   - Configure access tokens
   - Set public/private visibility
   - Configure changelog preferences

### Team Dashboard

1. Project Overview

   - List all team projects
   - Project status and recent changes
   - Quick actions

2. Team Settings
   - Member management
   - Access controls
   - Notification preferences

### Developer Portal

1. Project Management

   - Create/manage projects
   - Connect GitHub repositories
   - Set changelog preferences

2. Changelog Generation

   - Fetch commits from GitHub API
   - AI processing pipeline:
     1. Filter relevant commits
     2. Group by feature/type
     3. Generate user-friendly descriptions
     4. Suggest version number
   - Manual editing interface
   - Preview mode

3. Publishing
   - Version management
   - Public/private toggle
   - Custom domains support

### Public Changelog Site

1. Clean, responsive design
2. Search/filter capabilities
3. RSS feed
4. Version comparison
5. Markdown support

## AI Implementation

### Prompt Engineering Strategy

1. Initial commit processing:

   ```typescript
   type CommitProcessor = {
     input: string[]; // Raw commit messages
     output: {
       type: "feature" | "fix" | "breaking" | "other";
       relevance: number; // 0-1 score
       description: string;
     }[];
   };
   ```

2. Changelog summarization:
   - Group by impact level
   - Convert technical details to user-facing language
   - Maintain technical accuracy
   - Include relevant links/references

### GitHub Integration

1. Webhook setup for real-time updates
2. Commit history fetching
3. Branch/PR tracking
4. Release tag integration

## Development Phases

### Phase 1: Foundation (Week 1)

- [ ] Project setup with Next.js 15
- [ ] Drizzle schema and migrations setup
- [ ] BetterAuth integration with team support
- [ ] Core UI components and layouts
- [ ] Admin dashboard basics

### Phase 2: Core Features (Week 2)

- [ ] GitHub integration
- [ ] AI processing pipeline
- [ ] Basic changelog generation
- [ ] Developer dashboard

### Phase 3: Polish (Week 3)

- [ ] Public changelog site
- [ ] Advanced features (search, RSS)
- [ ] Testing & optimization
- [ ] Documentation

## Deployment Strategy

1. Neon DB setup
2. Drizzle migrations deployment
3. Vercel project configuration
4. Environment variables:
   ```env
   DATABASE_URL=
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   OPENAI_API_KEY=
   BETTERAUTH_SECRET=
   ADMIN_EMAIL= # Initial admin user
   ```

## Future Enhancements

- Team activity analytics
- Audit logs
- Custom domains per team
- Slack/Discord integration
- Multiple AI model support
- Custom AI training
- Automated release notes
- Analytics dashboard
- Changelog templates
- Multi-language support
