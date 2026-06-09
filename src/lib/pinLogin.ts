// Stores Quick Sign-In credentials in localStorage.
// The parent enters the student's password once during setup; it's base64-encoded
// alongside the PIN hash so the Login page can sign in without user interaction.
// Appropriate for a private single-family app on a trusted device.

const CFG_KEY = 'alpha_prep_qsi'

interface QSIConfig {
  email: string
  pw: string   // base64
  hash: string // SHA-256("alpha-prep-pin:" + pin)
}

export async function hashPIN(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`alpha-prep-pin:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function isPinConfigured(): boolean {
  return !!localStorage.getItem(CFG_KEY)
}

export function saveQuickSignIn(email: string, password: string, pinHash: string): void {
  const cfg: QSIConfig = { email, pw: btoa(password), hash: pinHash }
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
}

export async function verifyPINAndGetCredentials(
  pin: string,
): Promise<{ email: string; password: string } | null> {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as QSIConfig
    const entered = await hashPIN(pin)
    if (entered !== cfg.hash) return null
    return { email: cfg.email, password: atob(cfg.pw) }
  } catch {
    return null
  }
}
