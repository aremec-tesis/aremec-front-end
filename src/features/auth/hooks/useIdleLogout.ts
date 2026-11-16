import { useEffect } from 'react'
import { useEndSession } from './useEndSession'
import { LOGOUT_REASON_IDLE } from '../loginMessages'

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const CHECK_INTERVAL_MS = 15 * 1000
const WRITE_THROTTLE_MS = 5 * 1000
// Shared across tabs so activity in any open tab keeps the session alive.
const LAST_ACTIVITY_KEY = 'aremec-last-activity'

const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const

function readLastActivity(fallback: number): number {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY)
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) ? Math.max(value, fallback) : fallback
  } catch {
    return fallback
  }
}

function writeLastActivity(ts: number) {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(ts))
  } catch {
    // Storage unavailable (private mode, blocked) — the in-memory value still works.
  }
}

/**
 * Logs the neurologist out after IDLE_TIMEOUT_MS without user interaction:
 * the backend expires the session cookie and the app redirects to
 * /login?reason=idle. Mount once inside the authenticated layout.
 */
export function useIdleLogout(timeoutMs: number = IDLE_TIMEOUT_MS) {
  const endSession = useEndSession()

  useEffect(() => {
    // Mounting the authenticated shell (fresh login or reload) counts as activity;
    // this also discards a stale timestamp left by a previous session.
    let lastActivity = Date.now()
    let lastWrite = lastActivity
    let loggingOut = false
    writeLastActivity(lastActivity)

    const onActivity = () => {
      const now = Date.now()
      lastActivity = now
      if (now - lastWrite >= WRITE_THROTTLE_MS) {
        lastWrite = now
        writeLastActivity(now)
      }
    }

    const check = () => {
      if (loggingOut) return
      // Background tabs throttle timers, so always compare wall-clock time.
      const latest = readLastActivity(lastActivity)
      if (Date.now() - latest >= timeoutMs) {
        loggingOut = true
        void endSession({ reason: LOGOUT_REASON_IDLE })
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check()
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true, capture: true }),
    )
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', check)
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity, { capture: true }),
      )
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', check)
      window.clearInterval(interval)
    }
  }, [timeoutMs, endSession])
}
