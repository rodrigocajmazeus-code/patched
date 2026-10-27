// Local, user-entered audiovisual evidence. This NEVER implies a provider-wide
// guarantee, nor that an iframe.onload verified video playback.
export const PLAYBACK_REPORTS_KEY = 'streambox.playback-reports.v2'
const MAX_REPORTS = 200
export const PLAYBACK_RESULTS = Object.freeze(['works', 'unavailable', 'wrong-content'])
export const HEARD_AUDIO = Object.freeze(['es-419', 'es-ES', 'ja', 'en', 'other', 'unknown'])
export const SEEN_SUBTITLES = Object.freeze(['es', 'other', 'none', 'unknown'])
// Observación subjetiva, no lectura de bitrate ni garantía de resolución.
export const PICTURE_QUALITY = Object.freeze(['unknown', 'blurry', 'acceptable', 'sharp'])
export const BUFFERING = Object.freeze(['unknown', 'none', 'sometimes', 'often'])
export const DISPLAYED_RESOLUTION = Object.freeze(['unknown', '360p', '480p', '720p', '1080p', '1440p', '2160p', 'other'])

function integer(value, fallback = null) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 1 && /^[1-9]\d*$/.test(String(value)) ? number : fallback
}

export function playbackReportScope({ mediaType, id, season, episode, providerId, requestedVariant = null }) {
  const mediaId = integer(id)
  if (!['movie', 'tv'].includes(mediaType) || !mediaId || !/^[a-z0-9-]{2,32}$/.test(String(providerId))) return null
  const s = mediaType === 'tv' ? integer(season) : null
  const e = mediaType === 'tv' ? integer(episode) : null
  if (mediaType === 'tv' && (!s || !e)) return null
  if (requestedVariant !== null && (!/^[A-Za-z0-9-]{1,12}$/.test(String(requestedVariant)))) return null
  return `${mediaType}:${mediaId}:${s ?? '-'}:${e ?? '-'}:${providerId}:${requestedVariant || '-'}`
}

export function makePlaybackReport(scope, input, checkedAt = new Date().toISOString()) {
  const key = playbackReportScope(scope)
  if (!key || !PLAYBACK_RESULTS.includes(input?.result)) return null
  const works = input.result === 'works'
  return {
    key,
    result: input.result,
    audio: works && HEARD_AUDIO.includes(input.audio) ? input.audio : 'unknown',
    subtitles: works && SEEN_SUBTITLES.includes(input.subtitles) ? input.subtitles : 'unknown',
    picture: works && PICTURE_QUALITY.includes(input.picture) ? input.picture : 'unknown',
    buffering: works && BUFFERING.includes(input.buffering) ? input.buffering : 'unknown',
    // Resolución anotada del menú del proveedor, NO medida por StreamBox.
    displayedResolution: works && DISPLAYED_RESOLUTION.includes(input.displayedResolution) ? input.displayedResolution : 'unknown',
    checkedAt,
    observer: 'user-local',
  }
}

export function parsePlaybackReports(raw) {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.key === 'string' &&
      PLAYBACK_RESULTS.includes(item.result) && item.observer === 'user-local' &&
      HEARD_AUDIO.includes(item.audio) && SEEN_SUBTITLES.includes(item.subtitles) &&
      typeof item.checkedAt === 'string').slice(0, MAX_REPORTS).map(item => ({
        ...item,
        // Soporta registros de StreamBox 0.3/0.4 sin alterar su evidencia audiovisual.
        picture: PICTURE_QUALITY.includes(item.picture) && item.result === 'works' ? item.picture : 'unknown',
        buffering: BUFFERING.includes(item.buffering) && item.result === 'works' ? item.buffering : 'unknown',
        displayedResolution: DISPLAYED_RESOLUTION.includes(item.displayedResolution) && item.result === 'works' ? item.displayedResolution : 'unknown',
      })) : []
  } catch { return [] }
}

export function upsertPlaybackReport(records, report) {
  if (!report) return records
  return [report, ...records.filter(item => item.key !== report.key)].slice(0, MAX_REPORTS)
}

export function readPlaybackReport(storage, scope) {
  const key = playbackReportScope(scope)
  if (!key || !storage) return null
  try { return parsePlaybackReports(storage.getItem(PLAYBACK_REPORTS_KEY)).find(item => item.key === key) || null }
  catch { return null }
}

export function savePlaybackReport(storage, scope, input) {
  if (!storage) return null
  const report = makePlaybackReport(scope, input)
  if (!report) return null
  try {
    const old = parsePlaybackReports(storage.getItem(PLAYBACK_REPORTS_KEY))
    storage.setItem(PLAYBACK_REPORTS_KEY, JSON.stringify(upsertPlaybackReport(old, report)))
    return report
  } catch { return null }
}
