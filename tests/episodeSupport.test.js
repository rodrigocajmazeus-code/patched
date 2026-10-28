import test from 'node:test'
import assert from 'node:assert/strict'
import {
  episodeSupportKey,
  normalizeExternalWatchUrl,
  normalizeEpisodeSupport,
  readEpisodeSupport,
  saveEpisodeSupport,
} from '../src/player/episodeSupport.js'

const tv18 = { mediaType: 'tv', id: 1429, season: 1, episode: 18 }
const tv19 = { mediaType: 'tv', id: 1429, season: 1, episode: 19 }

function storage() {
  const values = new Map()
  return {
    getItem: k => values.get(k) ?? null,
    setItem: (k, v) => { values.set(k, v) },
  }
}

test('episode support keys are separated by chapter', () => {
  assert.notEqual(episodeSupportKey(tv18), episodeSupportKey(tv19))
})
test('episode support keys are separated by media type', () => {
  assert.notEqual(episodeSupportKey({ mediaType: 'movie', id: 1429 }), episodeSupportKey(tv18))
})
test('https external watch link is accepted', () => {
  assert.equal(normalizeExternalWatchUrl('https://tokianime.tv/watch/shingeki-no-kyojin/18'),
    'https://tokianime.tv/watch/shingeki-no-kyojin/18')
})
test('external watch link rejects javascript and data urls', () => {
  assert.equal(normalizeExternalWatchUrl('javascript:alert(1)'), null)
  assert.equal(normalizeExternalWatchUrl('data:text/html,hello'), null)
})
test('external watch link rejects non-secure urls', () => {
  assert.equal(normalizeExternalWatchUrl('http://example.com/watch'), null)
})
test('external watch link rejects embedded credentials', () => {
  assert.equal(normalizeExternalWatchUrl('https://username:pass@example.com'), null)
})
test('external watch link rejects localhost', () => {
  assert.equal(normalizeExternalWatchUrl('https://localhost:3000/'), null)
})
test('external watch link rejects malformed input', () => {
  assert.equal(normalizeExternalWatchUrl('not a url'), null)
  assert.equal(normalizeExternalWatchUrl(''), null)
})
test('external watch link rejects excessive length', () => {
  assert.equal(normalizeExternalWatchUrl('https://example.com/' + 'a'.repeat(2100)), null)
})
test('empty episode support is a valid default', () => {
  assert.deepEqual(normalizeEpisodeSupport(null), { externalUrl: '', providers: {} })
})
test('episode notes can be stored and read for a single chapter', () => {
  const db = storage()
  const notes = { externalUrl: 'https://example.com/18', providers: { facilitoplay: { issue: 'stalled', language: 'es-ES' } } }
  assert.equal(saveEpisodeSupport(tv18, notes, db), true)
  assert.deepEqual(readEpisodeSupport(tv18, db), notes)
  assert.deepEqual(readEpisodeSupport(tv19, db), { externalUrl: '', providers: {} })
})
test('invalid stored links are dropped without losing provider diagnostics', () => {
  const notes = normalizeEpisodeSupport({ externalUrl: 'javascript:alert(1)', providers: { moviemaster: { issue: 'ads' } } })
  assert.equal(notes.externalUrl, '')
  assert.equal(notes.providers.moviemaster.issue, 'ads')
})
test('corrupted saved JSON is ignored', () => {
  const db = { getItem: () => '{garbage' }
  assert.deepEqual(readEpisodeSupport(tv18, db), { externalUrl: '', providers: {} })
})
test('storage errors do not crash the user interface', () => {
  const db = { getItem: () => { throw Error('private mode') }, setItem: () => { throw Error('private mode') } }
  assert.deepEqual(readEpisodeSupport(tv18, db), { externalUrl: '', providers: {} })
  assert.equal(saveEpisodeSupport(tv18, { externalUrl: '', providers: {} }, db), false)
})
