import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useProgress } from '../hooks/useProgress'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { supabase } from '../lib/supabase'
import { getWeekNumber } from '../lib/curriculum'
import { generateWeeklyPlan } from '../lib/weeklyPlan'
import { CountdownBanner } from '../components/CountdownBanner'
import { ParentDashboard } from '../components/parent/ParentDashboard'
import { LevelBadge } from '../components/LevelBadge'
import { StreakCounter } from '../components/StreakCounter'
import { FocusTodayCard } from '../components/FocusTodayCard'
import { WeeklyThemeCard } from '../components/WeeklyThemeCard'

const EXAM_DATE = new Date('2026-08-14')

interface WeekStats {
  questionsThisWeek: number
  accuracyThisWeek: number | null
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-2xl ${className ?? ''}`} />
}


export function Dashboard() {
  const navigate = useNavigate()
  const { user, profile, loading: userLoading } = useUser()
  const { mastery, loading: masteryLoading } = useProgress(user?.id)
  const { plan, loading: planLoading, refetch: refetchPlan } = useWeeklyPlan(user?.id)
  const [weekStats, setWeekStats] = useState<WeekStats>({ questionsThisWeek: 0, accuracyThisWeek: null })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planGenError, setPlanGenError] = useState<string | null>(null)
  const generationAttempted = useRef(false)

  const loading = userLoading || masteryLoading || planLoading

  // Auto-generate this week's plan on first login of the week when none exists
  useEffect(() => {
    if (planLoading || masteryLoading || plan || !user?.id || profile?.role !== 'student' || generationAttempted.current) return
    generationAttempted.current = true
    setGeneratingPlan(true)
    setPlanGenError(null)
    generateWeeklyPlan(user.id, mastery)
      .then(result => { void refetchPlan() ; return result })
      .catch((err: unknown) => {
        const msg = err instanceof Error
          ? err.message
          : (err !== null && typeof err === 'object' ? JSON.stringify(err) : String(err))
        setPlanGenError(msg)
      })
      .finally(() => setGeneratingPlan(false))
  // mastery and refetchPlan are stable between renders; ref guard prevents re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoading, masteryLoading, plan, user?.id, profile?.role])

  const weekNumber = getWeekNumber(EXAM_DATE)

  // Fetch week stats from sessions table
  useEffect(() => {
    if (!user?.id) return
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('sessions')
      .select('total_questions, correct_count')
      .eq('student_id', user.id)
      .gte('started_at', sevenDaysAgo)
      .not('completed_at', 'is', null)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const totalQ = data.reduce((sum, s) => sum + (s.total_questions ?? 0), 0)
        const totalC = data.reduce((sum, s) => sum + (s.correct_count ?? 0), 0)
        setWeekStats({
          questionsThisWeek: totalQ,
          accuracyThisWeek: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : null,
        })
      })
  }, [user?.id])

  const isFirstTimeUser = !loading && mastery.length === 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <SkeletonBlock className="h-20" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
        </div>
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-28" />
      </div>
    )
  }

  // Profile must be present and role must be known before rendering either dashboard.
  // Never default silently — show an error if profile failed to load.
  console.log('[Dashboard] profile.role =', profile?.role)

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-sm text-center space-y-3">
          <p className="text-red-400 font-medium">Could not load your profile.</p>
          <p className="text-gray-400 text-sm">Please sign out and sign back in.</p>
        </div>
      </div>
    )
  }

  if (profile.role === 'parent') {
    return <ParentDashboard parentProfile={profile} />
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      {/* Greeting */}
      <div className="pt-2 pb-1">
        <h1 className="text-white text-2xl font-bold">
          Hey, {profile?.display_name ?? 'Student'} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {isFirstTimeUser ? "Let's get started — your first session awaits." : "Ready to level up today?"}
        </p>
      </div>

      {/* Countdown */}
      <CountdownBanner />

      {/* Level + Streak */}
      <div className="grid grid-cols-2 gap-4">
        <LevelBadge
          level={profile?.level ?? 1}
          title={profile ? getLevelTitle(profile.level) : 'Learner'}
          xpTotal={profile?.xp_total ?? 0}
        />
        <StreakCounter
          streak={profile?.streak_current ?? 0}
          streakBest={profile?.streak_best ?? 0}
        />
      </div>

      {/* Focus Today */}
      <FocusTodayCard mastery={mastery} weeklyPlan={plan} />

      {/* Weekly Theme */}
      <WeeklyThemeCard plan={plan} weekNumber={weekNumber} />
      {generatingPlan && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <span className="text-indigo-400 text-sm">Generating your weekly plan…</span>
        </div>
      )}
      {planGenError && (
        <div className="bg-red-950/40 border border-red-700/50 rounded-xl px-4 py-3 text-xs text-red-400 break-all">
          Plan error: {planGenError}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="This week" value={String(weekStats.questionsThisWeek)} unit="questions" />
        <StatCard
          label="Accuracy"
          value={weekStats.accuracyThisWeek !== null ? `${weekStats.accuracyThisWeek}%` : '—'}
          unit="this week"
        />
        <StatCard label="Best streak" value={String(profile?.streak_best ?? 0)} unit="days" />
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate('/study')}
        className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl font-semibold text-lg py-4 transition-all duration-150"
      >
        {isFirstTimeUser ? 'Start First Session' : 'Start Session'}
      </button>


      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-xl leading-tight">{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{unit}</p>
    </div>
  )
}

// Derive title from level number using the LEVELS array
function getLevelTitle(level: number): string {
  const titles: Record<number, string> = {
    1: 'Learner', 2: 'Thinker', 3: 'Challenger', 4: 'Scholar',
    5: 'Achiever', 6: 'Expert', 7: 'Elite', 8: 'Alpha',
  }
  return titles[level] ?? 'Learner'
}
