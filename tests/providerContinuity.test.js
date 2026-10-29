import test from 'node:test'
import assert from 'node:assert/strict'
import { providerContinuityScope } from '../src/player/providerContinuity.js'

const base = {
  mediaType: 'tv',
  id: '1429',
  playbackPreference: 'es-ES',
  providers: [{ id: 'moviemaster' }, { id: 'facilitoplay' }, { id: 'vidrift' }],
  excludedProviders: [],
  providerOptions: { moviemaster: { requestedVariant: 'ESP' } },
}

test('episode navigation does not change the manual source scope', () => {
  assert.equal(providerContinuityScope({ ...base, season: 1, episode: 18 }),
    providerContinuityScope({ ...base, season: 1, episode: 22 }))
})
test('switching to a different series does not carry the chosen provider', () => {
  assert.notEqual(providerContinuityScope(base), providerContinuityScope({ ...base, id: '999' }))
})
test('changing preferred language or excluded providers resets choice', () => {
  assert.notEqual(providerContinuityScope(base), providerContinuityScope({ ...base, playbackPreference: 'es-419' }))
  assert.notEqual(providerContinuityScope(base),
    providerContinuityScope({ ...base, excludedProviders: ['facilitoplay'] }))
})
test('frame restriction can change without throwing away the current source', () => {
  assert.equal(providerContinuityScope({ ...base, restrictedFrames: false }),
    providerContinuityScope({ ...base, restrictedFrames: true }))
})


test('VidRift defaults to muted autoplay instead of requiring a click', async () => {
  const { buildVidRiftUrl } = await import('../src/player/providers/vidrift.js')
  const url = buildVidRiftUrl({ mediaType: 'tv', id: 1429, season: 1, episode: 23 })
  assert.equal(url, 'https://embed.vidrift.net/embed/tv/1429/1/23')
  assert.equal(new URL(url).searchParams.has('autoplay'), false)
})
