import test from 'node:test'
import assert from 'node:assert/strict'
import { LAB_SOURCES, labEvidenceKey, sourceLabUrl, labSourceFromId } from '../src/player/freeSourceLab.js'

test('build documented TMDB TV URLs with provider-specific structure', () => {
  const tv = { mediaType: 'tv', id: 1429, season: 1, episode: 22, locale: 'es-419' }
  assert.equal(sourceLabUrl('stellar', tv),
    'https://stellar.rip/es-419/watch/embed/tv/1429-1-22?autoPlay=false')
  assert.equal(sourceLabUrl('vidnest', tv), 'https://vidnest.fun/tv/1429/1/22')
  assert.equal(sourceLabUrl('vidcore-org', tv), 'https://vidcore.org/embed/tv/1429/1/22')
  assert.equal(sourceLabUrl('embedwave', tv), 'https://embedwave.cc/embed/tv/1429/1/22')
})
test('build movie URLs without episode identifiers', () => {
  const movie = { mediaType: 'movie', id: '238', locale: 'es-ES' }
  assert.equal(sourceLabUrl('stellar', movie),
    'https://stellar.rip/es-ES/watch/embed/movie/238?autoPlay=false')
  assert.equal(sourceLabUrl('vidnest', movie), 'https://vidnest.fun/movie/238')
})
test('reject malformed IDs and invalid media types', () => {
  for (const bad of [0, -1, '10/3', '../1', '1e5', 'abc', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => sourceLabUrl('vidnest', { mediaType: 'movie', id: bad }))
  }
  assert.throws(() => sourceLabUrl('vidnest', { mediaType: 'tv', id: 1429, season: 1, episode: 0 }))
  assert.throws(() => sourceLabUrl('vidnest', { mediaType: 'game', id: 1429 }))
  assert.throws(() => sourceLabUrl('unknown', { mediaType: 'movie', id: 238 }))
})
test('never mix vidcore.org with vidcore.net; preserve referrer policies', () => {
  assert.equal(labSourceFromId('vidcore-org').origin, 'https://vidcore.org')
  assert.equal(labSourceFromId('stellar').referrerPolicy, 'strict-origin-when-cross-origin')
  assert.equal(labSourceFromId('embedwave').referrerPolicy, 'no-referrer')
  assert.equal(LAB_SOURCES.length, 4)
})
test('record key is unique for each episode and provider', () => {
  const one = labEvidenceKey('stellar', { mediaType:'tv', id:1429, season:1, episode:22 })
  assert.notEqual(one, labEvidenceKey('stellar', { mediaType:'tv', id:1429, season:1, episode:23 }))
  assert.notEqual(one, labEvidenceKey('vidnest', { mediaType:'tv', id:1429, season:1, episode:22 }))
})
