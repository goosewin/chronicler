# Chronicler

> AI-powered changelog generator for development teams

Chronicler is a modern, team-focused changelog management system that automatically generates user-friendly changelogs from your Git commits. It uses AI to transform technical commit messages into clear, meaningful changelog entries that your users will actually understand.

![Chronicler Screenshot](docs/screenshot.png)

## Features

- 🤖 **AI-Powered Generation**: Automatically convert commit messages into user-friendly changelog entries
- 👥 **Team-Focused**: Manage changelogs across multiple projects and teams
- 🔄 **GitHub Integration**: Seamless sync with your GitHub repositories
- 🎨 **Beautiful Public Pages**: Clean, searchable changelog pages for your users
- 🔒 **Access Control**: Granular permissions for teams and projects
- 📱 **Responsive Design**: Works great on all devices
- 🚀 **Easy Deployment**: Deploy to Vercel with one click

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/yourusername/chronicler.git
cd chronicler
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up your environment variables:

```bash
cp .env.example .env.local
```

4. Set up your database:

```bash
pnpm db:push
```

5. Run the development server:

```bash
pnpm dev
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
- **AI**: Vercel AI SDK + OpenAI
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Deployment**: Vercel

## Development

### Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/             # Utility functions and configs
└── styles/          # Global styles
```

### Commands

```bash
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
pnpm test            # Run tests
pnpm db:push         # Push database changes
pnpm db:studio       # Open Drizzle Studio
```

## Deployment

1. Create a new project on Vercel
2. Connect your repository
3. Set up your environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fchronicler)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details
