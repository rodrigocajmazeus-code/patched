import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLanguage, audioLabel, subtitleLabel, sortAudioTracks } from '../src/player/language.js'
import { getEnabledProviders, getRecommendedProviders, resolveSelectedProvider, buildEmbedUrl, resolveEmbedUrl } from '../src/data/providers.js'
import { moviemaster, buildMovieMasterUrl, readMovieMasterMessage } from '../src/player/providers/moviemaster.js'
import { vidcloud, KIMETSU_MAPPING, buildVidCloudUrl, getReviewedAnimeMapping, readVidCloudMessage } from '../src/player/providers/vidcloud.js'
import { getBridgeAdapter } from '../src/player/providers/bridgeAdapters.js'
import { getProviderObservation, providerObservations } from '../src/data/providerObservations.js'

test('Spanish regional tags never invent Latino availability', () => {
  for (const tag of ['es-ES', 'ES_es', ' es-es ']) {
    assert.equal(normalizeLanguage(tag), 'es-es')
    assert.match(audioLabel(tag), /castellano/)
  }
  assert.equal(normalizeLanguage('es-419'), 'es-419')
  assert.equal(audioLabel('es-419'), 'Español latino')
  for (const tag of ['es', 'spa']) assert.equal(audioLabel(tag), 'Español no especificado')
  assert.equal(normalizeLanguage('es-MX'), 'es-mx')
  assert.doesNotMatch(audioLabel('es-MX'), /latino/i)
  assert.equal(subtitleLabel('es-ES'), 'Español')
  const tracks = [{lang:'es-ES'}, {lang:'es'}, {lang:'ja'}, {lang:'es-419'}]
  assert.deepEqual(sortAudioTracks(tracks).map(x => x.lang), ['es-419', 'ja', 'es-ES', 'es'])
  assert.equal(tracks[0].lang, 'es-ES')
})

test('user-approved order enables MovieMaster/FacilitoPlay/VidRift and keeps VidCloud opt-in', () => {
  assert.deepEqual(getEnabledProviders(false).map(p => p.id), ['moviemaster','facilitoplay','vidrift','vidcore','vidfast','vidrock'])
  assert.equal(getEnabledProviders('true').length, 6)
  assert.equal(getEnabledProviders(true).length, 7)
  assert.equal(resolveSelectedProvider('moviemaster'), 'moviemaster')
  assert.equal(resolveSelectedProvider('vidrift'), 'vidrift')
  assert.equal(resolveSelectedProvider('vidcloud'), 'moviemaster')
  assert.equal(resolveSelectedProvider('vidcloud',true), 'vidcloud')
  assert.deepEqual(getRecommendedProviders().map(p => p.id), ['moviemaster','facilitoplay','vidrift'])
  assert.equal(resolveSelectedProvider('facilitoplay'), 'facilitoplay')
})

test('MovieMaster constructs public routes, validates input, never promises tracks', () => {
  assert.equal(buildMovieMasterUrl({mediaType:'movie',id:'27205'}), 'https://api.moviemaster.lat/e/movie/27205?lang=LAT')
  assert.equal(buildEmbedUrl('moviemaster','tv','85937','1','1',{moviemaster:{requestedVariant:'SUB'}}), 'https://api.moviemaster.lat/e/tv/85937/1/1?lang=SUB')
  for (const bad of [0,-1,1.2,'1/foo',NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) assert.throws(() => buildMovieMasterUrl({mediaType:'tv',id:bad,season:1,episode:1}))
  assert.throws(() => buildMovieMasterUrl({mediaType:'tv',id:1429,season:0,episode:1}))
  assert.throws(() => buildMovieMasterUrl({mediaType:'tv',id:1429,season:1,episode:1,requestedVariant:'JA'}))
  for (const p of [moviemaster,vidcloud]) { assert.equal(p.audioTracks,null); assert.equal(p.subtitleTracks,null); assert.equal(p.commands,false) }
})

test('VidCloud only uses explicitly reviewed AniList episode mapping', () => {
  const request = {mediaType:'tv',id:85937,season:1,episode:1}
  assert.equal(getReviewedAnimeMapping(request), KIMETSU_MAPPING)
  assert.equal(buildVidCloudUrl(request), 'https://vidcloud.sbs/embed/ani/101922/1?track=sub&autoPlay=0&autoSkip=0&autoNext=0')
  assert.ok(!('malId' in KIMETSU_MAPPING))
  for (const change of [{id:99999},{season:2},{episode:2},{mediaType:'movie'},{requestedVariant:'dub'},{anilistId:85937},{mapping:null},{mapping:{...KIMETSU_MAPPING,animeEpisode:2}}]) assert.throws(() => buildVidCloudUrl({...request,...change}))
  const unsupported=resolveEmbedUrl('vidcloud','tv',99999,1,1)
  assert.equal(unsupported.url,null)
  assert.match(unsupported.error,/correspondencia/)
})

test('MovieMaster bridge trusts exact origin and emitting window, not requested language or identity', () => {
  const frame = {}
  const url = buildEmbedUrl('moviemaster','tv',1429,1,1)
  const event={source:frame,origin:moviemaster.origin,data:{type:'mm:time',currentTime:12,duration:1500}}
  assert.deepEqual(readMovieMasterMessage(event,frame,url),{time:12,duration:1500,paused:null,status:'time',identityReported:false})
  for (const change of [{source:{}},{origin:'https://api.moviemaster.lat.evil.test'},{data:{type:'mm:time',currentTime:'12',duration:1500}},{data:{type:'mm:time',currentTime:NaN,duration:1500}},{data:{event:'play',language:'ja'}}]) assert.equal(readMovieMasterMessage({...event,...change},frame,url),null)
  const hello=readMovieMasterMessage({...event,data:'mm:hello'},frame,url)
  assert.equal(hello.activityOnly,true)
  assert.equal(hello.time,undefined)
  assert.equal(hello.audio,undefined)
  assert.equal(getBridgeAdapter(url),moviemaster)
})

test('VidCloud play is an activity signal, not proof of audio, identity or progress', () => {
  const frame={}; const url=buildEmbedUrl('vidcloud','tv',85937,1,1)
  const event={source:frame,origin:vidcloud.origin,data:{event:'play',audio:'ja'}}
  assert.deepEqual(readVidCloudMessage(event,frame,url),{activityOnly:true,status:'play',identityReported:false})
  assert.equal(readVidCloudMessage({...event,source:{}},frame,url),null)
  assert.equal(readVidCloudMessage({...event,origin:'https://evil.test'},frame,url),null)
  assert.equal(readVidCloudMessage(event,frame,url.replace('101922','85937')),null)
  assert.equal(getBridgeAdapter(url),vidcloud)
})

test('historical evidence separates observers, requested variants, silent and unknown audio', () => {
  const aot=getProviderObservation('facilitoplay','tv',1429,1,1)
  assert.equal(aot.observer,'user'); assert.equal(aot.audio['es-419'],'silent'); assert.equal(aot.audio['es-ES'],'confirmed')
  const mm=getProviderObservation('moviemaster','tv',85937,1,1,'SUB')
  assert.equal(mm.audio,null); assert.equal(mm.fallback,'SUB-to-Latino-label-confirmed'); assert.equal(mm.streamboxPlayback,'unverified')
  assert.equal(getProviderObservation('moviemaster','tv',85937,1,1,'LAT'),null)
  const vc=getProviderObservation('vidcloud','tv',85937,1,1,'sub')
  assert.equal(vc.subtitles,'pending-definitive-user-verification'); assert.equal(vc.audio.ja,'confirmed')
})

test('new SNK listening report supersedes earlier uncertainty without erasing history', () => {
  const mm=getProviderObservation('moviemaster','tv',1429,1,1,'LAT')
  assert.equal(mm.observer,'user'); assert.equal(mm.source,'user-report-in-chat')
  assert.equal(mm.identity,'title-and-episode-confirmed-by-user')
  assert.equal(mm.audio['es-419'],'confirmed')
  assert.equal(mm.subtitles,'unknown')
  const earlier=providerObservations.find(r=>r.providerId==='moviemaster' && r.testedCommit==='33e0004')
  assert.equal(earlier.audio['es-419'],'not-confirmed')
  assert.equal(earlier.heardAudio,'other-language-or-no-audio')
  const vc=getProviderObservation('vidcloud','tv',85937,1,1,'sub')
  assert.equal(vc.observer,'user'); assert.equal(vc.source,'user-report-in-chat')
  assert.equal(vc.identity,'title-and-episode-confirmed-by-user')
  assert.equal(vc.audio.ja,'confirmed')
  assert.equal(vc.subtitles,'pending-definitive-user-verification')
  assert.equal(getProviderObservation('vidcloud','tv',85937,1,2,'sub'),null)
  assert.equal(getProviderObservation('vidcloud','tv',85937,2,1,'sub'),null)
  assert.equal(getProviderObservation('vidcloud','tv',85937,1,1,'dub'),null)
  const previous=providerObservations.find(r=>r.providerId==='vidcloud' && r.observer==='agent-visual-only')
  assert.equal(previous.audio,null); assert.equal(previous.subtitles,'spanish-displayed')
})
