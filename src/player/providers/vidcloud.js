// Reviewed episode mappings. Catalog correspondence is not playback evidence.
export const VIDCLOUD_ORIGIN = 'https://vidcloud.sbs'
export const KIMETSU_MAPPING = Object.freeze({
  status: 'reviewed-primary-catalogs', reviewedOn: '2026-10-26',
  tmdbId: 85937, season: 1, episode: 1, anilistId: 101922, animeEpisode: 1,
  title: 'Kimetsu no Yaiba', firstEpisode: 'Cruelty', seasonEpisodes: 26, firstAired: '2019-04-06',
  // AniList content was available in its official search index; direct fetch was
  // 403. No restriction was bypassed. MAL has not been validated or assumed.
  sources: Object.freeze([
    'https://www.themoviedb.org/tv/85937/season/1/episode/1?language=en-US',
    'https://anilist.co/anime/101922/Kimetsu-no-Yaiba/watch',
  ]),
})
export const AOT_MAPPING = Object.freeze({
  status: 'reviewed-primary-catalogs', reviewedOn: '2026-10-26',
  tmdbId: 1429, season: 1, episode: 1, anilistId: 16498, animeEpisode: 1,
  title: 'Shingeki no Kyojin', firstEpisode: 'To You, in 2000 Years: The Fall of Shiganshina (1)',
  seasonEpisodes: 25, firstAired: '2013-04-07', playback: 'unverified',
  sources: Object.freeze([
    'https://www.themoviedb.org/tv/1429/season/1/episode/1?language=en-US',
    'https://anilist.co/anime/16498/Shingeki-no-Kyojin/',
  ]),
})
const reviewedMappings = Object.freeze([KIMETSU_MAPPING, AOT_MAPPING])
export function getReviewedAnimeMapping(request) {
  if (request?.mediaType !== 'tv') return null
  return reviewedMappings.find(m => String(request.id) === String(m.tmdbId) &&
    String(request.season) === String(m.season) && String(request.episode) === String(m.episode)) || null
}
export function buildVidCloudUrl(request) {
  const m = getReviewedAnimeMapping(request)
  if (!m || (request.requestedVariant ?? 'sub') !== 'sub') throw new TypeError('VidCloud: sin correspondencia revisada para este título, temporada, episodio o variante')
  // Validate supplied mapping data against the registry; never trust a caller's
  // "reviewed" flag or a numeric ID merely because it resembles a catalog ID.
  if ('mapping' in request && (!request.mapping || ['status', 'tmdbId', 'season', 'episode', 'anilistId', 'animeEpisode'].some(key => request.mapping[key] !== m[key]))) throw new TypeError('Correspondencia de episodio no validada')
  if (('anilistId' in request && request.anilistId !== m.anilistId) || ('animeEpisode' in request && request.animeEpisode !== m.animeEpisode)) throw new TypeError('Identificador anime no coincide')
  return `${VIDCLOUD_ORIGIN}/embed/ani/${m.anilistId}/${m.animeEpisode}?track=sub&autoPlay=0&autoSkip=0&autoNext=0`
}
export function parseVidCloudEvent(event, frameWindow) {
  if (!frameWindow || event.source !== frameWindow || event.origin !== VIDCLOUD_ORIGIN) return null
  const data = event.data
  if (!data || typeof data !== 'object' || !['ready', 'play', 'ended'].includes(data.event)) return null
  return { event: data.event }
}
export function readVidCloudMessage(event, frameWindow, playerUrl) {
  if (!reviewedMappings.some(m => playerUrl === buildVidCloudUrl({ mediaType: 'tv', id: m.tmdbId, season: m.season, episode: m.episode }))) return null
  const data = parseVidCloudEvent(event, frameWindow)
  return data ? { activityOnly: true, status: data.event, identityReported: false } : null
}
export const vidcloud = Object.freeze({ id: 'vidcloud', name: 'VidCloud (experimental)',
  origin: VIDCLOUD_ORIGIN, experimental: true, requiresConfirmedSelection: true, commands: false,
  referrerPolicy: 'strict-origin-when-cross-origin', audioTracks: null, subtitleTracks: null,
  buildUrl: buildVidCloudUrl, readEvent: readVidCloudMessage,
})
