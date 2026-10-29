// Save a deliberate source choice by title, not chapter.
// Restoring this choice avoids jumping back to a default provider on every refresh.
export function providerMemoryKey({ mediaType, id }) {
  const type = mediaType === 'tv' ? 'tv' : 'movie'
  if (!/^[1-9]\d{0,14}$/.test(String(id))) return null
  return 'patched.playback.source.v1:' + type + ':' + String(id)
}

export function readRememberedProvider(request, store) {
  const key = providerMemoryKey(request)
  if (!key) return null
  try {
    const value = (store ?? (typeof window === 'undefined' ? null : window.localStorage))?.getItem(key)
    return typeof value === 'string' && /^[a-z][a-z0-9-]{0,45}$/.test(value) ? value : null
  } catch {
    return null
  }
}

export function saveRememberedProvider(request, providerId, store) {
  const key = providerMemoryKey(request)
  if (!key) return false
  try {
    const target = store ?? (typeof window === 'undefined' ? null : window.localStorage)
    if (!target) return false
    if (providerId && /^[a-z][a-z0-9-]{0,45}$/.test(providerId)) {
      target.setItem(key, providerId)
    } else if (!providerId) {
      target.removeItem(key)
    } else {
      return false
    }
    return true
  } catch {
    return false
  }
}
