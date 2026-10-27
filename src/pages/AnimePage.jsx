import TypePage from './TypePage.jsx'
import { ANIME_ROW_SOURCES, getAnimeList } from '../api/dataService.js'

// Sección especializada. Las fichas siguen siendo /watch/tv o /watch/movie.
export default function AnimePage() {
  return <TypePage catalogSection="anime" mediaType="tv" sources={ANIME_ROW_SOURCES} label="Anime" trendingFetch={() => getAnimeList('tv')} />
}
