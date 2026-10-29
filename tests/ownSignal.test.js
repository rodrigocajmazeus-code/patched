import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizedStreamCandidate } from '../src/tv/ownSignal.js'

test('accept direct secure HLS and MP4 sources', () => {
  assert.equal(authorizedStreamCandidate('https://media.example/live/master.m3u8')?.type, 'hls')
  assert.equal(authorizedStreamCandidate('https://media.example/video.mp4?token=example')?.type, 'mp4')
})
test('reject insecure and unwanted protocols', () => {
  for (const url of ['http://example.com/test.m3u8', 'javascript:alert(1)', 'file:///a.mp4', 'data:video/mp4,abc']) {
    assert.equal(authorizedStreamCandidate(url), null)
  }
})
test('reject embedded credentials and unexpected formats', () => {
  assert.equal(authorizedStreamCandidate('https://user:password@example.com/a.m3u8'), null)
  assert.equal(authorizedStreamCandidate('https://example.com/site.html'), null)
})
test('reject localhost sources and very long links', () => {
  assert.equal(authorizedStreamCandidate('https://localhost/a.m3u8'), null)
  assert.equal(authorizedStreamCandidate('https://example.com/a.m3u8?' + 'x'.repeat(4200)), null)
})
