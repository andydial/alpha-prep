# Alpha Prep

AI-powered study app for EDSC Alpha entrance exam preparation.

The Alpha entry test at East Doncaster Secondary College is an **EduTest** paper:
Verbal Reasoning, Numerical Reasoning, Reading Comprehension and Mathematics
(30 minutes each, all multiple choice, about 60 seconds per question) plus a
15-minute Written Expression task. Every question the app generates is shaped to
that paper — see `src/lib/examSpec.ts`.

## Setup

1. Clone this repo
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in your credentials:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
   - `VITE_ANTHROPIC_API_KEY` — your Anthropic API key
4. Run the SQL schema from `CLAUDE.md` in your Supabase SQL editor, then the
   migrations in `db/` — `parent_read_policies.sql`, `seed_player_cards.sql`,
   `migrate_squad.sql` and `migrate_edutest_alignment.sql`
5. Create 2 users in Supabase Auth (student + parent) with metadata `{"role": "student"}` / `{"role": "parent"}`
6. `npm run dev`

## Deploy to Netlify

1. Push to GitHub
2. Connect repo in Netlify dashboard
3. Add the 3 env vars in Netlify → Site settings → Environment variables
4. Deploy

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth)
- Anthropic API (Claude Sonnet)
- Recharts
