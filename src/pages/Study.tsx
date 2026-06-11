import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useStudySession } from '../hooks/useStudySession'
import { QuestionCard } from '../components/QuestionCard'
import { AnswerInput } from '../components/AnswerInput'
import { ExplanationPanel } from '../components/ExplanationPanel'
import { XPFlash } from '../components/XPFlash'
import { SessionStreamBanner } from '../components/SessionStreamBanner'
import { StreamTransitionScreen } from '../components/StreamTransitionScreen'
import { SessionModeSelect } from './SessionModeSelect'
import type { DomainPair, SessionConfig } from '../types'

export function Study() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)

  const domainPair: DomainPair = config?.domainPair ?? ['maths', 'verbal']
  const totalQuestions = config?.totalQuestions ?? 40
  const forcedTopicId = config?.forcedTopicId

  const {
    state, initSession, handleAnswer, handleNext,
    setHintUsed, dismissTransition, finishSession, QUESTIONS_PER_SESSION,
  } = useStudySession(user, null, domainPair, totalQuestions, forcedTopicId)

  const {
    currentQuestion, answered, evaluating, aiFeedback, isCorrect, xpEarned,
    hintUsed, showXPFlash, questionNumber, loading, error,
    showStreamTransition,
  } = state

  useEffect(() => {
    if (user && config) void initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, config])

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
                questionsInBlock={QUESTIONS_PER_SESSION / 2}
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
                    correctAnswer={currentQuestion!.correct_answer}
                    explanation={aiFeedback || currentQuestion!.explanation}
                    hintUsed={hintUsed}
                    xpEarned={xpEarned}
                    onNext={onNext}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
      <XPFlash xp={xpEarned} show={showXPFlash} />

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
