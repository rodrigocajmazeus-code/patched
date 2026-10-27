import { useEffect, useState } from 'react'
import { readVidRiftTelemetry, VIDRIFT_EMBED_ORIGIN, vidriftStateRequest } from '../player/vidriftTelemetry.js'

// Read-only provider messages, validated against the exact iframe, title and episode.
// Provider claims are not user-confirmed audiovisual observations.
export function useVidRiftEvidence({ iframeRef, active, playerUrl, mediaType, id, season, episode }) {
  const [telemetry, setTelemetry] = useState(null)
  useEffect(() => {
    setTelemetry(null)
    if (!active || !playerUrl) return
    let origin
    try { origin = new URL(playerUrl).origin } catch { return }
    if (origin !== VIDRIFT_EMBED_ORIGIN) return
    const frame = iframeRef.current?.contentWindow
    if (!frame) return
    const request = { mediaType, id, season, episode }
    const onMessage = event => {
      const parsed = readVidRiftTelemetry(event, frame, request)
      if (!parsed) return
      // Episode changes are hints only and do not navigate or change stored evidence.
      setTelemetry(previous => ({ ...(previous || {}),
        ...(parsed.kind === 'state' ? { state: parsed } : {}),
        ...(parsed.kind === 'progress' ? { progress: parsed } : {}),
        ...(parsed.kind === 'episode-hint' ? { episodeHint: parsed } : {}),
        ...(parsed.kind === 'command-error' ? { error: parsed.reason } : {}),
      }))
    }
    window.addEventListener('message', onMessage)
    try { frame.postMessage(vidriftStateRequest(), VIDRIFT_EMBED_ORIGIN) } catch { /* iframe might have navigated */ }
    return () => window.removeEventListener('message', onMessage)
  }, [iframeRef, active, playerUrl, mediaType, id, season, episode])
  return telemetry
}
