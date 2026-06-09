import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useProgress } from '../hooks/useProgress'
import { useWeeklyPlan } from '../hooks/useWeeklyPlan'
import { useSettings } from '../hooks/useSettings'
import { getSessionDomainPair, getTopicById, TOPICS, DOMAIN_NAMES } from '../lib/curriculum'
import type { Domain, SessionConfig, SessionMode } from '../types'

const EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'abstract']

const DOMAIN_COLOUR: Record<Domain, string> = {
  maths:    'border-blue-500/50 bg-blue-500/10 text-blue-300',
  reading:  'border-purple-500/50 bg-purple-500/10 text-purple-300',
  verbal:   'border-amber-500/50 bg-amber-500/10 text-amber-300',
  abstract: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300',
  writing:  'border-green-500/50 bg-green-500/10 text-green-300',
}

interface SessionModeSelectProps {
  onConfirm: (config: SessionConfig) => void
}

export function SessionModeSelect({ onConfirm }: SessionModeSelectProps) {
  const navigate = useNavigate()
  const { user } = useUser()
  const { mastery, loading: masteryLoading } = useProgress(user?.id)
  const { plan, loading: planLoading } = useWeeklyPlan(user?.id)
  const { settings, loading: settingsLoading } = useSettings()

  const [mode, setMode] = useState<SessionMode>('planned')
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [drillDomain, setDrillDomain] = useState<Domain | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  const dataLoading = masteryLoading || planLoading || settingsLoading

  const plannedPair = getSessionDomainPair(mastery, plan ?? null, 0)
  const plannedQuestions = parseInt(settings.default_session_questions ?? '40', 10) || 40
  const primaryTopic = plan?.primary_topic_id ? getTopicById(plan.primary_topic_id) : null
  const secondaryTopic = plan?.secondary_topic_id ? getTopicById(plan.secondary_topic_id) : null

  const drillTopics = drillDomain ? TOPICS.filter(t => t.domain === drillDomain && t.active) : []

  const canStart =
    mode === 'planned' ||
    (mode === 'domain' && selectedDomain !== null) ||
    (mode === 'topic' && selectedTopicId !== null)

  function handleConfirm() {
    if (mode === 'planned') {
      onConfirm({ mode: 'planned', domainPair: plannedPair, totalQuestions: plannedQuestions })
    } else if (mode === 'domain' && selectedDomain) {
      onConfirm({ mode: 'domain', domainPair: [selectedDomain, selectedDomain], totalQuestions: 20 })
    } else if (mode === 'topic' && selectedTopicId && drillDomain) {
      onConfirm({ mode: 'topic', domainPair: [drillDomain, drillDomain], totalQuestions: 15, forcedTopicId: selectedTopicId })
    }
  }

  function selectMode(m: SessionMode) {
    setMode(m)
    setSelectedDomain(null)
    setDrillDomain(null)
    setSelectedTopicId(null)
  }

  const startLabel = (() => {
    if (mode === 'planned') return `Start — ${plannedQuestions} Questions`
    if (mode === 'domain') return selectedDomain ? `Start — ${DOMAIN_NAMES[selectedDomain]}` : 'Select a subject'
    return selectedTopicId ? `Start — ${getTopicById(selectedTopicId)?.name ?? 'Topic'}` : 'Select a topic'
  })()

  return (
    <div className="min-h-screen bg-gray-950 max-w-2xl mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-6 pb-5">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-white font-bold text-xl leading-tight">Choose Session Type</h1>
          <p className="text-gray-400 text-sm">Pick how you want to study today</p>
        </div>
      </div>

      {/* Mode cards */}
      <div className="space-y-3">

        {/* Planned Session */}
        <ModeCard
          selected={mode === 'planned'}
          onClick={() => selectMode('planned')}
          label="Planned Session"
          subtext="Follow this week's study plan"
          badge={`${dataLoading ? '—' : plannedQuestions} questions`}
        >
          {dataLoading ? (
            <div className="mt-2 pl-6 space-y-1.5">
              <div className="h-3.5 bg-gray-800 rounded animate-pulse w-44" />
              <div className="h-3.5 bg-gray-800 rounded animate-pulse w-36" />
            </div>
          ) : primaryTopic ? (
            <div className="mt-2 pl-6 space-y-1">
              <TopicLine stream="Stream 1" name={primaryTopic.name} />
              {secondaryTopic && <TopicLine stream="Stream 2" name={secondaryTopic.name} />}
            </div>
          ) : (
            <p className="mt-2 pl-6 text-gray-500 text-xs">
              No plan yet — topics chosen from your weakest areas
            </p>
          )}
        </ModeCard>

        {/* Domain Focus */}
        <ModeCard
          selected={mode === 'domain'}
          onClick={() => selectMode('domain')}
          label="Domain Focus"
          subtext="Practise one subject area"
          badge="20 questions"
        >
          {mode === 'domain' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {EXAM_DOMAINS.map(d => (
                <button
                  key={d}
                  onClick={e => { e.stopPropagation(); setSelectedDomain(d) }}
                  className={`
                    px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all
                    ${selectedDomain === d
                      ? DOMAIN_COLOUR[d]
                      : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }
                  `}
                >
                  {DOMAIN_NAMES[d]}
                </button>
              ))}
            </div>
          )}
        </ModeCard>

        {/* Topic Drill */}
        <ModeCard
          selected={mode === 'topic'}
          onClick={() => selectMode('topic')}
          label="Topic Drill"
          subtext="Deep dive into one specific topic"
          badge="15 questions"
        >
          {mode === 'topic' && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {EXAM_DOMAINS.map(d => (
                  <button
                    key={d}
                    onClick={e => { e.stopPropagation(); setDrillDomain(d); setSelectedTopicId(null) }}
                    className={`
                      px-3 py-2 rounded-xl border text-sm font-medium text-left transition-all
                      ${drillDomain === d
                        ? DOMAIN_COLOUR[d]
                        : 'border-gray-700 bg-gray-800/60 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      }
                    `}
                  >
                    {DOMAIN_NAMES[d]}
                  </button>
                ))}
              </div>

              {drillTopics.length > 0 && (
                <div className="space-y-1.5">
                  {drillTopics.map(topic => (
                    <button
                      key={topic.id}
                      onClick={e => { e.stopPropagation(); setSelectedTopicId(topic.id) }}
                      className={`
                        w-full px-3 py-2.5 rounded-xl border text-sm text-left transition-all
                        ${selectedTopicId === topic.id
                          ? 'border-blue-500/50 bg-blue-500/10 text-white font-medium'
                          : 'border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-600 hover:text-white'
                        }
                      `}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </ModeCard>
      </div>

      {/* Start button */}
      <div className="mt-5">
        <button
          onClick={handleConfirm}
          disabled={!canStart}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all active:scale-95"
        >
          {startLabel}
        </button>
      </div>
    </div>
  )
}

interface ModeCardProps {
  selected: boolean
  onClick: () => void
  label: string
  subtext: string
  badge: string
  children?: React.ReactNode
}

function ModeCard({ selected, onClick, label, subtext, badge, children }: ModeCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      className={`
        rounded-2xl border p-4 cursor-pointer transition-all select-none
        ${selected
          ? 'border-blue-500/50 bg-blue-500/10'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
            selected ? 'border-blue-500 bg-blue-500' : 'border-gray-600'
          }`} />
          <div className="min-w-0">
            <p className={`font-semibold text-base leading-tight ${selected ? 'text-white' : 'text-gray-300'}`}>
              {label}
            </p>
            <p className="text-gray-400 text-sm mt-0.5">{subtext}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 mt-0.5">
          {badge}
        </span>
      </div>
      {children}
    </div>
  )
}

function TopicLine({ stream, name }: { stream: string; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 w-14 flex-shrink-0">
        {stream}
      </span>
      <span className="text-gray-300 text-xs font-medium truncate">{name}</span>
    </div>
  )
}
