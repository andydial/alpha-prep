import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2, PenLine } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useSettings } from '../hooks/useSettings'
import { useCountdown } from '../hooks/useCountdown'
import { supabase } from '../lib/supabase'
import { generateWritingPrompt, markWritingResponse, type WritingPrompt } from '../lib/anthropic'
import { getWeekNumber } from '../lib/curriculum'
import { getDifficultyBand } from '../lib/examSpec'
import { parseExamDate } from '../lib/examDate'
import { writingTimeLimitSeconds, formatClock } from '../lib/sessionTimer'
import { runSessionEnd } from '../lib/sessionEnd'
import { SessionTimer } from '../components/SessionTimer'
import type { WritingMark } from '../types'

/**
 * Written Expression — the fifth section of the EduTest paper.
 *
 * One prompt, fifteen minutes, no planning time. This was the one section of
 * the real exam the app gave Aarav no practice at: the writing domain was
 * switched off and there was no way to attempt a long-form task at all.
 *
 * The piece is marked against the four published criteria (ideas, structure,
 * language, conventions) at 0-4 each, and recorded as a one-question session so
 * it flows into XP, streak, mastery and the parent report like any other.
 */

type Stage = 'brief' | 'writing' | 'marking' | 'result'

/** Score at or above which the attempt counts as "correct" for accuracy stats. */
const PASS_MARK = 10

function CriterionBar({ label, score }: { label: string; score: number }) {
  const tone = score >= 3 ? 'bg-green-500' : score >= 2 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-sm">{label}</span>
        <span className="text-white text-sm font-semibold tabular-nums">{score}/4</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${tone}`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>
    </div>
  )
}

export function WritingTask() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { settings, loading: settingsLoading } = useSettings()

  const [stage, setStage] = useState<Stage>('brief')
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null)
  const [text, setText] = useState('')
  const [mark, setMark] = useState<WritingMark | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startedAt = useRef(0)
  const submitting = useRef(false)
  const textRef = useRef('')
  textRef.current = text

  const weekNumber = getWeekNumber(parseExamDate(settings.exam_date))
  const timeLimit = settingsLoading ? null : writingTimeLimitSeconds(settings)

  // Alternate narrative and persuasive by prep week so both get practised.
  const style: 'narrative' | 'persuasive' = weekNumber % 2 === 0 ? 'persuasive' : 'narrative'

  useEffect(() => {
    if (settingsLoading) return
    let cancelled = false
    generateWritingPrompt({ style, weekNumber })
      .then(p => { if (!cancelled) setPrompt(p) })
      .catch(() => { if (!cancelled) setError('Could not load a writing prompt. Please try again.') })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading])

  const { remaining, start: startClock, stop: stopClock } = useCountdown(
    timeLimit,
    () => { void submit(true) },
  )

  function begin() {
    startedAt.current = Date.now()
    setStage('writing')
    startClock()
  }

  async function submit(fromTimer = false) {
    if (submitting.current) return
    submitting.current = true
    stopClock()
    setTimedOut(fromTimer)
    setStage('marking')

    const response = textRef.current.trim()
    const durationSeconds = Math.round((Date.now() - startedAt.current) / 1000)
    const result = await markWritingResponse({
      prompt: prompt?.prompt ?? '',
      style,
      text: response,
    })
    setMark(result)
    setStage('result')

    if (!user) return
    try {
      await persist(result, response, durationSeconds, fromTimer)
    } catch (err) {
      console.error('[WritingTask] could not save the attempt:', err)
    }
  }

  async function persist(
    result: WritingMark,
    response: string,
    durationSeconds: number,
    wasTimedOut: boolean,
  ) {
    if (!user) return
    const topicId = style === 'persuasive' ? 'writing_persuasive' : 'writing_narrative'
    const difficulty = getDifficultyBand(
      weekNumber,
      parseInt(settings.difficulty_offset ?? '0', 10) || 0,
    ).core
    // A 16-mark rubric mapped onto the same XP scale a short session earns.
    const xp = result.total * 10

    const baseSession = {
      student_id: user.id,
      session_type: 'writing',
      week_number: weekNumber,
      completed_at: new Date().toISOString(),
      total_questions: 1,
      correct_count: result.total >= PASS_MARK ? 1 : 0,
      duration_seconds: durationSeconds,
    }
    let { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        ...baseSession,
        xp_earned: xp,
        time_limit_seconds: timeLimit,
        timed_out: wasTimedOut,
      })
      .select().single()
    if (sessionError?.code === '42703') {
      // Timer / xp columns not yet migrated — retry with the core fields only.
      ;({ data: session, error: sessionError } = await supabase
        .from('sessions').insert(baseSession).select().single())
    }
    if (sessionError || !session) throw sessionError ?? new Error('session insert failed')

    const baseAttempt = {
      session_id: session.id,
      student_id: user.id,
      topic_id: topicId,
      question_text: prompt?.prompt ?? '',
      question_type: 'short_answer',
      options: null,
      correct_answer: `Rubric: ideas ${result.ideas}/4, structure ${result.structure}/4, language ${result.language}/4, conventions ${result.conventions}/4`,
      student_answer: response,
      is_correct: result.total >= PASS_MARK,
      difficulty,
      time_seconds: durationSeconds,
      ai_explanation: result.feedback,
      hint_used: false,
    }
    const { error: attemptError } = await supabase
      .from('attempts').insert({ ...baseAttempt, xp_earned: xp })
    if (attemptError?.code === '42703') {
      await supabase.from('attempts').insert(baseAttempt)
    } else if (attemptError) {
      console.error('[WritingTask] attempt insert failed:', attemptError)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('xp_total, level, streak_current, last_session_date')
      .eq('id', user.id)
      .single()

    await runSessionEnd({
      studentId: user.id,
      sessionId: session.id,
      attempts: [{
        topicId,
        isCorrect: result.total >= PASS_MARK,
        difficulty,
        timeTaken: durationSeconds,
      }],
      xpEarned: xp,
      currentXPTotal: profile?.xp_total ?? 0,
      currentStreak: profile?.streak_current ?? 0,
      lastSessionDate: profile?.last_session_date ?? null,
    })
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center space-y-4">
        <p className="text-red-400 font-medium">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 max-w-2xl mx-auto px-4 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 pb-5">
        {stage === 'brief' && (
          <button
            onClick={() => navigate('/study')}
            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            aria-label="Back to session picker"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-xl leading-tight">Written Expression</h1>
          <p className="text-gray-400 text-sm capitalize">
            {style} · {timeLimit === null ? 'untimed' : `${Math.round(timeLimit / 60)} minutes`} · no planning time
          </p>
        </div>
        {stage === 'writing' && <SessionTimer remaining={remaining} total={timeLimit} />}
      </div>

      {/* Brief */}
      {stage === 'brief' && (
        <div className="space-y-4">
          {!prompt ? (
            <div className="flex flex-col items-center gap-4 py-20">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
              <p className="text-gray-400 text-sm">Preparing your task…</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                  Your prompt
                </p>
                <p className="text-white text-lg leading-relaxed">{prompt.prompt}</p>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-2">
                <p className="text-gray-300 text-sm font-medium">How this is marked</p>
                <p className="text-gray-400 text-sm leading-relaxed">{prompt.guidance}</p>
                <p className="text-gray-500 text-xs pt-1">
                  Four criteria, 0–4 each: ideas, structure, language, conventions.
                  {timeLimit !== null &&
                    ` The clock starts the moment you press begin, and the piece is marked automatically at ${formatClock(timeLimit)}.`}
                </p>
              </div>

              <button
                onClick={begin}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg
                           rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <PenLine size={18} />
                Start writing
              </button>
            </>
          )}
        </div>
      )}

      {/* Writing */}
      {stage === 'writing' && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
            <p className="text-white text-base leading-relaxed">{prompt?.prompt}</p>
          </div>

          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Start writing…"
            className="w-full min-h-[45vh] bg-gray-900 border border-gray-800 rounded-2xl p-5 text-white
                       text-base leading-relaxed resize-y focus:outline-none focus:border-blue-500 transition-colors"
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-gray-500 text-sm tabular-nums">{wordCount} words</span>
            <button
              onClick={() => { void submit(false) }}
              disabled={wordCount === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40
                         disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Submit for marking
            </button>
          </div>
        </div>
      )}

      {/* Marking */}
      {stage === 'marking' && (
        <div className="flex flex-col items-center gap-4 py-24">
          <Loader2 size={28} className="text-blue-400 animate-spin" />
          <p className="text-gray-400 text-sm">
            {timedOut ? "Time's up — marking your piece…" : 'Marking your piece…'}
          </p>
        </div>
      )}

      {/* Result */}
      {stage === 'result' && mark && (
        <div className="space-y-4">
          {timedOut && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl px-5 py-3">
              <p className="text-amber-300 text-sm font-semibold">
                Time's up — your piece was marked exactly as it stood.
              </p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-2">
            <div className={`text-5xl font-black tabular-nums ${
              mark.total >= 12 ? 'text-green-400' : mark.total >= 9 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {mark.total}
              <span className="text-gray-500 text-3xl"> / 16</span>
            </div>
            <p className="text-gray-400 text-sm">{wordCount} words</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              EduTest criteria
            </p>
            <CriterionBar label="Ideas" score={mark.ideas} />
            <CriterionBar label="Structure" score={mark.structure} />
            <CriterionBar label="Language" score={mark.language} />
            <CriterionBar label="Conventions" score={mark.conventions} />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5">
            <p className="text-gray-200 text-sm leading-relaxed">{mark.feedback}</p>
          </div>

          {mark.strengths.length > 0 && (
            <div className="bg-gray-900 border border-green-500/25 rounded-2xl px-6 py-4 space-y-2">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wide">What worked</p>
              <ul className="space-y-1.5">
                {mark.strengths.map((sItem, i) => (
                  <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-2">
                    <span className="text-green-500 shrink-0">·</span>{sItem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mark.improvements.length > 0 && (
            <div className="bg-gray-900 border border-amber-500/25 rounded-2xl px-6 py-4 space-y-2">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">Next time</p>
              <ul className="space-y-1.5">
                {mark.improvements.map((iItem, i) => (
                  <li key={i} className="text-gray-300 text-sm leading-relaxed flex gap-2">
                    <span className="text-amber-500 shrink-0">·</span>{iItem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/study')}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
            >
              Another session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
