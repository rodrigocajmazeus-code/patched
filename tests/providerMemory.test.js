import test from 'node:test'
import assert from 'node:assert/strict'
import {
  providerMemoryKey,
  readRememberedProvider,
  saveRememberedProvider,
} from '../src/player/providerMemory.js'

function db() {
  const map = new Map()
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k),
  }
}
test('remember source across episodes but not across shows', () => {
  const store = db()
  const req = { mediaType: 'tv', id: 1429, season: 1, episode: 18 }
  assert.equal(saveRememberedProvider(req, 'facilitoplay', store), true)
  assert.equal(readRememberedProvider({ ...req, episode: 23 }, store), 'facilitoplay')
  assert.equal(readRememberedProvider({ ...req, id: 1234 }, store), null)
  assert.equal(readRememberedProvider({ ...req, mediaType: 'movie' }, store), null)
})
test('clearing manual selection also clears saved choice', () => {
  const store = db()
  const req = { mediaType: 'tv', id: 1429 }
  saveRememberedProvider(req, 'vidrift', store)
  assert.equal(saveRememberedProvider(req, null, store), true)
  assert.equal(readRememberedProvider(req, store), null)
})
test('refuse malformed media IDs and provider names', () => {
  const store = db()
  assert.equal(providerMemoryKey({ mediaType: 'tv', id: '../xx' }), null)
  assert.equal(saveRememberedProvider({ mediaType: 'tv', id: 1429 }, 'bad\nvalue', store), false)
})
test('storage denial cannot break the player', () => {
  const store = { getItem: () => {throw Error('blocked')}, setItem: () => {throw Error('blocked')} }
  assert.equal(readRememberedProvider({ mediaType: 'tv', id: 1429 }, store), null)
  assert.equal(saveRememberedProvider({ mediaType: 'tv', id: 1429 }, 'vidrift', store), false)
})
