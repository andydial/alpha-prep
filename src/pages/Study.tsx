import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Pause } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useSettings } from '../hooks/useSettings'
import { useStudySession } from '../hooks/useStudySession'
import { useCountdown } from '../hooks/useCountdown'
import { sessionTimeLimitSeconds } from '../lib/sessionTimer'
import { QuestionCard } from '../components/QuestionCard'
import { AnswerInput } from '../components/AnswerInput'
import { ExplanationPanel } from '../components/ExplanationPanel'
import { XPFlash } from '../components/XPFlash'
import { SessionTimer } from '../components/SessionTimer'
import { PauseOverlay } from '../components/PauseOverlay'
import { SessionStreamBanner } from '../components/SessionStreamBanner'
import { StreamTransitionScreen } from '../components/StreamTransitionScreen'
import { SessionModeSelect } from './SessionModeSelect'
import type { DomainPair, SessionConfig } from '../types'

export function Study() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { settings, loading: settingsLoading } = useSettings()

  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  // A break the student asked for, as opposed to the clock being held while the
  // app works. Both stop the countdown; only this one hides the question.
  const [onBreak, setOnBreak] = useState(false)

  const domainPair: DomainPair = config?.domainPair ?? ['maths', 'verbal']
  const totalQuestions = config?.totalQuestions ?? 40
  const forcedTopicId = config?.forcedTopicId

  // Null when the parent has switched timed tests off in Settings.
  const timeLimitSeconds = config ? sessionTimeLimitSeconds(totalQuestions, settings) : null

  const {
    state, initSession, handleAnswer, handleNext,
    setHintUsed, dismissTransition, finishSession, flagCurrentQuestion,
    QUESTIONS_PER_SESSION, questionsPerBlock,
  } = useStudySession(user, null, domainPair, totalQuestions, forcedTopicId, timeLimitSeconds)

  const {
    currentQuestion, answered, evaluating, aiFeedback, isCorrect, xpEarned,
    hintUsed, showXPFlash, questionNumber, loading, error,
    showStreamTransition,
  } = state

  // Guarded so a double-fire of the countdown cannot write two result payloads.
  const expiring = useRef(false)
  async function handleTimeUp() {
    if (expiring.current) return
    expiring.current = true
    setTimeUp(true)
    await finishSession({ timedOut: true })
    navigate('/study/results')
  }

  const {
    remaining, paused: clockPaused, start: startTimer, setPaused: setClockPaused,
  } = useCountdown(timeLimitSeconds, () => { void handleTimeUp() })

  // Time Aarav spends waiting on us is not time spent on the paper: generating a
  // question and second-opinion marking a wrong answer are both round trips to
  // the Anthropic API, and on a 60-second-per-question pace they were quietly
  // eating whole questions' worth of the clock. Collapsing every reason to hold
  // the clock into one boolean means the hook never has to reconcile competing
  // callers — see useCountdown.setPaused.
  const waitingOnApp = loading || evaluating
  const clockShouldHold = waitingOnApp || onBreak

  useEffect(() => {
    setClockPaused(clockShouldHold)
  }, [clockShouldHold, setClockPaused])

  // A reload would lose the generated question, the blueprint and everything
  // else held in memory, so make an accidental one cost a confirmation. The
  // break screen is the supported way to step away.
  useEffect(() => {
    if (!config || timeUp) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [config, timeUp])

  useEffect(() => {
    if (!user || !config || settingsLoading) return
    void initSession()
    startTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, config, settingsLoading])

  if (!config) {
    return <SessionModeSelect onConfirm={setConfig} />
  }

  async function onNext() {
    const done = await handleNext(questionNumber)
    if (done) navigate('/study/results')
  }

  async function handleExitConfirm() {
    setShowExitModal(false)
    await finishSession()
    navigate('/dashboard')
  }

  if (timeUp) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 py-20">
        <Loader2 size={28} className="text-amber-400 animate-spin" />
        <p className="text-amber-300 font-semibold">Time's up — marking your test…</p>
      </div>
    </div>
  )

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

  // Spinner only for the very first load before any question exists
  const isInitialLoad = loading && !currentQuestion

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-4">
        {isInitialLoad ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={32} className="text-blue-400 animate-spin" />
            <p className="text-gray-400">Generating question…</p>
          </div>
        ) : (
          <>
            {/* Top row: stream banner + exit button */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <SessionStreamBanner
                  domainPair={state.domainPair}
                  activeDomain={state.activeDomain}
                  questionNumber={questionNumber}
                />
              </div>
              <SessionTimer remaining={remaining} total={timeLimitSeconds} paused={clockPaused} />
              <button
                onClick={() => setOnBreak(true)}
                title="Pause the test and take a break"
                className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white
                           px-2 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 hover:bg-gray-800/60
                           transition-colors"
              >
                <Pause size={13} /> Pause
              </button>
              <button
                onClick={() => setShowExitModal(true)}
                className="flex-shrink-0 text-xs text-gray-600 hover:text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-colors"
              >
                ✕ Exit
              </button>
            </div>

            {showStreamTransition ? (
              <StreamTransitionScreen
                domainPair={state.domainPair}
                correctCount={state.correctCount}
                questionsInBlock={questionsPerBlock}
                timed={timeLimitSeconds !== null}
                onContinue={dismissTransition}
              />
            ) : loading ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <Loader2 size={28} className="text-blue-400 animate-spin" />
                <p className="text-gray-400 text-sm">Generating question…</p>
              </div>
            ) : (
              <>
                <QuestionCard
                  question={currentQuestion!}
                  questionNumber={questionNumber}
                  totalQuestions={QUESTIONS_PER_SESSION}
                />
                {evaluating ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-gray-400">
                    <Loader2 size={20} className="animate-spin text-blue-400" />
                    <span className="text-sm">Checking your answer…</span>
                  </div>
                ) : !answered ? (
                  <AnswerInput
                    question={currentQuestion!}
                    onSubmit={(answer) => { void handleAnswer(answer, currentQuestion!) }}
                    disabled={answered}
                    hintUsed={hintUsed}
                    onHintRequest={setHintUsed}
                  />
                ) : (
                  <ExplanationPanel
                    isCorrect={isCorrect}
                    correctAnswer={state.resolvedAnswer || currentQuestion!.correct_answer}
                    explanation={aiFeedback || currentQuestion!.explanation}
                    hintUsed={hintUsed}
                    xpEarned={xpEarned}
                    answerVerified={state.answerVerified}
                    optionsFaulty={state.optionsFaulty}
                    onNext={onNext}
                    onFlag={() => { void flagCurrentQuestion() }}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      <XPFlash xp={xpEarned} show={showXPFlash} />

      {/* Break screen. Rendered over the page rather than instead of it, so a
          part-typed short answer survives the break. */}
      {onBreak && (
        <PauseOverlay
          remaining={remaining}
          detail={`Question ${questionNumber} of ${QUESTIONS_PER_SESSION}`}
          onResume={() => setOnBreak(false)}
        />
      )}

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">Exit this session?</h2>
              <p className="text-gray-400 text-sm mt-1">Your progress so far will be saved.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-semibold text-sm transition-colors"
              >
                Keep Going
              </button>
              <button
                onClick={handleExitConfirm}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
