import test from 'node:test'
import assert from 'node:assert/strict'
import { VIDCLOUD_CASE, KIMETSU_MAPPING, buildVidCloudUrl, parseVidCloudEvent } from '../src/player/lab/vidcloud.js'

test('VidCloud uses only the reviewed Kimetsu first-season episode mapping', () => {
  assert.equal(KIMETSU_MAPPING.firstEpisode, 'Cruelty')
  assert.equal(KIMETSU_MAPPING.sources.length, 2)
  assert.equal(buildVidCloudUrl(VIDCLOUD_CASE), 'https://vidcloud.sbs/embed/ani/101922/1?track=sub&autoPlay=0&autoSkip=0&autoNext=0')
  for (const override of [{ mapping: null }, { mapping: { ...KIMETSU_MAPPING, status: 'unknown' } }, { mapping: { ...KIMETSU_MAPPING, anilistId: 85937 } }, { id: 1429 }, { season: 2 }, { episode: 2 }, { anilistId: 85937 }, { requestedVariant: 'dub' }]) assert.throws(() => buildVidCloudUrl({ ...VIDCLOUD_CASE, ...override }))
})

test('VidCloud accepts only documented events from its own frame and exact origin', () => {
  const win = {}, event = { origin: 'https://vidcloud.sbs', source: win, data: { event: 'play' } }
  assert.deepEqual(parseVidCloudEvent(event, win), { event: 'play' })
  assert.equal(parseVidCloudEvent({ ...event, source: {} }, win), null)
  assert.equal(parseVidCloudEvent({ ...event, origin: 'https://vidcloud.sbs.evil.test' }, win), null)
  assert.equal(parseVidCloudEvent({ ...event, data: { event: 'language', language: 'ja' } }, win), null)
  assert.equal(parseVidCloudEvent({ ...event, data: { event: 'play', language: 'ja', identityMatches: true } }, win).language, undefined)
})
