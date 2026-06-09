import type { Mastery, Domain } from '../../types'
import { TOPICS, DOMAIN_NAMES } from '../../lib/curriculum'

const EXAM_DOMAINS: Domain[] = ['maths', 'reading', 'verbal', 'abstract']

type TopicStatus = 'not_started' | 'in_progress' | 'strong'

function getStatus(topicId: string, mastery: Mastery[]): TopicStatus {
  const row = mastery.find(m => m.topic_id === topicId)
  if (!row || row.attempts_total === 0) return 'not_started'
  if (row.score_alltime >= 0.75) return 'strong'
  return 'in_progress'
}

const CHIP: Record<TopicStatus, string> = {
  not_started: 'text-gray-500 bg-gray-800 border-gray-700',
  in_progress:  'text-amber-400 bg-amber-500/15 border-amber-500/30',
  strong:       'text-green-400 bg-green-500/15 border-green-500/30',
}

const CHIP_LABEL: Record<TopicStatus, string> = {
  not_started: 'Not started',
  in_progress:  'In progress',
  strong:       'Strong',
}

interface CurriculumCoverageProps {
  mastery: Mastery[]
}

export function CurriculumCoverage({ mastery }: CurriculumCoverageProps) {
  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide px-1">
        Curriculum Coverage
      </p>
      <div className="space-y-3">
        {EXAM_DOMAINS.map(domain => {
          const topics = TOPICS.filter(t => t.domain === domain)
          return (
            <div key={domain} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <p className="text-white font-semibold text-sm">{DOMAIN_NAMES[domain]}</p>
              <div className="space-y-2">
                {topics.map(topic => {
                  const status = getStatus(topic.id, mastery)
                  return (
                    <div key={topic.id} className="flex items-center justify-between gap-3">
                      <p className="text-gray-300 text-sm">{topic.name}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${CHIP[status]}`}>
                        {CHIP_LABEL[status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
