import { useEffect, useRef, useState } from 'react'
import { Stream } from '@cloudflare/stream-react'

type Props = {
  streamId: string
}

type PlaybackStatus = 'loading' | 'playing' | 'exhausted'

const RETRY_INTERVAL_MS = 5000
const MAX_RETRY_MS = 2 * 60 * 1000

export function CloudflareStreamPlayer({ streamId }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<PlaybackStatus>('loading')
  const elapsedMsRef = useRef(0)

  useEffect(() => {
    if (!streamId.trim() || status !== 'loading') return

    elapsedMsRef.current = 0
    const timer = setInterval(() => {
      elapsedMsRef.current += RETRY_INTERVAL_MS
      if (elapsedMsRef.current >= MAX_RETRY_MS) {
        setStatus('exhausted')
        return
      }
      setAttempt((n) => n + 1)
    }, RETRY_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [streamId, status])

  if (!streamId.trim()) {
    return (
      <div className="live-wrapper">
        <div
          className="live-placeholder"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
        >
          Stream no configurado
        </div>
      </div>
    )
  }

  return (
    <div className="live-wrapper">
      <Stream
        key={attempt}
        className="live-background"
        src={streamId}
        title="Stream VR en vivo"
        autoplay
        muted
        responsive={false}
        onPlaying={() => setStatus('playing')}
        onError={() => setStatus((s) => (s === 'exhausted' ? s : 'loading'))}
      />

      {status === 'loading' && (
        <div className="live-loading-overlay">Conectando con el stream…</div>
      )}

      {status === 'exhausted' && (
        <div className="live-loading-overlay">
          No se pudo cargar el stream.
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setAttempt((n) => n + 1)
              setStatus('loading')
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="live-badge">
        <div className="live-dot" />
        EN VIVO
      </div>
    </div>
  )
}
