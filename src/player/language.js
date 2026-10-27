export const AUDIO_LANGUAGES = [
  { code: 'es-419', label: 'Español latino' },
  { code: 'es-es', label: 'Español de España (castellano)' },
  { code: 'es', label: 'Español no especificado' },
  { code: 'ja', label: 'Japonés' },
  { code: 'en', label: 'Inglés' },
]

export const SUBTITLE_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'Inglés' },
]

export function normalizeLanguage(value) {
  const lang = String(value || '').trim().toLowerCase().replace(/_/g, '-')
  // Preserve regional identity. A generic Spanish tag is not proof of a dub.
  if (lang === 'spa') return 'es'
  if (lang === 'es' || lang.startsWith('es-')) return lang
  if (lang === 'jp' || lang === 'jpn' || lang.startsWith('ja')) return 'ja'
  if (lang === 'eng' || lang.startsWith('en')) return 'en'
  return lang
}

export function audioLabel(value) {
  const lang = normalizeLanguage(value)
  return AUDIO_LANGUAGES.find(item => item.code === lang)?.label || String(value || 'Audio sin identificar')
}

export function subtitleLabel(value) {
  const lang = normalizeLanguage(value)
  if (lang === 'es' || lang.startsWith('es-')) return 'Español'
  return SUBTITLE_LANGUAGES.find(item => item.code === lang)?.label || String(value || 'Subtítulos')
}

export function sortAudioTracks(tracks = []) {
  const order = { 'es-419': 0, ja: 1, en: 2 }
  return [...tracks].sort((a, b) => (order[normalizeLanguage(a.lang || a.language)] ?? 9) - (order[normalizeLanguage(b.lang || b.language)] ?? 9))
}
