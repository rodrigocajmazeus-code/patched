// Lab fixtures reuse the same adapter as StreamBox.
import { buildMovieMasterUrl as buildAdapterUrl } from '../providers/moviemaster.js'
export { MOVIEMASTER_ORIGIN, parseMovieMasterEvent } from '../providers/moviemaster.js'
export const MOVIEMASTER_CASES = Object.freeze({
  'aot-lat': Object.freeze({ providerId: 'moviemaster', title: 'Attack on Titan T1E1', mediaType: 'tv', id: 1429, season: 1, episode: 1, requestedVariant: 'LAT' }),
  'kimetsu-sub': Object.freeze({ providerId: 'moviemaster', title: 'Kimetsu no Yaiba T1E1', mediaType: 'tv', id: 85937, season: 1, episode: 1, requestedVariant: 'SUB' }),
})

export function buildMovieMasterUrl(request) {
  if (!request || request.mediaType !== 'tv') throw new TypeError('Caso de laboratorio inválido')
  for (const field of ['id', 'season', 'episode']) {
    if (!Number.isSafeInteger(request[field]) || request[field] < 1) throw new TypeError('Caso de laboratorio inválido')
  }
  return buildAdapterUrl(request)
}
// These events do not report title identity, selected variant, audible language,
// subtitles or fallback. Preserve those as unknown until manual observation.
export function initialEvidence() {
  return { iframeLoadEvent: false, providerHello: false, providerTimeAdvance: false,
    playback: 'unobserved', identity: 'unobserved', heardAudio: 'unobserved',
    subtitles: 'unobserved', subtitleControl: 'unobserved',
    observedVariant: 'unobserved', fallback: 'unobserved' }
}

export function reduceEvidence(state, kind, detail = {}) {
  if (kind === 'iframe-load') return { ...state, iframeLoadEvent: true }
  if (kind === 'provider-hello') return { ...state, providerHello: true }
  if (kind === 'provider-time-advance') return { ...state, providerTimeAdvance: true }
  if (kind === 'manual') {
    const result = { ...state }
    // Never allow manual form data to rewrite automatic events.
    for (const field of ['playback', 'identity', 'heardAudio', 'subtitles', 'subtitleControl', 'observedVariant', 'fallback']) {
      if (typeof detail[field] === 'string') result[field] = detail[field].slice(0, 500)
    }
    return result
  }
  return state
}
