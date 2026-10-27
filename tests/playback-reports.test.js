import test from 'node:test'
import assert from 'node:assert/strict'
import {
  playbackReportScope, makePlaybackReport, parsePlaybackReports,
  readPlaybackReport, savePlaybackReport, upsertPlaybackReport, PLAYBACK_REPORTS_KEY,
} from '../src/player/playbackReports.js'
import { languageRouting, nextAvailableProvider } from '../src/player/languageRouting.js'
import { getEnabledProviders } from '../src/data/providers.js'
import { optionsForPreference, selectEpisodeProvider } from '../src/player/providerSelection.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    get raw() { return data },
  }
}
const aot = { mediaType: 'tv', id: 1429, season: 1, episode: 1, providerId: 'moviemaster', requestedVariant: 'LAT' }

test('reports are scoped by title, episode, provider, and requested variant', () => {
  const store = memoryStorage()
  const report = savePlaybackReport(store, aot, { result: 'works', audio: 'es-419', subtitles: 'unknown' })
  assert.equal(report.observer, 'user-local')
  assert.equal(readPlaybackReport(store, aot)?.audio, 'es-419')
  for (const change of [
    { episode: 2 }, { season: 2 }, { id: 85937 },
    { providerId: 'vidrift' }, { requestedVariant: 'SUB' },
  ]) assert.equal(readPlaybackReport(store, { ...aot, ...change }), null)
  assert.notEqual(playbackReportScope({ mediaType: 'movie', id: 1429, providerId: 'moviemaster', requestedVariant: 'LAT' }), playbackReportScope(aot))
})

test('failed and wrong-content reports never confirm audio or subtitles', () => {
  const store = memoryStorage()
  const failed = savePlaybackReport(store, aot, { result: 'unavailable', audio: 'es-419', subtitles: 'es' })
  assert.equal(failed.audio, 'unknown')
  assert.equal(failed.subtitles, 'unknown')
  assert.equal(savePlaybackReport(store, aot, { result: 'wrong-content', audio: 'ja', subtitles: 'es' }).result, 'wrong-content')
  assert.equal(readPlaybackReport(store, aot).audio, 'unknown')
  assert.equal(savePlaybackReport(store, aot, { result: 'works', audio: 'en', subtitles: 'es' }).audio, 'en')
  assert.equal(parsePlaybackReports(store.getItem(PLAYBACK_REPORTS_KEY)).length, 1)
})

test('reports are validated and malformed storage degrades safely', () => {
  assert.equal(playbackReportScope({ ...aot, providerId: '../hack' }), null)
  assert.equal(playbackReportScope({ ...aot, episode: 0 }), null)
  assert.equal(makePlaybackReport(aot, { result: 'fictional' }), null)
  assert.equal(makePlaybackReport(aot, { result: 'works', audio: 'unsure', subtitles: 'unverified' }).audio, 'unknown')
  assert.deepEqual(parsePlaybackReports('{bad'), [])
  assert.deepEqual(parsePlaybackReports('{"records":[]}'), [])
  assert.equal(readPlaybackReport({ getItem: () => { throw Error('blocked') } }, aot), null)
  assert.equal(savePlaybackReport({ getItem: () => null, setItem: () => { throw Error('blocked') } }, aot, {result:'works'}), null)
  assert.equal(upsertPlaybackReport([], null).length, 0)
})

test('MovieMaster SUB is a requested route, not a guaranteed Japanese or English track', () => {
  const opts = optionsForPreference({ moviemaster: { requestedVariant: 'LAT' } }, 'ja-es')
  assert.equal(opts.moviemaster.requestedVariant, 'SUB')
  const route = languageRouting('moviemaster', 'ja-es', 'SUB')
  assert.equal(route.mode, 'requested-variant')
  assert.equal(route.variant, 'SUB')
  assert.match(route.message, /no garantiza inglés ni japonés/)
  assert.equal(languageRouting('moviemaster', 'es-419').variant, 'LAT')
  assert.equal(languageRouting('moviemaster', 'es-ES').variant, 'ESP')
  assert.equal(languageRouting('facilitoplay', 'ja-es').mode, 'provider-controlled')
  assert.equal(languageRouting('vidrift', 'es-419').mode, 'provider-controlled')
  assert.equal(languageRouting('moviemaster', 'manual').mode, 'manual')
})

test('explicit next server respects availability, excluded sources, and priority', () => {
  const request = { mediaType: 'tv', id: 1429, season: 1, episode: 2 }
  const select = excluded => selectEpisodeProvider({ request, providers: getEnabledProviders(false), excluded })
  const order = ['moviemaster', 'facilitoplay', 'vidrift']
  assert.equal(nextAvailableProvider('moviemaster', select([]).candidates, order), 'facilitoplay')
  assert.equal(nextAvailableProvider('moviemaster', select(['facilitoplay']).candidates, order), 'vidrift')
  assert.equal(nextAvailableProvider('moviemaster', select(['facilitoplay', 'vidrift']).candidates, order), null)
  assert.equal(nextAvailableProvider('vidrift', select([]).candidates, order), 'moviemaster')
})
