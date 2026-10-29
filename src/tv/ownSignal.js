export function authorizedStreamCandidate(value) {
  if (typeof value !== 'string' || value.length > 4096) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (!url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) return null
    const path = url.pathname.toLowerCase()
    const type = path.endsWith('.m3u8') ? 'hls' : path.endsWith('.mp4') ? 'mp4' : null
    if (!type) return null
    return { url: url.href, type, labels: [], provider: 'Fuente propia' }
  } catch {
    return null
  }
}
