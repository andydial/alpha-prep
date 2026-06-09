# Alpha Prep AI — Product Requirements Document
*Version 2.0 — June 2026*
*For use by Claude Code agent. Read this alongside CLAUDE.md.*

---

## 1. Product Vision

A personalised AI study platform preparing Aarav (Year 6) for the EDSC Alpha / SEALP selective entry exam in Victoria, Australia. Conducted by EduTest. Target exam date: 5 September 2026.

**Core USP:** Fully adaptive per-topic progress. The AI tracks mastery at topic level, accelerates where Aarav excels, slows and drills where he struggles. Every week builds on the last. No two students would follow the same path.

**Future product intent:** This is being built for Aarav first, but the architecture must support multiple children per parent account. Use `STUDENT_ID` constants with a `// TODO: multi-child` comment wherever Aarav's UUID is hardcoded.

---

## 2. Users

| User | Email | UUID | Role |
|---|---|---|---|
| Aarav (student) | aaravdial@gmail.com | `bcf5c2fb-1d99-4d1e-9da8-4cc73d4c297f` | student |
| Andy (parent) | anuragdial@gmail.com | `5b73a4ad-4cca-4844-9293-a02e404c4bfa` | parent |

---

## 3. Authentication

### Parent login
- Standard email + password via Supabase Auth
- On login → always route to Parent Dashboard
- Nav shows: Dashboard, Report, Settings, Sign out
- Never show Study or Progress nav items to parent

### Student login (Aarav)
- Option 1: Standard email + password
- Option 2: 4-digit PIN (faster on tablet)
  - PIN stored as hashed value in profiles table (`pin_hash` column)
  - Login screen shows both options — "Use PIN" toggle
  - PIN set by parent in Settings
- On login → always route to Student Dashboard
- Nav shows: Dashboard, Study, Progress, Sign out
- Never show Report or Settings nav items to student

### Role gate — CRITICAL
- After auth, immediately fetch `profiles` row for `auth.uid()`
- Check `profile.role` — route accordingly
- If role fetch fails or is null → show error, do not default to student view
- Parent must NEVER see student UI. Student must NEVER see parent UI.

---

## 4. Exam Context

- **Exam:** EDSC Alpha entrance test, East Doncaster Secondary College, Victoria
- **Conducted by:** EduTest (not ACER — important for question style)
- **Format:** Multiple choice + short answer, 4 domains tested
- **Goal:** Aarav performs so well the exam feels routine
- **Curriculum:** Victorian Curriculum F-10 Version 2.0, targeting Year 5–7 range
- **Difficulty target:** Always above grade level. Floor 5/10, default start 6/10, ceiling 10/10

---

## 5. Domains & Topics

### Core domains (always included)
1. **Maths** — Fractions & Decimals, Percentages & Ratios, Algebra & Patterns, Geometry & Measurement, Data & Probability, Word Problems & Logic, Number Sense & Operations, Time/Money/Units
2. **Reading Comprehension** — Inference & Deduction, Main Idea & Summary, Vocabulary in Context, Author Purpose & Tone, Text Structure & Features
3. **Verbal Reasoning** — Word Analogies, Antonyms & Synonyms, Odd One Out, Word Relationships, Sentence Completion
4. **Abstract Reasoning** — Number & Letter Sequences, Pattern Matrix, Spatial Reasoning, Odd Shape Out

### Optional domain (parent/student opts in per weekly plan)
5. **Written Expression** — Planning & Structure, Persuasive Writing, Narrative Writing
   - Default OFF
   - Parent can enable in Settings → applies from next weekly plan onwards
   - Student can request it on the session mode selection screen
   - When enabled, replaces one block in the session (not added on top of 40Q)

---

## 6. Adaptive Difficulty & AI Topic Selection

### Per-topic difficulty
- Each topic has its own current difficulty level (stored in `mastery.current_difficulty`)
- Floor: 5, Default start: 6, Ceiling: 10
- After every 5 questions on a topic:
  - ≥80% correct → difficulty +1 (accelerate)
  - ≤40% correct → difficulty -1 (consolidate, never below 5)
  - 41–79% → hold (healthy challenge zone)

### Weekly plan — AI decides, auto-generates every Monday
- AI receives: all topic mastery scores, current week number, weeks remaining until exam
- AI selects primary focus (weakest high-exam-weight topic) + secondary focus
- If Writing is enabled → may include as tertiary focus replacing one block
- AI writes a one-sentence rationale per topic choice
- Each week builds on the previous — AI receives last week's plan as context
- No manual regeneration — plan is authoritative for the week
- Stored in `weekly_plans` table

### Daily session topic selection
- Within the weekly plan's focus topics, AI selects specific questions
- If Aarav is excelling (>80% across 3 consecutive sessions on a topic) → escalate difficulty and move to next weakest topic sooner
- If struggling (<50% across 2 consecutive sessions) → stay on topic, reduce difficulty, change question style

---

## 7. Session Flow

### 7A. Session mode selection screen
Shown AFTER Aarav taps "Start Session" on dashboard — separate screen before questions begin.

Three modes:
1. **Planned Session** (default) — follows weekly plan, 40 questions, 2 domain blocks of 20
2. **Domain Focus** — Aarav picks one domain, 20 questions, that domain only
3. **Topic Drill** — Aarav picks one specific topic, 15 questions, that topic only

UI: Three large cards. Planned Session pre-selected. Domain Focus shows 4 domain buttons. Topic Drill shows topic list filtered by domain selection first.

Parent can change the default question count in Settings (15 / 20 / 30 / 40). This only changes the Planned Session default — Domain Focus stays 20Q, Topic Drill stays 15Q.

### 7B. Session structure — Planned Session
- Block 1: 20 questions, Domain 1 (from weekly plan primary topic)
- Full-screen domain transition card between blocks ("Great work! Now switching to [Domain 2]")
- Block 2: 20 questions, Domain 2 (from weekly plan secondary topic)
- Questions never mix domains within a block
- No individual question timers
- Progress bar shows questions done / total

### 7C. Question screen
1. Topic label + difficulty indicator (e.g. "Verbal Reasoning · Level 7")
2. Question text (clear, large)
3. Answer input — multiple choice buttons OR text field depending on question type
4. **Hint button** (before submitting) — costs 30% XP, shows one-sentence hint
5. Submit button

### 7D. After each answer
1. Immediate feedback — green ✓ or amber "Not quite" (never "Wrong" or "Incorrect")
2. XP flash animation — "+70 XP" for correct, "+5 XP" for incorrect (always earn something)
3. Explanation panel — always shown, 2–4 sentences, encouraging tone
4. "Next →" button — Aarav taps manually to advance (never auto-advance)

### 7E. Session results screen
Shown after final question:
1. Animated score counter (e.g. "32 / 40")
2. XP earned this session — total + expandable per-question breakdown
3. XP bar animating toward next level
4. Level-up celebration if threshold crossed (full screen moment)
5. Badge earned — full card with icon + description if any awarded
6. Streak status — "🔥 Day 3 streak! Keep it going tomorrow"
7. AI-generated 1–2 sentence encouragement (personalised to score + topics)
8. Two CTAs: "Study More" (another session) / "See My Progress" (go to Progress page)

---

## 8. Gamification

### XP & Levels
```
Correct answer XP = difficulty × 10 (e.g. difficulty 7 = 70 XP)
Incorrect answer XP = 5 (always — never zero)
Hint penalty = 30% reduction on that question's XP
```

| Level | Title | XP Required |
|---|---|---|
| 1 | Learner | 0 |
| 2 | Thinker | 500 |
| 3 | Challenger | 1,500 |
| 4 | Scholar | 3,000 |
| 5 | Achiever | 5,500 |
| 6 | Expert | 9,000 |
| 7 | Elite | 14,000 |
| 8 | Alpha | 20,000 |

### Streaks
- Daily streak: consecutive days with at least one completed session
- Resets at midnight if no session that day
- Milestone badges at 3, 7, 14, 21, 30 days

### Badges
15 badges as defined in CLAUDE.md. Checked and awarded after every session.

### FIFA-Style Player Card Store — NEW FEATURE

**Concept:** Aarav spends XP to "buy" text-based football player cards. Better players cost more XP. This is the primary motivation loop — study → earn XP → buy cards.

**Card tiers:**

| Tier | Player Rating | XP Cost | Example Players |
|---|---|---|---|
| Bronze | 60–69 | 200 XP | Solid squad players |
| Silver | 70–79 | 500 XP | Good first team players |
| Gold | 80–89 | 1,200 XP | Top club players |
| Elite | 90–94 | 2,500 XP | World class |
| Legend | 95–99 | 5,000 XP | Messi, Ronaldo, Mbappé tier |

**Card contents (text-based):**
```
┌─────────────────────┐
│  94  MBAPPÉ         │
│  PAC 97  SHO 93     │
│  PAS 80  DRI 95     │
│  DEF 36  PHY 78     │
│  ⭐ Legend Card      │
│  Earned: 8 Jun 2026 │
└─────────────────────┘
```

**Rules:**
- XP is deducted immediately on purchase
- Cannot buy the same player twice (duplicate protection)
- Aarav redeems freely — no parent approval needed
- Parent can see Aarav's full card collection in parent dashboard (read-only)
- Cards are permanent — cannot be sold or traded (v1)
- Store shows 6 random available cards at a time, refreshes daily
- "My Squad" screen shows all owned cards in a grid, sortable by rating/tier/date

**Database tables needed:**
```sql
create table public.player_cards (
  id text primary key,           -- e.g. 'mbappe_95'
  name text not null,            -- 'Kylian Mbappé'
  rating int not null,           -- 60–99
  tier text not null,            -- 'bronze'|'silver'|'gold'|'elite'|'legend'
  pace int, shooting int, passing int,
  dribbling int, defending int, physical int,
  xp_cost int not null,
  active boolean default true
);

create table public.student_cards (
  id uuid default uuid_generate_v4() primary key,
  student_id uuid references auth.users,
  card_id text references public.player_cards,
  purchased_at timestamptz default now(),
  xp_spent int not null,
  unique(student_id, card_id)
);
```

---

## 9. Student Dashboard

Aarav sees this on login. Must feel motivating, not like homework.

**Sections (top to bottom):**
1. "Hey, Aarav 👋" + subtitle based on time of day / streak status
2. Countdown banner — "X days until Alpha exam" (reads from settings)
3. Level card (left) + Streak card (right) — side by side
4. Today's Focus card — 2–3 topics with mastery %, AI rationale ("Focus on Fractions today — you're close to mastery!")
5. Week theme card — "Week 3: Algebra + Verbal Analogies"
6. Stats row — questions this week / accuracy this week / best streak
7. **"Start Session" button** — big, primary CTA → goes to session mode selection screen
8. Recent badges — last 3 earned as icon chips
9. **"My Squad" button** — goes to FIFA card collection screen

**State-aware text:**
- First ever login: "Let's get started — your first session awaits"
- Has streak: "🔥 Day X streak — keep it going!"
- No session today yet: "Ready for today's session?"
- Session done today: "Great work today! Come back tomorrow to keep your streak"

---

## 10. Parent Dashboard

Andy sees this on login. Oversight only — no study UI elements.

**Sections:**
1. "Welcome, Andy" header + "Viewing: Aarav's Progress" subtext + child selector (future: multiple children)
2. Exam countdown (same banner, reads same settings) + Aarav's level/XP/streak card side by side
3. Domain performance grid (2×2) — Maths / Reading / Verbal / Abstract
   - Average accuracy % per domain from mastery table
   - Green >75% / Amber 50–75% / Red <50% / Grey = no data
   - "Needs Focus" tag on weakest domain
4. This week's plan card — primary + secondary topic, AI rationale, week number
5. Recent activity feed — last 5 completed sessions (date, domains, score, XP earned) — each row drills into full session detail on click
6. Curriculum coverage map — all 25 topics, status chip per topic (Not started / In progress / Strong)
7. Aarav's card collection — read-only view of all FIFA cards owned

**What is NOT on parent dashboard:**
- No Start Session button
- No XP bar for Andy
- No weekly plan regenerate button (auto only)
- No study controls — those are in Settings

---

## 11. Settings Page (Parent only)

Route: `/settings` — accessible only to parent role.

**Sections:**
1. **Exam configuration**
   - Exam date picker → saves to `settings` table key `exam_date`
   - All countdowns across the app recalculate immediately

2. **Session configuration**
   - Default session length: 15 / 20 / 30 / 40 questions (saves to `default_session_questions`)
   - Writing domain toggle: ON / OFF (saves to `writing_enabled`)
   - When ON, writing is available in next weekly plan

3. **Aarav's PIN**
   - Set or change Aarav's 4-digit login PIN
   - Stored as bcrypt hash in `profiles.pin_hash`
   - Show: "PIN is set" or "No PIN set" — never show actual PIN

4. **Child account info**
   - Aarav's display name + email (read-only for now)
   - Future: add child button (multi-child TODO)

---

## 12. Progress Page (Student only)

Route: `/progress`

**Sections:**
1. 14-day accuracy trend line chart (Recharts)
2. Domain breakdown — 4 domain cards with accuracy %
3. Per-topic mastery bars — colour coded (red/amber/green)
4. "Biggest improvement" + "Biggest gap" labels
5. Total questions answered / total XP / current level summary

---

## 13. Report Page (Parent only, existing)

Route: `/report` — keep existing, enhance with:
- Session drill-down: clicking any session in parent dashboard opens full detail here
- Shows every question attempted, answer given, correct answer, XP earned

---

## 14. Database Schema Additions Required

```sql
-- PIN support
alter table public.profiles add column if not exists pin_hash text;

-- Writing domain toggle
insert into public.settings (key, value) values ('writing_enabled', 'false')
on conflict (key) do nothing;

-- Player cards store
create table public.player_cards ( ... ); -- full SQL in section 8
create table public.student_cards ( ... ); -- full SQL in section 8

-- RLS for card tables
alter table public.player_cards enable row level security;
alter table public.student_cards enable row level security;
create policy "cards readable by all authenticated" on public.player_cards for select using (auth.role() = 'authenticated');
create policy "own cards" on public.student_cards for all using (auth.uid() = student_id);
create policy "parent can read all student cards" on public.student_cards for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'parent'));
```

---

## 15. Key Business Rules (Non-Negotiable)

1. **Role gate is absolute** — parent never sees student UI, student never sees parent UI
2. **Session always saves** — even incomplete sessions save attempted questions
3. **XP always awarded** — minimum 5 XP per question, never zero
4. **Hints never blocked** — always available, just cost 30% XP
5. **Difficulty floor 5** — never generate below difficulty 5 for Aarav
6. **Domain blocks are strict** — Block 1 questions are exclusively Domain 1, Block 2 exclusively Domain 2
7. **Questions never regenerate mid-session** — only advance on explicit user action
8. **Weekly plan auto-generates Mondays** — no manual trigger
9. **XP deducts on card purchase** — cannot go below 0, button disabled if insufficient XP
10. **Australian English throughout** — colour, maths, programme, fulfil, etc.
11. **Encouraging tone always** — never "wrong", never "incorrect" — "not quite" or "close"
12. **Explanation always shown** — even for correct answers
13. **Every question saves immediately** — attempts are written to the `attempts` table the moment Aarav submits an answer, before the explanation is shown. Sessions never batch-save at the end. If the session is abandoned or the app crashes, all completed questions are preserved. Parent dashboard question counts query the `attempts` table directly, not the `sessions` table.

---

## 16. Routing

```
/                   → redirect based on role
/login              → email+password OR PIN toggle
/dashboard          → student dashboard (student role only)
/study              → session mode selection → question loop
/study/results      → post-session summary
/progress           → student progress charts (student role only)
/parent             → parent dashboard (parent role only)
/parent/session/:id → session drill-down detail
/report             → parent report (parent role only)
/settings           → settings page (parent role only)
/squad              → FIFA card collection (student role only)
/store              → FIFA card store (student role only)
```

---

## 17. Design Principles

- Dark mode, clean, modern — treat Aarav as a serious high achiever, not a child doing homework
- Mobile + tablet first (Aarav likely uses iPad)
- Tailwind CSS only — no inline styles, no separate CSS files
- Green = strong/correct, Amber = needs work, Red = urgent gap, Blue = informational/neutral
- Gamification feels earned — not cheap or childish
- Level titles aspirational: Scholar, Elite, Alpha
- FIFA cards should feel like a real reward — card UI clean and sharp even in text form

---

*This PRD is the source of truth for all feature development. CLAUDE.md contains technical schema and prompt details. When they conflict, this PRD takes precedence on product decisions; CLAUDE.md takes precedence on technical implementation details.*
