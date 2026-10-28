// Public, unauthenticated listings. They are playback candidates, not uptime checks.
export const TDT_TV_URL = 'https://www.tdtchannels.com/lists/tv.json'
export const FREE_TV_URL = 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8'

function normalizedName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

export function parseFreeTvPlaylist(content) {
  if (typeof content !== 'string' || !content.trimStart().startsWith('#EXTM3U')) return []
  const result = []
  let metadata = null
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.startsWith('#EXTINF:')) {
      const id = line.match(/\btvg-id="([^"]+)"/i)?.[1] || ''
      metadata = id ? { id, geo: line.includes('Ⓖ') } : null
    } else if (line && !line.startsWith('#')) {
      if (metadata) result.push({
        channel: metadata.id, url: line, provider: 'Free-TV',
        labels: metadata.geo ? ['Geo-blocked'] : [],
      })
      metadata = null
    }
  }
  return result
}

// TDTChannels documents original broadcaster pages and direct playback options.
// Only merge names on an EXACT, country-scoped match; avoid channel identity swaps.
export function adaptTdtCatalog(document, knownChannels = []) {
  const channels = []
  const streams = []
  if (!Array.isArray(document?.countries)) return { channels, streams }
  const existing = new Map()
  for (const channel of knownChannels) {
    if (channel.country === 'ES' && channel.name) {
      const key = normalizedName(channel.name)
      if (!existing.has(key)) existing.set(key, channel.id)
    }
  }
  const seen = new Set()
  for (const country of document.countries) {
    if (country.name !== 'Spain' || !Array.isArray(country.ambits)) continue
    for (const ambit of country.ambits) {
      if (!Array.isArray(ambit.channels)) continue
      for (const entry of ambit.channels) {
        if (!entry?.name || !normalizedName(entry.name)) continue
        const key = normalizedName(entry.name)
        if (seen.has(key)) continue
        seen.add(key)
        const id = existing.get(key) || 'TDT.ES.' + key.replace(/ /g, '-')
        if (!existing.has(key)) channels.push({
          id, name: entry.name, country: 'ES', categories: ['general'],
          is_nsfw: false, closed: null, website: entry.web || '',
        })
        const flagged = Array.isArray(entry.extra_info) && entry.extra_info.includes('GEO')
        for (const option of (Array.isArray(entry.options) ? entry.options : [])) {
          if (!['m3u8', 'mp4'].includes(option?.format) || !option?.url) continue
          // Template placeholders cannot be resolved safely by the browser.
          if (/\[[A-Z_]+\]/.test(option.url)) continue
          streams.push({
            channel: id, url: option.url, provider: 'TDTChannels', quality: option.res || null,
            labels: flagged || option.geo2 ? ['Geo-blocked'] : [],
          })
        }
      }
    }
  }
  return { channels, streams }
}

export async function fetchSupplementalSources(channels, fetcher = fetch) {
  const [tdt, freeTv] = await Promise.all([
    fetcher(TDT_TV_URL).then(r => { if (!r.ok) throw new Error('TDT'); return r.json() }).catch(() => null),
    fetcher(FREE_TV_URL).then(r => { if (!r.ok) throw new Error('Free-TV'); return r.text() }).catch(() => ''),
  ])
  const additional = adaptTdtCatalog(tdt, channels)
  return {
    channels: additional.channels,
    streams: additional.streams.concat(parseFreeTvPlaylist(freeTv)),
  }
}
