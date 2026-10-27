import test from 'node:test'
import assert from 'node:assert/strict'
import { getEnabledProviders } from '../src/data/providers.js'
import { selectEpisodeProvider, framePolicy, matchesObservedPreference, optionsForPreference } from '../src/player/providerSelection.js'
import { AOT_MAPPING, buildVidCloudUrl, readVidCloudMessage, vidcloud } from '../src/player/providers/vidcloud.js'
import { providerExperience } from '../src/data/providerExperience.js'

const request = (id, episode=1) => ({mediaType:'tv',id,season:1,episode})
const choose = (id, preference, extra={}) => selectEpisodeProvider({request:request(id),preference,providers:getEnabledProviders(true),...extra})

test('AOT LAT selects the narrowly confirmed MovieMaster episode but no other unknown source', () => {
  const result=choose(1429,'es-419')
  assert.equal(result.providerId,'moviemaster')
  assert.equal(result.confirmed,true)
  assert.match(result.candidates.find(c=>c.providerId==='moviemaster').reason,/confirmados por el usuario/)
  assert.equal(choose(1429,'es-419',{request:request(1429,2)}).providerId,null)
  assert.equal(choose(1429,'ja-es').providerId,null)
  assert.equal(choose(1429,'es-ES').providerId,'facilitoplay')
})

test('Kimetsu Japanese uses user-confirmed VidCloud only when enabled; Spanish captions remain pending', () => {
  assert.equal(choose(85937,'ja').providerId,'vidcloud')
  assert.equal(choose(85937,'ja-es').providerId,null)
  assert.match(choose(85937,'ja-es').candidates.find(c=>c.providerId==='vidcloud').reason,/subtítulos españoles pendientes/)
  assert.equal(choose(85937,'ja',{providers:getEnabledProviders(false)}).providerId,null)
  assert.equal(choose(85937,'ja',{request:request(85937,2)}).providerId,null)
  assert.equal(choose(85937,'es-419').providerId,'facilitoplay')
})

test('exclusions, manual mode and unvalidated frame restrictions never silently restore a source', () => {
  assert.equal(choose(85937,'ja',{excluded:['vidcloud']}).providerId,null)
  assert.equal(choose(85937,'es-419',{excluded:['facilitoplay']}).providerId,null)
  assert.equal(choose(85937,'manual').providerId,null)
  assert.equal(choose(85937,'es-419',{restricted:true}).providerId,null)
  assert.equal(choose(1396,'es-419').providerId,null)
  // A last global provider is not an input to language-based selection.
  assert.equal(choose(1429,'es-419',{storedProviderId:'moviemaster'}).providerId,'moviemaster')
})

test('only complete manual evidence certifies Japanese with Spanish captions', () => {
  const wanted={audio:'ja',subtitles:'es'}
  const confirmed={observer:'user',playback:'confirmed',identity:'title-and-episode-confirmed-by-user',audio:{ja:'confirmed'},confirmedSubtitleLanguages:['es']}
  assert.equal(matchesObservedPreference(confirmed,wanted),true)
  for(const changes of [{observer:'agent-visual-only'},{identity:'unverified'},{audio:{ja:'advertised'}},{confirmedSubtitleLanguages:undefined,subtitles:'spanish-displayed'},{confirmedSubtitleLanguages:['en']}]) assert.equal(matchesObservedPreference({...confirmed,...changes},wanted),false)
})

test('frame restriction blocks popups/top navigation by construction, leaves compatibility mode unchanged, respects VidCloud restriction', () => {
  assert.equal(framePolicy('facilitoplay').sandbox,undefined)
  assert.equal(framePolicy('vidcloud',true).blocked,true)
  for(const id of ['vidcore','vidfast','vidrock','facilitoplay','moviemaster']) {
    const policy=framePolicy(id,true)
    assert.ok(policy.sandbox.includes('allow-scripts'))
    assert.ok(policy.sandbox.includes('allow-same-origin'))
    assert.ok(!/allow-popups|allow-top-navigation|allow-downloads/.test(policy.sandbox))
    assert.equal(policy.status,'playback-compatibility-unverified')
  }
})

test('AOT AniList mapping is catalog-reviewed, not proof of Japanese, Spanish subtitles or LAT', () => {
  assert.equal(AOT_MAPPING.anilistId,16498)
  assert.equal(AOT_MAPPING.playback,'unverified')
  assert.equal(AOT_MAPPING.firstAired,'2013-04-07')
  const url=buildVidCloudUrl(request(1429))
  assert.equal(url,'https://vidcloud.sbs/embed/ani/16498/1?track=sub&autoPlay=0&autoSkip=0&autoNext=0')
  assert.throws(()=>buildVidCloudUrl(request(1429,2)))
  const frame={}
  assert.equal(readVidCloudMessage({source:frame,origin:vidcloud.origin,data:{event:'play'}},frame,url).identityReported,false)
  assert.equal(choose(1429,'ja').providerId,null)
})

test('advertising report retains unknown mechanism and subtitle scope instead of inventing incidents', () => {
  const reported=providerExperience.find(r=>r.providerId==='facilitoplay')
  assert.equal(reported.advertising,'bothersome-reported')
  assert.equal(reported.titleScope,'unspecified')
  assert.equal(reported.popupWindows,'unknown')
  assert.equal(reported.topLevelRedirects,'unknown')
})

test('explicit language preferences align request parameters without pretending they certify audio', () => {
  const original={moviemaster:{requestedVariant:'LAT'}}
  assert.equal(optionsForPreference(original,'ja-es').moviemaster.requestedVariant,'SUB')
  assert.equal(optionsForPreference(original,'es-ES').moviemaster.requestedVariant,'ESP')
  assert.equal(optionsForPreference(original,'manual'),original)
  assert.equal(original.moviemaster.requestedVariant,'LAT')
})
