import test from 'node:test'
import assert from 'node:assert/strict'
import { COVERAGE_CASES, coverageWatchPath } from '../src/data/coverageCases.js'
import { coverageStatus, latestCoverageRecord, summarizeCoverage } from '../src/player/coverageMetrics.js'
import { makePlaybackReport } from '../src/player/playbackReports.js'

const snk1 = COVERAGE_CASES.find(x => x.key === 'tv:1429:1:1')
const snk2 = COVERAGE_CASES.find(x => x.key === 'tv:1429:1:2')
const inception = COVERAGE_CASES.find(x => x.key === 'movie:27205:-:-')
const scope = (item, providerId, requestedVariant) => ({ ...item, providerId, requestedVariant })

const logged = (item, providerId, variant, result, checkedAt) => makePlaybackReport(scope(item, providerId, variant),
  {result, audio: result === 'works' ? 'es-419' : 'unknown'}, checkedAt)

test('coverage cases are unique, sensible, and separated by three editorial categories', () => {
  assert.equal(new Set(COVERAGE_CASES.map(x => x.key)).size, COVERAGE_CASES.length)
  assert.ok(COVERAGE_CASES.length >= 15)
  assert.deepEqual([...new Set(COVERAGE_CASES.map(x => x.category))], ['anime','series','movies'])
  assert.equal(coverageWatchPath(snk2), '/watch/tv/1429?s=1&e=2&play=1')
  assert.equal(coverageWatchPath(inception), '/watch/movie/27205?play=1')
  assert.notEqual(coverageWatchPath(snk1), coverageWatchPath(snk2))
})

test('only actual reports from this browser count, not iframe loads or catalog records', () => {
  const blank = summarizeCoverage([])
  assert.equal(blank.tested, 0)
  assert.equal(blank.total, COVERAGE_CASES.length * 3)
  assert.equal(blank.pending, blank.total)
  assert.equal(coverageStatus(null), 'Pendiente')
})

test('different episodes, providers and variants never become false availability claims', () => {
  const a = logged(snk1, 'moviemaster', 'LAT', 'works', '2026-10-26T12:00:00.000Z')
  const b = logged(snk1, 'moviemaster', 'SUB', 'unavailable', '2026-10-26T14:00:00.000Z')
  const c = logged(snk2, 'moviemaster', 'LAT', 'works', '2026-10-26T15:00:00.000Z')
  const reports = [a,b,c]
  assert.equal(latestCoverageRecord(reports, snk1, 'moviemaster').result, 'works')
  assert.equal(latestCoverageRecord(reports, snk2, 'moviemaster').result, 'works')
  assert.equal(latestCoverageRecord(reports, snk1, 'vidrift'), null)
  assert.equal(coverageStatus(b), 'No carga')
  assert.equal(summarizeCoverage(reports).tested, 2)
  assert.equal(summarizeCoverage(reports).works, 2)
})

test('casewise coverage keeps failures, wrong-content and successful playback separate', () => {
  const reports = [
    logged(snk1, 'moviemaster', 'LAT', 'works', '2026-10-26T12:00:00Z'),
    logged(snk1, 'facilitoplay', null, 'wrong-content', '2026-10-26T12:00:00Z'),
    logged(snk1, 'vidrift', null, 'unavailable', '2026-10-26T12:00:00Z'),
  ]
  const result = summarizeCoverage(reports, [snk1])
  assert.deepEqual(result, {cases:1,total:3,tested:3,works:1,unavailable:1,wrongContent:1,pending:0})
})

test('every sample case builds an independent valid URL with each priority provider', async () => {
  const { resolveEmbedUrl, PRIMARY_PROVIDER_ORDER } = await import('../src/data/providers.js')
  const urls = new Set()
  for (const item of COVERAGE_CASES) {
    for (const provider of PRIMARY_PROVIDER_ORDER) {
      const result = resolveEmbedUrl(provider, item.mediaType, item.id, item.season || 1, item.episode || 1)
      assert.equal(result.error, null)
      assert.match(result.url, /^https:\/\//)
      urls.add(result.url)
    }
  }
  assert.equal(urls.size, COVERAGE_CASES.length * PRIMARY_PROVIDER_ORDER.length)
})

test('anime classification keeps Japanese animation separate from other cartoons and live action', async () => {
  const { normalizeMedia } = await import('../src/data/media.js')
  const japaneseAnime = normalizeMedia({id:1,genre_ids:[16,10765],original_language:'ja'}, 'tv')
  const japaneseFilm = normalizeMedia({id:2,genre_ids:[16],original_language:'ja'}, 'movie')
  const americanAnimation = normalizeMedia({id:3,genre_ids:[16],original_language:'en'}, 'movie')
  const japaneseDrama = normalizeMedia({id:4,genre_ids:[18],original_language:'ja'}, 'tv')
  assert.equal(japaneseAnime.isAnime, true)
  assert.equal(japaneseFilm.isAnime, true)
  assert.equal(americanAnimation.isAnime, false)
  assert.equal(japaneseDrama.isAnime, false)
})
