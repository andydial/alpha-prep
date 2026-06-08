interface StreakCounterProps {
  streak: number
  streakBest: number
}

export function StreakCounter({ streak, streakBest }: StreakCounterProps) {
  const hasStreak = streak > 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between gap-3 h-full">
      <div className="flex items-center gap-3">
        <span className={`text-3xl ${hasStreak ? '' : 'grayscale opacity-40'}`}>🔥</span>
        {hasStreak ? (
          <div>
            <p className="text-white font-bold text-lg leading-tight">
              {streak}-day streak
            </p>
            <p className="text-amber-400 text-sm font-medium">Keep it going!</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 font-semibold text-base leading-tight">No active streak</p>
            <p className="text-gray-500 text-sm">Start your streak today!</p>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-xs">
        Personal best: <span className="text-gray-300 font-semibold">{streakBest} {streakBest === 1 ? 'day' : 'days'}</span>
      </p>
    </div>
  )
}
