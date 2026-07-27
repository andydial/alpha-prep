# Parent Session Reporting — Design

**Date:** 2026-07-27
**Requested by:** Andy (parent/admin)

## Problem

The parent view is not useful for the thing Andy actually wants to do: sit down with
Aarav and go through the mistakes from his last session.

Specifically:

1. There is no list of all sessions. `/report` shows the last 10 only; the parent
   dashboard shows the last 5.
2. Time spent per session is buried in a column that is hidden on mobile.
3. There is no way to open a session and see what happened inside it — no per-topic
   breakdown, and no view of the questions he got wrong.

Two data defects compound this:

- **Most sessions are invisible.** `useStudySession.ts` writes
  `session_type: totalQuestions < 40 ? 'test' : 'practice'`, so every quick /
  single-domain / topic-drill session is tagged `'test'`. Both parent screens filter
  with `.neq('session_type', 'test')`, so only full 40-question sessions have ever
  been shown.
- **Question counts are the planned number, not the actual.** `finishSession()` writes
  `total_questions` as the configured target. A session abandoned after 12 questions
  still records 40.

## Solution

### 1. `/report` rebuilt, sessions-first

Order of the page, top to bottom:

1. Header (title, exam countdown, Print button) — unchanged.
2. Summary strip: sessions, questions, accuracy, total study time. Computed from real
   attempt rows, not `sessions.total_questions`.
3. **All Sessions** — every completed session, newest first. No `'test'` filter, no
   last-10 cut-off. Columns: date + time of day, duration, questions attempted, score
   (`x/y` + %), chevron. Whole row is a link to the drill-down.
4. **Overall progress** — collapsed `<details>`, containing the existing domain scores,
   topic mastery bars, badges, and focus areas. Expanded automatically when printing.

### 2. `/report/session/:id` — session drill-down

Reachable from every session row, not just the most recent.

- Header: full date and time, duration, back link.
- Summary tiles: attempted, correct, accuracy, duration.
- **By topic:** attempts grouped by domain, then topic. Each row shows `correct/total`
  and a colour-coded percentage. Domain rows show the roll-up.
- **Mistakes (N):** one card per incorrect attempt, in the order they were answered.
  Each card shows the topic name, the full question text, Aarav's answer (red), and the
  correct answer (green).

Explanations, MC option lists, and per-question metadata (time, difficulty, hint) are
deliberately excluded — Andy chose the minimal card. Multiple-choice answers are stored
as the full option string (`"C) 2 5/8 cups"`), so the answer pair reads correctly
without listing all options.

### 3. Data handling

- Drop `.neq('session_type', 'test')` everywhere in the parent views.
- Filter to `completed_at is not null`; a session with zero saved attempts is shown with
  a `0 Q` count rather than hidden, so nothing silently disappears.
- Derive attempted/correct per session by fetching `(session_id, is_correct)` for all of
  the student's attempts in one query and grouping client-side. Falls back to the stored
  `total_questions` / `correct_count` for any session with no attempt rows.

### 4. Access

The drill-down requires the parent account to have SELECT on `public.attempts`.
`db/parent_read_policies.sql` ships as a re-runnable script (idempotent, uses the
existing `is_parent_user()` SECURITY DEFINER helper). If sessions load but attempts come
back empty, the UI shows a specific "run this SQL" message rather than a blank screen.

## Components

| File | Purpose |
|---|---|
| `src/hooks/useParentReport.ts` | Loads sessions + per-session attempt tallies + mastery + badges for the student |
| `src/components/parent/SessionList.tsx` | The all-sessions table; rows link to the drill-down |
| `src/pages/ParentReport.tsx` | Rebuilt: summary strip, `<SessionList>`, collapsed progress section |
| `src/pages/ParentSessionDetail.tsx` | Drill-down: summary, topic breakdown, mistake cards |
| `src/components/parent/MistakeCard.tsx` | One wrong answer: question, his answer, correct answer |
| `db/parent_read_policies.sql` | Idempotent parent SELECT policies |

Splitting `ParentReport` this way keeps every file under the 200-line rule in CLAUDE.md.

## Out of scope

- Fixing the `session_type` mislabelling at the write site. The parent views stop
  filtering on it, which solves the visible problem; changing what gets written would
  not retroactively fix existing rows and risks the student-side logic.
- Multi-child support. `STUDENT_ID` stays a constant, as it is today.
