import test from 'node:test'
import assert from 'node:assert/strict'
import { playableStream, buildLiveCatalog, searchLiveChannels } from '../src/tv/catalog.js'

const common = { channel: 'Example.pe', feed: null, referrer: null, user_agent: null, labels: [] }
const stream = { ...common, url: 'https://example.com/live/index.m3u8', quality: '720p' }
const channels = [
  { id: 'Example.pe', name: 'Canal Ejemplo', country: 'PE', categories: ['news'], is_nsfw: false, closed: null, website: 'https://example.com/' },
  { id: 'Other.es', name: 'Música España', country: 'ES', categories: ['music'], is_nsfw: false, closed: null, website: 'https://example.es/' },
  { id: 'Adult.pe', name: 'Adulto', country: 'PE', categories: ['general'], is_nsfw: true, website: 'https://example.com/' },
  { id: 'Closed.pe', name: 'Cerrado', country: 'PE', categories: ['general'], is_nsfw: false, closed: '2020-01-01', website: 'https://example.com/' },
]
const countries = [{ code: 'PE', name: 'Perú', flag: '🇵🇪' }, { code: 'ES', name: 'España', flag: '🇪🇸' }]

test('accept HTTPS HLS', () => {
  assert.equal(playableStream(stream).type, 'hls')
})
test('reject insecure and scripted protocols', () => {
  assert.equal(playableStream({ ...stream, url: 'http://example.com/a.m3u8' }), null)
  assert.equal(playableStream({ ...stream, url: 'javascript:alert(1)' }), null)
})
test('reject streams requiring spoofed request headers', () => {
  assert.equal(playableStream({ ...stream, referrer: 'https://example.com/' }), null)
  assert.equal(playableStream({ ...stream, user_agent: 'special-player' }), null)
})
test('do not claim unsupported playback formats', () => {
  assert.equal(playableStream({ ...stream, url: 'https://example.com/dash.mpd' }), null)
})
test('exclude adult and closed channels', () => {
  const result = buildLiveCatalog({ channels, streams: [stream], countries })
  assert.deepEqual(result.channels.map(x => x.id), ['Example.pe', 'Other.es'])
})
test('join sources and country details without marking them verified', () => {
  const result = buildLiveCatalog({ channels, streams: [stream], countries })
  assert.equal(result.channels[0].source.type, 'hls')
  assert.equal(result.channels[0].countryName, 'Perú')
  assert.equal(result.channels[1].source, null)
})
test('exclude channels with no web page and no playable stream', () => {
  const result = buildLiveCatalog({ channels: [{ id: 'empty', name: 'Empty', country: 'PE' }] })
  assert.equal(result.channels.length, 0)
})
test('filter by country, category, playable sources and favorites', () => {
  const rows = buildLiveCatalog({ channels, streams: [stream], countries }).channels
  assert.equal(searchLiveChannels(rows, { country: 'PE' }).length, 1)
  assert.equal(searchLiveChannels(rows, { category: 'music' }).length, 1)
  assert.equal(searchLiveChannels(rows, { playableOnly: true }).length, 1)
  assert.equal(searchLiveChannels(rows, { favoritesOnly: true, favorites: ['Other.es'] })[0].id, 'Other.es')
})
test('search is accent insensitive', () => {
  const rows = buildLiveCatalog({ channels, streams: [stream], countries }).channels
  assert.equal(searchLiveChannels(rows, { query: 'musica' })[0].id, 'Other.es')
})
