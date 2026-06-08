import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Zap, RotateCcw, BarChart2, Loader2, Flame, TrendingUp } from 'lucide-react'
import { generateSessionSummary } from '../lib/anthropic'

interface SessionResult {
  sessionId: string
  correctCount: number
  totalQuestions: number
  xpEarned: number
  durationSeconds: number
  topicNames: string[]
  newXPTotal: number
  newLevel: number
  leveledUp: boolean
  newStreak: number
  badgesEarned: string[]
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Learner', 2: 'Thinker', 3: 'Challenger', 4: 'Scholar',
  5: 'Achiever', 6: 'Expert', 7: 'Elite', 8: 'Alpha',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function gradeColour(pct: number) {
  if (pct >= 80) return 'text-green-400'
  if (pct >= 60) return 'text-amber-400'
  return 'text-red-400'
}

export function Results() {
  const navigate = useNavigate()
  const [result] = useState<SessionResult | null>(() => {
    const raw = sessionStorage.getItem('lastSessionResult')
    if (!raw) return null
    try { return JSON.parse(raw) as SessionResult } catch { return null }
  })
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(!!result)

  useEffect(() => {
    if (!result) { navigate('/dashboard'); return }
    generateSessionSummary({
      topicNames: result.topicNames,
      correctCount: result.correctCount,
      totalCount: result.totalQuestions,
      xpEarned: result.xpEarned,
    })
      .then(msg => setSummary(msg))
      .catch(() => setSummary("Great effort — keep pushing for that Alpha!"))
      .finally(() => setLoadingSummary(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!result) return null

  const pct = Math.round((result.correctCount / result.totalQuestions) * 100)
  const isStrong = pct >= 80
  const levelTitle = LEVEL_TITLES[result.newLevel] ?? 'Alpha'

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">

        {/* Level-up celebration */}
        {result.leveledUp && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40
                          rounded-2xl p-6 text-center space-y-1 animate-pulse">
            <div className="text-yellow-400 text-2xl font-black">Level Up!</div>
            <div className="text-white font-semibold">You are now Level {result.newLevel}: {levelTitle}</div>
          </div>
        )}

        {/* Badges earned */}
        {result.badgesEarned.length > 0 && (
          <div className="bg-gray-900 border border-amber-500/30 rounded-2xl px-6 py-4 space-y-2">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-wide">Badge{result.badgesEarned.length > 1 ? 's' : ''} Earned</p>
            <div className="flex flex-wrap gap-2">
              {result.badgesEarned.map(id => (
                <span key={id} className="text-xs px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full font-medium">
                  {id.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Score card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-3">
          <div className={`text-6xl font-black tabular-nums ${gradeColour(pct)}`}>
            {result.correctCount}
            <span className="text-gray-500 text-4xl"> / {result.totalQuestions}</span>
          </div>
          <div className="text-gray-400 text-sm">{pct}% correct</div>
          <div className={`text-lg font-semibold ${isStrong ? 'text-green-400' : 'text-amber-400'}`}>
            {isStrong ? 'Well done!' : "Keep pushing — you're getting there!"}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1.5">
            <Zap size={18} className="text-yellow-400" />
            <div className="text-white font-bold text-lg">+{result.xpEarned}</div>
            <div className="text-gray-500 text-xs">XP earned</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1.5">
            <Flame size={18} className="text-orange-400" />
            <div className="text-white font-bold text-lg">{result.newStreak}</div>
            <div className="text-gray-500 text-xs">Day streak</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1.5">
            <Star size={18} className="text-blue-400" />
            <div className="text-white font-bold text-lg">{formatDuration(result.durationSeconds)}</div>
            <div className="text-gray-500 text-xs">Session time</div>
          </div>
        </div>

        {/* XP + level status */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 flex items-center gap-3">
          <TrendingUp size={16} className="text-blue-400 shrink-0" />
          <div className="text-sm text-gray-300">
            Total XP: <span className="text-white font-semibold">{result.newXPTotal.toLocaleString()}</span>
            <span className="text-gray-500 mx-2">·</span>
            Level {result.newLevel}: <span className="text-blue-300 font-semibold">{levelTitle}</span>
          </div>
        </div>

        {/* AI summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5">
          {loadingSummary ? (
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Generating summary…</span>
            </div>
          ) : (
            <p className="text-gray-200 text-sm leading-relaxed">{summary}</p>
          )}
        </div>

        {/* Topics covered */}
        {result.topicNames.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 space-y-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Topics covered</p>
            <div className="flex flex-wrap gap-2">
              {result.topicNames.map(name => (
                <span key={name} className="text-xs px-2.5 py-1 bg-gray-800 text-gray-300 rounded-full">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/study')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500
                       text-white font-semibold rounded-xl transition-colors"
          >
            <RotateCcw size={16} />
            Study again
          </button>
          <button
            onClick={() => navigate('/progress')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-800 hover:bg-gray-700
                       text-white font-semibold rounded-xl transition-colors"
          >
            <BarChart2 size={16} />
            See progress
          </button>
        </div>

      </div>
    </div>
  )
}
