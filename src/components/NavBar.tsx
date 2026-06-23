import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'

interface NavItemProps {
  to: string
  label: string
  onClick?: () => void
}

function NavItem({ to, label, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

export function NavBar() {
  const navigate = useNavigate()
  const { profile } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const levelTitle =
    profile?.level
      ? (
          {
            1: 'Learner', 2: 'Thinker', 3: 'Challenger', 4: 'Scholar',
            5: 'Achiever', 6: 'Expert', 7: 'Elite', 8: 'Alpha',
          } as Record<number, string>
        )[profile.level] ?? 'Learner'
      : null

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <NavLink to="/dashboard" className="font-bold text-white text-base tracking-tight">
          Alpha Prep
        </NavLink>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          <NavItem to="/dashboard" label="Dashboard" />
          {profile?.role !== 'parent' && (
            <>
              <NavItem to="/study" label="Study" />
              <NavItem to="/progress" label="Progress" />
              <NavItem to="/store" label="Store" />
              <NavItem to="/squad" label="My Squad" />
            </>
          )}
          {profile?.role === 'parent' && (
            <>
              <NavItem to="/report" label="Report" />
              <NavItem to="/settings" label="Settings" />
            </>
          )}
        </div>

        {/* Right side: level + name + sign out */}
        <div className="hidden sm:flex items-center gap-3">
          {profile && (
            <div className="flex items-center gap-2">
              {levelTitle && profile.role !== 'parent' && (
                <span className="text-xs bg-blue-900/60 text-blue-300 rounded-full px-2.5 py-0.5 font-semibold">
                  Lv {profile.level} · {levelTitle}
                </span>
              )}
              <span className="text-gray-400 text-sm">{profile.display_name}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="sm:hidden text-gray-400 hover:text-white p-2 rounded-lg"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-800 px-4 py-3 space-y-1 bg-gray-950">
          <NavItem to="/dashboard" label="Dashboard" onClick={() => setMenuOpen(false)} />
          {profile?.role !== 'parent' && (
            <>
              <NavItem to="/study" label="Study" onClick={() => setMenuOpen(false)} />
              <NavItem to="/progress" label="Progress" onClick={() => setMenuOpen(false)} />
              <NavItem to="/store" label="Store" onClick={() => setMenuOpen(false)} />
              <NavItem to="/squad" label="My Squad" onClick={() => setMenuOpen(false)} />
            </>
          )}
          {profile?.role === 'parent' && (
            <>
              <NavItem to="/report" label="Report" onClick={() => setMenuOpen(false)} />
              <NavItem to="/settings" label="Settings" onClick={() => setMenuOpen(false)} />
            </>
          )}
          {profile && (
            <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
              <span className="text-gray-400 text-sm">{profile.display_name}</span>
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
