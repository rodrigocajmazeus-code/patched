import test from 'node:test'
import assert from 'node:assert/strict'
import { readVidRiftEvent, buildVidRiftUrl } from '../src/player/providers/vidrift.js'

const frame = {}
const src = buildVidRiftUrl({ mediaType: 'tv', id: 1429, season: 1, episode: 23 })
const ev = (data, props = {}) => ({
  origin: 'https://embed.vidrift.net', source: frame,
  data: { tmdbId: 1429, mediaType: 'tv', season: 1, episode: 23, ...data },
  ...props,
})
test('trusted documented progress event enables time tracking', () => {
  assert.deepEqual(readVidRiftEvent(ev({ type: 'vidrift:progress', currentTime: 75, duration: 1500 }), frame, src),
    { time: 75, duration: 1500, paused: false, status: 'time' })
})
test('documented paused and unpaused events enable play-state tracking', () => {
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:paused', currentTime: 75 }), frame, src).paused, true)
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:unpaused', currentTime: 76 }), frame, src).paused, false)
})
test('reject forged origins, frames and wrong episode', () => {
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:progress', currentTime: 5, duration: 100 },
    { origin: 'https://evil.example' }), frame, src), null)
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:progress', currentTime: 5, duration: 100 },
    { source: {} }), frame, src), null)
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:progress', currentTime: 5, duration: 100, episode: 24 }), frame, src), null)
})
test('unsupported events and invalid player URLs never claim playback', () => {
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:set' }), frame, src), null)
  assert.equal(readVidRiftEvent(ev({ type: 'vidrift:progress', currentTime: 5, duration: 100 }), frame,
    'https://evil.example/embed/tv/1429/1/23'), null)
})
