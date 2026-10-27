import test from 'node:test'
import assert from 'node:assert/strict'
import { MOVIEMASTER_CASES, buildMovieMasterUrl, parseMovieMasterEvent, initialEvidence, reduceEvidence } from '../src/player/lab/moviemaster.js'
import { PROVIDERS } from '../src/data/providers.js'

test('MovieMaster lab has only the two authorized cases and stays outside the default provider list', () => {
  assert.equal(buildMovieMasterUrl(MOVIEMASTER_CASES['aot-lat']), 'https://api.moviemaster.lat/e/tv/1429/1/1?lang=LAT')
  assert.equal(buildMovieMasterUrl(MOVIEMASTER_CASES['kimetsu-sub']), 'https://api.moviemaster.lat/e/tv/85937/1/1?lang=SUB')
  assert.deepEqual(PROVIDERS.map(p => p.id), ['vidcore', 'vidfast', 'vidrock', 'facilitoplay'])
  for (const override of [{ id: '1429/evil' }, { season: 0 }, { episode: -1 }, { requestedVariant: 'JA' }, { id: Infinity }, { mediaType: 'movie' }]) assert.throws(() => buildMovieMasterUrl({ ...MOVIEMASTER_CASES['aot-lat'], ...override }))
})

test('MovieMaster messages require exact origin and current frame window', () => {
  const win = {}, base = { origin: 'https://api.moviemaster.lat', source: win, data: 'mm:hello' }
  assert.deepEqual(parseMovieMasterEvent(base, win), { event: 'hello' })
  for (const origin of ['null', 'http://api.moviemaster.lat', 'https://api.moviemaster.lat.evil.test']) assert.equal(parseMovieMasterEvent({ ...base, origin }, win), null)
  assert.equal(parseMovieMasterEvent(base, {}), null)
  assert.equal(parseMovieMasterEvent({ ...base, source: null }, null), null)
  assert.equal(parseMovieMasterEvent({ ...base, data: 'unknown' }, win), null)
  assert.deepEqual(parseMovieMasterEvent({ ...base, data: { type: 'mm:time', currentTime: 12, duration: 1400 } }, win), { event: 'time', currentTime: 12, duration: 1400 })
  for (const currentTime of [-1, Infinity, '12', NaN, null]) assert.equal(parseMovieMasterEvent({ ...base, data: { type: 'mm:time', currentTime, duration: 1400 } }, win), null)
})

test('load, hello and time advancement never imply audio, identity, subtitles or fallback', () => {
  let state = initialEvidence()
  for (const kind of ['iframe-load', 'provider-hello', 'provider-time-advance']) state = reduceEvidence(state, kind)
  assert.equal(state.iframeLoadEvent, true)
  assert.equal(state.providerTimeAdvance, true)
  for (const key of ['playback', 'identity', 'heardAudio', 'subtitles', 'subtitleControl', 'observedVariant', 'fallback']) assert.equal(state[key], 'unobserved')
})

test('manual observations can record fallback and silence without rewriting automatic evidence', () => {
  const state = reduceEvidence(initialEvidence(), 'manual', { playback: 'video-only', heardAudio: 'silent', observedVariant: 'ESP', fallback: 'observed', iframeLoadEvent: true })
  assert.equal(state.heardAudio, 'silent')
  assert.equal(state.observedVariant, 'ESP')
  assert.equal(state.fallback, 'observed')
  assert.equal(state.identity, 'unobserved')
  assert.equal(state.iframeLoadEvent, false)
  assert.equal(initialEvidence().fallback, 'unobserved')
})
