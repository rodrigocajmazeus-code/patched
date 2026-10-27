import test from 'node:test'
import assert from 'node:assert/strict'
import { makePlaybackReport, parsePlaybackReports, PLAYBACK_REPORTS_KEY, savePlaybackReport, readPlaybackReport } from '../src/player/playbackReports.js'
import { mapHlsLevels, hlsLevelLabel, canSelectHlsLevel } from '../src/player/hlsQuality.js'
import { latestCoverageRecord, summarizeCoverage, summarizeObservedQuality } from '../src/player/coverageMetrics.js'
const scope = { mediaType:'tv', id:1429, season:1, episode:1, providerId:'moviemaster', requestedVariant:'LAT' }
const storage = () => {
  const map = new Map()
  return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}
}
test('picture, buffering, and displayed resolution are optional first-party observations, not detected stream data', () => {
  const report = makePlaybackReport(scope, { result:'works', audio:'es-419', picture:'sharp', buffering:'none', displayedResolution:'1080p' })
  assert.equal(report.picture, 'sharp')
  assert.equal(report.buffering, 'none')
  assert.equal(report.displayedResolution, '1080p')
  assert.equal(report.observer, 'user-local')
  assert.equal(makePlaybackReport(scope,{ result:'unavailable', picture:'sharp', buffering:'none', displayedResolution:'1080p' }).picture,'unknown')
  assert.equal(makePlaybackReport(scope,{ result:'wrong-content', displayedResolution:'2160p' }).displayedResolution,'unknown')
})
test('invalid quality claims never reach reports', () => {
  const r = makePlaybackReport(scope, {result:'works',picture:'ultra-8k',buffering:'impossible',displayedResolution:'9999p'})
  assert.equal(r.picture,'unknown')
  assert.equal(r.buffering,'unknown')
  assert.equal(r.displayedResolution,'unknown')
})
test('historic 0.4 reports remain readable without invented picture evidence', () => {
  const old = {key:'tv:1429:1:1:moviemaster:LAT',result:'works',audio:'es-419',subtitles:'unknown',checkedAt:'2026-10-26T00:00:00Z',observer:'user-local'}
  const parsed = parsePlaybackReports(JSON.stringify([old]))
  assert.equal(parsed[0].audio,'es-419')
  assert.equal(parsed[0].picture,'unknown')
  assert.equal(parsed[0].displayedResolution,'unknown')
  const db = storage()
  db.setItem(PLAYBACK_REPORTS_KEY,JSON.stringify([old]))
  assert.equal(readPlaybackReport(db,scope).buffering,'unknown')
  const result = savePlaybackReport(db,scope,{result:'works',audio:'es-419',picture:'acceptable',buffering:'sometimes'})
  assert.equal(result.picture,'acceptable')
  assert.equal(parsePlaybackReports(db.getItem(PLAYBACK_REPORTS_KEY)).length,1)
})
test('coverage only displays picture from a report that plays correctly', () => {
  const works = makePlaybackReport(scope,{result:'works',picture:'sharp',buffering:'none'},'2026-10-25T00:00:00Z')
  const failed = makePlaybackReport({...scope,requestedVariant:'SUB'},{result:'unavailable',picture:'sharp'},'2026-10-26T00:00:00Z')
  const item = {key:'tv:1429:1:1'}
  assert.equal(latestCoverageRecord([failed,works],item,'moviemaster')?.picture,'sharp')
  assert.equal(summarizeCoverage([failed,works],[item],['moviemaster']).works,1)
})
test('hls levels expose only heights and bitrates actually listed by the manifest', () => {
  const levels=mapHlsLevels([{height:480,bitrate:900000},{height:1080,bitrate:5100000},{}])
  assert.equal(hlsLevelLabel(levels[0]),'480p · 0.9 Mb/s')
  assert.equal(hlsLevelLabel(levels[1]),'1080p · 5.1 Mb/s')
  assert.equal(hlsLevelLabel(levels[2]),'Nivel 3')
  assert.equal(canSelectHlsLevel(levels,-1),true)
  assert.equal(canSelectHlsLevel(levels,'1'),true)
  assert.equal(canSelectHlsLevel(levels,'999'),false)
  assert.deepEqual(mapHlsLevels('not an array'),[])
})

test('quality summary counts only user-confirmed playable cases, not failed variants', () => {
  const valid = makePlaybackReport(scope, {result:'works',picture:'sharp',buffering:'none'})
  const bad = makePlaybackReport({...scope,requestedVariant:'SUB'},{result:'unavailable',picture:'blurry'},'2026-10-27T00:00:00Z')
  const [x]=summarizeObservedQuality([valid,bad],[{key:'tv:1429:1:1'}],['moviemaster'])
  assert.equal(x.workingCases,1)
  assert.equal(x.sharp,1)
  assert.equal(x.blurry,0)
  assert.equal(x.fluid,1)
})
