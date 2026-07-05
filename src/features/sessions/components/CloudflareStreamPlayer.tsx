import { useEffect, useState } from 'react'
import { Stream } from '@cloudflare/stream-react'

type Props = {
  streamId: string
}

const RETRY_INTERVAL_MS = 5000

export function CloudflareStreamPlayer({ streamId }: Props) {
  const [attempt, setAttempt] = useState(0)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!streamId.trim() || isLive) return

    const timer = setInterval(() => {
      setAttempt((n) => n + 1)
    }, RETRY_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [streamId, isLive])

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
        className={`live-background ${isLive ? 'is-live' : 'is-hidden'}`}
        src={streamId}
        title="Stream VR en vivo"
        autoplay
        muted
        responsive={false}
        onPlaying={() => setIsLive(true)}
        onError={() => setIsLive(false)}
      />

      {isLive && (
        <div className="live-badge">
          <div className="live-dot" />
          EN VIVO
        </div>
      )}
    </div>
  )
}
