import test from 'node:test'
import assert from 'node:assert/strict'
import { episodePage, filterEpisodes } from '../src/components/episodePickerModel.js'
test('pagination preserves original TMDB episode identities and bounds the rendered set', () => {
  const episodes = Array.from({length: 501}, (_, index) => ({ id: 9000 + index, number: index + 7, season: 12, title: 'Episodio ' + index }))
  const page = episodePage(episodes, 6)
  assert.equal(page.items.length, 48)
  assert.equal(page.items[0], episodes[288])
  assert.equal(page.items[0].number, 295)
  assert.equal(episodePage(episodes, 999).index, 10)
  assert.equal(episodePage(episodes, -1).index, 0)
  assert.equal(episodePage([], 0).pages, 1)
})
test('search preserves long titles and exact episode numbers without renumbering', () => {
  const title = 'La dimensión de los recuerdos y un título extraordinariamente largo'
  const episodes = [{id: 14, number: 101, season: 4, title}, {id: 15, number: 102, season: 4, title: 'Otro'}]
  assert.deepEqual(filterEpisodes(episodes, 'dimension'), [episodes[0]])
  assert.equal(filterEpisodes(episodes, '101')[0].title, title)
  assert.equal(filterEpisodes(episodes, '1').length, 0)
  assert.equal(filterEpisodes(episodes, 'inexistente').length, 0)
})
