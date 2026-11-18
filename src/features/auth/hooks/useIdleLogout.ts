import { useCallback, useEffect, useState } from 'react'
import { useEndSession } from './useEndSession'
import { LOGOUT_REASON_IDLE } from '../loginMessages'
import { IDLE_TIMEOUT_MS, LAST_ACTIVITY_KEY } from '../sessionGuard'

export { IDLE_TIMEOUT_MS }

// A reminder is shown every IDLE_REMINDER_EVERY_MS of inactivity, and a final
// warning with a countdown IDLE_FINAL_WARNING_MS before the automatic logout.
export const IDLE_REMINDER_EVERY_MS = 5 * 60 * 1000
export const IDLE_FINAL_WARNING_MS = 60 * 1000

// Once per second so the final-minute countdown stays accurate. The check only
// reads a timestamp; React state changes only when the visible notice changes.
const CHECK_INTERVAL_MS = 1000
const WRITE_THROTTLE_MS = 5 * 1000

const ACTIVITY_EVENTS = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const

export type IdleNotice =
  | { kind: 'reminder'; idleMinutes: number; remainingMinutes: number }
  | { kind: 'final'; secondsLeft: number }

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

function noticeFor(idleMs: number, timeoutMs: number): IdleNotice | null {
  const remainingMs = timeoutMs - idleMs
  if (remainingMs <= IDLE_FINAL_WARNING_MS) {
    return { kind: 'final', secondsLeft: Math.max(0, Math.ceil(remainingMs / 1000)) }
  }
  const reminders = Math.floor(idleMs / IDLE_REMINDER_EVERY_MS)
  if (reminders === 0) return null
  const idleMinutes = (reminders * IDLE_REMINDER_EVERY_MS) / 60000
  return {
    kind: 'reminder',
    idleMinutes,
    remainingMinutes: Math.round((timeoutMs - idleMinutes * 60000) / 60000),
  }
}

function sameNotice(a: IdleNotice | null, b: IdleNotice | null): boolean {
  if (a === null || b === null) return a === b
  if (a.kind === 'final' && b.kind === 'final') return a.secondsLeft === b.secondsLeft
  if (a.kind === 'reminder' && b.kind === 'reminder') return a.idleMinutes === b.idleMinutes
  return false
}

/**
 * Logs the neurologist out after `timeoutMs` without user interaction (the
 * backend expires the session cookie and the app redirects to
 * /login?reason=idle), surfacing reminders along the way. Activity in any open
 * tab resets the timer. Mount once inside the authenticated layout.
 *
 * Returns the notice to display (null when none) and `stayActive`, which
 * registers activity explicitly (e.g. from a "Seguir conectado" button).
 */
export function useIdleLogout(timeoutMs: number = IDLE_TIMEOUT_MS) {
  const endSession = useEndSession()
  const [notice, setNotice] = useState<IdleNotice | null>(null)

  const stayActive = useCallback(() => {
    writeLastActivity(Date.now())
    setNotice(null)
  }, [])

  useEffect(() => {
    // Mounting the authenticated shell (fresh login or reload) counts as activity;
    // this also discards a stale timestamp left by a previous session.
    let lastActivity = Date.now()
    let lastWrite = lastActivity
    let loggingOut = false
    let current: IdleNotice | null = null
    writeLastActivity(lastActivity)

    const check = () => {
      if (loggingOut) return
      // Background tabs throttle timers, so always compare wall-clock time.
      const idleMs = Date.now() - readLastActivity(lastActivity)
      if (idleMs >= timeoutMs) {
        loggingOut = true
        void endSession({ reason: LOGOUT_REASON_IDLE })
        return
      }
      const next = noticeFor(idleMs, timeoutMs)
      if (!sameNotice(current, next)) {
        current = next
        setNotice(next)
      }
    }

    const onActivity = () => {
      const now = Date.now()
      lastActivity = now
      if (now - lastWrite >= WRITE_THROTTLE_MS) {
        lastWrite = now
        writeLastActivity(now)
      }
      if (current) check()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check()
    }

    // Another tab registered activity: hide this tab's notice right away.
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && current) check()
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true, capture: true }),
    )
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', check)
    window.addEventListener('storage', onStorage)
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity, { capture: true }),
      )
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', check)
      window.removeEventListener('storage', onStorage)
      window.clearInterval(interval)
    }
  }, [timeoutMs, endSession])

  return { notice, stayActive }
}
