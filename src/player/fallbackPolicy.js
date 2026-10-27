// Fail over only when a provider reports a definitive failure, when an iframe
// itself errors, or when its document never loads. Cross-origin iframe.onload
// cannot establish that a video plays; silence isn't proof of a broken stream.
export const EMBED_LOAD_TIMEOUT_MS = 20000
export const VERIFIED_FAILURES = Object.freeze(['error', 'unavailable', 'content-mismatch'])

export function shouldAttemptFallback({ status, statusUrl, currentUrl, frameErrorUrl, frameLoaded, elapsedMs = 0 }) {
  if (!currentUrl) return false
  if (frameErrorUrl === currentUrl) return true
  if (statusUrl === currentUrl && VERIFIED_FAILURES.includes(status)) return true
  return !frameLoaded && elapsedMs >= EMBED_LOAD_TIMEOUT_MS
}

export function nextUntriedProvider({ providerId, candidates = [], attempted = [], order = [] }) {
  const available = new Set(candidates.filter(candidate => candidate.available).map(candidate => candidate.providerId))
  const tried = new Set(attempted)
  const current = order.indexOf(providerId)
  if (current < 0) return null
  // Forward only: never loop endlessly through a set of failing iframes.
  return order.slice(current + 1).find(id => available.has(id) && !tried.has(id)) || null
}

export function portalMessage({ kind = 'opening', sourceNumber = 1, mediaType = 'movie' } = {}) {
  if (kind === 'fallback') return `El parche busca otra señal… Abriendo portal a la opción ${sourceNumber}.`
  if (kind === 'error') return 'No se pudo abrir este portal. Puedes elegir otra opción.'
  if (sourceNumber === 1) return `Rick abrió un portal buscando ${mediaType === 'tv' ? 'tu episodio' : 'tu película'}…`
  if (sourceNumber === 2) return 'El parche está escaneando otra dimensión…'
  return 'Rastreando la señal a través del portal…'
}
