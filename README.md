# Chronicler

> AI-powered changelog generator

Chronicler is a modern changelog management system that helps automate the creation of user-friendly changelogs from your Git commits. It uses AI to transform technical commit messages into clear, meaningful changelog entries that your users will actually understand.

## Features

- 🤖 **AI-Powered Generation**: Automatically convert commit messages into user-friendly changelog entries
- 🔄 **GitHub Integration**: Seamless sync with your GitHub repositories
- 🎨 **Beautiful Public Pages**: Clean, searchable changelog pages for your users
- 📱 **Responsive Design**: Works great on all devices
- 🚀 **Easy Deployment**: Deploy to Vercel with one click

## AI-Powered Workflows

Chronicler leverages [Mastra](https://github.com/mastralib/mastra), a powerful framework for building AI-driven workflows:

- **Intelligent Agents** - Custom AI agents analyze commits and generate human-readable changelog entries
- **Automated Processing** - Extract meaningful changes from technical commit messages
- **Context-Aware Generation** - Group related changes and maintain semantic consistency
- **Custom Tools** - Purpose-built tools help agents understand your codebase and repository structure
- **Workflow Orchestration** - Multi-step AI workflows ensure quality and consistency

The AI system uses a combination of LLM-powered agents and tailored workflows to transform cryptic commit messages like `fix(auth): resolve JWT validation edge case #142` into user-friendly descriptions like "Fixed an issue where some users might experience login problems in rare circumstances."

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/chronicler.git
cd chronicler
```

2. Install dependencies:

```bash
bun install
```

3. Set up your environment variables:

```bash
cp .env.example .env.local
```

4. Set up your database:

```bash
bun db:push
```

5. Run the development server:

```bash
bun dev
```

Visit `http://localhost:3000` to see your app.

## Environment Variables

```env
DATABASE_URL=           # Your Neon DB URL
GITHUB_CLIENT_ID=      # GitHub OAuth App Client ID
GITHUB_CLIENT_SECRET=  # GitHub OAuth App Secret
OPENAI_API_KEY=        # OpenAI API Key
BETTERAUTH_SECRET=     # BetterAuth Secret Key
ADMIN_EMAIL=           # Initial admin user email
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon (Postgres) + Drizzle ORM
- **Auth**: BetterAuth
- **AI**: Vercel AI SDK + OpenAI + Mastra for workflow orchestration
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Deployment**: Vercel

## Development

### Project Structure

```
app/              # Next.js app router pages
components/       # React components
lib/              # Utility functions and configs
public/           # Static assets
```

### Commands

```bash
bun dev             # Start development server
bun run build       # Build for production
bun start           # Start production server
bun lint            # Run ESLint
bun format          # Run Prettier
bun db:push         # Push database changes
bun db:studio       # Open Drizzle Studio
```

## Deployment

1. Create a new project on Vercel
2. Connect your repository
3. Set up your environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgoosewin%2Fchronicler)
