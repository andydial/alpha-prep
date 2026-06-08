import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { useStudySession } from '../hooks/useStudySession'
import { QuestionCard } from '../components/QuestionCard'
import { AnswerInput } from '../components/AnswerInput'
import { ExplanationPanel } from '../components/ExplanationPanel'
import { XPFlash } from '../components/XPFlash'

export function Study() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { plan } = useWeeklyPlan(user?.id)
  const { state, initSession, handleAnswer, handleNext, setHintUsed, QUESTIONS_PER_SESSION } =
    useStudySession(user, plan ?? null)

  const {
    currentQuestion, answered, isCorrect, xpEarned,
    hintUsed, showXPFlash, questionNumber, loading, error,
  } = state

  useEffect(() => {
    if (user) void initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function onNext() {
    const done = await handleNext(questionNumber)
    if (done) navigate('/study/results')
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

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-4">
        {loading || !currentQuestion ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={32} className="text-blue-400 animate-spin" />
            <p className="text-gray-400">Generating question…</p>
          </div>
        ) : (
          <>
            <QuestionCard
              question={currentQuestion}
              questionNumber={questionNumber}
              totalQuestions={QUESTIONS_PER_SESSION}
            />
            {!answered ? (
              <AnswerInput
                question={currentQuestion}
                onSubmit={(answer) => handleAnswer(answer, currentQuestion)}
                disabled={answered}
                hintUsed={hintUsed}
                onHintRequest={setHintUsed}
              />
            ) : (
              <ExplanationPanel
                isCorrect={isCorrect}
                correctAnswer={currentQuestion.correct_answer}
                explanation={currentQuestion.explanation}
                hintUsed={hintUsed}
                xpEarned={xpEarned}
                onNext={onNext}
              />
            )}
          </>
        )}
      </div>
      <XPFlash xp={xpEarned} show={showXPFlash} />
    </div>
  )
}
