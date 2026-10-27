import test from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDERS, DEFAULT_PROVIDER, buildEmbedUrl } from '../src/data/providers.js'
import { readFacilitoplayMessage } from '../src/player/providers/facilitoplay.js'
import { getProviderObservation } from '../src/data/providerObservations.js'

test('new MovieMaster default preserves existing provider URLs', () => {
  assert.equal(DEFAULT_PROVIDER, 'moviemaster')
  assert.deepEqual(PROVIDERS.map(p => p.id), ['vidcore', 'vidfast', 'vidrock', 'facilitoplay'])
  for (const [id, host, param] of [['vidcore', 'vidcore.net', 'autoPlay'], ['vidfast', 'vidfast.vc', 'autoPlay'], ['vidrock', 'vidrock.net', 'autoplay']]) {
    assert.equal(buildEmbedUrl(id, 'movie', 27205), `https://${host}/movie/27205?${param}=true`)
    assert.equal(buildEmbedUrl(id, 'tv', 1429, 1, 1), `https://${host}/tv/1429/1/1?${param}=true`)
  }
  assert.equal(PROVIDERS.at(-1).experimental, true)
  assert.equal(PROVIDERS.at(-1).commands, false)
  assert.equal(buildEmbedUrl('facilitoplay', 'movie', 27205), 'https://facilitoplay.com/e/pelicula/27205')
  assert.equal(buildEmbedUrl('facilitoplay', 'tv', 85937, 1, 1), 'https://facilitoplay.com/e/serie/85937/1/1')
})

test('FacilitoPlay bridge distinguishes readiness, playback, pause, errors and identity', () => {
  const win = {}, url = buildEmbedUrl('facilitoplay', 'tv', 1429, 1, 1)
  const message = (event, extra = {}) => ({ origin: 'https://facilitoplay.com', source: win, data: {
    source: 'facilitoplay', event, media: { type: 'serie', tmdbId: 1429, season: 1, episode: 1 }, ...extra,
  } })
  assert.equal(readFacilitoplayMessage(message('ready'), win, url).activityOnly, true)
  assert.deepEqual(readFacilitoplayMessage(message('play', { currentTime: 5, duration: 100 }), win, url), { time: 5, duration: 100, paused: false, status: 'play' })
  assert.equal(readFacilitoplayMessage(message('pause', { currentTime: 6 }), win, url).paused, true)
  assert.equal(readFacilitoplayMessage(message('time', { currentTime: 7 }), win, url).paused, null)
  assert.equal(readFacilitoplayMessage(message('error', { reason: 'sin-servidores-que-funcionen' }), win, url).reason, 'sin-servidores-que-funcionen')
  assert.equal(readFacilitoplayMessage(message('unavailable'), win, url).status, 'unavailable')
  assert.deepEqual(readFacilitoplayMessage(message('play', { currentTime: 5, media: { type: 'serie', tmdbId: 85937, season: 1, episode: 1 } }), win, url), { activityOnly: true, status: 'content-mismatch' })
  assert.deepEqual(readFacilitoplayMessage(message('ready', { media: undefined }), win, url), { activityOnly: true, status: 'identity-unverified' })
  assert.equal(readFacilitoplayMessage({ ...message('play'), source: {} }, win, url), null)
  assert.equal(readFacilitoplayMessage({ ...message('play'), origin: 'https://evil.test' }, win, url), null)
  assert.equal(readFacilitoplayMessage(message('play'), win, 'https://evil.test/e/serie/1429/1/1'), null)
  assert.equal(readFacilitoplayMessage(message('play'), win, 'https://facilitoplay.com/e/serie/1429/0/1'), null)
  assert.equal(readFacilitoplayMessage({ origin: 'https://facilitoplay.com', source: win, data: { type: 'player:timeupdate', time: 99 } }, win, url), null)
})

test('reported observations stay scoped to provider, title, season, episode and lab environment', () => {
  const inception = getProviderObservation('facilitoplay', 'movie', 27205)
  assert.equal(inception.audio['es-419'], 'confirmed')
  assert.equal(inception.observer, 'user')
  assert.equal(inception.streamboxPlayback, 'unverified')
  assert.equal(getProviderObservation('vidcore', 'movie', 27205), null)
  assert.equal(getProviderObservation('facilitoplay', 'tv', 1429, 1, 2), null)
  assert.equal(getProviderObservation('facilitoplay', 'tv', 1429, 2, 1), null)
  assert.equal(getProviderObservation('facilitoplay', 'tv', 1429, 1, 1).audio['es-419'], 'silent')
  assert.equal(getProviderObservation('facilitoplay', 'tv', 85937, 1, 1).audio.ja, 'not-offered-in-test')
  assert.equal(getProviderObservation('facilitoplay', 'tv', 1396, 1, 1).playback, 'unknown')
  assert.equal(getProviderObservation('facilitoplay', 'tv', 999999, 1, 1), null)
})
