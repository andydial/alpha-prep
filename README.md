# Alpha Prep

AI-powered study app for EDSC Alpha entrance exam preparation.

## Setup

1. Clone this repo
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in your credentials:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
   - `VITE_ANTHROPIC_API_KEY` — your Anthropic API key
4. Run the SQL schema from `CLAUDE.md` in your Supabase SQL editor
5. Create 2 users in Supabase Auth (student + parent) with metadata `{"role": "student"}` / `{"role": "parent"}`
6. `npm run dev`

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Add the 3 env vars in Netlify → Site settings → Environment variables
4. Deploy

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth)
- Anthropic API (Claude Sonnet)
- Recharts
