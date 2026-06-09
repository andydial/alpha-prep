import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isPinConfigured, verifyPINAndGetCredentials } from '../lib/pinLogin'

export function Login() {
  const navigate = useNavigate()
  const pinAvailable = isPinConfigured()
  const [mode, setMode] = useState<'email' | 'pin'>(pinAvailable ? 'pin' : 'email')

  // Email/password state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // PIN state
  const [digits, setDigits] = useState<string[]>([])
  const [pinError, setPinError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  async function handlePinDigit(d: string) {
    if (loading) return
    const next = [...digits, d]
    setDigits(next)
    setPinError(null)

    if (next.length === 4) {
      setLoading(true)
      const pin = next.join('')
      const creds = await verifyPINAndGetCredentials(pin)
      if (!creds) {
        setDigits([])
        setPinError('Wrong PIN — try again')
        setLoading(false)
        return
      }
      const { error: authError } = await supabase.auth.signInWithPassword(creds)
      if (authError) {
        setDigits([])
        setPinError('Sign-in failed — use email instead')
        setLoading(false)
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }

  function handleDelete() {
    setDigits(prev => prev.slice(0, -1))
    setPinError(null)
  }

  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'] as const

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Alpha Prep</h1>
          <p className="mt-1 text-sm text-gray-400 text-center">
            EDSC Alpha Entrance Exam Preparation
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Mode toggle */}
          {pinAvailable && (
            <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setMode('pin'); setError(null); setPinError(null); setDigits([]) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'pin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Quick Sign-in
              </button>
              <button
                onClick={() => { setMode('email'); setError(null); setPinError(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  mode === 'email' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Email
              </button>
            </div>
          )}

          {mode === 'pin' ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white font-semibold text-lg">Enter PIN</p>
                <p className="text-gray-500 text-sm mt-0.5">Aarav's 4-digit PIN</p>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-4">
                {[0,1,2,3].map(i => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      i < digits.length
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-600 bg-transparent'
                    }`}
                  />
                ))}
              </div>

              {/* Numeric pad */}
              <div className="grid grid-cols-3 gap-3">
                {PAD.map((key, i) => {
                  if (key === '') return <div key={i} />
                  if (key === '⌫') {
                    return (
                      <button
                        key={i}
                        onClick={handleDelete}
                        disabled={digits.length === 0 || loading}
                        className="aspect-square flex items-center justify-center rounded-2xl bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-xl font-bold transition-colors"
                      >
                        ⌫
                      </button>
                    )
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => { void handlePinDigit(key) }}
                      disabled={digits.length >= 4 || loading}
                      className="aspect-square flex items-center justify-center rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 disabled:opacity-30 text-white text-2xl font-bold transition-all"
                    >
                      {loading && digits.length === 4 ? '…' : key}
                    </button>
                  )
                })}
              </div>

              {pinError && (
                <p className="text-red-400 text-sm text-center" role="alert">{pinError}</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Accounts are managed by your parent. Contact them if you need access.
        </p>
      </div>
    </div>
  )
}
