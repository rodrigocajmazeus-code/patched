/**
 * Fuentes que administras y tienes derecho a reproducir.
 * No se importan vídeos ni pistas de proveedores de iframe.
 * Claves: movie:TMDB_ID o tv:TMDB_ID:TEMPORADA:EPISODIO.
 *
 * Ejemplo para un contenido propio:
 * 'movie:1234': {
 *   title: 'Mi cortometraje',
 *   renditions: [
 *     { id: 'es', language: 'es-419', label: 'Español latino', kind: 'mp4', url: '/media/mi-corto-es.mp4' },
 *     { id: 'en', language: 'en', label: 'English', kind: 'mp4', url: '/media/mi-corto-en.mp4' }
 *   ],
 *   subtitles: [
 *     { language: 'es', label: 'Español', url: '/media/mi-corto.es.vtt' },
 *     { language: 'en', label: 'English', url: '/media/mi-corto.en.vtt' }
 *   ],
 * }
 *
 * Para una pista multiaudio HLS use una sola rendition: kind: 'hls', url:
 * 'https://dominio-autorizado/maestro.m3u8'. El reproductor detectará los
 * idiomas del manifiesto mediante hls.js; no inventará los que no existan.
 */
export const authorizedMedia = Object.freeze({})

export function mediaIdentity(mediaType, id, season = 1, episode = 1) {
  if (mediaType === 'tv') return `tv:${id}:${season}:${episode}`
  return `movie:${id}`
}

export function getAuthorizedMedia(mediaType, id, season = 1, episode = 1) {
  return authorizedMedia[mediaIdentity(mediaType, id, season, episode)] || null
}
