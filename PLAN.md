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
- Next MDX for markdown with rich text formatting

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

## Deployment

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
