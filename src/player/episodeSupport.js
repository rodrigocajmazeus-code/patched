// Local-only episode diagnostics and user-managed external bookmarks.
// Provider iframes are cross-origin; their playback, audio and ads cannot be inspected reliably.
const MAX_LINK_LENGTH = 2048

export function episodeSupportKey({ mediaType, id, season = 1, episode = 1 }) {
  const type = mediaType === 'tv' ? 'tv' : 'movie'
  const number = (value) => String(value).replace(/[^0-9]/g, '').slice(0, 15) || '0'
  return type === 'tv'
    ? `patched.episode-support.v1:${type}:${number(id)}:${number(season)}:${number(episode)}`
    : `patched.episode-support.v1:${type}:${number(id)}`
}

export function normalizeExternalWatchUrl(input) {
  const value = String(input || '').trim()
  if (!value || value.length > MAX_LINK_LENGTH) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (!url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) return null
    return url.href
  } catch {
    return null
  }
}

export const ISSUE_CHOICES = Object.freeze([
  { value: 'untested', label: 'Sin comprobar' },
  { value: 'ok', label: 'Funcionó correctamente' },
  { value: 'stalled', label: 'Se detuvo o no cargó' },
  { value: 'missing-castilian', label: 'No encontré castellano en este capítulo' },
  { value: 'missing-audio', label: 'Sin audio o idioma incorrecto' },
  { value: 'ads', label: 'Publicidad o ventanas molestas' },
  { value: 'wrong-episode', label: 'Episodio incorrecto' },
])

export const LANGUAGE_CHOICES = Object.freeze([
  { value: 'unknown', label: 'Idioma sin comprobar' },
  { value: 'es-419', label: 'Español latino confirmado por mí' },
  { value: 'es-ES', label: 'Castellano confirmado por mí' },
  { value: 'sub', label: 'Subtitulado confirmado por mí' },
  { value: 'not-found', label: 'No encontré mi idioma' },
])

export function normalizeEpisodeSupport(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { externalUrl: '', providers: {} }
  const providers = raw.providers && typeof raw.providers === 'object' && !Array.isArray(raw.providers)
    ? raw.providers : {}
  return {
    externalUrl: normalizeExternalWatchUrl(raw.externalUrl) || '',
    providers,
  }
}

export function readEpisodeSupport(request, storage) {
  const store = storage ?? (typeof window === 'undefined' ? null : window.localStorage)
  try {
    return normalizeEpisodeSupport(JSON.parse(store?.getItem(episodeSupportKey(request)) || 'null'))
  } catch {
    return normalizeEpisodeSupport(null)
  }
}

export function saveEpisodeSupport(request, record, storage) {
  const store = storage ?? (typeof window === 'undefined' ? null : window.localStorage)
  const normalized = normalizeEpisodeSupport(record)
  try {
    store?.setItem(episodeSupportKey(request), JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}
