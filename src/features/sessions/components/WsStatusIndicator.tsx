import { Loader2, RefreshCw, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '../../../store/app.store'

const STATUS_LABEL: Record<string, string> = {
  reconnecting: 'Reconectando...',
  polling: 'Actualización periódica activa',
  disconnected: 'Conexión perdida',
}

const STATUS_ICON: Record<string, LucideIcon> = {
  reconnecting: Loader2,
  polling: RefreshCw,
  disconnected: WifiOff,
}

export function WsStatusIndicator() {
  const wsStatus = useAppStore((s) => s.activeSession.wsStatus)

  if (wsStatus === 'connected') return null

  const Icon = STATUS_ICON[wsStatus]

  return (
    <div
      className={`ws-status-indicator ws-status-${wsStatus}`}
      role="status"
      aria-live="polite"
    >
      {Icon && (
        <Icon
          size={13}
          className={wsStatus === 'reconnecting' ? 'spin-icon' : undefined}
        />
      )}
      {STATUS_LABEL[wsStatus] ?? wsStatus}
    </div>
  )
}
