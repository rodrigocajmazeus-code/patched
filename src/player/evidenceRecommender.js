/**
 * Recomendador LOCAL de evidencias de StreamBox (experimental 0.8).
 * No consulta proveedores, no hace scraping, no reproduce videos ni cambia
 * automáticamente el proveedor. Conservar la decisión manual del usuario.
 *
 * Entradas compatibles con `playbackReports.js` y `availabilityIndex.js` 0.7.
 */

export const VIDEO_PROVIDER_ORDER = Object.freeze(['moviemaster', 'facilitoplay', 'vidrift'])
export const VIDEO_PREFERENCES = Object.freeze(['es-419', 'es-ES', 'ja', 'ja-es', 'manual'])
const AUDIOS = Object.freeze({ 'es-419': 'es-419', 'es-ES': 'es-ES', ja: 'ja', 'ja-es': 'ja' })
const MAX_VALID_AGE_DAYS = 30
const DAY_MS = 86400000

const isPositive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 && /^\d+$/.test(String(value))
const inArray = (value, values) => values.includes(value)

function titleAndEpisodeKeys({ mediaType, id, season, episode }) {
  if (!inArray(mediaType, ['tv', 'movie']) || !isPositive(id)) return null
  if (mediaType === 'movie') return { mediaKey: `movie:${Number(id)}`, fullKey: `movie:${Number(id)}:-:-` }
  if (!isPositive(season) || !isPositive(episode)) return null
  return { mediaKey: `tv:${Number(id)}`, episodeKey: `episode:${Number(id)}:${Number(season)}:${Number(episode)}`,
    fullKey: `tv:${Number(id)}:${Number(season)}:${Number(episode)}` }
}

export function requiredVariant(providerId, preference) {
  if (providerId !== 'moviemaster') return '-'
  return ({ 'es-419': 'LAT', 'es-ES': 'ESP', ja: 'SUB', 'ja-es': 'SUB' })[preference] || '-'
}

function reportTimestamp(record, nowMs) {
  const ts = Date.parse(record?.checkedAt || '')
  return Number.isFinite(ts) && ts <= nowMs + DAY_MS && ts > 0 ? ts : null
}

// Strict exact-title, exact-episode and exact-provider comparison.
// MovieMaster's LAT, ESP and SUB are different claims, not interchangeable.
function findRelevantReport(reports, scope, providerId, variant, nowMs) {
  const searchPrefix = `${scope.fullKey}:${providerId}:`
  const relevant = (Array.isArray(reports) ? reports : []).filter(r =>
    r?.observer === 'user-local' && inArray(r.result, ['works','unavailable','wrong-content']) &&
    typeof r.key === 'string' && r.key.startsWith(searchPrefix) &&
    // Require variant match for MovieMaster: no fallback from LAT to SUB.
    r.key === `${searchPrefix}${variant}` && reportTimestamp(r, nowMs) !== null)
  relevant.sort((a,b) => reportTimestamp(b, nowMs) - reportTimestamp(a, nowMs))
  return relevant[0] || null
}

function inventoryStatus(inventories, scope, providerId) {
  const matching = (Array.isArray(inventories) ? inventories : []).filter(d =>
    d?.providerId === providerId && Array.isArray(d.entries) &&
    inArray(d.sourceType, ['official-claimed', 'community', 'personal']))
    .sort((a,b) => (Date.parse(b.importedAt || '') || 0) - (Date.parse(a.importedAt || '') || 0))
  for (const d of matching) {
    if (scope.episodeKey && d.entries.includes(scope.episodeKey)) return { kind:'listed-episode', source:d.sourceLabel }
    if (d.entries.includes(scope.mediaKey)) return { kind:scope.episodeKey ? 'listed-series' : 'listed-title', source:d.sourceLabel }
  }
  return {kind:'unknown', source:null}
}

function reportStatus(report, preference, nowMs, staleDays) {
  const date = Date.parse(report.checkedAt)
  const ageDays = Math.max(0, Math.floor((nowMs - date) / DAY_MS))
  const stale = ageDays > staleDays
  const result = { kind:'unknown', languageMatched:false, stale, ageDays, reportDate:report.checkedAt,
    audio:report.audio || 'unknown', subtitles:report.subtitles || 'unknown',
    picture:report.picture || 'unknown', buffering:report.buffering || 'unknown',
    displayedResolution:report.displayedResolution || 'unknown', result:report.result }
  if (report.result !== 'works') return {...result, kind: report.result === 'wrong-content' ? 'wrong-content' : 'reported-unavailable' }
  if (preference === 'manual') return {...result, kind:'playback-observed', languageMatched:false }
  const matchesAudio = report.audio === AUDIOS[preference]
  const matchesSubs = preference !== 'ja-es' || report.subtitles === 'es'
  if (matchesAudio && matchesSubs) return {...result, kind:'language-observed', languageMatched:true}
  if (report.audio && report.audio !== 'unknown' && !matchesAudio) return {...result, kind:'language-mismatch'}
  if (preference === 'ja-es' && matchesAudio && !matchesSubs) return {...result, kind:'subtitles-unconfirmed'}
  return {...result, kind:'playback-observed'}
}

function confidenceScore(status) {
  if (status.kind === 'language-observed') {
    let score = status.stale ? 56 : 100
    if (status.picture === 'sharp') score += 3
    if (status.picture === 'blurry') score -= 6
    if (status.buffering === 'none') score += 3
    if (status.buffering === 'often') score -= 10
    return score
  }
  if (status.kind === 'playback-observed') return status.stale ? 20 : 38
  if (status.kind === 'subtitles-unconfirmed') return status.stale ? 17 : 32
  if (status.kind === 'listed-episode') return 16
  if (status.kind === 'listed-title') return 14
  if (status.kind === 'listed-series') return 8
  if (status.kind === 'language-mismatch') return -16
  if (status.kind === 'reported-unavailable') return -60
  if (status.kind === 'wrong-content') return -90
  return 0
}

const LABELS = Object.freeze({
  'language-observed':'Idioma solicitado comprobado anteriormente',
  'playback-observed':'Video comprobado; idioma solicitado no confirmado',
  'subtitles-unconfirmed':'Audio comprobado; subtítulos españoles pendientes',
  'language-mismatch':'Reproduce, pero el audio comprobado no coincide',
  'listed-episode':'Episodio incluido en una lista importada, sin prueba de reproducción',
  'listed-title':'Película incluida en una lista importada, sin prueba de reproducción',
  'listed-series':'Serie incluida en una lista; este episodio no está confirmado',
  'reported-unavailable':'Falló anteriormente con esta variante',
  'wrong-content':'Se registró contenido incorrecto para esta variante',
  unknown:'Disponibilidad e idioma sin comprobar',
})

/**
 * Returns a historically-informed *suggestion*; it never initiates playback.
 * `recommendedProviderId` means a suggested manual choice, NOT a live check.
 */
export function recommendVideoProviders({ request, preference='es-419', reports=[], inventories=[],
  excluded=[], now=new Date().toISOString(), staleDays=MAX_VALID_AGE_DAYS }={}) {
  const scope = titleAndEpisodeKeys(request || {})
  if (!scope) return { valid:false, candidates:[], recommendedProviderId:null,
    reason:'Identificador TMDB, temporada o episodio inválido.' }
  const effectivePreference = VIDEO_PREFERENCES.includes(preference) ? preference : 'es-419'
  const date = Date.parse(now)
  const nowMs = Number.isFinite(date) ? date : Date.now()
  const maxAge = Number.isInteger(staleDays) && staleDays >= 0 ? staleDays : MAX_VALID_AGE_DAYS
  const candidates = VIDEO_PROVIDER_ORDER.filter(id => !excluded.includes(id)).map((providerId,index) => {
    const variant = requiredVariant(providerId,effectivePreference)
    const report = findRelevantReport(reports,scope,providerId,variant,nowMs)
    const status = report ? reportStatus(report,effectivePreference,nowMs,maxAge) : inventoryStatus(inventories,scope,providerId)
    const score = confidenceScore(status)
    return { providerId, requestedVariant:variant, evidence:status.kind, statusLabel:LABELS[status.kind],
      score, priority:index + 1, stale:!!status.stale, ageDays:status.ageDays ?? null,
      audio:status.audio || 'unknown', subtitles:status.subtitles || 'unknown',
      picture:status.picture || 'unknown', buffering:status.buffering || 'unknown',
      source:status.source || null, displayOnly:true }
  })
  // Do not treat imported lists as proof; tie-break by user's permanent preferred order.
  candidates.sort((a,b) => b.score - a.score || a.priority - b.priority)
  const recommended = candidates[0] || null
  return {
    valid:true, mediaType:request.mediaType, id:Number(request.id),
    preference:effectivePreference, candidates,
    recommendedProviderId:recommended?.providerId || null,
    recommendedEvidence:recommended?.evidence || 'unknown',
    hasConfirmedPreference:!!candidates.find(c => c.evidence === 'language-observed' && !c.stale),
    requiresManualSelection:true,
    isLiveAvailability:false,
    reason:recommended
      ? `${recommended.providerId}: ${recommended.statusLabel.toLowerCase()}. Sugerencia histórica, no cambio automático ni garantía de disponibilidad actual.`
      : 'No hay proveedores habilitados.',
  }
}
