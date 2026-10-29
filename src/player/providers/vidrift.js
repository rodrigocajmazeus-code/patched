// Public contract: https://vidrift.net/ — no private streams or inferred tracks.
export const VIDRIFT_ORIGIN = 'https://embed.vidrift.net'
export function buildVidRiftUrl(request) {
  if (!request || !['movie', 'tv'].includes(request.mediaType)) throw new TypeError('VidRift: tipo de contenido inválido')
  const positive = value => {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw new TypeError('VidRift: identificador o episodio inválido')
    return Number(value)
  }
  const path = request.mediaType === 'tv' ? `tv/${positive(request.id)}/${positive(request.season)}/${positive(request.episode)}` : `movie/${positive(request.id)}`
  // The documented default attempts muted autoplay, avoiding a forced extra click.
  // Do not add autoplay=0: it deliberately disables the provider's start behavior.
  return `${VIDRIFT_ORIGIN}/embed/${path}`
}
export const vidrift = Object.freeze({ id: 'vidrift', name: 'VidRift (sin verificar)',
  origin: VIDRIFT_ORIGIN, experimental: true, commands: false,
  referrerPolicy: 'strict-origin-when-cross-origin', audioTracks: null, subtitleTracks: null,
  buildUrl: buildVidRiftUrl,
  // Event integration deferred: never interpret it as the legacy protocol.
  readEvent: () => null,
})
