interface CountdownBannerProps {
  daysLeft: number
}

export function CountdownBanner({ daysLeft }: CountdownBannerProps) {
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
