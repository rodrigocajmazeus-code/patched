import { getProviderObservation } from '../data/providerObservations.js'
import { PRIMARY_PROVIDER_ORDER, resolveEmbedUrl } from '../data/providers.js'
import { hasReportedAds } from '../data/providerExperience.js'

export const PLAYBACK_PREFERENCES = Object.freeze([
  { id: 'es-419', label: 'Español latino', audio: 'es-419' },
  { id: 'ja-es', label: 'Japonés con subtítulos españoles', audio: 'ja', subtitles: 'es' },
  { id: 'ja', label: 'Japonés (sin exigir subtítulos)', audio: 'ja' },
  { id: 'es-ES', label: 'Castellano', audio: 'es-ES' },
  { id: 'manual', label: 'Elegir fuente manualmente' },
])
export function normalizePlaybackPreference(value) {
  return PLAYBACK_PREFERENCES.some(p => p.id === value) ? value : 'es-419'
}
export function requestedVariantFor(providerId, options = {}) {
  return providerId === 'moviemaster' ? options.moviemaster?.requestedVariant ?? 'LAT' : providerId === 'vidcloud' ? 'sub' : null
}
export function optionsForPreference(options, preference) {
  const variant = { 'es-419': 'LAT', 'es-ES': 'ESP', ja: 'SUB', 'ja-es': 'SUB' }[preference]
  return variant ? { ...options, moviemaster: { ...options.moviemaster, requestedVariant: variant } } : options
}

// This is an optional browser restriction, not an ad filter or access bypass.
// VidCloud explicitly documents sandbox incompatibility: never probe around it.
export function framePolicy(providerId, restricted = false) {
  if (!restricted) return { sandbox: undefined, blocked: false, status: 'compatibility-mode' }
  if (['vidcloud', 'vidrift'].includes(providerId)) return { blocked: true, status: 'documented-incompatible',
    reason: `${providerId} documenta incompatibilidad con sandbox. El modo restrictivo no cargará esta fuente; cambia de fuente o desactiva ese modo explícitamente.` }
  return { sandbox: 'allow-scripts allow-same-origin allow-presentation', blocked: false,
    status: 'playback-compatibility-unverified' }
}

// User-approved source order, distinct from language verification. No automatic
// failover after errors or changes to the requested language.
export function applyPreferredOrder(selection, preference, restricted = false) {
  if (preference === 'manual' || restricted) return selection
  const candidate = PRIMARY_PROVIDER_ORDER.map(id => selection.candidates.find(c => c.providerId === id && c.available)).find(Boolean)
  if (!candidate) return { ...selection, providerId: null, confirmed: false,
    reason: 'Las tres fuentes prioritarias están excluidas o no disponibles. Elige otra fuente manualmente.' }
  return { ...selection, providerId: candidate.providerId, confirmed: candidate.confirmed,
    reason: `Orden elegido por el usuario: MovieMaster → FacilitoPlay → VidRift. Fuente: ${candidate.providerId}. ${candidate.reason} La prioridad no confirma audio, subtítulos ni reproducción actual; no se cambia de fuente por un error automáticamente.` }
}

export function matchesObservedPreference(observation, wanted) {
  return !!wanted.audio && observation?.observer === 'user' && observation.playback === 'confirmed' &&
    observation.identity === 'title-and-episode-confirmed-by-user' && observation.audio?.[wanted.audio] === 'confirmed' &&
    (!wanted.subtitles || observation.confirmedSubtitleLanguages?.includes(wanted.subtitles) === true)
}

export function selectEpisodeProvider({ request, preference = 'es-419', providers = [], options = {}, excluded = [], restricted = false }) {
  const wanted = PLAYBACK_PREFERENCES.find(p => p.id === normalizePlaybackPreference(preference))
  const effectiveOptions = optionsForPreference(options, wanted.id)
  const candidates = providers.filter(p => !excluded.includes(p.id)).map(provider => {
    const variant = requestedVariantFor(provider.id, effectiveOptions)
    const observation = getProviderObservation(provider.id, request.mediaType, request.id, request.season, request.episode, variant)
    const embed = resolveEmbedUrl(provider.id, request.mediaType, request.id, request.season, request.episode, effectiveOptions)
    const policy = framePolicy(provider.id, restricted)
    const audio = observation?.audio?.[wanted.audio] === 'confirmed'
    // Visual captions and advertised/selectable tracks are deliberately insufficient.
    const subtitles = !wanted.subtitles || observation?.confirmedSubtitleLanguages?.includes(wanted.subtitles) === true
    const confirmed = matchesObservedPreference(observation, wanted)
    const reason = embed.error || (policy.blocked ? policy.reason : null) ||
      (confirmed ? 'Identidad y requisitos de idioma confirmados por el usuario para este caso.' :
        audio && !subtitles ? 'Audio confirmado; subtítulos españoles pendientes. No cumple la preferencia completa.' :
          observation?.audio?.[wanted.audio] === 'silent' ? 'Esta pista se registró sin audio en la prueba anterior.' :
            provider.id === 'moviemaster' && wanted.audio === 'es-419' && observation?.heardAudio === 'other-language-or-no-audio' ? 'LAT no confirmado: el usuario registró «otro idioma o sin audio».' :
            'Sin confirmación completa de identidad, audio y subtítulos para esta preferencia.')
    return { providerId: provider.id, observation, confirmed, available: !!embed.url && !policy.blocked, reason }
  })
  // Advertising reports break ties only after matching all audiovisual criteria.
  // Do not trade a confirmed language for an unknown one to reduce advertising.
  const match = wanted.audio && !restricted && candidates.filter(c => c.confirmed && c.available)
    .sort((a, b) => Number(hasReportedAds(a.providerId)) - Number(hasReportedAds(b.providerId)))[0]
  return { providerId: match ? match.providerId : null, confirmed: !!match, candidates,
    reason: match ? `${match.reason} Resultado histórico; los controles y posibles sustituciones dependen del proveedor.` :
      preference === 'manual' ? 'Elección manual solicitada. No se carga una fuente hasta que la elijas.' :
        'No hay una fuente habilitada con todos los requisitos confirmados para este episodio. Tu idioma solicitado se conserva; elige una fuente para comprobarla o cambia la preferencia explícitamente.' }
}
