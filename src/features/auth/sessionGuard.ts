// Decides whether a session cookie found on page load may be reused.
//
// The backend's HttpOnly session cookie outlives the browser (Max-Age 1h), so
// on its own it would let anyone reopening the portal walk straight in. A
// session is only trusted when it was started by an explicit login from this
// browser, the browser has not been closed since, and the user has not been
// idle longer than IDLE_TIMEOUT_MS.

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000
// Shared across tabs so activity in any open tab keeps the session alive.
export const LAST_ACTIVITY_KEY = 'aremec-last-activity'

// Set when the user presses "Iniciar sesión"; consumed when the app loads after
// the Auth0 round-trip. Matches the backend OAuth state cookie lifetime.
const LOGIN_STARTED_KEY = 'aremec-login-started'
const LOGIN_STARTED_TTL_MS = 5 * 60 * 1000

// Cookie without Max-Age/Expires: the browser drops it when it is closed.
const BROWSER_SESSION_COOKIE = 'aremec-browser-session'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode, blocked).
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage unavailable (private mode, blocked).
  }
}

function hasBrowserSessionCookie(): boolean {
  return document.cookie.split('; ').some((c) => c === `${BROWSER_SESSION_COOKIE}=1`)
}

function setBrowserSessionCookie() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${BROWSER_SESSION_COOKIE}=1; Path=/; SameSite=Lax${secure}`
}

function clearBrowserSessionCookie() {
  document.cookie = `${BROWSER_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

/** Call right before redirecting the browser to the backend's /auth/login. */
export function markLoginStarted() {
  safeSet(LOGIN_STARTED_KEY, String(Date.now()))
}

/**
 * Returns true when an existing backend session may be used. A pending explicit
 * login is consumed here (single use) and turned into a trusted browser session.
 */
export function claimTrustedSession(): boolean {
  const now = Date.now()
  const started = Number(safeGet(LOGIN_STARTED_KEY))
  safeRemove(LOGIN_STARTED_KEY)

  if (Number.isFinite(started) && started > 0 && now - started <= LOGIN_STARTED_TTL_MS) {
    setBrowserSessionCookie()
    safeSet(LAST_ACTIVITY_KEY, String(now))
    return true
  }

  if (!hasBrowserSessionCookie()) return false
  const lastActivity = Number(safeGet(LAST_ACTIVITY_KEY))
  return Number.isFinite(lastActivity) && now - lastActivity < IDLE_TIMEOUT_MS
}

/** Forget every client-side trace of the session (logout, idle, rejected reuse). */
export function clearTrustedSession() {
  clearBrowserSessionCookie()
  safeRemove(LOGIN_STARTED_KEY)
  safeRemove(LAST_ACTIVITY_KEY)
}
