import test from 'node:test'
import assert from 'node:assert/strict'
import { inventoryKey, parseInventoryText, makeInventory, mergeInventory, findAvailability, parseInventories } from '../src/player/availabilityIndex.js'

test('keys distinguish movies, shows and exact episodes', () => {
  assert.equal(inventoryKey('movie:27205'), 'movie:27205')
  assert.equal(inventoryKey('tv:1429'), 'tv:1429')
  assert.equal(inventoryKey('episode:1429:1:1'), 'episode:1429:1:1')
  assert.equal(inventoryKey('tv:1429:1:1'), 'episode:1429:1:1')
  assert.equal(inventoryKey('1429', 'tv'), 'tv:1429')
  assert.equal(inventoryKey({type:'episode', id:1429,season:1,episode:2}), 'episode:1429:1:2')
  assert.equal(inventoryKey('movie:0'), null)
  assert.equal(inventoryKey('https://example.com/1'), null)
  assert.equal(inventoryKey('tv:1:0:1'), null)
})
test('plain TXT skips comments, bad entries and duplicates', () => {
  const d = parseInventoryText('27205\n# comment\n27205\nmovie:603\ntv:1429\njunk\n')
  assert.deepEqual(d.entries, ['movie:27205','movie:603','tv:1429'])
  assert.equal(d.rejected, 1)
  assert.equal(d.duplicated, 1)
})
test('JSON manifest supports IDs with complete season/episode metadata', () => {
  const d = parseInventoryText(JSON.stringify({entries: [
    {type:'movie',tmdbId:27205}, {type:'tv',id:1429},
    {type:'episode', tmdbId:1429, season:1, episode:1},
    {type:'tv', id:1429, season:1, episode:2},
    {type:'tv', id:1429, season:1},
  ]}))
  assert.deepEqual(d.entries, ['episode:1429:1:1','episode:1429:1:2','movie:27205','tv:1429'])
  assert.equal(d.rejected, 1)
})
test('invalid input fails closed, without network or implicit lookup', () => {
  assert.throws(() => parseInventoryText('{invalid}'), /JSON inválido/)
  assert.throws(() => parseInventoryText('{"movies": [2]}'), /entries/)
  assert.throws(() => parseInventoryText('https://example.com/data.json'), /IDs TMDB/)
  assert.throws(() => parseInventoryText(' '), /vacío/)
})
test('provider and provenance remain explicit; saved lists parse safely', () => {
  const a = makeInventory({providerId:'moviemaster',sourceType:'community',sourceLabel:'foro', parsed:parseInventoryText('1429\n','tv'), now:'2026-10-26T15:00:00.000Z'})
  assert.deepEqual(a.entries, ['tv:1429'])
  assert.equal(makeInventory({providerId:'bogus',sourceType:'community',sourceLabel:'foro',parsed:{entries:['movie:1']}}), null)
  assert.deepEqual(parseInventories(JSON.stringify([a])), [a])
  assert.deepEqual(parseInventories('{not-json}'), [])
  const b = makeInventory({providerId:'moviemaster',sourceType:'official-claimed',sourceLabel:'foro', parsed:parseInventoryText('603'), now:'2026-10-26T16:00:00.000Z'})
  assert.deepEqual(mergeInventory([a],b), [b]) // Same provider and source label replaces older snapshot
})
test('show-level inventory never proves an exact episode exists', () => {
  const list = makeInventory({providerId:'facilitoplay',sourceType:'community',sourceLabel:'lista',parsed:parseInventoryText('1429','tv')})
  const result = findAvailability({mediaType:'tv',id:1429,season:1,episode:1,providerId:'facilitoplay'},[],[list])
  assert.equal(result.status, 'listed-series')
  assert.equal(findAvailability({mediaType:'tv',id:1429,season:1,episode:1,providerId:'moviemaster'},[],[list]).status, 'unknown')
})
test('recorded evidence outranks imported claims, but does not guarantee present availability', () => {
  const list = makeInventory({providerId:'moviemaster',sourceType:'community',sourceLabel:'lista',parsed:parseInventoryText('episode:1429:1:1')})
  const scope = {mediaType:'tv',id:1429,season:1,episode:1,providerId:'moviemaster'}
  assert.equal(findAvailability(scope,[],[list]).status, 'listed-episode')
  const reports = [{key:'tv:1429:1:1:moviemaster:LAT',observer:'user-local',result:'works',audio:'es-419',checkedAt:'2026-10-26T00:00:00Z'},
    {key:'tv:1429:1:1:moviemaster:SUB',observer:'user-local',result:'unavailable',checkedAt:'2026-10-26T01:00:00Z'}]
  const outcome = findAvailability(scope,reports,[list])
  assert.equal(outcome.status,'observed')
  assert.equal(outcome.mixed,true)
  assert.equal(outcome.report.audio,'es-419')
  assert.equal(findAvailability({...scope,episode:2},reports,[list]).status,'unknown')
  assert.equal(findAvailability({...scope,providerId:'vidrift'},reports,[list]).status,'unknown')
  assert.equal(findAvailability(scope,[reports[1]],[]).status,'failed')
})
