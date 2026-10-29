// A manual source choice belongs to a series/movie, not a single episode.
// Changing language or provider settings creates a fresh selection context.
export function providerContinuityScope({
  mediaType, id, playbackPreference, providers = [], excludedProviders = [], providerOptions = {},
}) {
  return JSON.stringify([
    mediaType === 'tv' ? 'tv' : 'movie',
    String(id),
    playbackPreference,
    providers.map(p => p.id),
    excludedProviders,
    providerOptions,
  ])
}
