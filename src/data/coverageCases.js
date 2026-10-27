// Pruebas iniciales para medir la cobertura: son casos a verificar, NO títulos disponibles.
// TMDB identifica la ficha; ningún identificador implica que el video o idioma exista.
export const COVERAGE_CATEGORIES = Object.freeze([
  { id: 'anime', label: 'Anime' },
  { id: 'series', label: 'Series' },
  { id: 'movies', label: 'Películas' },
])

const cases = [
  // Anime incluye series y largometrajes japoneses.
  ['anime', 'Attack on Titan', 'tv', 1429, 1, 1],
  ['anime', 'Attack on Titan', 'tv', 1429, 1, 2],
  ['anime', 'Kimetsu no Yaiba', 'tv', 85937, 1, 1],
  ['anime', 'Kimetsu no Yaiba', 'tv', 85937, 1, 2],
  ['anime', 'One Piece', 'tv', 37854, 1, 1],
  ['anime', 'One Piece', 'tv', 37854, 1, 2],
  ['anime', 'El viaje de Chihiro', 'movie', 129, null, null],
  // Series no anime, incluidos capítulos contiguos para detectar errores de identidad.
  ['series', 'Breaking Bad', 'tv', 1396, 1, 1],
  ['series', 'Breaking Bad', 'tv', 1396, 1, 2],
  ['series', 'Breaking Bad', 'tv', 1396, 2, 1],
  ['series', 'Stranger Things', 'tv', 66732, 1, 1],
  ['series', 'Stranger Things', 'tv', 66732, 1, 2],
  // Películas: formatos, géneros y años diferentes.
  ['movies', 'Inception', 'movie', 27205, null, null],
  ['movies', 'Interstellar', 'movie', 157336, null, null],
  ['movies', 'The Dark Knight', 'movie', 155, null, null],
  ['movies', 'The Avengers', 'movie', 24428, null, null],
  ['movies', 'Spider-Man: Into the Spider-Verse', 'movie', 497698, null, null],
  ['movies', 'Turning Red', 'movie', 670559, null, null],
]

export const COVERAGE_CASES = Object.freeze(cases.map(([category, title, mediaType, id, season, episode]) => Object.freeze({
  key: `${mediaType}:${id}:${season || '-'}:${episode || '-'}`,
  category, title, mediaType, id, season, episode,
})))

export function coverageWatchPath(item) {
  const path = `/watch/${item.mediaType}/${item.id}`
  if (item.mediaType === 'movie') return `${path}?play=1`
  return `${path}?s=${item.season}&e=${item.episode}&play=1`
}
