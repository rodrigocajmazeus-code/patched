import test from 'node:test'
import assert from 'node:assert/strict'
import { adjacentEpisode, readEpisodeNumber, watchQuery } from '../src/player/episodeNavigation.js'

const seasons = [
  { season_number: 0, episode_count: 3 },
  { season_number: 1, episode_count: 2 },
  { season_number: 2, episode_count: 3 },
  { season_number: 3, episode_count: 0 },
]
const list = [{ number: 1 }, { number: 2 }]

test('next and previous episodes follow catalog IDs and stop at season boundaries correctly', () => {
  assert.deepEqual(adjacentEpisode({ seasons, episodes: list, season: 1, episode: 1 }, 1), { season: 1, episode: 2 })
  assert.deepEqual(adjacentEpisode({ seasons, episodes: list, season: 1, episode: 2 }, 1), { season: 2, episode: 1 })
  assert.deepEqual(adjacentEpisode({ seasons, episodes: list, season: 2, episode: 1 }, -1), { season: 1, episode: 2 })
  assert.equal(adjacentEpisode({ seasons, episodes: list, season: 1, episode: 1 }, -1), null)
  assert.equal(adjacentEpisode({ seasons, episodes: [], season: 1, episode: 1 }, 1), null)
  assert.equal(adjacentEpisode({ seasons, episodes: list, season: 2, episode: 3 }, 1), null)
  assert.deepEqual(adjacentEpisode({ seasons, episodes: [{ number: 1 }, { number: 3 }], season: 1, episode: 1 }, 1), { season: 1, episode: 3 })
})

test('the current season/episode and playback mode remain in shareable URLs', () => {
  const first = watchQuery('foo=bar&autoplay=true', { mediaType: 'tv', season: 1, episode: 2, playing: true })
  assert.equal(first.get('s'), '1')
  assert.equal(first.get('e'), '2')
  assert.equal(first.get('play'), '1')
  assert.equal(first.get('autoplay'), null)
  assert.equal(first.get('foo'), 'bar')
  const closed = watchQuery(first, { mediaType: 'tv', season: 1, episode: 2, playing: false })
  assert.equal(closed.get('play'), null)
  assert.equal(closed.get('e'), '2')
  const movie = watchQuery('x=1', { mediaType: 'movie', season: 1, episode: 1, playing: true })
  assert.equal(movie.get('s'), null)
  assert.equal(movie.get('play'), '1')
  assert.throws(() => watchQuery('', {mediaType: 'tv', season: 0, episode: 1, playing: true}), /inválido/)
})

test('invalid, negative and unreasonably large episode query values fall back to one', () => {
  assert.equal(readEpisodeNumber('s=-1', 's'), 1)
  assert.equal(readEpisodeNumber('e=2.5', 'e'), 1)
  assert.equal(readEpisodeNumber('e=9999999999999999999', 'e'), 1)
  assert.equal(readEpisodeNumber('s=4', 's'), 4)
})
