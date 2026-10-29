import test from 'node:test'
import assert from 'node:assert/strict'
import { getEnabledProviders, buildEmbedUrl } from '../src/data/providers.js'
import { applyPreferredOrder, selectEpisodeProvider, framePolicy } from '../src/player/providerSelection.js'
import { vidrift, buildVidRiftUrl } from '../src/player/providers/vidrift.js'
import { getBridgeAdapter } from '../src/player/providers/bridgeAdapters.js'

function selection(excluded=[]) {
  return selectEpisodeProvider({request:{mediaType:'tv',id:1429,season:1,episode:1},
    preference:'es-419',providers:getEnabledProviders(false),excluded})
}
test('MovieMaster opens first and only SNK T1E1 LAT has user-reported audio confirmation', () => {
  const result=applyPreferredOrder(selection(),'es-419')
  assert.equal(result.providerId,'moviemaster')
  assert.equal(result.confirmed,true)
  assert.match(result.reason,/confirmados por el usuario/)
  assert.equal(buildEmbedUrl(result.providerId,'tv',1429,1,1),'https://api.moviemaster.lat/e/tv/1429/1/1?lang=LAT')
  assert.equal(applyPreferredOrder(selection(['moviemaster']),'es-419').providerId,'facilitoplay')
  assert.equal(applyPreferredOrder(selection(['moviemaster','facilitoplay']),'es-419').providerId,'vidrift')
  assert.equal(applyPreferredOrder(selection(['moviemaster','facilitoplay','vidrift']),'es-419').providerId,null)
  assert.equal(applyPreferredOrder({...selection(),providerId:null},'manual').providerId,null)
})
test('VidRift uses only documented TMDB routes and never pretends its dub means Latino', () => {
  assert.equal(buildVidRiftUrl({mediaType:'tv',id:1429,season:1,episode:1}), 'https://embed.vidrift.net/embed/tv/1429/1/1')
  assert.equal(buildVidRiftUrl({mediaType:'movie',id:27205}), 'https://embed.vidrift.net/embed/movie/27205')
  for (const request of [{mediaType:'anime',id:1429},{mediaType:'tv',id:1429,season:0,episode:1},{mediaType:'movie',id:'1/../../x'}]) assert.throws(()=>buildVidRiftUrl(request))
  assert.equal(vidrift.audioTracks,null)
  assert.equal(vidrift.subtitleTracks,null)
  assert.equal(vidrift.commands,false)
  assert.equal(vidrift.readEvent({data:{type:'player:timeupdate',time:99}}),null)
  assert.equal(getBridgeAdapter(buildEmbedUrl('vidrift','tv',1429,1,1)),vidrift)
  assert.equal(framePolicy('vidrift',true).blocked,true)
})
