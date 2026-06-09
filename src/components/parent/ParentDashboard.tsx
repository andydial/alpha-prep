import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useProgress } from '../../hooks/useProgress'
import { useWeeklyPlan } from '../../hooks/useWeeklyPlan'
import { getLevelForXP, getTopicById } from '../../lib/curriculum'
import { CountdownBanner } from '../CountdownBanner'
import { DomainPerformanceGrid } from './DomainPerformanceGrid'
import { RecentActivityFeed } from './RecentActivityFeed'
import { CurriculumCoverage } from './CurriculumCoverage'
import type { Profile, Session } from '../../types'

// TODO: replace with dynamic child lookup when multi-child support is added
const STUDENT_ID = 'bcf5c2fb-1d99-4d1e-9da8-4cc73d4c297f'

interface ParentDashboardProps {
  parentProfile: Profile
}

export function ParentDashboard({ parentProfile }: ParentDashboardProps) {
  const [studentProfile, setStudentProfile] = useState<Profile | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])

  const { mastery } = useProgress(STUDENT_ID)
  const { plan } = useWeeklyPlan(STUDENT_ID)

  useEffect(() => {
    async function load() {
      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', STUDENT_ID).single()
      setStudentProfile(profileData)

      const { data: sessionData } = await supabase
        .from('sessions').select('*')
        .eq('student_id', STUDENT_ID)
        .not('completed_at', 'is', null)
        .neq('session_type', 'test')
        .order('completed_at', { ascending: false })
        .limit(5)
      setRecentSessions(sessionData ?? [])
    }
    void load()
  }, [])

  const levelInfo = getLevelForXP(studentProfile?.xp_total ?? 0)
  const primaryTopic = plan?.primary_topic_id ? getTopicById(plan.primary_topic_id)?.name : null
  const secondaryTopic = plan?.secondary_topic_id ? getTopicById(plan.secondary_topic_id)?.name : null

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* 1. Header */}
      <div className="pt-2">
        <h1 className="text-white text-2xl font-bold">
          Welcome, {parentProfile.display_name ?? 'Andy'}
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Aarav's study overview</p>
      </div>

      {/* 2. Countdown + Aarav's stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CountdownBanner />
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between gap-3">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Aarav's progress</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg leading-tight">
                Level {levelInfo.level} — {levelInfo.title}
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                {(studentProfile?.xp_total ?? 0).toLocaleString()} XP total
              </p>
            </div>
            <div className="text-right">
              <p className="text-orange-400 font-bold text-3xl leading-none">
                🔥 {studentProfile?.streak_current ?? 0}
              </p>
              <p className="text-gray-500 text-xs mt-1">day streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Domain performance */}
      <DomainPerformanceGrid mastery={mastery} />

      {/* 4. Recent activity */}
      <RecentActivityFeed sessions={recentSessions} />

      {/* 5. Curriculum coverage */}
      <CurriculumCoverage mastery={mastery} />

      {/* 6. Weekly plan */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <p className="text-white font-semibold">This Week's Plan</p>
        {plan ? (
          <div className="space-y-2">
            {primaryTopic && secondaryTopic && (
              <p className="text-blue-300 text-sm font-medium">
                {primaryTopic} · {secondaryTopic}
              </p>
            )}
            {plan.theme_description && (
              <p className="text-white text-sm">{plan.theme_description}</p>
            )}
            {plan.ai_rationale && (
              <p className="text-gray-400 text-sm leading-relaxed">{plan.ai_rationale}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            No plan for this week yet — it will appear after Aarav's first login of the week.
          </p>
        )}
      </div>

      <div className="h-4" />
    </div>
  )
}
