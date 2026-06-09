# CLAUDE.md — Alpha Prep AI Study App

## Project Mission
Build a personalised AI study platform to prepare a Year 6 student for the EDSC Alpha (accelerated learning) entrance exam in approximately 8 weeks. The app must generate unlimited Victorian curriculum questions, adapt to the student's weaknesses, track progress with full persistence, and make the entrance exam feel easy through deliberate over-preparation.

**Primary user:** Aarav, Year 6, high achiever — near top of his class. Dad (Andy) is the admin/supervisor.
**Exam:** EDSC Alpha entrance test, Victoria, Australia. ~8 weeks away.
**Stack:** React + Vite → Netlify (free), Supabase (free tier Postgres + Auth), Anthropic API (Claude Sonnet).

### Student Profile: Aarav
- High achiever — consistently near the top of Year 6
- Must always be challenged — never coasting on easy questions
- Tone must be encouraging and positive at all times — frame difficulty as exciting, not threatening
- Starting difficulty floor is 6/10 (above standard Year 6) — never drop below 5/10
- Difficulty ceiling is 10/10 (Year 8-9 level) — push there as mastery grows
- The goal: make him feel like a champion who keeps levelling up, not a student grinding homework

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend | React 18 + Vite | TypeScript preferred |
| Styling | Tailwind CSS v3 | Mobile-friendly, clean |
| Database | Supabase (Postgres) | Free tier, 500MB |
| Auth | Supabase Auth | Email/password, 2 users: student + parent |
| AI | Anthropic API `claude-sonnet-4-20250514` | Question generation + explanations |
| Hosting | Netlify | Deploy from GitHub, auto CI/CD |
| Charts | Recharts | Progress visualisation |

---

## Project Structure

```
alpha-prep/
├── CLAUDE.md                  ← this file
├── .env.local                 ← secrets (never commit)
├── .env.example               ← template (commit this)
├── .gitignore
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx                ← routing
│   ├── lib/
│   │   ├── supabase.ts        ← Supabase client
│   │   ├── anthropic.ts       ← AI call wrapper
│   │   └── curriculum.ts      ← topic definitions + weights
│   ├── hooks/
│   │   ├── useSession.ts      ← current study session state
│   │   ├── useProgress.ts     ← fetch mastery scores
│   │   └── useWeeklyPlan.ts   ← fetch/generate weekly focus
│   ├── pages/
│   │   ├── Dashboard.tsx      ← daily focus + week overview
│   │   ├── Study.tsx          ← question-answer loop
│   │   ├── Results.tsx        ← end-of-session summary
│   │   ├── Progress.tsx       ← charts + topic breakdown
│   │   └── ParentReport.tsx   ← parent-only detailed report
│   ├── components/
│   │   ├── QuestionCard.tsx
│   │   ├── AnswerInput.tsx
│   │   ├── ExplanationPanel.tsx
│   │   ├── TopicMasteryBar.tsx
│   │   ├── WeeklyThemeCard.tsx
│   │   ├── FocusTodayCard.tsx
│   │   ├── ProgressChart.tsx
│   │   ├── CountdownBanner.tsx
│   │   ├── XPBar.tsx              ← animated XP progress bar
│   │   ├── LevelBadge.tsx         ← level number + title display
│   │   ├── StreakCounter.tsx       ← fire icon + day count
│   │   ├── BadgeCard.tsx          ← badge display + earn animation
│   │   ├── XPFlash.tsx            ← "+70 XP" animation on correct answer
│   │   └── SessionResults.tsx     ← post-session summary with XP + badges
│   └── types/
│       └── index.ts
```

---

## Environment Variables

```bash
# .env.local (never commit)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key

# .env.example (commit this — no real values)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ANTHROPIC_API_KEY=
```

**Security note:** The Anthropic API key is called from the frontend via Vite. For a private single-family app this is acceptable. If this ever becomes public, move AI calls to a Netlify serverless function.

---

## Settings Table

Key-value store in `public.settings`. Parent role can write, student role can read.

Current keys:
- `exam_date`: ISO date string (e.g. `'2026-09-05'`) — drives all countdowns and weekly plan pacing
- `default_session_questions`: integer as string (e.g. `'40'`) — default questions per session

Hook: `src/hooks/useSettings.ts` — returns `{ settings: Record<string, string>, loading: boolean }`

---

## Supabase Database Schema

Run these SQL statements in the Supabase SQL editor (Dashboard → SQL Editor → New Query):

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('student', 'parent')),
  display_name text,
  created_at timestamptz default now()
);

-- Curriculum topics master list
create table public.topics (
  id text primary key,            -- e.g. 'maths_fractions'
  domain text not null,           -- 'maths' | 'reading' | 'verbal' | 'abstract' | 'writing'
  name text not null,             -- 'Fractions & Decimals'
  year_level int default 6,
  difficulty_base int default 5,  -- 1-10 base difficulty
  active boolean default true
);

-- Study sessions
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  session_type text default 'practice', -- 'practice' | 'timed_test' | 'drill'
  total_questions int default 0,
  correct_count int default 0,
  duration_seconds int,
  week_number int,                -- week 1-8 of exam prep
  notes text                      -- AI-generated session summary
);

-- Individual question attempts
create table public.attempts (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions on delete cascade,
  student_id uuid references auth.users not null,
  topic_id text references public.topics,
  attempted_at timestamptz default now(),
  question_text text not null,
  question_type text,             -- 'multiple_choice' | 'short_answer' | 'numeric'
  options jsonb,                  -- MC options array if applicable
  correct_answer text not null,
  student_answer text,
  is_correct boolean,
  difficulty int,                 -- 1-10, what was set for this Q
  time_seconds int,               -- how long they took
  ai_explanation text,            -- Claude's explanation shown after
  hint_used boolean default false
);

-- Topic mastery (rolling score per topic)
create table public.mastery (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users not null,
  topic_id text references public.topics not null,
  last_updated timestamptz default now(),
  attempts_total int default 0,
  attempts_correct int default 0,
  score_7day float default 0,     -- % correct last 7 days
  score_alltime float default 0,  -- % correct all time
  current_difficulty int default 5, -- adaptive difficulty level
  unique(student_id, topic_id)
);

-- Weekly plan (AI-generated each Monday)
create table public.weekly_plans (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users not null,
  week_number int not null,
  week_start date not null,
  primary_topic_id text references public.topics,
  secondary_topic_id text references public.topics,
  theme_description text,         -- e.g. "Fractions mastery + Verbal analogies"
  daily_goal_questions int default 15,
  ai_rationale text,              -- why these topics were chosen
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.mastery enable row level security;
alter table public.weekly_plans enable row level security;

-- Policies: student sees own data, parent sees all
create policy "own data" on public.sessions for all using (auth.uid() = student_id);
create policy "own data" on public.attempts for all using (auth.uid() = student_id);
create policy "own data" on public.mastery for all using (auth.uid() = student_id);
create policy "own data" on public.weekly_plans for all using (auth.uid() = student_id);
create policy "own profile" on public.profiles for all using (auth.uid() = id);
```

### Seed Topics Data

```sql
insert into public.topics (id, domain, name, difficulty_base) values
-- Mathematics
('maths_fractions', 'maths', 'Fractions & Decimals', 6),
('maths_percentages', 'maths', 'Percentages & Ratios', 6),
('maths_algebra', 'maths', 'Algebra & Patterns', 7),
('maths_geometry', 'maths', 'Geometry & Measurement', 5),
('maths_data', 'maths', 'Data & Probability', 5),
('maths_word_problems', 'maths', 'Word Problems & Logic', 7),
('maths_number_sense', 'maths', 'Number Sense & Operations', 5),
('maths_time_money', 'maths', 'Time, Money & Units', 4),
-- Reading & Comprehension
('reading_inference', 'reading', 'Inference & Deduction', 7),
('reading_main_idea', 'reading', 'Main Idea & Summary', 5),
('reading_vocabulary', 'reading', 'Vocabulary in Context', 6),
('reading_author_intent', 'reading', 'Author Purpose & Tone', 7),
('reading_text_structure', 'reading', 'Text Structure & Features', 5),
-- Verbal Reasoning
('verbal_analogies', 'verbal', 'Word Analogies', 7),
('verbal_antonyms', 'verbal', 'Antonyms & Synonyms', 5),
('verbal_odd_one_out', 'verbal', 'Odd One Out', 5),
('verbal_word_relationships', 'verbal', 'Word Relationships', 6),
('verbal_sentence_completion', 'verbal', 'Sentence Completion', 6),
-- Abstract / Non-Verbal Reasoning
('abstract_sequences', 'abstract', 'Number & Letter Sequences', 7),
('abstract_pattern_matrix', 'abstract', 'Pattern Matrix', 8),
('abstract_spatial', 'abstract', 'Spatial Reasoning', 7),
('abstract_odd_shape', 'abstract', 'Odd Shape Out', 6),
-- Written Expression
('writing_planning', 'writing', 'Planning & Structure', 5),
('writing_persuasive', 'writing', 'Persuasive Writing', 6),
('writing_narrative', 'writing', 'Narrative Writing', 5);
```

### Helper Functions

- `public.is_parent_user()` — SECURITY DEFINER function, used in all parent RLS policies to avoid recursive profile lookups.

---

## Victorian Curriculum Alignment

The AI must generate questions that:
- Align with **Victorian Curriculum F-10 Version 2.0**
- Target **Year 5–7 range** (above grade level = competitive advantage)
- Match **ACER-style selective entry** question formats (used by EDSC Alpha and similar programs)
- Cover the 4 main domains tested: Maths Reasoning, Reading Comprehension, Verbal Reasoning, Abstract Reasoning

### 8-Week Difficulty Ramp

| Week | Difficulty | Focus |
|---|---|---|
| 1 | 4-5/10 | Baseline assessment across all domains |
| 2 | 5/10 | Identify and begin drilling weak areas |
| 3 | 5-6/10 | Consolidate weak areas, maintain strengths |
| 4 | 6/10 | Cross-domain mixed sessions |
| 5 | 6-7/10 | Exam-format timed practice begins |
| 6 | 7/10 | High-difficulty targeted drilling |
| 7 | 7-8/10 | Full mock tests, pressure simulation |
| 8 | 8/10 | Final review, confidence consolidation |

---

## AI Question Generation

### System Prompt Template (`src/lib/anthropic.ts`)

```typescript
const SYSTEM_PROMPT = `You are an expert Australian tutor preparing Aarav, a high-achieving Year 6 student, for the EDSC Alpha (accelerated learning) entrance exam in Victoria. Aarav is near the top of his class and thrives on challenge — he should always feel stretched, never bored.

STUDENT PROFILE:
- Name: Aarav
- Year 6, high achiever, competitive mindset
- Responds well to challenge and genuine encouragement
- Should always feel like he is levelling up, not just doing homework

QUESTION RULES:
- Difficulty 1-10 where 5 = standard Year 6, 7 = Year 7-8 challenge, 10 = elite selective entry
- Never generate a question below difficulty 5 for Aarav
- Default starting difficulty is 6 — push upward as performance warrants
- Questions must require genuine reasoning, not just recall
- Multi-step problems preferred for maths
- For maths: show clear working steps in explanations
- For reading: reference the key part of the text in explanations
- For verbal/abstract: explain the rule or pattern that makes the answer correct
- Never repeat a question from the same session
- Australian English spelling throughout (colour, maths, programme, fulfil, etc.)

TONE FOR EXPLANATIONS:
- Always encouraging — frame wrong answers as "great attempt, here's the insight"
- For correct answers: reinforce WHY it's correct, add a pro tip or deeper insight
- Never say "wrong" or "incorrect" — say "not quite" or "close — here's the trick"
- Treat Aarav as a capable, intelligent student who can handle stretch content
- Occasionally acknowledge difficulty: "This is a tough one — well done for attempting it"

OUTPUT FORMAT: Always respond with valid JSON only, no markdown, no preamble.`;

const QUESTION_SCHEMA = `{
  "question": "string — the full question text",
  "type": "multiple_choice | short_answer | numeric",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."] | null,
  "correct_answer": "string — exact answer",
  "difficulty": number 1-10,
  "topic_id": "string — matches topic id",
  "hint": "string — one sentence hint without giving away answer",
  "explanation": "string — clear explanation of why the answer is correct, 2-4 sentences"
}`;
```

### Question Generation Call

```typescript
async function generateQuestion(params: {
  topicId: string;
  topicName: string;
  difficulty: number;
  previousQuestions: string[]; // avoid repeats
  weekNumber: number;
}): Promise<Question> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate ONE question for topic: "${params.topicName}" (id: ${params.topicId}).
Difficulty: ${params.difficulty}/10.
Week ${params.weekNumber} of 8-week exam prep (ramp difficulty accordingly).
Previous questions this session (do not repeat): ${params.previousQuestions.slice(-5).join(' | ')}
Respond with JSON matching this schema: ${QUESTION_SCHEMA}`
      }]
    })
  });
  const data = await response.json();
  return JSON.parse(data.content[0].text);
}
```

### Weekly Plan Generation

```typescript
async function generateWeeklyPlan(params: {
  weekNumber: number;
  masteryScores: { topicId: string; topicName: string; score: number }[];
}): Promise<WeeklyPlan> {
  // Pass mastery data, get back AI-chosen focus topics + rationale
  // AI picks 2 weakest topics with highest exam weighting
  // Returns: primary_topic, secondary_topic, theme_description, daily_goal, ai_rationale
}
```

---

## Adaptive Difficulty Logic

In `src/lib/curriculum.ts`:

```typescript
// Aarav is a high achiever — difficulty floor is 5, default start is 6
const DIFFICULTY_FLOOR = 5;
const DIFFICULTY_CEILING = 10;
const DIFFICULTY_DEFAULT = 6;

function getNextDifficulty(currentDifficulty: number, recentResults: boolean[]): number {
  const last5 = recentResults.slice(-5);
  if (last5.length < 3) return currentDifficulty; // not enough data yet
  const correctRate = last5.filter(Boolean).length / last5.length;

  if (correctRate >= 0.8) return Math.min(DIFFICULTY_CEILING, currentDifficulty + 1); // crushing it — go up
  if (correctRate <= 0.4) return Math.max(DIFFICULTY_FLOOR, currentDifficulty - 1);   // struggling — step back (but never below 5)
  return currentDifficulty; // in the zone (40-80% correct = healthy challenge)
}

// Never initialise a topic below difficulty 6 for Aarav
function getInitialDifficulty(topicDifficultyBase: number): number {
  return Math.max(DIFFICULTY_DEFAULT, topicDifficultyBase);
}

function selectTopicForSession(masteryScores: MasteryScore[], weeklyPlan: WeeklyPlan): string {
  // 50% chance: pick from weekly focus topics (primary or secondary)
  // 30% chance: pick lowest mastery topic overall
  // 20% chance: pick random topic (breadth maintenance, avoid tunnel vision)
}
```

---

## Gamification System

**Philosophy:** Gamification motivates daily engagement and rewards effort — but it must never trivialise the exam content or let Aarav think it's "just a game." The game layer sits *on top* of serious study. Think: how Duolingo keeps you coming back, but the content is still real learning.

### XP & Levels

Every correct answer earns XP. Difficulty multiplies XP earned.

```typescript
function calculateXP(isCorrect: boolean, difficulty: number, hintUsed: boolean): number {
  if (!isCorrect) return 5; // small XP for attempting — never zero
  const base = difficulty * 10;           // difficulty 6 = 60 XP, difficulty 9 = 90 XP
  const hintPenalty = hintUsed ? 0.7 : 1; // hint used = 70% XP
  return Math.round(base * hintPenalty);
}

// Level thresholds — add to profiles table as xp_total int default 0, level int default 1
const LEVELS = [
  { level: 1,  title: 'Learner',      xpRequired: 0 },
  { level: 2,  title: 'Thinker',      xpRequired: 500 },
  { level: 3,  title: 'Challenger',   xpRequired: 1500 },
  { level: 4,  title: 'Scholar',      xpRequired: 3000 },
  { level: 5,  title: 'Achiever',     xpRequired: 5500 },
  { level: 6,  title: 'Expert',       xpRequired: 9000 },
  { level: 7,  title: 'Elite',        xpRequired: 14000 },
  { level: 8,  title: 'Alpha',        xpRequired: 20000 }, // top level = exam ready
];
```

- Show current level + title on dashboard prominently
- XP bar showing progress to next level
- Level-up animation/celebration when threshold crossed
- "Alpha" is the top level — reaching it is a meaningful milestone tied to the exam goal

### Streaks

- **Daily streak** — consecutive days with at least one completed session
- Streak shown on dashboard with fire icon 🔥
- Streak resets at midnight if no session that day
- Milestone rewards at 3, 7, 14, 21, 30 days (display badge, bonus XP)
- Add `streak_current int default 0` and `streak_best int default 0` to profiles table

### Badges / Achievements

Store in a `badges` table. Award automatically when conditions are met.

```sql
create table public.badges (
  id text primary key,
  name text not null,
  description text,
  icon text              -- emoji or lucide icon name
);

create table public.student_badges (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users,
  badge_id text references public.badges,
  earned_at timestamptz default now(),
  unique(student_id, badge_id)
);

insert into public.badges (id, name, description, icon) values
('first_session',     'First Step',        'Complete your first study session',              '🚀'),
('streak_3',          'On a Roll',         '3-day study streak',                             '🔥'),
('streak_7',          'Week Warrior',      '7-day study streak',                             '⚡'),
('streak_14',         'Fortnight Fighter', '14-day study streak',                            '💪'),
('streak_21',         'Unstoppable',       '21-day study streak',                            '🏆'),
('perfect_session',   'Perfect Round',     'Score 100% in a session (min 10 questions)',     '⭐'),
('speed_demon',       'Speed Demon',       'Answer 10 questions correctly under 30s each',  '⚡'),
('maths_master',      'Maths Master',      'Reach 85%+ mastery in any Maths topic',         '🔢'),
('reading_ace',       'Reading Ace',       'Reach 85%+ mastery in any Reading topic',       '📖'),
('verbal_pro',        'Verbal Pro',        'Reach 85%+ mastery in any Verbal topic',        '💬'),
('abstract_genius',   'Abstract Genius',   'Reach 85%+ mastery in any Abstract topic',      '🧩'),
('level_alpha',       'Alpha Ready',       'Reach Level 8: Alpha',                          '🎯'),
('century',           'Century',           'Answer 100 questions total',                    '💯'),
('five_hundred',      '500 Club',          'Answer 500 questions total',                    '🌟'),
('difficulty_9',      'Elite Thinker',     'Answer a difficulty 9 question correctly',      '🧠'),
('difficulty_10',     'Genius Level',      'Answer a difficulty 10 question correctly',     '🔮');
```

### Session End Celebration

After every session, show a results screen with:
- Score (X / Y correct) with animated counter
- XP earned this session (with breakdown: +60 XP for Q1, +90 XP for Q2...)
- XP bar animating toward next level
- Badge earned (if any) — full-screen pop with animation
- Streak status
- Encouraging AI-generated message (1-2 sentences, personalised to performance)
- "Keep going" vs "Great session" tone calibrated to score

### Dashboard Gamification Elements

- Level badge + title (top of dashboard, prominent)
- XP progress bar to next level
- Daily streak counter
- "Questions answered today" vs daily goal (e.g. 8 / 15 ✓)
- Recent badges earned (last 3, shown as icons)
- Weekly leaderboard: not vs others — vs Aarav's own personal bests ("Your best week: 142 questions")

### What NOT to gamify

- Do NOT add timers that rush him on individual questions (time pressure in timed test mode only)
- Do NOT show a leaderboard vs other students (this is solo prep)
- Do NOT make incorrect answers feel punishing — small XP for attempts always
- Do NOT let XP farming replace quality — badge conditions require minimum question counts
- Do NOT use childish visual language — no cartoon characters, keep it sharp and modern

### Additional DB columns needed (add to schema)

```sql
alter table public.profiles add column if not exists xp_total int default 0;
alter table public.profiles add column if not exists level int default 1;
alter table public.profiles add column if not exists streak_current int default 0;
alter table public.profiles add column if not exists streak_best int default 0;
alter table public.profiles add column if not exists last_session_date date;
alter table public.sessions add column if not exists xp_earned int default 0;
alter table public.attempts add column if not exists xp_earned int default 0;
```

---

### Dashboard Page — Most Critical Screen

The dashboard is what Aarav sees every day. It must instantly communicate:

1. **Level badge + XP bar** — current title (e.g. "Scholar — Level 4") and animated progress to next level
2. **Streak counter** — 🔥 X day streak, prominent, rewarding to see grow
3. **Countdown banner** — "X days until Alpha exam" (exciting, not scary)
4. **Focus today card** — 2-3 topics with mastery % and AI rationale for why these today
5. **Week theme card** — e.g. "Week 3: Fractions Mastery + Verbal Analogies"
6. **Today's progress** — questions answered vs daily goal (e.g. "8 / 15 today")
7. **Start Session button** — big, primary CTA
8. **Recent badges** — last 3 earned, shown as icon + name chips

### Study Page — The Core Loop

1. Show question clearly (topic label + difficulty indicator — e.g. "Level 7")
2. Answer input (MC buttons or text field depending on type)
3. On submit: immediate ✓ or "Not quite" — never harsh language
4. **XP flash** — "+70 XP" animates on screen for correct answers
5. Show explanation always — even for correct (reinforce + add insight)
6. Optional hint button (before submitting — costs 30% XP)
7. Progress bar: questions done / session total
8. End session after configured number (default 15) → Results screen

### Results Screen (Post-Session)

1. Score display with animated counter (e.g. "12 / 15")
2. XP earned this session — animated total with per-question breakdown on expand
3. XP bar updating toward next level — animate the fill
4. **Level-up celebration** if threshold crossed — full screen moment
5. **Badge earned** — if any, full card with icon + description
6. Streak status — "🔥 Day 5 streak! Keep it going tomorrow"
7. AI-generated 1-2 sentence encouragement (personalised to score + topics)
8. CTA: "Keep going" (another session) or "See progress" (go to progress page)

### Progress Page

- Per-domain breakdown (Maths / Reading / Verbal / Abstract)
- Per-topic mastery bars (colour coded: red <50%, amber 50-75%, green >75%)
- Line chart: overall score trend over past 14 days
- Biggest improvement, biggest gap labels

### Design Principles

- Clean, modern, sharp — treat Aarav as a serious high-achieving student, not a child doing homework
- Gamification elements must feel earned and meaningful — not cheap or childish
- Mobile-friendly (tablet use likely)
- Dark mode support preferred — looks premium
- Colour system: green = strong/correct, amber = needs work, red = urgent gap, blue = informational
- Encouraging tone everywhere — never negative, always framed as growth and opportunity
- Level titles and badge names should feel aspirational (Scholar, Elite, Alpha — not "star student")

---

## Routing Structure (`src/App.tsx`)

```
/ → redirect to /dashboard if logged in, else /login
/login
/dashboard          ← home base
/study              ← session in progress
/study/results      ← post-session summary
/progress           ← charts + topic breakdown
/progress/:topicId  ← drill-down on one topic
/report             ← parent report (parent role only)
/settings           ← exam date, daily goal, notifications
```

---

## Build Order (Follow This Sequence)

### Step 1 — Project scaffold
```bash
npm create vite@latest alpha-prep -- --template react-ts
cd alpha-prep
npm install
npm install @supabase/supabase-js @anthropic-ai/sdk tailwindcss @tailwindcss/vite recharts lucide-react react-router-dom
npx tailwindcss init -p
```

### Step 2 — Supabase setup
- Create `src/lib/supabase.ts` with client
- Run schema SQL in Supabase dashboard
- Run seed topics SQL
- Test connection

### Step 3 — Auth flow
- Login page (email/password via Supabase Auth)
- Create 2 users in Supabase Auth: student + parent
- Auth guard on all routes
- `useUser` hook

### Step 4 — Curriculum module
- `src/lib/curriculum.ts` with all topic definitions
- Difficulty ramp logic
- Topic selection logic

### Step 5 — AI question generation
- `src/lib/anthropic.ts` with generateQuestion function
- Test with one hardcoded topic call
- Parse and validate JSON response

### Step 6 — Study session flow
- `Study.tsx` page
- QuestionCard component
- Answer submission + immediate feedback
- Explanation panel
- Session completion → save to Supabase

### Step 7 — Mastery tracking
- `useProgress` hook
- After each session, recalculate mastery scores
- Upsert to `mastery` table

### Step 8 — Dashboard
- `Dashboard.tsx`
- FocusTodayCard (uses mastery data)
- WeeklyThemeCard
- Countdown banner (reads exam date from settings)
- Stats summary

### Step 9 — Progress visualisation
- `Progress.tsx`
- Recharts line chart
- Topic mastery bars
- Domain breakdown

### Step 10 — Weekly plan generation
- Monday auto-trigger or manual button
- AI call with mastery data → weekly plan
- Save to `weekly_plans` table

### Step 11 — Parent report
- `ParentReport.tsx` (role-gated)
- Full progress dump
- Printable layout

### Step 12 — Deploy
```bash
# push to GitHub
# connect repo to Netlify
# add env vars in Netlify dashboard
# deploy
```

---

## Key Business Rules

1. **Session always saves** — even if incomplete, save what was attempted
2. **Mastery recalculates after every session** — never stale
3. **XP and level update after every session** — instant feedback loop
4. **Streak checks on login** — if last_session_date < yesterday, reset streak to 0
5. **Badge checks after every session** — evaluate all badge conditions, award any newly earned
6. **Weekly plan generates Monday morning** — or on first login of the week
7. **Difficulty floor is 5, default start is 6** — never generate below difficulty 5 for Aarav
8. **Difficulty is per-topic** — can be difficulty 8 in maths, 6 in verbal simultaneously
9. **Exam date is configurable** in settings — countdown adjusts automatically
10. **Questions are never cached** — always freshly generated by Claude (ensures variety and no repeats)
11. **Explanation always shown** — even for correct answers (builds understanding, not pattern matching)
12. **Hints cost XP** — 30% reduction, but never block access — challenge without punishment
13. **Parent can see everything** — student sees only their own dashboard
14. **Session exit always saves** — abandoning a session mid-way calls finishSession() so all attempted questions and XP earned are preserved. Never discard partial session data.

---

## Error Handling

- If Anthropic API fails: retry once, then show a fallback question from a small local bank
- If Supabase save fails: keep session in local state, retry on next load
- If JSON parse fails on AI response: re-request with explicit format reminder
- Always log errors to console in dev, swallow gracefully in prod

---

## Exam Context (Brief the AI on This)

The EDSC Alpha program at East Doncaster Secondary College is a selective accelerated learning program. Entry is competitive. The entrance test follows ACER-style formats similar to:
- ACER Scholarship Tests
- Selective Entry High School tests (Vic)
- EduTest assessments

Questions tend to be:
- Multi-step reasoning (not just recall)
- Time-pressured (speed + accuracy matter)
- Abstract and lateral thinking rewarded
- Reading passages with 4-6 inference questions

The goal is not just to pass — it is to be so well-prepared that the exam feels routine.

---

## Notes for Claude Code Agent

- Always use TypeScript, never plain JS
- Always use Tailwind for styling — no inline styles, no separate CSS files
- Always handle loading and error states in every component
- Use React Query or SWR for data fetching if the component is complex, otherwise simple useEffect + useState is fine
- Keep components under 200 lines — split if larger
- Never hardcode the student's name — always pull from profile
- The Anthropic API key goes in `.env.local` only — never hardcode
- Run `npm run dev` to test locally before asking me to check anything
- Commit frequently with descriptive messages

---

---

## Current Status & Known Issues (Updated June 2026)

### App Status
- ✅ Deployed to Netlify
- ✅ Supabase schema + topics seeded
- ✅ Auth working for both Aarav (student) and Andy (parent)
- ✅ Question generation via Anthropic API working
- ✅ 2-domain block session structure built
- ❌ Session results not saving to Supabase correctly
- ❌ Dashboard not reflecting completed sessions or weekly plan
- ❌ Parent Report showing "No session data" — RLS policy missing for parent role
- ❌ Window focus/tab switch triggers new question generation (loses current question)
- ❌ Weekly plan generates but doesn't display on dashboard

### Known Issues / Status

✅ **Window focus bug — FIXED (June 2026).** `sessionStarted` ref guard in `useStudySession.ts` prevents re-triggering on tab switch or token refresh.

✅ **Settings table — CREATED (June 2026).** `public.settings` table in Supabase holds `exam_date` and `default_session_questions`. `useSettings` hook reads all settings as key-value map. `CountdownBanner` is now self-contained — reads `exam_date` from Supabase, falls back to 2026-09-05.

✅ **Role gate — FIXED (June 2026).** Parent sees ParentDashboard, student sees student dashboard, null profile shows error.

✅ **RLS recursive policy bug — FIXED (June 2026).** Fixed via `is_parent_user()` SECURITY DEFINER function on all parent policies (profiles, mastery, sessions, attempts, weekly_plans, settings).

✅ **Parent dashboard — FIXED (June 2026).** Rendering correctly with domain performance, curriculum coverage, Aarav's stats.

❌ **Weekly plan not displaying** — Dashboard Week Focus card not reading generated plan correctly.

❌ **Session mode selection** — not built yet. Aarav/parent should choose before starting: full planned (40Q), single domain (20Q), single topic drill (15Q).

❌ **Domain blocks not strict** — Q1-20 must be Domain 1 only, Q21-40 Domain 2 only.

### RLS Policy Needed for Parent Report
Run this in Supabase SQL editor to allow parent account to read Aarav's data:

```sql
create policy "parent can read all sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'parent'
    )
  );

create policy "parent can read all attempts"
  on public.attempts for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'parent'
    )
  );

create policy "parent can read all mastery"
  on public.mastery for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'parent'
    )
  );
```

*Last updated: June 2026 | Stack: React 18 + Vite + Supabase + Anthropic API | Target: EDSC Alpha entrance exam*