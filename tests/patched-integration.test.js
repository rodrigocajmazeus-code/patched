import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { recommendVideoProviders } from '../src/player/evidenceRecommender.js'
import { readVidRiftTelemetry, VIDRIFT_EMBED_ORIGIN } from '../src/player/vidriftTelemetry.js'

const watchSource = readFileSync(new URL('../src/pages/WatchPage.jsx', import.meta.url), 'utf8')
const viewSource = readFileSync(new URL('../src/components/ProviderEvidencePanel.jsx', import.meta.url), 'utf8')
const hookSource = readFileSync(new URL('../src/hooks/useVidRiftEvidence.js', import.meta.url), 'utf8')

test('PATCHED watch page connects the historical panel and VidRift telemetry without replacing episode selection', () => {
  assert.match(watchSource, /<ProviderEvidencePanel[\s\S]*request=\{evidenceRequest\}/)
  assert.match(watchSource, /useVidRiftEvidence\(/)
  assert.match(watchSource, /<EpisodePicker /)
  assert.match(watchSource, /<PlayerEmbed /)
  assert.match(watchSource, /onChoose=\{setProvider\}/)
})
test('recommendations remain historical and can only be activated via a button', () => {
  assert.match(viewSource, /onClick=\{\(\) => onChoose\(suggested\.providerId\)\}/)
  assert.match(viewSource, /no una consulta de disponibilidad en tiempo real/)
  const outcome = recommendVideoProviders({request:{mediaType:'tv',id:1429,season:1,episode:1}})
  assert.equal(outcome.isLiveAvailability,false)
  assert.equal(outcome.requiresManualSelection,true)
})
test('VidRift hook rejects wrong origin and never marks audiovisual evidence as verified', () => {
  assert.match(hookSource, /readVidRiftTelemetry\(event, frame, request\)/)
  assert.match(hookSource, /frame\.postMessage\(vidriftStateRequest\(\), VIDRIFT_EMBED_ORIGIN\)/)
  assert.doesNotMatch(hookSource, /savePlaybackReport/)
  const frame = {}
  assert.equal(readVidRiftTelemetry({source:frame, origin:'https://example.org', data:{type:'vidrift:state'}},frame,{mediaType:'movie',id:27205}),null)
  const state = readVidRiftTelemetry({source:frame, origin:VIDRIFT_EMBED_ORIGIN, data:{type:'vidrift:state',tmdbId:27205,mediaType:'movie',quality:'1080p'}},frame,{mediaType:'movie',id:27205})
  assert.equal(state.playbackVerified,false)
  assert.equal(state.bitrateMeasured,false)
})
