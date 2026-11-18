import { useEffect } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { useIdleLogout } from '../hooks/useIdleLogout'

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Runs the idle-logout timer for the authenticated shell and shows its
 * reminders: one every 5 minutes of inactivity, plus a countdown during the
 * last minute before the automatic logout. Isolated in its own component so
 * the per-second countdown does not re-render the whole layout.
 */
export function IdleSessionNotice() {
  const { notice, stayActive } = useIdleLogout()

  // Surface the warning in the tab title too, in case the portal is in the background.
  useEffect(() => {
    if (!notice) return
    const original = document.title
    document.title =
      notice.kind === 'final'
        ? `(${formatCountdown(notice.secondsLeft)}) Sesión por expirar`
        : '(!) Sesión inactiva'
    return () => {
      document.title = original
    }
  }, [notice])

  if (!notice) return null

  const isFinal = notice.kind === 'final'

  return (
    <div
      className={`idle-notice${isFinal ? ' idle-notice-final' : ''}`}
      role={isFinal ? 'alertdialog' : 'status'}
      aria-live={isFinal ? 'assertive' : 'polite'}
      aria-labelledby="idle-notice-title"
    >
      <span className="idle-notice-icon" aria-hidden="true">
        {isFinal ? <AlertTriangle size={18} /> : <Clock size={18} />}
      </span>
      <div className="idle-notice-body">
        <div id="idle-notice-title" className="idle-notice-title">
          {isFinal ? 'Tu sesión está por cerrarse' : 'Sesión inactiva'}
        </div>
        <div className="idle-notice-text">
          {isFinal ? (
            <>
              Por seguridad, se cerrará en{' '}
              <strong className="idle-notice-countdown">{formatCountdown(notice.secondsLeft)}</strong>{' '}
              y volverás al inicio de sesión.
            </>
          ) : (
            <>
              Llevas {notice.idleMinutes} minutos sin actividad. Tu sesión se cerrará en{' '}
              {notice.remainingMinutes} minutos si no continúas.
            </>
          )}
        </div>
      </div>
      <button className={`btn btn-sm ${isFinal ? 'btn-primary' : 'btn-ghost'}`} onClick={stayActive}>
        {isFinal ? 'Seguir conectado' : 'Entendido'}
      </button>
    </div>
  )
}
