import test from 'node:test'
import assert from 'node:assert/strict'
import { FEATURED_CHANNELS, FEATURED_TV_FILTERS, filterFeaturedChannels } from '../src/tv/featuredChannels.js'

test('curated TV has named ESPN Disney and Peru channels', () => {
  for (const id of ['disney', 'disney-junior', 'espn', 'espn3', 'tvperu', 'atv', 'pluto']) {
    assert.ok(FEATURED_CHANNELS.some(ch => ch.id === id), id)
  }
})
test('curated entries use unique identifiers and safe HTTPS destinations', () => {
  assert.equal(new Set(FEATURED_CHANNELS.map(ch => ch.id)).size, FEATURED_CHANNELS.length)
  for (const channel of FEATURED_CHANNELS) {
    assert.ok(channel.name)
    assert.ok(channel.links.length > 0)
    for (const link of channel.links) {
      const url = new URL(link.url)
      assert.equal(url.protocol, 'https:')
      assert.equal(url.username, '')
      assert.equal(url.password, '')
    }
  }
})
test('premium channels are not falsely marked as free', () => {
  for (const ch of FEATURED_CHANNELS.filter(ch => /disney|espn|hbo/.test(ch.id))) {
    assert.notEqual(ch.access, 'web')
  }
})
test('filtering by name, topic, and open portals works', () => {
  assert.deepEqual(filterFeaturedChannels(FEATURED_CHANNELS, { category: 'todos', query: 'Disney' })
    .map(ch => ch.id).sort(), ['disney', 'disney-junior'])
  assert.ok(filterFeaturedChannels(FEATURED_CHANNELS, { category: 'deportes' }).some(ch => ch.id === 'espn'))
  assert.ok(filterFeaturedChannels(FEATURED_CHANNELS, { category: 'todos', freeOnly: true })
    .every(ch => ch.access === 'web'))
  assert.ok(filterFeaturedChannels(FEATURED_CHANNELS).every(ch => ch.featured))
})
test('every filter points to a real category or a defined collection', () => {
  for (const filter of FEATURED_TV_FILTERS) {
    if (['destacados','todos'].includes(filter.id)) continue
    assert.ok(FEATURED_CHANNELS.some(ch => ch.category === filter.id))
  }
})
