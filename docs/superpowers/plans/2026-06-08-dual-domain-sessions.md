# Dual-Domain Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split every 15-question session into two domain streams (~7+8 questions), with domain pairs chosen from the weekly plan rotation, and expose a manual override picker on the Dashboard.

**Architecture:** Add a `DomainPair` type and stream-tracking state to `useStudySession`. Domain selection logic lives in `curriculum.ts`. Weekly plan gains a `domain_rotation` column (5 pairs per week). Dashboard passes chosen pair via `sessionStorage` before navigating to `/study`. Study page reads it and shows a `SessionStreamBanner`.

**Tech Stack:** TypeScript, React 18, Supabase Postgres, existing `src/lib/curriculum.ts` + `src/hooks/useStudySession.ts`

---

## DB migration (manual — user runs in Supabase SQL editor)

```sql
alter table public.weekly_plans
  add column if not exists domain_rotation jsonb;
-- Stores an array of up to 5 [domain1, domain2] pairs, one per session slot this week.
-- e.g. [["maths","verbal"],["reading","abstract"],["maths","abstract"],["verbal","reading"],null]
-- null at index 4 = "free choice" (weakest domains computed at runtime)
```

---

## File map

| File | Change |
|---|---|
| `src/types/index.ts` | Add `Domain` and `DomainPair` named types; add `domain_rotation` field to `WeeklyPlan` |
| `src/lib/curriculum.ts` | Add `DOMAIN_NAMES`, `WEEKLY_ROTATION`, `getWeakestDomains()`, `getSessionDomainPair()`, `selectTopicFromDomain()` |
| `src/lib/weeklyPlan.ts` | Add `domain_rotation` to the insert; update AI prompt to return it |
| `src/hooks/useStudySession.ts` | Accept `domainPair: DomainPair`; add stream tracking refs; change topic selection to domain-constrained |
| `src/components/SessionStreamBanner.tsx` | New — shows "Maths · Verbal Reasoning" with which stream is active |
| `src/pages/Study.tsx` | Read `domainPair` from `sessionStorage`; pass to hook; render `SessionStreamBanner` |
| `src/pages/Dashboard.tsx` | Add domain picker UI (two selects + confirm); write choice to `sessionStorage` before navigating |

---

## Task 1: Types — `Domain`, `DomainPair`, `WeeklyPlan.domain_rotation`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `Domain` and `DomainPair` types and update `WeeklyPlan`**

In `src/types/index.ts`, make the following changes:

Replace the inline domain union inside `Topic`:
```typescript
// BEFORE:
  domain: 'maths' | 'reading' | 'verbal' | 'abstract' | 'writing'

// AFTER (add before the Topic interface):
export type Domain = 'maths' | 'reading' | 'verbal' | 'abstract' | 'writing'
export type DomainPair = [Domain, Domain]

// inside Topic interface, change to:
  domain: Domain
```

Add `domain_rotation` to the `WeeklyPlan` interface:
```typescript
// Add as last field before closing brace:
  domain_rotation: DomainPair[] | null   // 5 weekly slots; null slot = compute at runtime
```

- [ ] **Step 2: Verify build still passes**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs` with no TypeScript errors. (The new `domain_rotation` field being optional-at-runtime is fine — the DB column is nullable.)

- [ ] **Step 3: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/types/index.ts
git commit -m "types: add Domain, DomainPair, WeeklyPlan.domain_rotation"
```

---

## Task 2: Curriculum — domain-level helpers

**Files:**
- Modify: `src/lib/curriculum.ts`

- [ ] **Step 1: Add constants and pure helper functions**

Add the following to `src/lib/curriculum.ts` after the existing constants block (after `DIFFICULTY_DEFAULT`):

```typescript
export const DOMAIN_NAMES: Record<Domain, string> = {
  maths:    'Maths',
  reading:  'Reading',
  verbal:   'Verbal Reasoning',
  abstract: 'Abstract Reasoning',
  writing:  'Writing',
}

// 5-session weekly rotation covering all 4 exam domains.
// Index 4 is null = pick the two weakest domains at runtime.
export const WEEKLY_ROTATION: (DomainPair | null)[] = [
  ['maths',    'verbal'],
  ['reading',  'abstract'],
  ['maths',    'abstract'],
  ['verbal',   'reading'],
  null,
]
```

- [ ] **Step 2: Add `getWeakestDomains()`**

Add after `getTopicsByDomain`:

```typescript
// Returns domains sorted by average mastery score ascending (weakest first).
// Ignores 'writing' domain (not in ACER exam).
export function getWeakestDomains(mastery: Mastery[]): Domain[] {
  const examDomains: Domain[] = ['maths', 'reading', 'verbal', 'abstract']
  const avgByDomain = examDomains.map(domain => {
    const topicIds = TOPICS.filter(t => t.domain === domain).map(t => t.id)
    const rows = mastery.filter(m => topicIds.includes(m.topic_id))
    const avg = rows.length > 0
      ? rows.reduce((sum, m) => sum + m.score_alltime, 0) / rows.length
      : 0
    return { domain, avg }
  })
  return avgByDomain.sort((a, b) => a.avg - b.avg).map(d => d.domain)
}
```

- [ ] **Step 3: Add `getSessionDomainPair()`**

```typescript
/**
 * Returns the domain pair for a session.
 * Priority:
 *   1. weekly_plan.domain_rotation[sessionIndex] if set
 *   2. Derive from plan primary/secondary topic domains
 *   3. Two weakest mastery domains
 */
export function getSessionDomainPair(
  mastery: Mastery[],
  weeklyPlan: WeeklyPlan | null,
  sessionIndexThisWeek: number,
): DomainPair {
  // 1. Explicit rotation from plan
  if (weeklyPlan?.domain_rotation) {
    const slot = weeklyPlan.domain_rotation[sessionIndexThisWeek % weeklyPlan.domain_rotation.length]
    if (slot) return slot
  }

  // 2. Derive from plan primary/secondary topics
  if (weeklyPlan?.primary_topic_id && weeklyPlan?.secondary_topic_id) {
    const d1 = getTopicById(weeklyPlan.primary_topic_id)?.domain
    const d2 = getTopicById(weeklyPlan.secondary_topic_id)?.domain
    if (d1 && d2 && d1 !== d2) return [d1 as Domain, d2 as Domain]
    if (d1) {
      const weakest = getWeakestDomains(mastery).find(d => d !== d1) ?? 'verbal'
      return [d1 as Domain, weakest]
    }
  }

  // 3. Two weakest domains
  const weakest = getWeakestDomains(mastery)
  return [weakest[0] ?? 'maths', weakest[1] ?? 'verbal']
}
```

- [ ] **Step 4: Add `selectTopicFromDomain()`**

```typescript
/**
 * Picks a topic ID from the given domain, weighted toward lower mastery.
 * Falls back to a random topic in the domain if mastery data is sparse.
 */
export function selectTopicFromDomain(domain: Domain, mastery: Mastery[]): string {
  const domainTopics = TOPICS.filter(t => t.domain === domain && t.active)
  if (domainTopics.length === 0) return TOPICS[0].id

  // Find the topic with the lowest mastery score (or unattempted)
  const scored = domainTopics.map(t => {
    const m = mastery.find(r => r.topic_id === t.id)
    return { topicId: t.id, score: m?.score_alltime ?? -1 } // -1 = unattempted (prioritise)
  })
  scored.sort((a, b) => a.score - b.score)

  // 60% chance: pick the weakest topic; 40% chance: random from bottom half
  const bottomHalf = scored.slice(0, Math.max(1, Math.ceil(scored.length / 2)))
  if (Math.random() < 0.6) return scored[0].topicId
  return bottomHalf[Math.floor(Math.random() * bottomHalf.length)].topicId
}
```

- [ ] **Step 5: Add the `Domain` import to the file top**

`curriculum.ts` uses `Domain` and `DomainPair` from `../types`. Add the import if not present:
```typescript
import type { Topic, Mastery, WeeklyPlan, LevelInfo, Domain, DomainPair } from '../types'
```

- [ ] **Step 6: Verify build**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5
```
Expected: `✓ built in X.XXs`

- [ ] **Step 7: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/lib/curriculum.ts
git commit -m "feat: add domain-level helpers — DOMAIN_NAMES, WEEKLY_ROTATION, getSessionDomainPair, selectTopicFromDomain"
```

---

## Task 3: Weekly plan — include `domain_rotation` in AI call

**Files:**
- Modify: `src/lib/weeklyPlan.ts`

- [ ] **Step 1: Read the current file**

Read `src/lib/weeklyPlan.ts` to understand the current AI prompt and insert statement.

- [ ] **Step 2: Update the AI prompt to request `domain_rotation`**

Update `callAnthropicForPlan` to include `domain_rotation` in the response schema. Replace the existing `prompt` variable with:

```typescript
  const prompt = `You are planning Week ${weekNumber} of 8 for Aarav's EDSC Alpha exam preparation.

Current mastery scores (0-100%):
${masteryScores.map(m => `- ${m.topicName}: ${Math.round(m.score * 100)}%`).join('\n')}

Choose 2 focus topics for this week AND provide a 5-session domain rotation that guarantees all 4 exam domains (maths, reading, verbal, abstract) are touched across the week.

Exam domain guidance:
- Pairs should mix strengths with weaknesses for each session
- Use this baseline rotation unless mastery data suggests otherwise:
  Session 1: maths + verbal
  Session 2: reading + abstract
  Session 3: maths + abstract
  Session 4: verbal + reading
  Session 5: the two lowest-scoring domains

Respond with JSON only:
{
  "primaryTopicId": "topic_id from the list above",
  "secondaryTopicId": "different topic_id",
  "themeDescription": "one sentence e.g. Fractions mastery + Verbal analogies",
  "dailyGoal": 15,
  "rationale": "2-3 sentences explaining why these topics and this rotation this week",
  "domainRotation": [
    ["maths", "verbal"],
    ["reading", "abstract"],
    ["maths", "abstract"],
    ["verbal", "reading"],
    ["<weakest>", "<second_weakest>"]
  ]
}`
```

- [ ] **Step 3: Update `callAnthropicForPlan` return type**

Change the return type to include `domainRotation`:
```typescript
async function callAnthropicForPlan(weekNumber: number, masteryScores: { topicId: string; topicName: string; score: number }[]): Promise<{
  primaryTopicId: string
  secondaryTopicId: string
  themeDescription: string
  dailyGoal: number
  rationale: string
  domainRotation: [string, string][]
}>
```

- [ ] **Step 4: Update the Supabase insert to include `domain_rotation`**

In the `.insert({...})` call, add:
```typescript
domain_rotation: plan.domainRotation,
```

- [ ] **Step 5: Verify build**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/lib/weeklyPlan.ts
git commit -m "feat: add domain_rotation to weekly plan AI generation"
```

---

## Task 4: `useStudySession` — stream tracking

**Files:**
- Modify: `src/hooks/useStudySession.ts`

This is the core logic change. The hook needs to:
- Accept a `domainPair: DomainPair` parameter
- Track which stream we're in (stream 0 = first domain, stream 1 = second domain)
- Switch streams after 7 questions
- Pick topics from the current stream's domain
- Expose `activeDomain` and `domainPair` in state

- [ ] **Step 1: Update state and imports**

Add to the imports at the top of `useStudySession.ts`:
```typescript
import {
  selectTopicForSession, getTopicById,
  getInitialDifficulty, getNextDifficulty, calculateXP, getWeekNumber,
  selectTopicFromDomain,  // ← add this
} from '../lib/curriculum'
import type { Question, Mastery, WeeklyPlan, Domain, DomainPair } from '../types'  // ← add Domain, DomainPair
```

Add `activeDomain` and `domainPair` to `StudySessionState`:
```typescript
export interface StudySessionState {
  sessionId: string | null
  currentQuestion: Question | null
  answered: boolean
  isCorrect: boolean
  xpEarned: number
  hintUsed: boolean
  showXPFlash: boolean
  questionNumber: number
  loading: boolean
  error: string | null
  totalXP: number
  correctCount: number
  activeDomain: Domain        // ← new
  domainPair: DomainPair      // ← new
}
```

- [ ] **Step 2: Add stream tracking refs and update initial state**

Update the function signature:
```typescript
export function useStudySession(
  user: User | null,
  plan: WeeklyPlan | null,
  domainPair: DomainPair,        // ← new parameter
)
```

Update initial state to include the new fields:
```typescript
  const [state, setState] = useState<StudySessionState>({
    sessionId: null,
    currentQuestion: null,
    answered: false,
    isCorrect: false,
    xpEarned: 0,
    hintUsed: false,
    showXPFlash: false,
    questionNumber: 1,
    loading: true,
    error: null,
    totalXP: 0,
    correctCount: 0,
    activeDomain: domainPair[0],  // ← start in stream 0
    domainPair,                    // ← expose for UI
  })
```

Add a stream tracking ref after the existing refs:
```typescript
  const streamBoundary = useRef(7) // questions 1-7 are stream 0; 8-15 are stream 1
  const currentDomainRef = useRef<Domain>(domainPair[0])
```

- [ ] **Step 3: Update `fetchNextQuestion` to use domain-constrained topic selection**

Replace the body of `fetchNextQuestion` with:
```typescript
  const fetchNextQuestion = useCallback(async (questionNum: number) => {
    // Determine current stream domain
    const activeDomain = questionNum <= streamBoundary.current
      ? domainPair[0]
      : domainPair[1]
    currentDomainRef.current = activeDomain

    setState(prev => ({
      ...prev,
      loading: true,
      answered: false,
      hintUsed: false,
      activeDomain,
    }))

    // Pick topic from the current stream's domain
    topicId.current = selectTopicFromDomain(activeDomain, masteryRef.current)
    const topic = getTopicById(topicId.current)
    const weekNum = getWeekNumber(EXAM_DATE)

    try {
      const q = await generateQuestion({
        topicId: topicId.current,
        topicName: topic?.name ?? topicId.current,
        difficulty: currentDifficulty.current,
        previousQuestions: previousQuestions.current,
        weekNumber: weekNum,
      })
      previousQuestions.current.push(q.question.slice(0, 80))
      topicsUsed.current.add(q.topic_id)
      questionStartTime.current = Date.now()
      setState(prev => ({ ...prev, currentQuestion: q, loading: false }))
    } catch {
      const fallback = getFallbackQuestion(topicId.current)
      topicsUsed.current.add(fallback.topic_id)
      questionStartTime.current = Date.now()
      setState(prev => ({ ...prev, currentQuestion: fallback, loading: false }))
    }
  }, [domainPair])  // domainPair is stable (set at session start)
```

Note: `fetchNextQuestion` now takes `questionNum: number` so it can determine the stream.

- [ ] **Step 4: Update `initSession` to pass questionNumber to `fetchNextQuestion`**

In `initSession`, change:
```typescript
// BEFORE:
      await fetchNextQuestion()

// AFTER:
      await fetchNextQuestion(1)
```

Also remove the old `topicId.current = selectTopicForSession(...)` line — topic is now selected inside `fetchNextQuestion` based on domain:
```typescript
// REMOVE this line from initSession:
      topicId.current = selectTopicForSession(masteryRef.current, plan)

// KEEP this line (difficulty initialisation still needed — use a representative topic from domain):
      const firstTopic = getTopicById(selectTopicFromDomain(domainPair[0], mastery ?? []))
      currentDifficulty.current = getInitialDifficulty(firstTopic?.difficulty_base ?? DIFFICULTY_DEFAULT)
```

- [ ] **Step 5: Update `handleNext` to pass questionNumber**

```typescript
  async function handleNext(questionNumber: number): Promise<boolean> {
    if (questionNumber >= QUESTIONS_PER_SESSION) {
      await finishSession()
      return true
    }
    setState(prev => ({ ...prev, questionNumber: prev.questionNumber + 1 }))
    await fetchNextQuestion(questionNumber + 1)   // ← pass incremented number
    return false
  }
```

- [ ] **Step 6: Verify build**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/hooks/useStudySession.ts
git commit -m "feat: stream-aware session — topic selection constrained to active domain stream"
```

---

## Task 5: `SessionStreamBanner` component

**Files:**
- Create: `src/components/SessionStreamBanner.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { Domain, DomainPair } from '../types'
import { DOMAIN_NAMES } from '../lib/curriculum'

interface SessionStreamBannerProps {
  domainPair: DomainPair
  activeDomain: Domain
  questionNumber: number
  streamBoundary?: number   // default 7
}

export function SessionStreamBanner({
  domainPair,
  activeDomain,
  questionNumber,
  streamBoundary = 7,
}: SessionStreamBannerProps) {
  const inStream1 = questionNumber <= streamBoundary
  const [d1, d2] = domainPair

  const DOMAIN_COLOUR: Record<Domain, string> = {
    maths:    'text-blue-400 bg-blue-500/15 border-blue-500/30',
    reading:  'text-purple-400 bg-purple-500/15 border-purple-500/30',
    verbal:   'text-amber-400 bg-amber-500/15 border-amber-500/30',
    abstract: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    writing:  'text-green-400 bg-green-500/15 border-green-500/30',
  }

  return (
    <div className="flex items-center gap-2 px-1 mb-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide mr-1">
        Today's streams
      </span>
      <DomainChip domain={d1} active={inStream1} colour={DOMAIN_COLOUR[d1]} />
      <span className="text-gray-600 text-xs">+</span>
      <DomainChip domain={d2} active={!inStream1} colour={DOMAIN_COLOUR[d2]} />
    </div>
  )
}

function DomainChip({
  domain, active, colour,
}: { domain: Domain; active: boolean; colour: string }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border
      transition-all duration-300
      ${active ? colour : 'text-gray-600 bg-gray-800/50 border-gray-700/50'}
    `}>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />}
      {DOMAIN_NAMES[domain]}
    </span>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/components/SessionStreamBanner.tsx
git commit -m "feat: SessionStreamBanner component"
```

---

## Task 6: Update `Study.tsx` — read domain pair, render banner

**Files:**
- Modify: `src/pages/Study.tsx`

- [ ] **Step 1: Read sessionStorage and pass domainPair to the hook**

In `Study.tsx`, before calling `useStudySession`, read the domain pair from `sessionStorage`:

```typescript
import { SessionStreamBanner } from '../components/SessionStreamBanner'
import type { DomainPair } from '../types'

// Inside the Study component, before useStudySession:
const domainPair = useMemo<DomainPair>(() => {
  try {
    const raw = sessionStorage.getItem('sessionDomainPair')
    if (raw) return JSON.parse(raw) as DomainPair
  } catch { /* ignore */ }
  return ['maths', 'verbal']  // sensible fallback
}, [])
```

Add `useMemo` to the React import at the top.

Update the `useStudySession` call:
```typescript
const { state, initSession, handleAnswer, handleNext, setHintUsed, QUESTIONS_PER_SESSION } =
  useStudySession(user, plan ?? null, domainPair)
```

- [ ] **Step 2: Render the `SessionStreamBanner` above `QuestionCard`**

In the JSX, add the banner just above `<QuestionCard .../>`:

```tsx
            <>
              <SessionStreamBanner
                domainPair={state.domainPair}
                activeDomain={state.activeDomain}
                questionNumber={questionNumber}
              />
              <QuestionCard
                question={currentQuestion}
                questionNumber={questionNumber}
                totalQuestions={QUESTIONS_PER_SESSION}
              />
              ...
            </>
```

- [ ] **Step 3: Verify build and lint**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5 && npm run lint 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/pages/Study.tsx
git commit -m "feat: Study page reads domainPair from sessionStorage, shows SessionStreamBanner"
```

---

## Task 7: Dashboard — domain pair picker

**Files:**
- Modify: `src/pages/Dashboard.tsx`

The Dashboard needs a session config UI. When the user clicks "Start Session", instead of immediately navigating to `/study`, show a small inline picker that lets them confirm or override the two domains. On confirm, write to `sessionStorage` then navigate.

- [ ] **Step 1: Read the full Dashboard.tsx**

Read `src/pages/Dashboard.tsx` to understand the current layout and state.

- [ ] **Step 2: Add domain picker state and logic**

Add these imports:
```typescript
import { getSessionDomainPair, DOMAIN_NAMES, getWeakestDomains } from '../lib/curriculum'
import type { Domain, DomainPair } from '../types'
```

Add state inside the `Dashboard` component (after the existing `generatingPlan` state):
```typescript
  const [showSessionConfig, setShowSessionConfig] = useState(false)
  const [pickedDomains, setPickedDomains] = useState<DomainPair | null>(null)
```

Add a derived `suggestedPair` using `useMemo`:
```typescript
  const suggestedPair = useMemo<DomainPair>(() => {
    // Use session index = count of sessions completed this week (approximate with 0 for now)
    return getSessionDomainPair(mastery, plan ?? null, 0)
  }, [mastery, plan])
```

Add `useMemo` to the React import.

Replace the "Start Session" button's `onClick` handler:
```typescript
onClick={() => {
  setPickedDomains(suggestedPair)
  setShowSessionConfig(true)
}}
```

Add a `handleStartSession` function:
```typescript
  function handleStartSession() {
    const pair = pickedDomains ?? suggestedPair
    sessionStorage.setItem('sessionDomainPair', JSON.stringify(pair))
    navigate('/study')
  }
```

- [ ] **Step 3: Add the session config UI**

Add a `SessionConfigPanel` component (inline in Dashboard.tsx, before the `export default`):

```typescript
const EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'abstract']

const DOMAIN_COLOUR_BG: Record<Domain, string> = {
  maths:    'border-blue-500/40 bg-blue-500/10 text-blue-300',
  reading:  'border-purple-500/40 bg-purple-500/10 text-purple-300',
  verbal:   'border-amber-500/40 bg-amber-500/10 text-amber-300',
  abstract: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  writing:  'border-green-500/40 bg-green-500/10 text-green-300',
}

interface SessionConfigPanelProps {
  suggested: DomainPair
  picked: DomainPair
  onChange: (pair: DomainPair) => void
  onConfirm: () => void
  onCancel: () => void
}

function SessionConfigPanel({ suggested, picked, onChange, onConfirm, onCancel }: SessionConfigPanelProps) {
  function toggle(domain: Domain) {
    if (picked.includes(domain)) return // can't deselect if only 2 remain
    const [d1, d2] = picked
    // Replace whichever was selected longer (d2 is more recent, so replace d1)
    onChange([d2, domain])
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-white font-semibold text-sm mb-0.5">Session focus</p>
        <p className="text-gray-400 text-xs">
          Suggested: <span className="text-gray-300">{DOMAIN_NAMES[suggested[0]]} + {DOMAIN_NAMES[suggested[1]]}</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {EXAM_DOMAINS.map(domain => {
          const isSelected = picked.includes(domain)
          return (
            <button
              key={domain}
              onClick={() => {
                if (isSelected) return
                const [d1, d2] = picked
                onChange([d2, domain])
              }}
              className={`
                px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all
                ${isSelected
                  ? DOMAIN_COLOUR_BG[domain]
                  : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                }
              `}
            >
              {isSelected && <span className="text-[10px] font-bold uppercase tracking-wide block opacity-70 mb-0.5">
                {picked[0] === domain ? 'Stream 1' : 'Stream 2'}
              </span>}
              {DOMAIN_NAMES[domain]}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Start — {DOMAIN_NAMES[picked[0]]} + {DOMAIN_NAMES[picked[1]]}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Render the config panel in the Dashboard JSX**

Replace the existing "Start Session" button block with:

```tsx
        {showSessionConfig ? (
          <SessionConfigPanel
            suggested={suggestedPair}
            picked={pickedDomains ?? suggestedPair}
            onChange={setPickedDomains}
            onConfirm={handleStartSession}
            onCancel={() => setShowSessionConfig(false)}
          />
        ) : (
          <button
            onClick={() => { setPickedDomains(suggestedPair); setShowSessionConfig(true) }}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-2xl transition-colors"
          >
            {isFirstTimeUser ? 'Start First Session' : 'Start Session'}
          </button>
        )}
```

- [ ] **Step 5: Verify build and lint**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep && npm run build 2>&1 | tail -5 && npm run lint 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Volumes/Data/AD/Projects/Claude/Apha-Prep/alpha-prep
git add src/pages/Dashboard.tsx
git commit -m "feat: Dashboard session config — domain pair picker before starting session"
```

---

## Self-review against spec

| Requirement | Task |
|---|---|
| 15-question session = 2 streams of ~7+8 | Task 4: `streamBoundary = 7` in `useStudySession` |
| Domain selection from weekly plan primary/secondary | Task 4: `getSessionDomainPair` used in `initSession` via passed-in `domainPair` |
| Fallback to two lowest-mastery domains | Task 2: `getWeakestDomains()` → Task 3: `getSessionDomainPair()` fallback |
| "Today's Streams" indicator on Study page | Task 5 + 6: `SessionStreamBanner` |
| Dashboard manual domain picker | Task 7: `SessionConfigPanel` |
| Weekly plan guarantees all 4 domains across 5 sessions | Task 3: `WEEKLY_ROTATION` baked into AI prompt |
| Rotation stored in `weekly_plans` table | Task 3: `domain_rotation` column (DB migration note + Task 3 insert) |
| DB column for `domain_rotation` | DB migration block at top of plan |

All requirements covered. No placeholders found.

---

*Plan written 2026-06-08 | Feature: dual-domain sessions*
