// Public contract: https://vidrift.net/ — no private streams or inferred tracks.
import { readVidRiftTelemetry } from '../vidriftTelemetry.js'
export const VIDRIFT_ORIGIN = 'https://embed.vidrift.net'
export function buildVidRiftUrl(request) {
  if (!request || !['movie', 'tv'].includes(request.mediaType)) throw new TypeError('VidRift: tipo de contenido inválido')
  const positive = value => {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new TypeError('VidRift: identificador o episodio inválido')
    return Number(value)
  }
  const path = request.mediaType === 'tv' ? `tv/${positive(request.id)}/${positive(request.season)}/${positive(request.episode)}` : `movie/${positive(request.id)}`
  // The documented default attempts muted autoplay, avoiding a forced extra click.
  // Do not add autoplay=0: it deliberately disables the provider's start behavior.
  return `${VIDRIFT_ORIGIN}/embed/${path}`
}
// Translate only documented, identity-checked events into player activity.
// These callbacks do not establish real audio, visual quality or episode identity.
export function readVidRiftEvent(event, frameWindow, playerUrl) {
  let expected
  try {
    const url = new URL(playerUrl)
    if (url.origin !== VIDRIFT_ORIGIN) return null
    const tv = url.pathname.match(/^\/embed\/tv\/([1-9]\d*)\/([1-9]\d*)\/([1-9]\d*)$/)
    const movie = url.pathname.match(/^\/embed\/movie\/([1-9]\d*)$/)
    if (!tv && !movie) return null
    expected = tv
      ? { mediaType: 'tv', id: Number(tv[1]), season: Number(tv[2]), episode: Number(tv[3]) }
      : { mediaType: 'movie', id: Number(movie[1]) }
  } catch {
    return null
  }
  const data = readVidRiftTelemetry(event, frameWindow, expected)
  if (!data) return null
  if (data.kind === 'progress') return {
    time: data.currentTime, duration: data.duration, paused: false, status: 'time',
  }
  if ((data.kind === 'paused' || data.kind === 'unpaused') && data.currentTime !== null) {
    return { time: data.currentTime, duration: 0, paused: data.kind === 'paused', status: data.kind }
  }
  if (data.kind === 'state' && data.currentTime !== null && data.duration !== null) {
    return { time: data.currentTime, duration: data.duration, paused: data.paused, status: 'time' }
  }
  if (data.kind === 'ended') return { activityOnly: true, status: 'ended' }
  return null
}
export const vidrift = Object.freeze({ id: 'vidrift', name: 'VidRift (sin verificar)',
  origin: VIDRIFT_ORIGIN, experimental: true, commands: true,
  referrerPolicy: 'strict-origin-when-cross-origin', audioTracks: null, subtitleTracks: null,
  buildUrl: buildVidRiftUrl,
  readEvent: readVidRiftEvent,
})
