import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useProgress } from '../hooks/useProgress'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { supabase } from '../lib/supabase'
import { getSessionDomainPair, DOMAIN_NAMES, getWeekNumber } from '../lib/curriculum'
import type { Domain, DomainPair } from '../types'
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
                const [, d2] = picked
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
              {isSelected && (
                <span className="text-[10px] font-bold uppercase tracking-wide block opacity-70 mb-0.5">
                  {picked[0] === domain ? 'Stream 1' : 'Stream 2'}
                </span>
              )}
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

export function Dashboard() {
  const navigate = useNavigate()
  const { user, profile, loading: userLoading } = useUser()
  const { mastery, loading: masteryLoading } = useProgress(user?.id)
  const { plan, loading: planLoading, refetch: refetchPlan } = useWeeklyPlan(user?.id)
  const [weekStats, setWeekStats] = useState<WeekStats>({ questionsThisWeek: 0, accuracyThisWeek: null })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [showSessionConfig, setShowSessionConfig] = useState(false)
  const [pickedDomains, setPickedDomains] = useState<DomainPair | null>(null)

  const loading = userLoading || masteryLoading || planLoading

  const suggestedPair = useMemo<DomainPair>(() => {
    return getSessionDomainPair(mastery, plan ?? null, 0)
  }, [mastery, plan])

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

  function handleStartSession() {
    const pair = pickedDomains ?? suggestedPair
    sessionStorage.setItem('sessionDomainPair', JSON.stringify(pair))
    sessionStorage.removeItem('sessionTestMode')
    navigate('/study')
  }

  async function handleGeneratePlan() {
    if (!user?.id) return
    setGeneratingPlan(true)
    try {
      const result = await generateWeeklyPlan(user.id, mastery)
      if (result) {
        await refetchPlan()
      } else {
        console.error('[handleGeneratePlan] generation returned null — check Supabase logs for insert error')
      }
    } catch (err) {
      console.error('[handleGeneratePlan] failed:', err)
    } finally {
      setGeneratingPlan(false)
    }
  }

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
      {!plan && !planLoading && (
        <button
          onClick={handleGeneratePlan}
          disabled={generatingPlan}
          className="w-full bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm py-3 transition-all duration-150 flex items-center justify-center gap-2"
        >
          {generatingPlan ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Generating your plan…
            </>
          ) : (
            'Generate This Week\'s Plan'
          )}
        </button>
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
          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl font-semibold text-lg py-4 transition-all duration-150"
        >
          {isFirstTimeUser ? 'Start First Session' : 'Start Session'}
        </button>
      )}


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
