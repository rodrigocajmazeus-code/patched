// Public iframe contract: https://api.moviemaster.lat/docs
export const MOVIEMASTER_ORIGIN = 'https://api.moviemaster.lat'
const variants = ['LAT', 'ESP', 'SUB']
function positive(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new TypeError('Identificador, temporada o episodio inválido')
  return Number(value)
}
export function buildMovieMasterUrl(request) {
  if (!request || !['movie', 'tv'].includes(request.mediaType)) throw new TypeError('Tipo de contenido inválido')
  const variant = request.requestedVariant ?? 'LAT'
  if (!variants.includes(variant)) throw new TypeError('Variante solicitada inválida')
  const id = positive(request.id)
  const path = request.mediaType === 'movie' ? `movie/${id}` : `tv/${id}/${positive(request.season)}/${positive(request.episode)}`
  return `${MOVIEMASTER_ORIGIN}/e/${path}?lang=${variant}`
}
export function parseMovieMasterEvent(event, frameWindow) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== MOVIEMASTER_ORIGIN) return null
  if (event.data === 'mm:hello') return { event: 'hello' }
  if (event.data === 'mm:ended') return { event: 'ended' }
  if (event.data === 'mm:fullscreen') return { event: 'fullscreen-request' }
  const data = event.data
  if (!data || typeof data !== 'object' || data.type !== 'mm:time') return null
  if (![data.currentTime, data.duration].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return null
  return { event: 'time', currentTime: data.currentTime, duration: data.duration }
}
export function readMovieMasterMessage(event, frameWindow, playerUrl) {
  try {
    const url = new URL(playerUrl)
    if (url.origin !== MOVIEMASTER_ORIGIN || !/^\/e\/(movie\/[1-9]\d*|tv\/[1-9]\d*\/[1-9]\d*\/[1-9]\d*)$/.test(url.pathname)) return null
    if (!variants.includes(url.searchParams.get('lang'))) return null
  } catch { return null }
  const data = parseMovieMasterEvent(event, frameWindow)
  if (!data) return null
  // Protocol has no media identity, selected language or subtitle inventory.
  if (data.event === 'time') return { time: data.currentTime, duration: data.duration, paused: null, status: 'time', identityReported: false }
  return { activityOnly: true, status: data.event === 'hello' ? 'ready' : data.event, identityReported: false }
}
export const moviemaster = Object.freeze({ id: 'moviemaster', name: 'MovieMaster (experimental)',
  origin: MOVIEMASTER_ORIGIN, experimental: true, requiresConfirmedSelection: true, commands: false,
  referrerPolicy: 'origin', audioTracks: null, subtitleTracks: null,
  buildUrl: buildMovieMasterUrl, readEvent: readMovieMasterMessage,
})
