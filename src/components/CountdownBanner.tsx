import { useSettings } from '../hooks/useSettings'

const FALLBACK_EXAM_DATE = new Date('2026-09-05')

export function CountdownBanner() {
  const { settings, loading } = useSettings()

  if (loading) {
    return <div className="bg-gray-800 animate-pulse rounded-2xl h-20" />
  }

  const examDate = settings.exam_date ? new Date(settings.exam_date) : FALLBACK_EXAM_DATE
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.max(0, Math.round((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  if (daysLeft === 0) {
    return (
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-6 text-center">
        <p className="text-white text-2xl font-bold tracking-wide">
          Exam day — you've got this!
        </p>
      </div>
    )
  }

  const urgencyClass =
    daysLeft <= 7
      ? 'from-red-700 to-orange-600'
      : daysLeft <= 21
        ? 'from-amber-700 to-yellow-600'
        : 'from-blue-700 to-indigo-600'

  return (
    <div className={`bg-gradient-to-r ${urgencyClass} rounded-2xl p-5 flex items-center justify-between`}>
      <div>
        <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-1">
          Alpha Exam Countdown
        </p>
        <p className="text-white text-base font-medium">
          Every session brings you closer — keep pushing.
        </p>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <span className="text-white font-extrabold text-5xl leading-none">{daysLeft}</span>
        <p className="text-white/80 text-sm font-semibold mt-1">
          {daysLeft === 1 ? 'day left' : 'days left'}
        </p>
      </div>
    </div>
  )
}
