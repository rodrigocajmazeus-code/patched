import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATALOG_MAX_PAGE,
  catalogPageNumber,
  catalogHasMore,
  buildCatalogRequests,
  mergeCatalogItems,
} from '../src/api/catalogQuery.js'

test('anime all combines TV and movie with Japanese animation filters', () => {
  const queries = buildCatalogRequests({ section: 'anime', kind: 'all', page: 3, sort: 'popular' })
  assert.equal(queries.length, 2)
  assert.deepEqual(queries.map(query => query.mediaType), ['tv', 'movie'])
  assert.equal(queries[0].params.with_genres, 16)
  assert.equal(queries[1].params.with_original_language, 'ja')
  assert.equal(queries[0].params.page, 3)
})

test('anime TV selection only queries series', () => {
  const queries = buildCatalogRequests({ section: 'anime', kind: 'tv' })
  assert.equal(queries.length, 1)
  assert.equal(queries[0].path, '/discover/tv')
})

test('series recent sort uses first-air dates and country', () => {
  const [query] = buildCatalogRequests({ section: 'series', sort: 'recent', period: '2010s', country: 'PE' })
  assert.equal(query.params.sort_by, 'first_air_date.desc')
  assert.equal(query.params['first_air_date.gte'], '2010-01-01')
  assert.equal(query.params['first_air_date.lte'], '2019-12-31')
  assert.equal(query.params.with_origin_country, 'PE')
})

test('movie rating sort uses vote count and canonical media type', () => {
  const [query] = buildCatalogRequests({ section: 'movies', sort: 'rating', period: '2000s' })
  assert.equal(query.path, '/discover/movie')
  assert.equal(query.params['vote_count.gte'], 100)
  assert.equal(query.params['primary_release_date.gte'], '2000-01-01')
  assert.equal(query.params['primary_release_date.lte'], '2009-12-31')
})

test('2020s end date is capped at today to avoid upcoming videos', () => {
  const [query] = buildCatalogRequests({ section: 'movies', period: '2020s' })
  assert.equal(query.params['primary_release_date.gte'], '2020-01-01')
  assert.notEqual(query.params['primary_release_date.lte'], '2029-12-31')
})

test('pagination clamps to valid TMDB pages and rejects invalid section', () => {
  assert.equal(catalogPageNumber(-5), 1)
  assert.equal(catalogPageNumber('hello'), 1)
  assert.equal(catalogPageNumber(9000), CATALOG_MAX_PAGE)
  assert.throws(() => buildCatalogRequests({ section: 'unknown' }), TypeError)
})

test('deduplicates across pagination but keeps movie/TV of same ID', () => {
  const merged = mergeCatalogItems([{ key: 'tv-5' }], [{ key: 'tv-5' }, { key: 'movie-5' }])
  assert.deepEqual(merged.map(item => item.key), ['tv-5', 'movie-5'])
})

test('hasMore respects server pagination and 500 page limit', () => {
  assert.equal(catalogHasMore([{ totalPages: 3 }, { totalPages: 4 }], 3), true)
  assert.equal(catalogHasMore([{ totalPages: 3 }, { totalPages: 4 }], 4), false)
  assert.equal(catalogHasMore([{ totalPages: 600 }], 500), false)
  assert.equal(catalogHasMore([], 1), false)
})
