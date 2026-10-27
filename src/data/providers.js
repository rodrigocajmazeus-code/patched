import { facilitoplay } from '../player/providers/facilitoplay.js'
import { moviemaster } from '../player/providers/moviemaster.js'
import { vidcloud } from '../player/providers/vidcloud.js'
import { vidrift } from '../player/providers/vidrift.js'

export const PROVIDERS = [
  {
    id: 'vidcore',
    name: 'VidCore',
    movie: (id) => `https://vidcore.net/movie/${id}?autoPlay=true`,
    tv: (id, season, episode) => `https://vidcore.net/tv/${id}/${season}/${episode}?autoPlay=true`,
  },
  {
    id: 'vidfast',
    name: 'VidFast',
    movie: (id) => `https://vidfast.vc/movie/${id}?autoPlay=true`,
    tv: (id, season, episode) => `https://vidfast.vc/tv/${id}/${season}/${episode}?autoPlay=true`,
  },
  {
    id: 'vidrock',
    name: 'VidRock',
    movie: (id) => `https://vidrock.net/movie/${id}?autoplay=true`,
    tv: (id, season, episode) => `https://vidrock.net/tv/${id}/${season}/${episode}?autoplay=true`,
  },
  { ...facilitoplay, name: 'FacilitoPlay (experimental)' },
]

export const DEFAULT_PROVIDER = 'moviemaster'
export const PRIMARY_PROVIDER_ORDER = Object.freeze(['moviemaster', 'facilitoplay', 'vidrift'])
export const EXPERIMENTAL_PROVIDERS = Object.freeze([moviemaster, vidcloud, vidrift])
// Keep the legacy registry/routes intact, but apply the user's new display order.
export const getEnabledProviders = enabled => [moviemaster, PROVIDERS.find(p => p.id === 'facilitoplay'), vidrift,
  ...PROVIDERS.filter(p => p.id !== 'facilitoplay'), ...(enabled === true ? [vidcloud] : [])]
export const getRecommendedProviders = () => getEnabledProviders(false).filter(p => PRIMARY_PROVIDER_ORDER.includes(p.id))
export function resolveSelectedProvider(id, enabled = false) {
  return getEnabledProviders(enabled).some(provider => provider.id === id) ? id : DEFAULT_PROVIDER
}

export const getProvider = (id) => [...PROVIDERS, ...EXPERIMENTAL_PROVIDERS].find((p) => p.id === id) || moviemaster

export function buildEmbedUrl(providerId, mediaType, id, season = 1, episode = 1, options = {}) {
  const provider = getProvider(providerId)
  if (provider.buildUrl) return provider.buildUrl({ ...options[provider.id], mediaType, id, season, episode })
  const url = mediaType === 'tv' ? provider.tv(id, season, episode) : provider.movie(id)
  if (/[?&]autoplay=/i.test(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}autoplay=true`
}

export function resolveEmbedUrl(...args) {
  try { return { url: buildEmbedUrl(...args), error: null } } catch (error) {
    return { url: null, error: error instanceof Error ? error.message : 'No se pudo preparar la fuente' }
  }
}
