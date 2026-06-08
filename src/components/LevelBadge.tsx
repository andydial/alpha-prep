import { getXPToNextLevel } from '../lib/curriculum'

interface LevelBadgeProps {
  level: number
  title: string
  xpTotal: number
}

export function LevelBadge({ level, title, xpTotal }: LevelBadgeProps) {
  const { xpIntoLevel, xpNeededForNext, next } = getXPToNextLevel(xpTotal)

  const isMaxLevel = next === null
  const fillPercent = isMaxLevel
    ? 100
    : Math.min(100, Math.round((xpIntoLevel / xpNeededForNext) * 100))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {/* Level circle */}
        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-xl">{level}</span>
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-tight">{title}</p>
          <p className="text-gray-400 text-sm">Level {level}</p>
        </div>
      </div>

      {/* XP progress bar */}
      <div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <p className="text-gray-400 text-xs mt-1.5">
          {isMaxLevel
            ? 'Maximum level reached!'
            : `${xpIntoLevel.toLocaleString()} / ${xpNeededForNext.toLocaleString()} XP → ${next!.title}`}
        </p>
      </div>
    </div>
  )
}
