import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../hooks/useSettings'
import { hashPIN, isPinConfigured, saveQuickSignIn } from '../lib/pinLogin'

// TODO: multi-child — replace with dynamic child lookup
const STUDENT_ID = 'bcf5c2fb-1d99-4d1e-9da8-4cc73d4c297f'
const STUDENT_EMAIL = 'aaravdial@gmail.com'

async function saveSetting(key: string, value: string): Promise<boolean> {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
  return !error
}

type SaveState = 'idle' | 'saving' | 'saved'

export function Settings() {
  const { settings, loading } = useSettings()

  // Exam date
  const [examDate, setExamDate] = useState('')
  const [examSave, setExamSave] = useState<SaveState>('idle')

  // Session config
  const [defaultQ, setDefaultQ] = useState('40')
  const [writingOn, setWritingOn] = useState(false)
  const [sessionSave, setSessionSave] = useState<SaveState>('idle')

  // PIN
  const [hasPIN, setHasPIN] = useState(false)
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [studentPw, setStudentPw] = useState('')
  const [qsiConfigured, setQsiConfigured] = useState(false)
  const [pinSave, setPinSave] = useState<SaveState>('idle')
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    if (loading) return
    setExamDate(settings.exam_date ?? '2026-09-05')
    setDefaultQ(settings.default_session_questions ?? '40')
    setWritingOn(settings.writing_enabled === 'true')
  }, [loading, settings])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('pin_hash')
      .eq('id', STUDENT_ID)
      .single()
      .then(({ data }) => setHasPIN(!!data?.pin_hash))
    setQsiConfigured(isPinConfigured())
  }, [])

  async function handleSaveExamDate() {
    setExamSave('saving')
    const ok = await saveSetting('exam_date', examDate)
    setExamSave(ok ? 'saved' : 'idle')
    if (ok) setTimeout(() => setExamSave('idle'), 2000)
  }

  async function handleSaveSession() {
    setSessionSave('saving')
    const [a, b] = await Promise.all([
      saveSetting('default_session_questions', defaultQ),
      saveSetting('writing_enabled', String(writingOn)),
    ])
    setSessionSave(a && b ? 'saved' : 'idle')
    if (a && b) setTimeout(() => setSessionSave('idle'), 2000)
  }

  async function handleSavePIN() {
    setPinError('')
    if (!/^\d{4}$/.test(pin1)) { setPinError('PIN must be exactly 4 digits'); return }
    if (pin1 !== pin2) { setPinError('PINs do not match'); return }
    if (!studentPw && !qsiConfigured) {
      setPinError("Enter Aarav's current password so Quick Sign-in works on this device")
      return
    }
    setPinSave('saving')
    const hash = await hashPIN(pin1)
    const { error } = await supabase
      .from('profiles')
      .update({ pin_hash: hash })
      .eq('id', STUDENT_ID)
    if (error) { setPinSave('idle'); setPinError('Failed to save PIN'); return }
    if (studentPw) {
      saveQuickSignIn(STUDENT_EMAIL, studentPw, hash)
      setQsiConfigured(true)
    }
    setHasPIN(true)
    setPin1('')
    setPin2('')
    setStudentPw('')
    setPinSave('saved')
    setTimeout(() => setPinSave('idle'), 2000)
  }

  if (loading) return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8 max-w-xl mx-auto space-y-5">
      <div className="pt-2">
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configure Alpha Prep for Aarav</p>
      </div>

      {/* Exam Configuration */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Exam</h2>
        <div className="space-y-1.5">
          <label className="text-gray-400 text-sm block">Exam date</label>
          <input
            type="date"
            value={examDate}
            onChange={e => { setExamDate(e.target.value); setExamSave('idle') }}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-gray-500 text-xs">Countdowns across the app update immediately.</p>
        </div>
        <SaveButton state={examSave} onClick={handleSaveExamDate} />
      </section>

      {/* Session Configuration */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Sessions</h2>

        <div className="space-y-1.5">
          <label className="text-gray-400 text-sm block">Default session length (Planned Sessions)</label>
          <div className="grid grid-cols-4 gap-2">
            {(['15', '20', '30', '40'] as const).map(n => (
              <button
                key={n}
                onClick={() => { setDefaultQ(n); setSessionSave('idle') }}
                className={`py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  defaultQ === n
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {n}Q
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs">Domain Focus always 20Q · Topic Drill always 15Q</p>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-white text-sm font-medium">Writing domain</p>
            <p className="text-gray-500 text-xs mt-0.5">Include Written Expression in weekly plans</p>
          </div>
          <button
            onClick={() => { setWritingOn(prev => !prev); setSessionSave('idle') }}
            className={`relative w-11 h-6 rounded-full transition-colors ${writingOn ? 'bg-blue-600' : 'bg-gray-700'}`}
            aria-label="Toggle writing domain"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                writingOn ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <SaveButton state={sessionSave} onClick={handleSaveSession} />
      </section>

      {/* Aarav's PIN */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-white font-semibold">Aarav's Login PIN</h2>
          <p className="text-gray-500 text-xs mt-1">
            {hasPIN
              ? `PIN is set · Quick Sign-in ${qsiConfigured ? 'active on this device' : 'not set up on this device — enter password below'}.`
              : 'No PIN set — Aarav must use email + password to log in.'}
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm block">{hasPIN ? 'New PIN' : 'Set PIN'}</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin1}
              onChange={e => { setPin1(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              placeholder="••••"
              className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-lg tracking-widest text-center focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm block">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin2}
              onChange={e => { setPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
              placeholder="••••"
              className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-lg tracking-widest text-center focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm block">
              Aarav's password{qsiConfigured ? ' (leave blank to keep existing)' : ''}
            </label>
            <input
              type="password"
              value={studentPw}
              onChange={e => { setStudentPw(e.target.value); setPinError('') }}
              placeholder={qsiConfigured ? '(unchanged)' : "Aarav's current password"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-gray-600 text-xs">
              Stored locally on this device so Aarav can sign in with just his PIN.
            </p>
          </div>
          {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
        </div>
        <SaveButton
          state={pinSave}
          onClick={handleSavePIN}
          label={hasPIN ? 'Change PIN' : 'Set PIN'}
          savedLabel="PIN saved"
          disabled={pin1.length !== 4 || pin2.length !== 4}
        />
      </section>

      {/* Child Account (read-only) */}
      <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-white font-semibold">Aarav's Account</h2>
        <div className="space-y-2.5 text-sm">
          <Row label="Name" value="Aarav" />
          <Row label="Email" value={STUDENT_EMAIL} />
          <Row label="Role" value="Student" />
        </div>
      </section>

      <div className="h-4" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function SaveButton({
  state,
  onClick,
  label = 'Save',
  savedLabel = '✓ Saved',
  disabled = false,
}: {
  state: SaveState
  onClick: () => void
  label?: string
  savedLabel?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={state === 'saving' || disabled}
      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
    >
      {state === 'saving' ? 'Saving…' : state === 'saved' ? savedLabel : label}
    </button>
  )
}
