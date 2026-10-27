import test from 'node:test'
import assert from 'node:assert/strict'
import { isTrustedPlayerEvent, playerOrigin, resolvePaused } from '../src/player/bridgeTrust.js'
import { buildFacilitoplayUrl, parseFacilitoplayEvent } from '../src/player/providers/facilitoplay.js'

test('bridge rejects wrong origin, suffix domain, missing/other window and opaque URLs', () => {
  const win = {}, url = 'https://vidcore.net/movie/27205'
  const event = { source: win, origin: 'https://vidcore.net' }
  assert.equal(isTrustedPlayerEvent(event, win, url), true)
  for (const origin of ['https://evil.test', 'https://vidcore.net.evil.test', 'null', 'http://vidcore.net']) {
    assert.equal(isTrustedPlayerEvent({ ...event, origin }, win, url), false)
  }
  assert.equal(isTrustedPlayerEvent(event, {}, url), false)
  assert.equal(isTrustedPlayerEvent({ origin: event.origin, source: null }, null, url), false)
  for (const url of ['', 'not a URL', 'data:text/html,hi', 'javascript:alert(1)', 'http://vidcore.net']) assert.equal(playerOrigin(url), null)
})

test('explicit pause and playing flags prevail over position changes', () => {
  const prev = { time: 10, updatedAt: 1000 }
  assert.equal(resolvePaused({ time: 12, paused: true }, prev, 3000), true)
  assert.equal(resolvePaused({ time: 10, paused: false }, prev, 3000), false)
})

test('regression: realistic progression means playing, never paused', () => {
  assert.equal(resolvePaused({ time: 12, paused: null }, { time: 10, updatedAt: 1000 }, 3000), false)
})

test('first sample, stalled playback, seek, backwards and stale samples remain unknown', () => {
  for (const [time, updatedAt, now, next] of [[0, 0, 1000, 0], [10, 1000, 3000, 10], [10, 1000, 3000, 500], [10, 1000, 3000, 5], [10, 1000, 31000, 40], [10, 3000, 1000, 12]]) {
    assert.equal(resolvePaused({ time: next, paused: null }, { time, updatedAt }, now), null)
  }
})

test('four explicit TMDB fixtures produce documented URLs without remapping', () => {
  assert.equal(buildFacilitoplayUrl({ mediaType: 'movie', id: 27205 }), 'https://facilitoplay.com/e/pelicula/27205')
  for (const id of [1396, 1429, 85937]) assert.equal(buildFacilitoplayUrl({ mediaType: 'tv', id, season: 1, episode: 1 }), `https://facilitoplay.com/e/serie/${id}/1/1`)
  for (const id of [0, -1, '1/path', 1.5, NaN, Infinity, '01']) assert.throws(() => buildFacilitoplayUrl({ mediaType: 'movie', id }))
  assert.throws(() => buildFacilitoplayUrl({ mediaType: 'tv', id: 1429, season: 0, episode: 1 }))
})

test('FacilitoPlay verifies sender and reports identity mismatch independently of play', () => {
  const win = {}, request = { mediaType: 'tv', id: 1429, season: 1, episode: 1 }
  const e = { source: win, origin: 'https://facilitoplay.com', data: { source: 'facilitoplay', event: 'play', media: { type: 'serie', tmdbId: 1429, season: 1, episode: 1 }, currentTime: 5 } }
  assert.equal(parseFacilitoplayEvent(e, win, request).identityMatches, true)
  assert.equal(parseFacilitoplayEvent({ ...e, origin: 'https://facilitoplay.com.evil.test' }, win, request), null)
  assert.equal(parseFacilitoplayEvent(e, {}, request), null)
  for (const media of [null, { ...e.data.media, tmdbId: 85937 }, { ...e.data.media, episode: 2 }, { ...e.data.media, season: 2 }, { ...e.data.media, type: 'pelicula' }]) {
    assert.equal(parseFacilitoplayEvent({ ...e, data: { ...e.data, media } }, win, request).identityMatches, false)
  }
  for (const data of [null, 'invalid', { source: 'other', event: 'play' }, { source: 'facilitoplay', event: 'unknown' }]) assert.equal(parseFacilitoplayEvent({ ...e, data }, win, request), null)
})

test('ready is not play; invalid times are excluded; errors retain reason', () => {
  const win = {}, request = { mediaType: 'movie', id: 27205 }
  for (const event of ['ready', 'error', 'unavailable', 'pause', 'time', 'ended']) {
    const parsed = parseFacilitoplayEvent({ source: win, origin: 'https://facilitoplay.com', data: { source: 'facilitoplay', event, media: { type: 'pelicula', tmdbId: 27205 }, reason: 'sin-servidores-que-funcionen', duration: Infinity, currentTime: -1 } }, win, request)
    assert.equal(parsed.event, event)
    assert.equal(parsed.identityMatches, true)
    assert.equal(parsed.reason, 'sin-servidores-que-funcionen')
    assert.equal('currentTime' in parsed, false)
    assert.equal('duration' in parsed, false)
    assert.equal('playbackVerified' in parsed, false)
  }
})
