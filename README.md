# CarStudioAI

Modern AI-assisted vehicle photo studio with queue processing, 360° capture, and persistent projects. Built with React + Vite + Tailwind, powered by Gemini and Supabase (hybrid IndexedDB fallback).

## Features

- Photo queue with progress and retry
- 360° capture workflow with vehicle presets
- AI retouching and background compositing
- Projects view with history and restore
- Supabase-backed persistence with IndexedDB fallback
- Optional dealership background per project

## Getting started

Prerequisites:
- Node.js 20+
- Supabase project (free tier works)

Install dependencies:

```bash
npm install
```

Environment variables (create `.env.local`):

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Dev server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

## Supabase setup

1) Apply database schema in `db/schema.sql` (projects, images) and `db/auth.sql` (profiles, dealerships, RLS).
2) In Authentication → Providers, enable Email (magic link or email+password).
3) Environment variables above must be set in Vercel for Production/Preview.

## Auth and roles

- The first account to sign up becomes admin automatically.
- Admins can manage dealerships and assign users.
- Regular users see and manage only their own projects.

## Scripts

- `npm run dev` — run locally
- `npm run build` — build for production
- `npm run lint` — lint sources
- `npm run format` — format with Prettier

## Contributing

- Open PRs against `main`. CI runs build checks.
- Use Prettier and ESLint configs in repo.

## License

MIT (see `LICENSE`)