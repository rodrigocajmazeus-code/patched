const API_BASE = 'https://iptv-org.github.io/api'
const API_FILES = ['channels', 'streams', 'logos', 'countries', 'categories']
const PRIORITY_COUNTRIES = ['PE', 'ES', 'MX', 'CO', 'AR', 'CL', 'EC', 'VE', 'BO', 'UY']

function validUrl(input, httpsOnly = false) {
  try {
    const url = new URL(String(input || ''))
    if (url.username || url.password) return null
    if (httpsOnly ? url.protocol !== 'https:' : !['https:', 'http:'].includes(url.protocol)) return null
    return url.href
  } catch {
    return null
  }
}

export function playableStream(entry) {
  if (!entry || entry.referrer || entry.user_agent) return null
  const url = validUrl(entry.url, true)
  if (!url) return null
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.endsWith('.m3u8')) return { url, type: 'hls', quality: entry.quality || null, labels: entry.labels || [] }
  if (pathname.endsWith('.mp4')) return { url, type: 'mp4', quality: entry.quality || null, labels: entry.labels || [] }
  return null
}

export function buildLiveCatalog({ channels = [], streams = [], logos = [], countries = [], categories = [] }) {
  const byCountry = new Map(countries.map(item => [item.code, item]))
  const byLogo = new Map()
  for (const logo of logos) {
    if (!logo?.channel || !logo.in_use) continue
    const url = validUrl(logo.url, true)
    if (url && !byLogo.has(logo.channel)) byLogo.set(logo.channel, url)
  }
  // Preserve alternate public streams; these are candidates, not verified feeds.
  const byStream = new Map()
  for (const entry of streams) {
    if (!entry?.channel) continue
    const source = playableStream(entry)
    if (!source) continue
    if (!byStream.has(entry.channel)) byStream.set(entry.channel, new Map())
    byStream.get(entry.channel).set(source.url, source)
  }
  const result = []
  for (const channel of channels) {
    if (!channel?.id || !channel.name || channel.is_nsfw || channel.closed) continue
    const sources = [...(byStream.get(channel.id)?.values() || [])]
      .sort((a, b) => {
        const penalty = item => Number(item.labels.includes('Geo-blocked')) * 2 +
          Number(item.labels.includes('Not 24/7'))
        return penalty(a) - penalty(b)
      }).slice(0, 8)
    const source = sources[0] || null
    const website = validUrl(channel.website)
    // Keep the complete active, non-adult directory without claiming playback.
    result.push({
      id: channel.id, name: channel.name,
      country: channel.country || '',
      countryName: byCountry.get(channel.country)?.name || channel.country || 'Sin país',
      flag: byCountry.get(channel.country)?.flag || '🌐',
      categories: Array.isArray(channel.categories) ? channel.categories : [],
      logo: byLogo.get(channel.id) || null,
      source, sources, website,
    })
  }
  result.sort((a, b) => {
    const ai = PRIORITY_COUNTRIES.indexOf(a.country)
    const bi = PRIORITY_COUNTRIES.indexOf(b.country)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) ||
      Number(Boolean(b.source)) - Number(Boolean(a.source)) || a.name.localeCompare(b.name)
  })
  return {
    channels: result,
    countries: [...byCountry.values()],
    categories: categories.map(item => ({ id: item.id, name: item.name })),
    totals: {
      listed: result.length,
      candidates: result.filter(item => item.source).length,
      officialOnly: result.filter(item => !item.source && item.website).length,
      directoryOnly: result.filter(item => !item.source && !item.website).length,
    },
  }
}

async function loadDirectoryFile(file) {
  const response = await fetch(API_BASE + '/' + file + '.json')
  if (!response.ok) throw new Error('No se pudo consultar ' + file + ' (' + response.status + ').')
  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('El directorio de TV devolvió datos inesperados.')
  return rows
}

export async function fetchLiveCatalog() {
  // Channel data and streams are essential; country names and logos can fail.
  const [channels, streams] = await Promise.all(API_FILES.slice(0, 2).map(loadDirectoryFile))
  const extras = await Promise.all(API_FILES.slice(2).map(file => loadDirectoryFile(file).catch(() => [])))
  return buildLiveCatalog({ channels, streams, logos: extras[0], countries: extras[1], categories: extras[2] })
}

export function searchLiveChannels(channels, { query = '', country = 'all', category = 'all', playableOnly = false, favoritesOnly = false, favorites = [] } = {}) {
  const text = String(query).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const favoriteIds = new Set(favorites)
  return channels.filter(item => {
    if (country !== 'all' && item.country !== country) return false
    if (category !== 'all' && !item.categories.includes(category)) return false
    if (playableOnly && !item.source) return false
    if (favoritesOnly && !favoriteIds.has(item.id)) return false
    if (text) {
      const name = (item.name + ' ' + item.countryName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (!name.includes(text)) return false
    }
    return true
  })
}
