/**
 * Catálogo IPTV-org: metadatos públicos y fuentes candidatas, NO una garantía
 * de disponibilidad ni una licencia de retransmisión.
 * No modifica cabeceras HTTP, no usa proxies y no evita controles de origen.
 */
export const IPTV_ENDPOINTS = Object.freeze({
  channels: 'https://iptv-org.github.io/api/channels.json',
  streams: 'https://iptv-org.github.io/api/streams.json',
  feeds: 'https://iptv-org.github.io/api/feeds.json',
  countries: 'https://iptv-org.github.io/api/countries.json',
  languages: 'https://iptv-org.github.io/api/languages.json',
  categories: 'https://iptv-org.github.io/api/categories.json',
  logos: 'https://iptv-org.github.io/api/logos.json',
})

export const SPANISH_FOCUS_COUNTRIES = Object.freeze([
  'PE', 'ES', 'MX', 'AR', 'CL', 'CO', 'EC', 'BO', 'VE', 'UY', 'PY',
  'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU',
])

export const CATEGORY_TRANSLATIONS = Object.freeze({
  animation: 'Animación', auto: 'Motor', business: 'Negocios', classic: 'Clásicos',
  comedy: 'Comedia', cooking: 'Cocina', culture: 'Cultura', documentary: 'Documentales',
  education: 'Educación', entertainment: 'Entretenimiento', family: 'Familia',
  general: 'General', kids: 'Infantil', legislative: 'Política', lifestyle: 'Estilo de vida',
  movies: 'Cine', music: 'Música', news: 'Noticias', outdoor: 'Aventura',
  relax: 'Relax', religious: 'Religión', science: 'Ciencia', series: 'Series',
  shop: 'Compras', sports: 'Deportes', travel: 'Viajes', weather: 'El tiempo',
})

function textValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function safeHttpsUrl(input) {
  const raw = textValue(input)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return ''
    return url.href
  } catch { return '' }
}

// Solo se admite HLS compatible con el navegador. No se suplantan User-Agent,
// Referrer ni cookies, y se excluyen fuentes HTTP en páginas HTTPS.
export function isDirectHlsCandidate(stream) {
  if (!stream || stream.referrer || stream.user_agent) return false
  const url = safeHttpsUrl(stream.url)
  if (!url) return false
  try { return /\.m3u8$/i.test(new URL(url).pathname) } catch { return false }
}

function normalizedText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function buildIptvCatalog({ channels, streams, feeds = [], countries = [], languages = [], categories = [], logos = [] }) {
  if (!Array.isArray(channels) || !Array.isArray(streams)) throw new TypeError('El catálogo y las fuentes deben ser listas.')
  const countryMap = new Map(asArray(countries).filter(x => x?.code).map(x => [x.code, x]))
  const languageMap = new Map(asArray(languages).filter(x => x?.code).map(x => [x.code, x.name]))
  const categoryMap = new Map(asArray(categories).filter(x => x?.id).map(x => [x.id, x.name]))
  const feedsMap = new Map()
  for (const feed of asArray(feeds)) {
    if (!feed?.channel) continue
    const key = feed.channel + '::' + (feed.id || '')
    feedsMap.set(key, feed)
  }
  const logosMap = new Map()
  for (const logo of asArray(logos)) {
    if (!logo?.channel || logo.in_use === false || !safeHttpsUrl(logo.url)) continue
    if (!logosMap.has(logo.channel)) logosMap.set(logo.channel, logo.url)
  }

  const entries = new Map()
  for (const channel of channels) {
    if (!channel || !textValue(channel.id) || !textValue(channel.name)) continue
    if (channel.is_nsfw || channel.closed || channel.replaced_by) continue
    const country = textValue(channel.country).toUpperCase()
    const meta = countryMap.get(country)
    const categoriesList = asArray(channel.categories).filter(x => typeof x === 'string')
    entries.set(channel.id, {
      id: channel.id,
      name: channel.name,
      country,
      countryName: meta?.name || country || 'Sin país',
      flag: meta?.flag || '',
      categories: categoriesList,
      categoryNames: categoriesList.map(x => CATEGORY_TRANSLATIONS[x] || categoryMap.get(x) || x),
      website: safeHttpsUrl(channel.website),
      logo: safeHttpsUrl(logosMap.get(channel.id)),
      streamsCount: 0,
      sources: [],
      languages: [],
    })
  }

  for (const stream of streams) {
    if (!stream?.channel) continue
    const entry = entries.get(stream.channel)
    if (!entry) continue
    entry.streamsCount += 1
    if (!isDirectHlsCandidate(stream)) continue
    const feed = feedsMap.get(stream.channel + '::' + (stream.feed || ''))
    const langCodes = asArray(feed?.languages).filter(x => typeof x === 'string')
    for (const language of langCodes) if (!entry.languages.includes(language)) entry.languages.push(language)
    const source = {
      id: entry.id + ':' + (stream.feed || 'main') + ':' + entry.sources.length,
      url: safeHttpsUrl(stream.url),
      label: textValue(stream.title) || entry.name,
      quality: textValue(stream.quality),
      labels: asArray(stream.labels).filter(x => typeof x === 'string'),
      languages: langCodes,
    }
    // Evitar docenas de señales de un único canal en la interfaz.
    if (entry.sources.length < 8 && !entry.sources.some(x => x.url === source.url)) entry.sources.push(source)
  }

  const list = [...entries.values()]
  for (const entry of list) {
    entry.languages = entry.languages.map(x => ({
      code: x, name: languageMap.get(x) || x,
    }))
    // No usar "disponible" o "verificado": los enlaces son solo candidatos.
    entry.hasHlsCandidate = entry.sources.length > 0
    entry.searchText = normalizedText([entry.name, entry.countryName, ...entry.categoryNames].join(' '))
  }
  list.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  return list
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error('HTTP ' + response.status)
  const payload = await response.json()
  if (!Array.isArray(payload)) throw new Error('Formato de catálogo inesperado')
  return payload
}

export async function fetchIptvCatalog(signal) {
  const [channels, streams] = await Promise.all([
    fetchJson(IPTV_ENDPOINTS.channels, signal),
    fetchJson(IPTV_ENDPOINTS.streams, signal),
  ])
  const optionalNames = ['feeds', 'countries', 'languages', 'categories', 'logos']
  const optionalResults = await Promise.allSettled(
    optionalNames.map(name => fetchJson(IPTV_ENDPOINTS[name], signal))
  )
  const others = Object.fromEntries(optionalNames.map((name, i) => [
    name, optionalResults[i].status === 'fulfilled' ? optionalResults[i].value : [],
  ]))
  return buildIptvCatalog({ channels, streams, ...others })
}

export function filterIptvCatalog(catalog, { query = '', scope = 'focus', country = '', category = '', language = '', onlyHls = false, favorites = [] } = {}) {
  const needle = normalizedText(query.trim())
  const favoriteSet = new Set(favorites)
  return catalog.filter(channel => {
    if (scope === 'focus' && !SPANISH_FOCUS_COUNTRIES.includes(channel.country)) return false
    if (scope === 'favorites' && !favoriteSet.has(channel.id)) return false
    if (onlyHls && !channel.hasHlsCandidate) return false
    if (country && channel.country !== country) return false
    if (category && !channel.categories.includes(category)) return false
    if (language && !channel.languages.some(l => l.code === language)) return false
    return !needle || channel.searchText.includes(needle)
  })
}
