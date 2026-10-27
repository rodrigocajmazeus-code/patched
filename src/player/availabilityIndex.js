// Local-only availability index. An external iframe loading never proves video availability.
// Imported lists express an allegation of catalog presence, not a verified playback.
import { parsePlaybackReports, PLAYBACK_REPORTS_KEY } from './playbackReports.js'

export const INVENTORY_STORAGE_KEY = 'streambox.availability-inventories.v1'
export const INVENTORY_PROVIDERS = Object.freeze(['moviemaster', 'facilitoplay', 'vidrift'])
const TYPES = Object.freeze(['movie', 'tv', 'episode'])
const MAX_DATASETS = 16
const MAX_ITEMS_PER_DATASET = 75000
const MAX_TOTAL_ENTRIES = 120000
const MAX_SOURCE_LENGTH = 100

function positiveInteger(value) {
  const str = String(value)
  return /^[1-9]\d{0,8}$/.test(str) && Number.isSafeInteger(Number(str)) ? Number(str) : null
}
function parsedKey(value) {
  if (typeof value !== 'string') return null
  const chunks = value.trim().toLowerCase().split(':')
  const type = chunks[0] === 'series' ? 'tv' : chunks[0]
  if (type === 'movie' && chunks.length === 2 && positiveInteger(chunks[1])) return `movie:${Number(chunks[1])}`
  if (type === 'tv' && chunks.length === 2 && positiveInteger(chunks[1])) return `tv:${Number(chunks[1])}`
  if ((type === 'tv' || type === 'episode') && chunks.length === 4 && chunks.slice(1).every(positiveInteger)) {
    return `episode:${Number(chunks[1])}:${Number(chunks[2])}:${Number(chunks[3])}`
  }
  return null
}
export function inventoryKey(input, defaultType = 'movie') {
  if (typeof input === 'string' && input.includes(':')) return parsedKey(input)
  if (typeof input === 'string' || typeof input === 'number') {
    const id = positiveInteger(input)
    return id && ['movie', 'tv'].includes(defaultType) ? `${defaultType}:${id}` : null
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const type = input.type || input.mediaType || defaultType
  const id = positiveInteger(input.tmdbId ?? input.tmdb_id ?? input.id)
  if (!id || !TYPES.includes(type)) return null
  if (type === 'movie') return `movie:${id}`
  const season = positiveInteger(input.season ?? input.season_number)
  const episode = positiveInteger(input.episode ?? input.episode_number)
  if (type === 'tv' && !season && !episode) return `tv:${id}`
  if ((type === 'episode' || type === 'tv') && season && episode) return `episode:${id}:${season}:${episode}`
  return null
}

// Formats: one numerical TMDB ID per line (choose movie/tv), prefixed keys such
// as tv:1429 or episode:1429:1:1, JSON array or {entries:[...]}.
// Never follow URLs, evaluate scripts, fetch providers or scrape protected pages.
export function parseInventoryText(text, defaultType = 'movie') {
  if (typeof text !== 'string' || text.length > 8_000_000) throw Error('Archivo demasiado grande (máximo 8 MB de texto).')
  if (!['movie', 'tv'].includes(defaultType)) throw Error('Elige películas o series para los ID numéricos.')
  let raw
  const trimmed = text.trim()
  if (!trimmed) throw Error('El inventario está vacío.')
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let json
    try { json = JSON.parse(trimmed) } catch { throw Error('JSON inválido. Usa un arreglo o un objeto con entries.') }
    raw = Array.isArray(json) ? json : (Array.isArray(json?.entries) ? json.entries : null)
    if (!raw) throw Error('El JSON debe ser una lista o contener un arreglo entries.')
  } else {
    raw = trimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
  }
  if (raw.length > MAX_ITEMS_PER_DATASET) throw Error(`Máximo ${MAX_ITEMS_PER_DATASET} registros por archivo.`)
  const keys = new Set()
  let rejected = 0
  for (const entry of raw) {
    const key = inventoryKey(entry, defaultType)
    if (key) keys.add(key)
    else rejected++
  }
  if (!keys.size) throw Error('No se encontraron IDs TMDB válidos.')
  return { entries: [...keys].sort(), rejected, duplicated: raw.length - keys.size - rejected }
}

function normalizedDataset(source) {
  if (!source || !INVENTORY_PROVIDERS.includes(source.providerId) ||
    !['official-claimed', 'community', 'personal'].includes(source.sourceType) ||
    typeof source.sourceLabel !== 'string' || !source.sourceLabel.trim() || source.sourceLabel.length > MAX_SOURCE_LENGTH ||
    !Array.isArray(source.entries) || source.entries.length > MAX_ITEMS_PER_DATASET ||
    !source.entries.every(key => typeof key === 'string' && inventoryKey(key) === key) ||
    typeof source.importedAt !== 'string' || !Number.isFinite(Date.parse(source.importedAt))) return null
  return { providerId: source.providerId, sourceType: source.sourceType,
    sourceLabel: source.sourceLabel.trim(), importedAt: source.importedAt, entries: [...new Set(source.entries)].sort() }
}
export function parseInventories(raw) {
  try {
    const datasets = JSON.parse(raw || '[]')
    if (!Array.isArray(datasets)) return []
    const valid = datasets.slice(0, MAX_DATASETS).map(normalizedDataset).filter(Boolean)
    return valid.reduce((acc, item) => {
      if (acc.total + item.entries.length > MAX_TOTAL_ENTRIES) return acc
      acc.items.push(item)
      acc.total += item.entries.length
      return acc
    }, { items: [], total: 0 }).items
  } catch { return [] }
}
export function makeInventory({ providerId, sourceType, sourceLabel, parsed, now = new Date().toISOString() }) {
  return normalizedDataset({ providerId, sourceType, sourceLabel, entries: parsed?.entries, importedAt: now })
}
export function mergeInventory(current, next) {
  const dataset = normalizedDataset(next)
  if (!dataset) throw Error('Inventario inválido.')
  const filtered = current.filter(d => !(d.providerId === dataset.providerId && d.sourceLabel === dataset.sourceLabel))
  const all = [dataset, ...filtered]
  if (all.length > MAX_DATASETS || all.reduce((sum, entry) => sum + entry.entries.length, 0) > MAX_TOTAL_ENTRIES) {
    throw Error('Límite local alcanzado: elimina un inventario anterior antes de importar otro.')
  }
  return all
}
export function readInventories(storage) {
  try { return parseInventories(storage?.getItem(INVENTORY_STORAGE_KEY)) }
  catch { return [] }
}
export function writeInventories(storage, datasets) {
  if (!storage) return false
  try { storage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(datasets)); return true }
  catch { return false }
}
export function readReports(storage) {
  try { return parsePlaybackReports(storage?.getItem(PLAYBACK_REPORTS_KEY)) }
  catch { return [] }
}

// Individual episode evidence must match the exact episode; a series-level list
// cannot be promoted to a verified episode. Failures may be variant-specific.
export function findAvailability({ mediaType, id, season, episode, providerId }, reports = [], inventories = []) {
  const titleKey = inventoryKey({ type: mediaType, id })
  const episodeKey = mediaType === 'tv' ? inventoryKey({ type: 'episode', id, season, episode }) : null
  if (!titleKey || !INVENTORY_PROVIDERS.includes(providerId) || (mediaType === 'tv' && !episodeKey)) return { status: 'unknown' }
  const prefix = `${mediaType}:${Number(id)}:${mediaType === 'tv' ? Number(season) : '-'}:${mediaType === 'tv' ? Number(episode) : '-'}:${providerId}:`
  const attempts = reports.filter(r => r.observer === 'user-local' && r.key.startsWith(prefix))
  const successes = attempts.filter(r => r.result === 'works').sort((a,b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt))
  const failures = attempts.filter(r => r.result !== 'works')
  if (successes.length) return { status: 'observed', report: successes[0], mixed: failures.length > 0 }
  if (failures.length) return { status: 'failed', report: [...failures].sort((a,b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt))[0] }
  // Newest matching publication first; no claim of working video.
  const matching = inventories.filter(d => d.providerId === providerId).sort((a,b) => Date.parse(b.importedAt) - Date.parse(a.importedAt))
  for (const data of matching) {
    if (episodeKey && data.entries.includes(episodeKey)) return { status: 'listed-episode', dataset: data }
    if (data.entries.includes(titleKey)) return { status: mediaType === 'tv' ? 'listed-series' : 'listed-title', dataset: data }
  }
  return { status: 'unknown' }
}

export const AVAILABILITY_LABELS = Object.freeze({
  observed: 'Reproducción comprobada antes',
  failed: 'Falló en una prueba anterior',
  'listed-episode': 'Episodio en lista importada',
  'listed-series': 'Serie en lista (episodio sin confirmar)',
  'listed-title': 'Título en lista importada',
  unknown: 'Sin información',
})
