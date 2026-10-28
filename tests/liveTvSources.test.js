import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptTdtCatalog, parseFreeTvPlaylist, fetchSupplementalSources } from '../src/tv/supplementalSources.js'
import { buildLiveCatalog } from '../src/tv/catalog.js'

const known = [
  { id: 'La1.es', name: 'La 1', country: 'ES', categories: ['general'] },
  { id: 'CanalPeru.pe', name: 'Canal Perú', country: 'PE', categories: ['general'] },
]
const tdt = {
  countries: [{ name: 'Spain', ambits: [{ name: 'Generalistas', channels: [
    { name: 'La 1', web: 'https://rtve.es/', options: [
      { format: 'm3u8', url: 'https://example.org/la1/master.m3u8', geo2: null },
      { format: 'youtube', url: 'https://youtube.com/live/test' },
      { format: 'm3u8', url: 'https://example.org/unsafe.m3u8?key=[DEVICE_ID]' },
    ] },
    { name: 'Canal Abierto', web: 'https://channel.es', options: [
      { format: 'm3u8', url: 'https://channel.es/live.m3u8' },
    ] },
  ] }] }],
}

test('only accepts parseable Free-TV M3U with channel identifiers', () => {
  const playlist = '#EXTM3U\n#EXTINF:-1 tvg-id="CanalPeru.pe" group-title="Peru",Canal Peru Ⓖ\nhttps://free.example/stream.m3u8\n#EXTINF:-1,Unknown\nhttps://free.example/none.m3u8'
  assert.deepEqual(parseFreeTvPlaylist(playlist), [{
    channel: 'CanalPeru.pe', url: 'https://free.example/stream.m3u8', provider: 'Free-TV', labels: ['Geo-blocked'],
  }])
  assert.deepEqual(parseFreeTvPlaylist('invalid'), [])
})

test('TDT matches Spanish channels only by exact normalized name', () => {
  const result = adaptTdtCatalog(tdt, known)
  assert.equal(result.streams[0].channel, 'La1.es')
  assert.equal(result.streams[0].provider, 'TDTChannels')
  assert.equal(result.streams.length, 2)
  assert.equal(result.channels.length, 1)
  assert.equal(result.channels[0].name, 'Canal Abierto')
})

test('TDT cannot attach an unrelated country channel', () => {
  const result = adaptTdtCatalog({
    countries: [{ name: 'Spain', ambits: [{ channels: [
      { name: 'Canal Perú', options: [{ format: 'm3u8', url: 'https://es.example/canal.m3u8' }] },
    ] }] }],
  }, known)
  assert.equal(result.streams[0].channel.startsWith('TDT.ES.'), true)
})

test('supplemental source failure cannot break core IPTV catalog', async () => {
  const result = await fetchSupplementalSources(known, async () => { throw Error('offline') })
  assert.deepEqual(result, { channels: [], streams: [] })
})

test('catalog merges distinct direct provider links, not duplicate URLs', () => {
  const extra = adaptTdtCatalog(tdt, known)
  const rows = buildLiveCatalog({
    channels: known, additionalChannels: extra.channels, additionalStreams: extra.streams,
    streams: [{ channel: 'La1.es', url: 'https://example.org/la1/master.m3u8' }],
  })
  const la1 = rows.channels.find(item => item.id === 'La1.es')
  assert.equal(la1.sources.length, 1)
  assert.equal(rows.channels.some(item => item.name === 'Canal Abierto'), true)
  assert.equal(rows.totals.providerCandidates.TDTChannels, 1)
})
