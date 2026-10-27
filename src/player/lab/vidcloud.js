// Isolated fixture; registry and validation are shared with StreamBox.
import { KIMETSU_MAPPING } from '../providers/vidcloud.js'
export { VIDCLOUD_ORIGIN, KIMETSU_MAPPING, buildVidCloudUrl, parseVidCloudEvent } from '../providers/vidcloud.js'
export const VIDCLOUD_CASE = Object.freeze({ providerId: 'vidcloud', title: 'Kimetsu no Yaiba T1E1',
  mediaType: 'tv', id: 85937, season: 1, episode: 1, anilistId: 101922, animeEpisode: 1,
  requestedVariant: 'sub', mapping: KIMETSU_MAPPING,
})