// Public contract: https://facilitoplay.com/documentacion (2026-10-26).
export const FACILITOPLAY_ORIGIN = 'https://facilitoplay.com'
const EVENTS = new Set(['ready', 'play', 'pause', 'time', 'ended', 'unavailable', 'error'])

function integer(value, minimum, name) {
  if (!/^(0|[1-9]\d*)$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum) {
    throw new TypeError(`${name}: entero válido desde ${minimum} requerido`)
  }
  return Number(value)
}

export function normalizeRequest(request) {
  if (!request || !['movie', 'tv'].includes(request.mediaType)) throw new TypeError('Tipo inválido')
  const id = integer(request.id, 1, 'TMDB ID')
  if (request.mediaType === 'movie') return { mediaType: 'movie', id }
  // Public docs only promise seasons >= 1. Do not remap specials to season 1.
  return { mediaType: 'tv', id, season: integer(request.season, 1, 'Temporada'), episode: integer(request.episode, 1, 'Episodio') }
}

export function buildFacilitoplayUrl(request) {
  const r = normalizeRequest(request)
  return `${FACILITOPLAY_ORIGIN}/e/${r.mediaType === 'movie' ? `pelicula/${r.id}` : `serie/${r.id}/${r.season}/${r.episode}`}`
}

export const facilitoplay = Object.freeze({
  id: 'facilitoplay',
  experimental: true,
  buildUrl: buildFacilitoplayUrl,
  audioTracks: null, subtitleTracks: null, // Unknown, not empty or invented.
  commands: false, // No documented remote play/pause/seek command contract.
})

export function facilitoplayRequestFromUrl(value) {
  try {
    const url = new URL(value)
    if (url.origin !== FACILITOPLAY_ORIGIN) return null
    const movie = url.pathname.match(/^\/e\/pelicula\/([1-9]\d*)$/)
    const tv = url.pathname.match(/^\/e\/serie\/([1-9]\d*)\/([1-9]\d*)\/([1-9]\d*)$/)
    return movie ? normalizeRequest({ mediaType: 'movie', id: movie[1] }) : tv ?
      normalizeRequest({ mediaType: 'tv', id: tv[1], season: tv[2], episode: tv[3] }) : null
  } catch { return null }
}

export function readFacilitoplayMessage(event, frameWindow, playerUrl) {
  const request = facilitoplayRequestFromUrl(playerUrl)
  if (!request) return null
  const parsed = parseFacilitoplayEvent(event, frameWindow, request)
  if (!parsed) return null
  // A missing identity field is not evidence of a wrong episode.
  if (!parsed.media) return { activityOnly: true, status: 'identity-unverified' }
  if (!parsed.identityMatches) return { activityOnly: true, status: 'content-mismatch' }
  if (['ready', 'error', 'unavailable'].includes(parsed.event) || parsed.currentTime === undefined) {
    return { activityOnly: true, status: parsed.event, reason: parsed.reason }
  }
  return {
    time: parsed.currentTime, duration: parsed.duration || 0,
    paused: parsed.event === 'play' ? false : ['pause', 'ended'].includes(parsed.event) ? true : null,
    status: parsed.event,
  }
}

export function parseFacilitoplayEvent(event, frameWindow, request) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== FACILITOPLAY_ORIGIN) return null
  const d = event.data
  if (!d || typeof d !== 'object' || d.source !== 'facilitoplay' || !EVENTS.has(d.event)) return null
  const r = normalizeRequest(request)
  const m = d.media
  const expectedType = r.mediaType === 'movie' ? 'pelicula' : 'serie'
  const identityMatches = !!m && m.type === expectedType && Number.isSafeInteger(m.tmdbId) && m.tmdbId === r.id &&
    (r.mediaType === 'movie' || (m.season === r.season && m.episode === r.episode))
  const result = { event: d.event, identityMatches, media: m ? {
    type: String(m.type).slice(0, 20), tmdbId: m.tmdbId, season: m.season, episode: m.episode,
  } : null }
  if (typeof d.reason === 'string') result.reason = d.reason.slice(0, 200)
  for (const key of ['currentTime', 'duration']) {
    if (typeof d[key] === 'number' && Number.isFinite(d[key]) && d[key] >= 0) result[key] = d[key]
  }
  return result
}
