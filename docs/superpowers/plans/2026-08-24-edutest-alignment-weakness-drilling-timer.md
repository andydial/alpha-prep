# EduTest Alignment, Weakness Drilling & Session Timer — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Run `npm test` and `npm run build` after every task.

**Goal:** Re-point every question the app generates at the actual EDSC Alpha entrance paper (an EduTest), drill the topics Aarav is measurably weakest on, and put a whole-test countdown on every session with a parent switch to turn it off.

**Architecture:** Three layers change. (1) A new `examSpec.ts` module owns the EduTest section/topic/difficulty definitions and the per-domain generation guidance the AI prompt consumes — `curriculum.ts` keeps only the mechanics. (2) A new `weakness.ts` module replaces per-question random topic draws with a *session blueprint*: an ordered list of `{topicId, difficulty, stretch}` slots computed up front from mastery + recent attempts, so coverage, weakness weighting and the 5–10% stretch share are all guaranteed rather than emergent. (3) A `useCountdown` hook + `SessionTimer` component drive a whole-session timer that finalises and marks the attempt when it expires, gated on a `timer_enabled` setting the parent controls.

**Tech Stack:** React 19 + Vite 5, TypeScript, Tailwind v4, Supabase (Postgres + RLS), Anthropic Messages API (`claude-sonnet-4-6`), Vitest, Netlify (auto-deploy from `main`).

## Global Constraints

- **Exam:** EDSC Alpha entry test = **EduTest**, Year 6 sitting for Year 7 entry. Five sections: Verbal Reasoning 30 min, Numerical Reasoning 30 min, Reading Comprehension 30 min, Mathematics 30 min, Written Expression 15 min. All reasoning/achievement sections are **multiple choice**. Pace ≈ **60 seconds per question**. Sources: [EDSC ALPHA page](https://www.eastdonsc.vic.edu.au/learning/alpha-program/), [Braintree EduTest format](https://braintreecoaching.com.au/edutest-exam-format), [AceAchievers EduTest guide](https://aceachievers.com.au/scholarship-exams/guides/edutest-scholarship-exam-guide.html).
- **Abstract / non-verbal reasoning is NOT on this paper.** It must not appear in planned sessions, weekly rotations or the domain picker.
- Australian English throughout (colour, maths, practise/practice, metre).
- Difficulty scale stays 1–10 with floor 5, ceiling 10 — but is **re-anchored to EduTest**: 5 = a routine EduTest item for this year level, 7 = a hard EduTest item, 9–10 = top-percentile stretch.
- **5–10% of every session's questions must be stretch** (core + 2). Target 8%.
- Weakness drilling adds **1–3 extra questions** on a weak topic vs. an even spread — never more, and a session must always keep ≥3 distinct topics per block with no topic exceeding 40% of the block.
- No new npm dependencies.
- Every DB column added must degrade gracefully via the existing `error.code === '42703'` retry pattern — the app must work before the migration is run.
- No new `topics` row may be *required* — new topic IDs are additive, and every domain must resolve to at least two already-seeded topic IDs so `attempts.topic_id`'s FK never fails pre-migration.
- Never hardcode the exam date. Read `settings.exam_date`, fall back to `2026-09-05`.

---

## File Structure

**Create**
- `src/lib/examSpec.ts` — EduTest section definitions, difficulty bands per prep week, `buildDifficultyPlan`, per-domain + per-topic AI generation guidance strings. Single source of truth for "what the exam actually asks".
- `src/lib/examSpec.test.ts` — difficulty band and stretch-share tests.
- `src/lib/weakness.ts` — weakness ranking + `buildBlueprint`. Pure functions, no I/O.
- `src/lib/weakness.test.ts` — blueprint composition tests.
- `src/lib/examDate.ts` — `parseExamDate`, `DEFAULT_EXAM_DATE`. Kills three hardcoded dates.
- `src/lib/sessionTimer.ts` — `sessionTimeLimitSeconds`, `formatClock`. Pure.
- `src/lib/sessionTimer.test.ts`
- `src/hooks/useCountdown.ts` — wall-clock-anchored countdown (immune to tab throttling).
- `src/components/SessionTimer.tsx` — mm:ss pill with amber/red thresholds.
- `src/pages/WritingTask.tsx` — Written Expression: one prompt, 15-minute timer, AI rubric marking.
- `db/migrate_edutest_alignment.sql` — new topic rows, session timer columns, default settings.

**Modify**
- `src/types/index.ts` — add `'numerical'` to `Domain`; `passage` to `Question`; `time_limit_seconds`/`timed_out` to `Session`; `SessionMode` gains `'writing'`; `SessionConfig` gains `timeLimitSeconds`.
- `src/lib/curriculum.ts` — retarget `TOPICS` and `DOMAIN_NAMES` at EduTest, add `EXAM_DOMAINS`, `examTopicsForDomain`, `adaptiveDelta`; retire `selectTopicForSession`/`selectTopicFromDomain` random draws in favour of the blueprint.
- `src/lib/anthropic.ts` — EduTest system prompt, forced multiple choice for exam domains, `generateReadingSet`, `generateWritingPrompt`, `markWritingResponse`.
- `src/lib/fallbackQuestions.ts` — add numerical-reasoning and verbal-deduction/codes offline questions.
- `src/lib/weeklyPlan.ts` — EduTest rotation, exam date param.
- `src/hooks/useStudySession.ts` — blueprint-driven question selection, reading-set queue, timer plumbing, timed-out finalisation, correct `session_type`.
- `src/pages/Study.tsx` — render `SessionTimer`, handle expiry.
- `src/pages/SessionModeSelect.tsx` — drop abstract, add Numerical Reasoning, add Writing Task mode, show time limits.
- `src/pages/Results.tsx` — "Time's up" state and unanswered count.
- `src/pages/Settings.tsx` — Timed Tests section (on/off + seconds per question).
- `src/pages/ParentReport.tsx` — exam date from settings.
- `src/components/QuestionCard.tsx` — render reading passage; numerical domain colour.
- `src/components/SessionStreamBanner.tsx`, `src/components/StreamTransitionScreen.tsx` — numerical domain labels.
- `src/App.tsx` — `/study/writing` route.
- `src/lib/sessionSim.test.ts` — exam-domain pairs instead of abstract.
- `CLAUDE.md` — replace the ACER framing with the EduTest framing; document new settings.

---

### Task 1: Exam spec module — EduTest sections, difficulty bands, stretch mix

**Files:**
- Create: `src/lib/examSpec.ts`
- Create: `src/lib/examSpec.test.ts`

**Interfaces:**
- Produces:
  - `EXAM_SECTIONS: ExamSection[]` where `ExamSection = { domain: Domain; label: string; minutes: number; blurb: string }`
  - `getDifficultyBand(weekNumber: number, offset: number): { core: number; stretch: number }`
  - `buildDifficultyPlan(count: number, band: {core:number;stretch:number}, rng?: () => number): { difficulty: number; stretch: boolean }[]`
  - `DOMAIN_GUIDANCE: Record<Domain, string>`
  - `TOPIC_GUIDANCE: Record<string, string>`
  - `EXAM_CONTEXT: string` (prose block injected into every generation prompt)

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/examSpec.test.ts
import { describe, it, expect } from 'vitest'
import { getDifficultyBand, buildDifficultyPlan, EXAM_SECTIONS, DOMAIN_GUIDANCE } from './examSpec'

describe('getDifficultyBand', () => {
  it('starts at exam level and ramps toward the exam', () => {
    expect(getDifficultyBand(1, 0).core).toBe(5)
    expect(getDifficultyBand(8, 0).core).toBe(7)
  })
  it('always puts stretch two above core, capped at 10', () => {
    for (let w = 1; w <= 8; w++) {
      const b = getDifficultyBand(w, 0)
      expect(b.stretch).toBe(Math.min(10, b.core + 2))
    }
  })
  it('applies the parent difficulty offset and clamps to 5..10', () => {
    expect(getDifficultyBand(1, -2).core).toBe(5)
    expect(getDifficultyBand(8, 2).core).toBe(9)
  })
})

describe('buildDifficultyPlan', () => {
  const band = { core: 7, stretch: 9 }
  it('returns exactly `count` slots', () => {
    expect(buildDifficultyPlan(40, band).length).toBe(40)
  })
  it('keeps stretch between 5% and 10% of the session', () => {
    for (const n of [10, 15, 20, 30, 40]) {
      const stretch = buildDifficultyPlan(n, band).filter(s => s.stretch).length
      expect(stretch / n).toBeGreaterThanOrEqual(0.05)
      expect(stretch / n).toBeLessThanOrEqual(0.10)
    }
  })
  it('never opens a session with a stretch question', () => {
    for (let i = 0; i < 200; i++) expect(buildDifficultyPlan(20, band)[0].stretch).toBe(false)
  })
  it('never places two stretch questions back to back', () => {
    for (let i = 0; i < 200; i++) {
      const plan = buildDifficultyPlan(40, band)
      for (let j = 1; j < plan.length; j++) {
        expect(plan[j].stretch && plan[j - 1].stretch).toBe(false)
      }
    }
  })
  it('gives every non-stretch slot the core difficulty', () => {
    for (const slot of buildDifficultyPlan(20, band)) {
      expect(slot.difficulty).toBe(slot.stretch ? 9 : 7)
    }
  })
})

describe('exam sections', () => {
  it('covers the five EduTest sections and excludes abstract reasoning', () => {
    expect(EXAM_SECTIONS.map(s => s.domain)).toEqual(
      ['verbal', 'numerical', 'reading', 'maths', 'writing'],
    )
    expect(Object.keys(DOMAIN_GUIDANCE)).not.toContain('abstract')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- examSpec`
Expected: FAIL — `Failed to resolve import "./examSpec"`.

- [ ] **Step 3: Implement `src/lib/examSpec.ts`**

Difficulty bands (core only; stretch derived):

| Prep week | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| core | 5 | 5 | 6 | 6 | 6 | 7 | 7 | 7 |

```ts
import type { Domain } from '../types'

export interface ExamSection { domain: Domain; label: string; minutes: number; blurb: string }

/** The real EduTest paper, in the order it is sat. */
export const EXAM_SECTIONS: ExamSection[] = [
  { domain: 'verbal',    label: 'Verbal Reasoning',     minutes: 30, blurb: 'Ability — vocabulary, analogies, classification, deduction, codes' },
  { domain: 'numerical', label: 'Numerical Reasoning',  minutes: 30, blurb: 'Ability — series, matrices, number properties, worded logic' },
  { domain: 'reading',   label: 'Reading Comprehension',minutes: 30, blurb: 'Achievement — literal, inferential and critical reading' },
  { domain: 'maths',     label: 'Mathematics',          minutes: 30, blurb: 'Achievement — number & algebra, measurement & geometry, statistics & probability' },
  { domain: 'writing',   label: 'Written Expression',   minutes: 15, blurb: 'Achievement — one narrative or persuasive task, no planning time' },
]

const CORE_BY_WEEK: Record<number, number> = { 1: 5, 2: 5, 3: 6, 4: 6, 5: 6, 6: 7, 7: 7, 8: 7 }

export function getDifficultyBand(weekNumber: number, offset: number): { core: number; stretch: number } {
  const base = CORE_BY_WEEK[weekNumber] ?? 6
  const core = Math.max(5, Math.min(10, base + offset))
  return { core, stretch: Math.min(10, core + 2) }
}

/**
 * The difficulty shape of one session. The real paper is overwhelmingly
 * at-level with a short hard tail, so ~8% of slots are pushed two levels above
 * core and the rest sit exactly at core. Stretch slots never open a session
 * (a cold first question that is the hardest of the set reads as punishing)
 * and never sit back to back.
 */
export function buildDifficultyPlan(
  count: number,
  band: { core: number; stretch: number },
  rng: () => number = Math.random,
): { difficulty: number; stretch: boolean }[] {
  const stretchCount = Math.min(
    Math.floor(count * 0.10),
    Math.max(count >= 10 ? 1 : 0, Math.round(count * 0.08)),
  )
  const slots = Array.from({ length: count }, () => ({ difficulty: band.core, stretch: false }))

  // Spread stretch slots evenly through the tail of each even segment, then
  // jitter within the segment so the pattern is not predictable.
  const segment = Math.floor((count - 1) / Math.max(1, stretchCount))
  const chosen = new Set<number>()
  for (let i = 0; i < stretchCount; i++) {
    const lo = 1 + i * segment
    const hi = Math.min(count - 1, lo + segment - 1)
    let idx = lo + Math.floor(rng() * Math.max(1, hi - lo + 1))
    while (idx <= 0 || chosen.has(idx) || chosen.has(idx - 1) || chosen.has(idx + 1)) {
      idx = idx + 1 > count - 1 ? 1 : idx + 1
      if (idx === lo) break
    }
    if (idx > 0 && !chosen.has(idx) && !chosen.has(idx - 1) && !chosen.has(idx + 1)) chosen.add(idx)
  }
  for (const idx of chosen) slots[idx] = { difficulty: band.stretch, stretch: true }
  return slots
}
```

Then `EXAM_CONTEXT`, `DOMAIN_GUIDANCE` and `TOPIC_GUIDANCE`. `EXAM_CONTEXT` states the paper is an EduTest with the five sections above, that every question is multiple choice with exactly four options, that a candidate has ~60 seconds per question, and that questions must be solvable without a calculator. `DOMAIN_GUIDANCE` has one entry per exam domain:

- `verbal` — synonyms/antonyms, analogies (`A : B :: C : ?`), classification and odd-one-out, logical deduction from two or three statements, letter and word codes, sentence completion. Vocabulary pitched at strong Year 6/7. Never require knowledge of a specific text.
- `numerical` — number series and sequences (arithmetic, geometric, alternating, second-difference), numeric matrices/grids where a rule links rows and columns, arithmetic reasoning in words (rates, ages, averages, proportion, unit conversion), number properties (factors, multiples, primes, divisibility). Pure reasoning: no curriculum recall, no diagrams.
- `reading` — a short passage (120–220 words) then questions on it. Passage types rotate literary / informational / persuasive. Question types: literal retrieval, inference, vocabulary in context, author purpose and tone, text structure.
- `maths` — Victorian Curriculum Year 6–7 across number & algebra, measurement & geometry, statistics & probability. Multi-step, worded, no calculator, answers reachable in under a minute by a strong student.
- `writing` — one prompt only, narrative or persuasive, 15 minutes, no planning time; the prompt must be openable by any Year 6 student with no specialist knowledge.

`TOPIC_GUIDANCE` maps each topic id to a one-line description of the item type the real paper uses for it.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- examSpec`
Expected: PASS (10 assertions across 3 describes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/examSpec.ts src/lib/examSpec.test.ts
git commit -m "Add EduTest exam spec: sections, difficulty bands, stretch mix"
```

---

### Task 2: Retarget the curriculum at EduTest

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/curriculum.ts`
- Modify: `src/lib/sessionSim.test.ts`
- Create: `db/migrate_edutest_alignment.sql`

**Interfaces:**
- Consumes: nothing from Task 1 yet.
- Produces:
  - `Domain` now includes `'numerical'`.
  - `EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'numerical']`
  - `examTopicsForDomain(domain: Domain, validIds: Set<string> | null): string[]`
  - `adaptiveDelta(recentResults: boolean[]): -1 | 0 | 1`
  - `WEEKLY_ROTATION` retargeted at the four exam domains.

- [ ] **Step 1: Update `Domain` in `src/types/index.ts`**

```ts
export type Domain = 'maths' | 'reading' | 'verbal' | 'numerical' | 'abstract' | 'writing'
```

`'abstract'` stays in the union so historical `mastery`/`attempts` rows still type-check; it is simply never selected.

- [ ] **Step 2: Retarget `TOPICS` in `src/lib/curriculum.ts`**

Two existing topics move domain so their mastery history carries over instead of being orphaned — `abstract_sequences` and `abstract_pattern_matrix` were always numeric reasoning wearing an "abstract" label:

| id | before | after |
|---|---|---|
| `abstract_sequences` | abstract / Number & Letter Sequences | **numerical** / Number & Letter Sequences |
| `abstract_pattern_matrix` | abstract / Pattern Matrix | **numerical** / Number Matrices & Grids |
| `abstract_spatial` | abstract / Spatial Reasoning | abstract, `active: false` |
| `abstract_odd_shape` | abstract / Odd Shape Out | abstract, `active: false` |

Added topics (additive — see the FK guard in Step 4):

```ts
{ id: 'numerical_arithmetic', domain: 'numerical', name: 'Arithmetic Reasoning & Worded Logic', year_level: 6, difficulty_base: 6, active: true },
{ id: 'numerical_properties', domain: 'numerical', name: 'Number Properties & Relationships', year_level: 6, difficulty_base: 6, active: true },
{ id: 'numerical_proportion', domain: 'numerical', name: 'Rates, Ratio & Proportion Reasoning', year_level: 6, difficulty_base: 7, active: true },
{ id: 'verbal_logical_deduction', domain: 'verbal', name: 'Logical Deduction', year_level: 6, difficulty_base: 7, active: true },
{ id: 'verbal_codes', domain: 'verbal', name: 'Letter & Word Codes', year_level: 6, difficulty_base: 6, active: true },
```

Also: `maths_time_money.difficulty_base` 4 → 5 (floor is 5, a base of 4 was dead), `reading_*` unchanged, `verbal_antonyms` renamed to `Synonyms & Antonyms`.

`DOMAIN_NAMES` gains `numerical: 'Numerical Reasoning'`. `WEEKLY_ROTATION` becomes:

```ts
export const EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'numerical']

export const WEEKLY_ROTATION: (DomainPair | null)[] = [
  ['maths',   'verbal'],
  ['reading', 'numerical'],
  ['maths',   'numerical'],
  ['verbal',  'reading'],
  null, // two weakest exam domains
]
```

`getWeakestDomains` iterates `EXAM_DOMAINS` instead of its hardcoded list.

- [ ] **Step 3: Add `adaptiveDelta` and keep `getNextDifficulty` for the mastery table**

```ts
/**
 * Live nudge applied on top of the blueprint's planned difficulty. The
 * blueprint owns the exam-level mix; this only leans one step either way when
 * the last five answers say Aarav is coasting or struggling.
 */
export function adaptiveDelta(recentResults: boolean[]): -1 | 0 | 1 {
  const last5 = recentResults.slice(-5)
  if (last5.length < 3) return 0
  const rate = last5.filter(Boolean).length / last5.length
  if (rate >= 0.8) return 1
  if (rate <= 0.4) return -1
  return 0
}
```

- [ ] **Step 4: Add the FK guard — `examTopicsForDomain`**

New topic IDs do not exist in Supabase's `topics` table until the migration runs, and `attempts.topic_id` has a foreign key to it. This function is what stops a pre-migration insert from failing:

```ts
/**
 * Topic IDs usable for a domain right now.
 *
 * `validIds` is the set of topic IDs actually present in Supabase (null when
 * the table could not be read). New EduTest topics are additive, so before
 * db/migrate_edutest_alignment.sql is run they are filtered out here rather
 * than blowing up attempts.topic_id's foreign key. Every exam domain still
 * resolves to at least two already-seeded IDs, so a session always builds.
 */
export function examTopicsForDomain(domain: Domain, validIds: Set<string> | null): string[] {
  const ids = TOPICS.filter(t => t.domain === domain && t.active).map(t => t.id)
  const usable = validIds ? ids.filter(id => validIds.has(id)) : ids
  if (usable.length > 0) return usable
  // Domain wiped out by an unexpected topics table — fall back to maths.
  return TOPICS.filter(t => t.domain === 'maths' && t.active)
    .map(t => t.id)
    .filter(id => !validIds || validIds.has(id))
}
```

- [ ] **Step 5: Write `db/migrate_edutest_alignment.sql`**

```sql
-- EduTest alignment (2026-08-24)
-- Safe to re-run. Run in Supabase Dashboard → SQL Editor → New Query.

-- 1. Re-home the two topics that were always numerical reasoning.
update public.topics set domain = 'numerical', name = 'Number & Letter Sequences'  where id = 'abstract_sequences';
update public.topics set domain = 'numerical', name = 'Number Matrices & Grids'    where id = 'abstract_pattern_matrix';

-- 2. Retire the topics that are not on the EduTest paper.
update public.topics set active = false where id in ('abstract_spatial', 'abstract_odd_shape');

-- 3. New EduTest topics.
insert into public.topics (id, domain, name, year_level, difficulty_base, active) values
  ('numerical_arithmetic',     'numerical', 'Arithmetic Reasoning & Worded Logic', 6, 6, true),
  ('numerical_properties',     'numerical', 'Number Properties & Relationships',   6, 6, true),
  ('numerical_proportion',     'numerical', 'Rates, Ratio & Proportion Reasoning', 6, 7, true),
  ('verbal_logical_deduction', 'verbal',    'Logical Deduction',                   6, 7, true),
  ('verbal_codes',             'verbal',    'Letter & Word Codes',                 6, 6, true)
on conflict (id) do update
  set domain = excluded.domain, name = excluded.name, active = excluded.active;

update public.topics set name = 'Synonyms & Antonyms' where id = 'verbal_antonyms';
update public.topics set difficulty_base = 5 where id = 'maths_time_money';

-- 4. Session timer columns (the app degrades gracefully without these).
alter table public.sessions add column if not exists time_limit_seconds int;
alter table public.sessions add column if not exists timed_out boolean default false;

-- 5. Timer settings defaults.
insert into public.settings (key, value) values
  ('timer_enabled', 'true'),
  ('timer_seconds_per_question', '60'),
  ('writing_time_seconds', '900')
on conflict (key) do nothing;

-- 6. Let the app read the topic list so new-topic filtering works.
alter table public.topics enable row level security;
drop policy if exists "topics readable by authenticated" on public.topics;
create policy "topics readable by authenticated" on public.topics for select to authenticated using (true);
```

- [ ] **Step 6: Update `src/lib/sessionSim.test.ts` to the exam domains**

Replace the `pairs` array with EduTest pairs and drop `'abstract'`:

```ts
const pairs: [Domain, Domain][] = [
  ['maths', 'verbal'], ['maths', 'reading'], ['maths', 'numerical'],
  ['reading', 'verbal'], ['numerical', 'verbal'], ['reading', 'numerical'],
]
```

This test will fail until Task 3 adds the numerical offline questions — that is expected and is the point of Task 3.

- [ ] **Step 7: Run the suite**

Run: `npm test`
Expected: `examSpec` and `answerCheck` pass; `sessionSim` fails on the numerical pairs (bank too small). Proceed to Task 3.

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/lib/curriculum.ts src/lib/sessionSim.test.ts db/migrate_edutest_alignment.sql
git commit -m "Retarget curriculum at EduTest: numerical reasoning in, abstract out"
```

---

### Task 3: Offline question bank for the new domains

**Files:**
- Modify: `src/lib/fallbackQuestions.ts`

**Interfaces:**
- Consumes: topic IDs from Task 2.
- Produces: no new exports; `FALLBACK_QUESTIONS` grows.

The offline bank must survive a full 20-question numerical block with zero repeats. Today numerical resolves to 6 questions (`abstract_sequences` ×4, `abstract_pattern_matrix` ×2).

- [ ] **Step 1: Run the failing simulation**

Run: `npm test -- sessionSim`
Expected: FAIL on `maths + numerical` — `served` short of 40.

- [ ] **Step 2: Add 14 numerical-reasoning questions**

Four per new topic (`numerical_arithmetic`, `numerical_properties`, `numerical_proportion`) plus two more `abstract_pattern_matrix`. All `multiple_choice`, four options, difficulty 5–9, each with `hint` and `explanation` in the existing house style. Example shape:

```ts
{
  question: "In this grid the number in the right-hand column is found from the two on its left by the same rule each row. Row 1: 4, 3 → 19. Row 2: 6, 2 → 20. Row 3: 5, 4 → ?",
  type: 'multiple_choice',
  options: ["A) 21", "B) 29", "C) 24", "D) 20"],
  correct_answer: "B) 29",
  difficulty: 7,
  topic_id: 'abstract_pattern_matrix',
  hint: "Try multiplying the first two numbers, then adding one of them back.",
  explanation: "The rule is (first x second) + first: 4x3+4 = 16... check row 2: 6x2+6 = 18, which fails. The rule that fits both is (first x second) + (first + second) - which gives 4x3+7 = 19 and 6x2+8 = 20, so row 3 is 5x4+9 = 29. Test a candidate rule against every given row before trusting it.",
},
```

- [ ] **Step 3: Add 6 verbal reasoning questions**

Three `verbal_logical_deduction` (two or three premises, one conclusion), three `verbal_codes` (letter-shift and word-substitution codes).

- [ ] **Step 4: Re-run the simulation**

Run: `npm test -- sessionSim`
Expected: PASS — all six pairs serve 40 unique questions across 50 runs.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fallbackQuestions.ts
git commit -m "Offline bank: numerical reasoning, logical deduction and codes"
```

---

### Task 4: Weakness-weighted session blueprint

**Files:**
- Create: `src/lib/weakness.ts`
- Create: `src/lib/weakness.test.ts`

**Interfaces:**
- Consumes: `buildDifficultyPlan` and `getDifficultyBand` from Task 1; `Mastery` from types.
- Produces:
  - `type AttemptSignal = { topic_id: string; is_correct: boolean | null }`
  - `rankWeakness(topicIds: string[], mastery: Mastery[], recent: AttemptSignal[]): { topicId: string; weakness: number; evidence: number }[]` — descending weakness.
  - `type Slot = { topicId: string; difficulty: number; stretch: boolean }`
  - `buildBlueprint(params: { topicIds: string[]; count: number; band: { core: number; stretch: number }; mastery: Mastery[]; recent: AttemptSignal[]; rng?: () => number }): Slot[]`

Weakness score, 0 (mastered) to 1 (never right), blending long-run and recent accuracy so a topic he has just started failing rises fast:

```
accuracy      = mastery.score_alltime            (0 if no row)
recent        = correct / attempted in `recent`  (falls back to accuracy)
evidence      = mastery.attempts_total
confidence    = min(1, evidence / 8)
weakness      = confidence * (0.4 * (1 - accuracy) + 0.6 * (1 - recent))
                + (1 - confidence) * 0.5          // unseen topics sit mid-pack
```

Bonus allocation, which is where the "1–3 extra questions" requirement lives:

| session size | weakest topic | 2nd weakest |
|---|---|---|
| ≥ 30 | +3 | +2 |
| 20–29 | +2 | +1 |
| 12–19 | +2 | 0 |
| < 12 | +1 | 0 |

Bonus slots are taken from the *strongest* topics, never dropping any topic below one slot. Then two caps are enforced, in this order: no topic exceeds 40% of `count`, and at least `min(3, topicIds.length)` distinct topics appear. Finally slots are ordered round-robin by topic so the drilled topic is spread through the block rather than clustered, and `buildDifficultyPlan` supplies the difficulty for each position.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/weakness.test.ts
import { describe, it, expect } from 'vitest'
import { rankWeakness, buildBlueprint } from './weakness'
import type { Mastery } from '../types'

function m(topic_id: string, attempts_total: number, score_alltime: number): Mastery {
  return {
    id: topic_id, student_id: 's', topic_id, last_updated: '', attempts_total,
    attempts_correct: Math.round(attempts_total * score_alltime),
    score_7day: score_alltime, score_alltime, current_difficulty: 6,
  }
}

const TOPICS = ['t_strong', 't_mid', 't_weak', 't_weak2', 't_new']
const MASTERY = [m('t_strong', 20, 0.95), m('t_mid', 20, 0.7), m('t_weak', 20, 0.3), m('t_weak2', 20, 0.45)]

// Deterministic rng so ordering assertions are stable.
const rng = () => 0.5

describe('rankWeakness', () => {
  it('puts the lowest-scoring topic first', () => {
    expect(rankWeakness(TOPICS, MASTERY, []).map(r => r.topicId)[0]).toBe('t_weak')
  })
  it('lets a recent collapse outrank a better all-time score', () => {
    const recent = Array.from({ length: 10 }, () => ({ topic_id: 't_mid', is_correct: false }))
    const ranked = rankWeakness(TOPICS, MASTERY, recent)
    expect(ranked.findIndex(r => r.topicId === 't_mid')).toBeLessThan(
      ranked.findIndex(r => r.topicId === 't_weak2'),
    )
  })
  it('parks unattempted topics mid-pack, not top', () => {
    const ranked = rankWeakness(TOPICS, MASTERY, [])
    expect(ranked[0].topicId).not.toBe('t_new')
    expect(ranked.at(-1)!.topicId).toBe('t_strong')
  })
})

describe('buildBlueprint', () => {
  const band = { core: 7, stretch: 9 }
  const build = (count: number) =>
    buildBlueprint({ topicIds: TOPICS, count, band, mastery: MASTERY, recent: [], rng })

  it('produces exactly `count` slots', () => {
    for (const n of [10, 15, 20, 40]) expect(build(n).length).toBe(n)
  })

  it('gives the weakest topic 1-3 more questions than an even spread', () => {
    for (const n of [10, 20, 40]) {
      const slots = build(n)
      const even = Math.floor(n / TOPICS.length)
      const weak = slots.filter(s => s.topicId === 't_weak').length
      expect(weak - even).toBeGreaterThanOrEqual(1)
      expect(weak - even).toBeLessThanOrEqual(3)
    }
  })

  it('never turns the session into a single-topic drill', () => {
    for (const n of [10, 20, 40]) {
      const slots = build(n)
      const counts = new Map<string, number>()
      for (const s of slots) counts.set(s.topicId, (counts.get(s.topicId) ?? 0) + 1)
      expect(counts.size).toBeGreaterThanOrEqual(3)
      expect(Math.max(...counts.values()) / n).toBeLessThanOrEqual(0.4)
    }
  })

  it('spreads the drilled topic instead of clustering it', () => {
    const slots = build(40)
    let runs = 0
    for (let i = 1; i < slots.length; i++) {
      if (slots[i].topicId === 't_weak' && slots[i - 1].topicId === 't_weak') runs++
    }
    expect(runs).toBeLessThanOrEqual(1)
  })

  it('carries the 5-10% stretch share through from the difficulty plan', () => {
    const slots = build(40)
    const stretch = slots.filter(s => s.stretch).length
    expect(stretch / 40).toBeGreaterThanOrEqual(0.05)
    expect(stretch / 40).toBeLessThanOrEqual(0.10)
  })

  it('handles a single-topic drill without dividing by zero', () => {
    const slots = buildBlueprint({ topicIds: ['t_weak'], count: 15, band, mastery: MASTERY, recent: [], rng })
    expect(slots.length).toBe(15)
    expect(new Set(slots.map(s => s.topicId))).toEqual(new Set(['t_weak']))
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- weakness`
Expected: FAIL — `Failed to resolve import "./weakness"`.

- [ ] **Step 3: Implement `src/lib/weakness.ts`** per the algorithm above.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- weakness`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/weakness.ts src/lib/weakness.test.ts
git commit -m "Weakness-weighted session blueprint with capped extra drilling"
```

---

### Task 5: EduTest-calibrated question generation

**Files:**
- Modify: `src/lib/anthropic.ts`
- Modify: `src/types/index.ts` (add `passage?: string` to `Question`)
- Modify: `src/components/QuestionCard.tsx`

**Interfaces:**
- Consumes: `EXAM_CONTEXT`, `DOMAIN_GUIDANCE`, `TOPIC_GUIDANCE` from Task 1.
- Produces:
  - `generateQuestion(params: { topicId; topicName; domain: Domain; difficulty; previousQuestions; weekNumber })` — `domain` is new and required.
  - `generateReadingSet(params: { topicIds: string[]; difficulty: number; weekNumber: number; previousQuestions: string[] }): Promise<Question[]>` — one passage, 4 linked questions, each carrying the same `passage`.

- [ ] **Step 1: Rewrite `SYSTEM_PROMPT`**

Replace every ACER reference. The new prompt states the target is the EduTest paper for EDSC Alpha entry, restates the five sections, and adds these rules to the existing `QUESTION RULES` block:

```
EXAM FORMAT — MATCH IT EXACTLY:
- Every question is MULTIPLE CHOICE with exactly four options, labelled A) B) C) D).
- Never produce short_answer or numeric for an exam-section question.
- A strong candidate must be able to solve it in about 60 seconds, without a calculator.
- Distractors must be the mistakes a good student actually makes, not filler.
- Difficulty 5 = a routine EduTest item at this year level; 7 = a hard EduTest item;
  9-10 = a top-percentile item that separates the strongest candidates.
- Abstract, spatial and non-verbal pattern questions are NOT on this paper. Never produce one.
```

The `STUDENT PROFILE`, `TONE FOR EXPLANATIONS` and `ANSWER CORRECTNESS` blocks are unchanged — the answer-key verification behaviour must not regress.

- [ ] **Step 2: Thread `domain` into the user message**

```ts
const userContent = `${EXAM_CONTEXT}

SECTION: ${DOMAIN_GUIDANCE[params.domain]}

Generate ONE ${params.domain === 'reading' ? 'reading comprehension' : 'exam'} question for topic: "${params.topicName}" (id: ${params.topicId}).
Item type for this topic: ${TOPIC_GUIDANCE[params.topicId] ?? params.topicName}
Difficulty: ${params.difficulty}/10 on the scale defined above.
Week ${params.weekNumber} of 8 in the run-up to the exam.
...`
```

- [ ] **Step 3: Force multiple choice for exam domains**

After `parseQuestionJSON`, before the existing MC-options check:

```ts
// The paper is entirely multiple choice. A short-answer item here is a
// generation miss, not a variation — regenerate rather than serve it.
if (params.domain !== 'writing' && question.type !== 'multiple_choice') {
  throw new Error('NOT_MULTIPLE_CHOICE')
}
if (params.domain !== 'writing' && (question.options?.length ?? 0) !== 4) {
  throw new Error('WRONG_OPTION_COUNT')
}
```

Both errors feed the existing two-attempt retry loop, then the offline bank.

- [ ] **Step 4: Add `generateReadingSet`**

The real paper gives a passage then 4–6 questions on it; generating reading questions one at a time produced disconnected mini-passages. One call returns:

```json
{
  "passage_type": "literary | informational | persuasive",
  "passage": "120-220 words",
  "questions": [
    { "topic_id": "...", "question": "...", "options": ["A) ...","B) ...","C) ...","D) ..."],
      "working": "...", "correct_answer": "...", "difficulty": 7, "hint": "...", "explanation": "..." }
  ]
}
```

with an instruction that the four questions must use four *different* reading skills drawn from the supplied `topicIds`. Each returned `Question` gets `passage` set and `type: 'multiple_choice'`. Same validation as `generateQuestion` runs per question; any question failing validation is dropped, and the set is only used if ≥2 survive (otherwise the caller falls back to single-question generation).

- [ ] **Step 5: Render the passage in `QuestionCard`**

Above the question text, when `question.passage` is set:

```tsx
{question.passage && (
  <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto">
    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{question.passage}</p>
  </div>
)}
```

Add `numerical: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'` to `DOMAIN_COLOURS`.

- [ ] **Step 6: Verify the build and the live generator**

Run: `npm run build`
Expected: no TypeScript errors.

Run: `RUN_LIVE_TESTS=1 npm test -- anthropic.live`
Expected: PASS. This costs a few API calls; it is the only way to confirm the new prompt still yields parseable JSON with consistent answer keys.

- [ ] **Step 7: Commit**

```bash
git add src/lib/anthropic.ts src/types/index.ts src/components/QuestionCard.tsx
git commit -m "EduTest-calibrated generation: forced MC, domain guidance, reading passage sets"
```

---

### Task 6: Wire the blueprint into the session

**Files:**
- Modify: `src/hooks/useStudySession.ts`
- Create: `src/lib/examDate.ts`
- Modify: `src/lib/weeklyPlan.ts`
- Modify: `src/pages/ParentReport.tsx`

**Interfaces:**
- Consumes: `buildBlueprint` (Task 4), `getDifficultyBand` (Task 1), `examTopicsForDomain`/`adaptiveDelta` (Task 2), `generateQuestion`/`generateReadingSet` (Task 5).
- Produces: `useStudySession` return value gains nothing yet; internals change.

- [ ] **Step 1: Create `src/lib/examDate.ts`**

```ts
/** Fallback used when settings.exam_date is missing or unparseable. */
export const DEFAULT_EXAM_DATE = '2026-09-05'

export function parseExamDate(value?: string | null): Date {
  const d = new Date(value ?? DEFAULT_EXAM_DATE)
  return Number.isNaN(d.getTime()) ? new Date(DEFAULT_EXAM_DATE) : d
}
```

- [ ] **Step 2: Delete the three hardcoded exam dates**

`useStudySession.ts`, `weeklyPlan.ts` and `ParentReport.tsx` each hold `new Date('2026-08-14')` — a date that has already passed, which pins `getWeekNumber` at its week-8 clamp and drives every question to difficulty 8–10 regardless of the real timeline. Replace with `parseExamDate(settings.exam_date)`; `generateWeeklyPlan` takes `examDate: Date` as a third parameter, `ParentReport` reads it from `useSettings`.

- [ ] **Step 3: Build the blueprint at session init**

In `initSession`, extend the existing parallel fetch:

```ts
const [{ data: mastery }, { data: settingsRows }, { data: topicRows }, { data: recentRows }] =
  await Promise.all([
    supabase.from('mastery').select('*').eq('student_id', user.id),
    supabase.from('settings').select('key, value'),
    supabase.from('topics').select('id'),
    supabase.from('attempts')
      .select('topic_id, is_correct')
      .eq('student_id', user.id)
      .gte('attempted_at', new Date(Date.now() - 21 * 86400000).toISOString())
      .order('attempted_at', { ascending: false })
      .limit(300),
  ])
```

`topicRows` becomes `validTopicIds` (a `Set`, or `null` when the query returns nothing — see `examTopicsForDomain`). Then one blueprint per block:

```ts
const band = getDifficultyBand(weekNum, difficultyOffset.current)
const half = Math.ceil(totalQuestions / 2)
const blockA = forcedTopicId
  ? [forcedTopicId]
  : examTopicsForDomain(domainPair[0], validTopicIds)
const blockB = forcedTopicId
  ? [forcedTopicId]
  : examTopicsForDomain(domainPair[1], validTopicIds)

blueprint.current = [
  ...buildBlueprint({ topicIds: blockA, count: half, band, mastery: masteryRef.current, recent }),
  ...buildBlueprint({ topicIds: blockB, count: totalQuestions - half, band, mastery: masteryRef.current, recent }),
]
```

`streamBoundary.current = half` (currently hardcoded to 20, which mis-sliced every session that was not exactly 40 questions — a 20-question session never reached its second domain).

- [ ] **Step 4: Serve from the blueprint**

`fetchNextQuestion(questionNum)` now reads `blueprint.current[questionNum - 1]` for its topic and difficulty instead of calling `selectTopicFromDomain` and reading `currentDifficulty.current`:

```ts
const slot = blueprint.current[questionNum - 1]
topicId.current = slot.topicId
const difficulty = Math.max(5, Math.min(10, slot.difficulty + adaptiveDelta(recentResults.current)))
```

If a generated question is a duplicate on all three attempts, the retry re-rolls the topic to another topic in the same block before falling back to the offline bank.

- [ ] **Step 5: Add the reading-set queue**

```ts
const questionQueue = useRef<Question[]>([])
```

At the top of `fetchNextQuestion`: if the queue is non-empty, shift and `accept()` immediately. Otherwise, if `getTopicById(slot.topicId)?.domain === 'reading'`, count how many of the *next* slots are also reading (up to 4), call `generateReadingSet`, push all but the first onto the queue and accept the first. On failure, fall through to the existing single-question path. Queued questions must still pass through `seenQuestions` and `balanceOptions` in `accept()`.

- [ ] **Step 6: Verify**

Run: `npm run build && npm test`
Expected: build clean, all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useStudySession.ts src/lib/examDate.ts src/lib/weeklyPlan.ts src/pages/ParentReport.tsx
git commit -m "Blueprint-driven sessions; read exam date from settings"
```

---

### Task 7: Whole-test timer

**Files:**
- Create: `src/lib/sessionTimer.ts`
- Create: `src/lib/sessionTimer.test.ts`
- Create: `src/hooks/useCountdown.ts`
- Create: `src/components/SessionTimer.tsx`
- Modify: `src/hooks/useStudySession.ts`
- Modify: `src/pages/Study.tsx`
- Modify: `src/pages/Results.tsx`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:
  - `sessionTimeLimitSeconds(totalQuestions: number, settings: Record<string, string>): number | null` — `null` when the parent has the timer off.
  - `formatClock(seconds: number): string` — `"12:05"`.
  - `useCountdown(totalSeconds: number | null, onExpire: () => void)` → `{ remaining: number | null; start: () => void; stop: () => void }`
  - `<SessionTimer remaining={number} total={number} />`
  - `finishSession(opts?: { timedOut?: boolean })`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sessionTimer.test.ts
import { describe, it, expect } from 'vitest'
import { sessionTimeLimitSeconds, formatClock } from './sessionTimer'

describe('sessionTimeLimitSeconds', () => {
  it('defaults to 60 seconds per question — the real EduTest pace', () => {
    expect(sessionTimeLimitSeconds(20, {})).toBe(1200)
  })
  it('returns null when the parent has switched the timer off', () => {
    expect(sessionTimeLimitSeconds(20, { timer_enabled: 'false' })).toBeNull()
  })
  it('honours a custom pace', () => {
    expect(sessionTimeLimitSeconds(40, { timer_seconds_per_question: '45' })).toBe(1800)
  })
  it('ignores a nonsense pace rather than producing a zero-length test', () => {
    expect(sessionTimeLimitSeconds(10, { timer_seconds_per_question: 'abc' })).toBe(600)
    expect(sessionTimeLimitSeconds(10, { timer_seconds_per_question: '0' })).toBe(600)
  })
})

describe('formatClock', () => {
  it('renders mm:ss with a padded seconds field', () => {
    expect(formatClock(725)).toBe('12:05')
    expect(formatClock(60)).toBe('1:00')
    expect(formatClock(9)).toBe('0:09')
  })
  it('never renders a negative clock', () => {
    expect(formatClock(-5)).toBe('0:00')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- sessionTimer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/sessionTimer.ts`**

```ts
export const DEFAULT_SECONDS_PER_QUESTION = 60

/**
 * Total time for a session, or null when the parent has the timer off.
 * 60s/question is the real EduTest pace — a candidate has 30 minutes for a
 * section and usually under a minute per item.
 */
export function sessionTimeLimitSeconds(
  totalQuestions: number,
  settings: Record<string, string>,
): number | null {
  if (settings.timer_enabled === 'false') return null
  const parsed = parseInt(settings.timer_seconds_per_question ?? '', 10)
  const perQuestion = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SECONDS_PER_QUESTION
  return Math.max(60, totalQuestions * perQuestion)
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
```

- [ ] **Step 4: Implement `src/hooks/useCountdown.ts`**

Anchored to a wall-clock deadline, not a decrementing counter, so a backgrounded tab (which browsers throttle to one tick per minute) still shows the true remaining time when Aarav comes back:

```ts
import { useEffect, useRef, useState } from 'react'

export function useCountdown(totalSeconds: number | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState<number | null>(totalSeconds)
  const deadline = useRef<number | null>(null)
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  function start() {
    if (totalSeconds === null) return
    deadline.current = Date.now() + totalSeconds * 1000
    expired.current = false
    setRemaining(totalSeconds)
  }

  function stop() { deadline.current = null }

  useEffect(() => {
    if (totalSeconds === null) return
    const id = setInterval(() => {
      if (deadline.current === null) return
      const left = Math.round((deadline.current - Date.now()) / 1000)
      setRemaining(Math.max(0, left))
      if (left <= 0 && !expired.current) {
        expired.current = true
        deadline.current = null
        onExpireRef.current()
      }
    }, 500)
    return () => clearInterval(id)
  }, [totalSeconds])

  return { remaining, start, stop }
}
```

- [ ] **Step 5: Implement `src/components/SessionTimer.tsx`**

A pill showing `formatClock(remaining)` with a `Timer` lucide icon. Grey above 50% remaining, amber below 50%, red with `animate-pulse` below 20%. Include `aria-live="off"` and a `title` of "Time remaining for this test".

- [ ] **Step 6: Plumb the timer through `useStudySession`**

Add `timeLimitSeconds: number | null` as a hook parameter. Track `answeredCount` from `allAttempts.current.length`. `finishSession(opts?: { timedOut?: boolean })`:

```ts
const coreUpdate = {
  completed_at: new Date().toISOString(),
  total_questions: totalQuestions,
  correct_count: correctCountRef.current,
  duration_seconds: durationSeconds,
  session_type: sessionType,          // 'timed_test' | 'practice' | 'drill'
  time_limit_seconds: timeLimitSeconds,
  timed_out: opts?.timedOut ?? false,
}
```

with the existing `42703` fallback widened to strip `time_limit_seconds` and `timed_out` when those columns are not yet migrated. `session_type` is finally correct: `'drill'` for a forced-topic session, `'timed_test'` when a limit is set, `'practice'` otherwise — replacing `totalQuestions < 40 ? 'test' : 'practice'`, which tagged every quick and domain session as a test.

The `lastSessionResult` payload gains `timedOut: boolean` and `answeredCount: number`.

**Scoring on expiry:** the score recorded is `correct_count` over the *planned* `total_questions`. Questions never reached count against the score — that is what "mark the test when time runs out" means, and it is what the real paper does.

- [ ] **Step 7: Render the timer in `Study.tsx`**

```tsx
const { settings } = useSettings()
const timeLimitSeconds = config ? sessionTimeLimitSeconds(config.totalQuestions, settings) : null
const { remaining, start } = useCountdown(timeLimitSeconds, handleTimeUp)
```

`start()` fires from the same effect that calls `initSession`. `handleTimeUp` sets a `timeUp` flag, calls `finishSession({ timedOut: true })` and navigates to `/study/results`. The timer pill sits in the top row beside the exit button. Guard `handleTimeUp` with a ref so a double-fire cannot create two result payloads.

The stream transition screen does **not** pause the clock — the exam does not stop between sections.

- [ ] **Step 8: Show the timed-out state in `Results.tsx`**

When `result.timedOut`, render an amber banner above the score card: `Time's up — marked at {correctCount}/{totalQuestions}`, plus `{totalQuestions - answeredCount} question(s) not reached` when that is non-zero. The score card itself is unchanged: it already shows correct over planned total.

- [ ] **Step 9: Verify**

Run: `npm test -- sessionTimer` → PASS.
Run: `npm run build` → clean.
Run: `npm run dev`, start a 10-question session, confirm the pill counts down from 10:00, turns amber then red, and that letting it hit zero lands on the results screen with the "Time's up" banner and a saved session row.

- [ ] **Step 10: Commit**

```bash
git add src/lib/sessionTimer.ts src/lib/sessionTimer.test.ts src/hooks/useCountdown.ts src/components/SessionTimer.tsx src/hooks/useStudySession.ts src/pages/Study.tsx src/pages/Results.tsx src/types/index.ts
git commit -m "Whole-test countdown timer with mark-on-expiry"
```

---

### Task 8: Parent controls and the mode picker

**Files:**
- Modify: `src/pages/Settings.tsx`
- Modify: `src/pages/SessionModeSelect.tsx`
- Modify: `src/components/SessionStreamBanner.tsx`
- Modify: `src/components/StreamTransitionScreen.tsx`

- [ ] **Step 1: Add the Timed Tests section to `Settings.tsx`**

A new `<section>` between Sessions and Question Difficulty, following the existing card + `SaveButton` pattern:

- Toggle "Timed tests" bound to `timerOn`, saving `timer_enabled` as `'true'`/`'false'`. Sub-label: *"Aarav sees a countdown for the whole test and it is marked automatically when time runs out."*
- A 4-button pace selector (`45s` / `60s` / `75s` / `90s`) bound to `timer_seconds_per_question`, disabled and dimmed while the toggle is off, with the helper *"The real EduTest gives about 60 seconds per question."*
- A live preview line: *"A {defaultQ}-question session gets {formatClock(defaultQ * pace)}."*

Both keys save through the existing `saveSetting` helper in one `handleSaveTimer`.

- [ ] **Step 2: Retarget `SessionModeSelect.tsx` at the exam**

- `EXAM_DOMAINS` imported from `curriculum` instead of the local hardcoded array — this is what removes Abstract Reasoning from the picker and adds Numerical Reasoning.
- `DOMAIN_COLOUR` gains `numerical` (emerald) and drops `abstract`.
- Every mode card's badge shows the time limit alongside the question count when the timer is on: `20 questions · 20:00`. When the parent has it off, the badge reads `20 questions · untimed`.
- A new "Written Expression" mode card: *"One 15-minute writing task, marked against the EduTest rubric"*, badge `1 task · 15:00`, which calls `navigate('/study/writing')` rather than returning a `SessionConfig`.
- The Planned Session card's subtitle names the two domains from `plannedPair` so it is obvious which sections the session covers.

- [ ] **Step 3: Add numerical labels to the banner and transition screens**

Both components map domain → label/colour. Add `numerical` and remove `abstract` from those maps, sourcing labels from `DOMAIN_NAMES` rather than re-declaring them.

- [ ] **Step 4: Verify**

Run: `npm run build` → clean.
Run: `npm run dev`, open `/settings` as the parent, toggle the timer off, save, then open `/study` as the student and confirm every badge says "untimed" and no countdown appears.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx src/pages/SessionModeSelect.tsx src/components/SessionStreamBanner.tsx src/components/StreamTransitionScreen.tsx
git commit -m "Parent timer controls; exam-aligned session mode picker"
```

---

### Task 9: Written Expression task

**Files:**
- Create: `src/pages/WritingTask.tsx`
- Modify: `src/lib/anthropic.ts`
- Modify: `src/App.tsx`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces:
  - `generateWritingPrompt(params: { style: 'narrative' | 'persuasive'; weekNumber: number }): Promise<{ prompt: string; style: 'narrative' | 'persuasive'; guidance: string }>`
  - `markWritingResponse(params: { prompt: string; style: string; text: string }): Promise<WritingMark>` where
    `WritingMark = { ideas: number; structure: number; language: number; conventions: number; total: number; feedback: string; strengths: string[]; improvements: string[] }` — each criterion 0–4, `total` out of 16.

Written Expression is a real section of the paper (15 minutes, one prompt, no planning time) and is currently switched off entirely, so it is the one section Aarav gets no practice on.

- [ ] **Step 1: Add the two API functions to `anthropic.ts`**

`generateWritingPrompt` returns one EduTest-style stimulus — a single sentence or short scenario, openable by any Year 6 student with no specialist knowledge, alternating narrative and persuasive. `markWritingResponse` marks against the four published EduTest criteria on a 0–4 scale each, returning JSON only, with the same encouraging-tone rules as the rest of the app and at most three `strengths` and three `improvements`. On API failure `markWritingResponse` returns a neutral mark (`2` across the board) with feedback explaining that marking was unavailable, so a completed piece is never lost.

- [ ] **Step 2: Build `WritingTask.tsx`**

Four states in one page:

1. **Brief** — style, prompt, the 15-minute rule, "Start writing" button. The clock does not run yet.
2. **Writing** — full-height textarea, live word count, `SessionTimer` in the header, "Submit" button. `useCountdown(writingSeconds, autoSubmit)` where `writingSeconds = parseInt(settings.writing_time_seconds ?? '900')`, and `null` when `timer_enabled === 'false'`. Expiry auto-submits whatever is in the box.
3. **Marking** — spinner.
4. **Result** — the four criteria as labelled 0–4 bars, `total`/16, feedback, strengths and improvements as bullet lists, and CTAs back to the dashboard or to a new session.

Persistence on submit: insert a `sessions` row (`session_type: 'writing'`, `total_questions: 1`, `time_limit_seconds`, `timed_out`), one `attempts` row (`topic_id` = `writing_narrative` or `writing_persuasive`, `question_text` = the prompt, `student_answer` = the response, `is_correct` = `total >= 10`, `difficulty` = the week's core band, `ai_explanation` = feedback), then `runSessionEnd` so XP, streak and mastery all update the same way a normal session does. XP for the piece is `total * 10` (0–160), which sits in the same range as a short practice session.

Both inserts use the same `42703` degradation pattern as the rest of the app.

- [ ] **Step 3: Add the route to `App.tsx`**

```tsx
<Route
  path="/study/writing"
  element={<AuthGuard requireRole="student"><AuthLayout><WritingTask /></AuthLayout></AuthGuard>}
/>
```

- [ ] **Step 4: Verify**

Run: `npm run build` → clean.
Run: `npm run dev`, go to `/study` → "Written Expression", write two sentences, submit, and confirm a rubric mark renders and a session appears in the parent report.

- [ ] **Step 5: Commit**

```bash
git add src/pages/WritingTask.tsx src/lib/anthropic.ts src/App.tsx src/types/index.ts
git commit -m "Written Expression: timed 15-minute task with EduTest rubric marking"
```

---

### Task 10: Documentation, full verification and deploy

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Rewrite the exam sections of `CLAUDE.md`**

Replace the "Exam Context (Brief the AI on This)" and "Victorian Curriculum Alignment" sections: the EDSC Alpha test is an **EduTest**, five sections with their timings, all multiple choice, ~60s per question, no abstract reasoning. Update the topic table to the new taxonomy, document the new settings keys (`timer_enabled`, `timer_seconds_per_question`, `writing_time_seconds`), add `db/migrate_edutest_alignment.sql` to the migration list, and update the Known Issues block — the `session_type` mislabel and the hardcoded exam date are both fixed in this change.

- [ ] **Step 2: Full verification**

```bash
npm test          # every suite green
npm run lint      # no new errors
npm run build     # clean tsc + vite build
```

- [ ] **Step 3: Run the migration in Supabase**

Paste `db/migrate_edutest_alignment.sql` into Supabase → SQL Editor → Run. Confirm with:

```sql
select domain, count(*) from public.topics where active group by domain order by domain;
```

Expect `maths 8`, `numerical 5`, `reading 5`, `verbal 7`, `writing 3` and no active `abstract` rows.

- [ ] **Step 4: Deploy**

```bash
git push origin main
```

Netlify builds from `main` automatically. Confirm the deploy succeeds and the live site loads a session with a countdown.

- [ ] **Step 5: Commit the docs**

```bash
git add CLAUDE.md README.md
git commit -m "Document EduTest alignment, timer settings and the new migration"
git push origin main
```

---

## Self-Review

**Spec coverage**

| Requirement | Task |
|---|---|
| Questions in all subjects optimised for the EDSC Alpha test | 1 (spec + bands), 2 (taxonomy), 5 (prompts, forced MC, reading passages), 9 (writing) |
| Right level, 5–10% on the difficult side | 1 (`buildDifficultyPlan`, tested at 5–10%), 6 (band applied per session, stale exam date fixed) |
| Stick to this specific test for every subject | 2 (abstract retired, numerical added), 5 ("never produce abstract" rule), 8 (picker), 9 (writing section covered) |
| More questions on weak topics, 1–3 extra, no repeats, not a single-topic test | 4 (`buildBlueprint`, tested), 6 (wired in); existing `SeenQuestions` still enforces no repeats |
| Total timer, mark on expiry, record as that attempt's score | 7 |
| Parent switch to turn the timer off | 8 |

**Placeholders:** none — every step names exact files, exports and test assertions.

**Type consistency:** `Slot` (Task 4) is consumed by Task 6; `{core, stretch}` band shape is identical in Tasks 1, 4 and 6; `finishSession(opts?: { timedOut?: boolean })` matches its call sites in Tasks 7 and 8; `sessionTimeLimitSeconds` returns `number | null` and every consumer handles `null`; `Domain` gains `'numerical'` in Task 2 before Tasks 5–8 use it.

**Known risk:** new topic IDs do not exist in Supabase until Step 3 of Task 10 runs, and `attempts.topic_id` is a foreign key. `examTopicsForDomain` (Task 2, Step 4) filters candidate topics against the live `topics` table, and both numerical topics that existed before this change (`abstract_sequences`, `abstract_pattern_matrix`) are re-homed rather than replaced — so every exam domain resolves to at least two already-seeded IDs and sessions build correctly before *and* after the migration.
