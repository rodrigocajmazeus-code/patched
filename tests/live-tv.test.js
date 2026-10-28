import test from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_TEST_SOURCES, OFFICIAL_LIVE_CHANNELS, parseLiveHlsUrl } from '../src/data/liveSources.js'

test('las dos señales técnicas declaradas son HLS HTTPS', () => {
  assert.equal(LIVE_TEST_SOURCES.length, 2)
  for (const source of LIVE_TEST_SOURCES) {
    assert.equal(parseLiveHlsUrl(source.url).ok, true)
  }
})

test('los canales oficiales enlazan a su propia web mediante HTTPS', () => {
  assert.ok(OFFICIAL_LIVE_CHANNELS.length >= 2)
  for (const channel of OFFICIAL_LIVE_CHANNELS) {
    assert.equal(new URL(channel.url).protocol, 'https:')
  }
})

test('acepta manifiestos HLS HTTPS con query string', () => {
  const result = parseLiveHlsUrl(' https://example.org/live/master.m3u8?token=test ')
  assert.deepEqual(result, { ok: true, url: 'https://example.org/live/master.m3u8?token=test' })
})

test('rechaza entradas no HLS y esquemas peligrosos', () => {
  for (const value of [
    '', 'javascript:alert(1)', 'data:text/html,a', 'http://example.org/live.m3u8',
    'https://example.org/live.mp4', 'https://example.org/playlist',
    'https://user:pass@example.org/live.m3u8', 'no es una url',
  ]) {
    assert.equal(parseLiveHlsUrl(value).ok, false, value)
  }
})
