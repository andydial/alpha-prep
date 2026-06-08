interface XPFlashProps {
  xp: number
  show: boolean
}

export function XPFlash({ xp, show }: XPFlashProps) {
  if (!show) return null

  return (
    <>
      <style>{`
        @keyframes xp-float {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 1; transform: translateY(-32px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.9); }
        }
        .xp-flash-anim {
          animation: xp-float 1.5s ease-out forwards;
          pointer-events: none;
        }
      `}</style>
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50">
        <div className="xp-flash-anim text-2xl font-black text-green-400 drop-shadow-lg select-none">
          +{xp} XP
        </div>
      </div>
    </>
  )
}
