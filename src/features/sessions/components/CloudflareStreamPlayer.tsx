import { useEffect, useRef, useState } from 'react'

type Props = {
  streamId: string
  /** Cloudflare Stream customer domain, e.g. `customer-xxxx.cloudflarestream.com`. */
  customerDomain: string
}

// The VR headset publishes over WebRTC (WHIP). Cloudflare only lets WHIP inputs
// be watched over WHEP — there is no HLS/DASH fallback — so we speak WHEP
// directly with an RTCPeerConnection instead of going through Cloudflare's
// iframe player. That player auto-updates (`sdk-iframe-integration…latest.js`)
// and probes `/webRTC/play` with HEAD, a method the endpoint does not accept,
// which leaves the embed stuck on a stream of 404s even while the input is live.

/** How often `/lifecycle` is polled while waiting for the headset to go live. */
const LIFECYCLE_POLL_MS = 3000
/** Feed considered frozen when the video clock does not advance for this long. */
const FROZEN_FEED_MS = 5000
/** Grace period for a transient ICE `disconnected` before tearing down. */
const ICE_DISCONNECT_GRACE_MS = 3000
/** Upper bound for non-trickle ICE gathering before sending the offer anyway. */
const ICE_GATHER_TIMEOUT_MS = 2000

type Phase = 'waiting' | 'connecting' | 'live'

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange)
      clearTimeout(timer)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done()
    }
    const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS)
    pc.addEventListener('icegatheringstatechange', onChange)
  })
}

export function CloudflareStreamPlayer({ streamId, customerDomain }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  const [hasBeenLive, setHasBeenLive] = useState(false)
  // Bumping this tears the current session down and starts a fresh one.
  const [session, setSession] = useState(0)

  const id = streamId.trim()
  const baseUrl = `https://${customerDomain.trim()}/${id}`

  useEffect(() => {
    if (!id) return

    let cancelled = false
    let pc: RTCPeerConnection | null = null
    let resourceUrl: string | null = null
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    let disconnectTimer: ReturnType<typeof setTimeout> | undefined
    let watchdog: ReturnType<typeof setInterval> | undefined

    const restart = () => {
      if (!cancelled) setSession((n) => n + 1)
    }

    const startWatchdog = () => {
      const video = videoRef.current
      if (!video) return
      let lastTime = video.currentTime
      let lastAdvance = Date.now()
      watchdog = setInterval(() => {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime
          lastAdvance = Date.now()
        } else if (Date.now() - lastAdvance > FROZEN_FEED_MS) {
          restart()
        }
      }, 1000)
    }

    const connect = async () => {
      setPhase('connecting')
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
        bundlePolicy: 'max-bundle',
      })
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      const remote = new MediaStream()
      pc.ontrack = (event) => {
        remote.addTrack(event.track)
        const video = videoRef.current
        if (video && video.srcObject !== remote) {
          video.srcObject = remote
          void video.play().catch(() => {})
        }
      }

      pc.onconnectionstatechange = () => {
        if (!pc || cancelled) return
        const state = pc.connectionState
        if (state === 'failed' || state === 'closed') {
          restart()
        } else if (state === 'disconnected') {
          disconnectTimer = setTimeout(restart, ICE_DISCONNECT_GRACE_MS)
        } else if (state === 'connected') {
          clearTimeout(disconnectTimer)
        }
      }

      await pc.setLocalDescription(await pc.createOffer())
      await waitForIceGathering(pc)
      if (cancelled || !pc.localDescription) return

      const res = await fetch(`${baseUrl}/webRTC/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription.sdp,
      })
      if (cancelled) return
      if (!res.ok) throw new Error(`WHEP ${res.status}`)

      const location = res.headers.get('Location')
      if (location) resourceUrl = new URL(location, baseUrl).toString()

      await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() })
    }

    // Wait (cheaply) until Cloudflare reports the input as live, then negotiate.
    const poll = async () => {
      try {
        const res = await fetch(`${baseUrl}/lifecycle`, { cache: 'no-store' })
        const info = (await res.json()) as { live?: boolean }
        if (cancelled) return
        if (info.live) {
          await connect()
          return
        }
      } catch (err) {
        if (cancelled) return
        console.warn('[CloudflareStreamPlayer]', err)
        // A failed negotiation leaves a half-open peer — start clean.
        if (pc) {
          restart()
          return
        }
      }
      if (!cancelled) {
        setPhase('waiting')
        pollTimer = setTimeout(poll, LIFECYCLE_POLL_MS)
      }
    }

    const video = videoRef.current
    const onPlaying = () => {
      if (cancelled) return
      setPhase('live')
      setHasBeenLive(true)
      clearInterval(watchdog)
      startWatchdog()
    }
    video?.addEventListener('playing', onPlaying)

    void poll()

    return () => {
      cancelled = true
      clearTimeout(pollTimer)
      clearTimeout(disconnectTimer)
      clearInterval(watchdog)
      video?.removeEventListener('playing', onPlaying)
      if (video) video.srcObject = null
      pc?.close()
      // Release the WHEP session on Cloudflare's side.
      if (resourceUrl) void fetch(resourceUrl, { method: 'DELETE' }).catch(() => {})
    }
  }, [id, baseUrl, session])

  if (!id) {
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

  const isLive = phase === 'live'
  const placeholder =
    phase === 'waiting'
      ? hasBeenLive
        ? 'Señal perdida — esperando que la RV vuelva a transmitir…'
        : 'Esperando transmisión de la RV…'
      : hasBeenLive
        ? 'Reconectando con el stream…'
        : 'Conectando con el stream…'

  return (
    <div className="live-wrapper">
      {!isLive && (
        <div
          className="live-placeholder"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {placeholder}
        </div>
      )}
      <div className={`live-background ${isLive ? 'is-live' : 'is-hidden'}`}>
        <video ref={videoRef} title="Stream VR en vivo" autoPlay muted playsInline />
      </div>

      {isLive && (
        <div className="live-badge">
          <div className="live-dot" />
          En vivo
        </div>
      )}
    </div>
  )
}
