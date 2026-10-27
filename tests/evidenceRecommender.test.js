import test from 'node:test'
import assert from 'node:assert/strict'
import { recommendVideoProviders as rank } from '../src/player/evidenceRecommender.js'

const now = '2026-10-27T02:00:00.000Z'
const request = {mediaType:'tv',id:1429,season:1,episode:1}
const report = (provider, variant, result='works', audio='es-419', opts={}) => ({
  key:`tv:1429:1:1:${provider}:${variant}`, observer:'user-local', result,audio,subtitles:'unknown',
  picture:'unknown',buffering:'unknown',checkedAt:'2026-10-26T02:00:00.000Z', ...opts
})
const get = (result,id) => result.candidates.find(item=>item.providerId===id)

test('default keeps MovieMaster first, unknown is NOT confirmed',()=>{
 const result=rank({request,now})
 assert.equal(result.recommendedProviderId,'moviemaster')
 assert.equal(result.hasConfirmedPreference,false)
 assert.equal(result.isLiveAvailability,false)
 assert.equal(result.requiresManualSelection,true)
})
test('MovieMaster SUB success is not evidence that LAT works',()=>{
 const result=rank({request,now,reports:[report('moviemaster','SUB')]})
 assert.equal(get(result,'moviemaster').evidence,'unknown')
 assert.equal(result.hasConfirmedPreference,false)
})
test('LAT success with Japanese audio is not Latin verification',()=>{
 const result=rank({request,now,reports:[report('moviemaster','LAT','works','ja')]})
 assert.equal(get(result,'moviemaster').evidence,'language-mismatch')
 assert.notEqual(result.recommendedProviderId,'moviemaster')
})
test('a matching local test can make FacilitoPlay the recommended choice',()=>{
 const result=rank({request,now,reports:[report('facilitoplay','-')]})
 assert.equal(result.recommendedProviderId,'facilitoplay')
 assert.equal(result.hasConfirmedPreference,true)
})
test('an exact different episode does not count',()=>{
 const result=rank({request,now,reports:[{...report('moviemaster','LAT'),key:'tv:1429:1:2:moviemaster:LAT'}]})
 assert.equal(get(result,'moviemaster').evidence,'unknown')
})
test('Spanish subtitles need an explicit verification for ja-es',()=>{
 const result=rank({request,preference:'ja-es',now,reports:[report('moviemaster','SUB','works','ja')]})
 assert.equal(get(result,'moviemaster').evidence,'subtitles-unconfirmed')
 const confirmed=rank({request,preference:'ja-es',now,reports:[report('moviemaster','SUB','works','ja',{subtitles:'es'})]})
 assert.equal(get(confirmed,'moviemaster').evidence,'language-observed')
})
test('failed LAT does not mark successful SUB variant unavailable',()=>{
 const result=rank({request,preference:'ja-es',now,reports:[report('moviemaster','LAT','unavailable')]})
 assert.equal(get(result,'moviemaster').evidence,'unknown')
})
test('later exact-variant failure overrides older success',()=>{
 const result=rank({request,now,reports:[report('moviemaster','LAT'), report('moviemaster','LAT','unavailable','unknown',{checkedAt:'2026-10-27T01:00:00Z'})]})
 assert.equal(get(result,'moviemaster').evidence,'reported-unavailable')
})
test('bad source and fabricated observation cannot count',()=>{
 const spoof={...report('moviemaster','LAT'),observer:'agent-visual-only'}
 const result=rank({request,now,reports:[spoof]})
 assert.equal(get(result,'moviemaster').evidence,'unknown')
})
test('series inventory does not prove episode nor idioma',()=>{
 const inventories=[{providerId:'moviemaster',sourceType:'community',sourceLabel:'lista',entries:['tv:1429'],importedAt:now}]
 const result=rank({request,now,inventories})
 assert.equal(get(result,'moviemaster').evidence,'listed-series')
 assert.equal(result.hasConfirmedPreference,false)
})
test('episode list is still not verified playback',()=>{
 const inventories=[{providerId:'vidrift',sourceType:'official-claimed',sourceLabel:'lista',entries:['episode:1429:1:1'],importedAt:now}]
 const result=rank({request,now,inventories})
 assert.equal(get(result,'vidrift').evidence,'listed-episode')
 assert.equal(result.hasConfirmedPreference,false)
})
test('stale prior confirmation is labeled, not treated as recent',()=>{
 const result=rank({request,now,reports:[report('moviemaster','LAT','works','es-419',{checkedAt:'2026-01-01T01:00:00Z'})]})
 assert.equal(get(result,'moviemaster').evidence,'language-observed')
 assert.equal(get(result,'moviemaster').stale,true)
 assert.equal(result.hasConfirmedPreference,false)
})
test('picture and buffering are preferences, not actual bitrate metrics',()=>{
 const result=rank({request,now,reports:[report('moviemaster','LAT','works','es-419',{picture:'blurry',buffering:'often'}),report('vidrift','-','works','es-419',{picture:'sharp',buffering:'none'})]})
 assert.equal(result.recommendedProviderId,'vidrift')
 assert.equal(get(result,'vidrift').picture,'sharp')
})
test('manual preference never implies a specified audio language',()=>{
 const result=rank({request,preference:'manual',now,reports:[report('moviemaster','-','works','ja')]})
 assert.equal(get(result,'moviemaster').evidence,'playback-observed')
 assert.equal(result.hasConfirmedPreference,false)
})
test('explicit excluded providers respected and all excluded yields no recommendation',()=>{
 const result=rank({request,now,excluded:['moviemaster','facilitoplay','vidrift']})
 assert.deepEqual(result.candidates,[])
 assert.equal(result.recommendedProviderId,null)
})
test('wrong-content is considered worse than no information',()=>{
 const result=rank({request,now,reports:[report('moviemaster','LAT','wrong-content')]})
 assert.equal(result.recommendedProviderId,'facilitoplay')
})
test('wrong type, invalid id, season or episode fails closed',()=>{
 assert.equal(rank({request:{mediaType:'tv',id:1429,season:0,episode:1},now}).valid,false)
 assert.equal(rank({request:{mediaType:'movie',id:'nan'},now}).valid,false)
})
test('movie inventories and movie scope work independently',()=>{
 const result=rank({request:{mediaType:'movie',id:27205},now,inventories:[{providerId:'facilitoplay',sourceType:'personal',sourceLabel:'lista',entries:['movie:27205'],importedAt:now}]})
 assert.equal(get(result,'facilitoplay').evidence,'listed-title')
})
