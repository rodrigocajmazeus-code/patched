import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData.js'
import { getTrending, getRow, getRowSources, getRecommendationsForHistory } from '../api/dataService.js'
import { useApiKey } from '../context/ApiKeyContext.jsx'
import { useHistory } from '../context/HistoryContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'
import FeaturedCarousel from '../components/FeaturedCarousel.jsx'
import CategoryNavigation from '../components/CategoryNavigation.jsx'
import Row from '../components/Row.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { sortByPopularity } from '../data/media.js'
import { HistoryIcon } from '../components/icons.jsx'

export default function HomePage() {
  const { apiKey, hasApiKey } = useApiKey()
  const { items: historyItems } = useHistory()
  const { country } = usePreferences()
  const trending = useData(() => getTrending(null, country), [apiKey, country])
  const featured = useMemo(
    () => (trending.data && trending.data.length ? sortByPopularity(trending.data).slice(0, 6) : []),
    [trending.data]
  )

  return (
    <div className="cinema-home pb-10">
      {!hasApiKey && (
        <div className="mx-auto max-w-screen-2xl px-4 pt-24 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-surface px-4 py-3 text-sm">
            <span>Estás viendo una muestra del catálogo. Añade tu clave gratuita de TMDB para explorar más títulos.</span>
            <Link to="/settings" className="font-semibold text-brand hover:underline">Configurar catálogo →</Link>
          </div>
        </div>
      )}
      <FeaturedCarousel items={featured} />
      <CategoryNavigation />

      <div className="relative z-10 mt-4 space-y-10">
        {historyItems.length > 0 && (
          <ContinueWatchingRow items={historyItems} />
        )}

        {getRowSources(country).map((source) => (
          <Fragment key={source.label}>
            <HomeRow source={source} />
          </Fragment>
        ))}

        {historyItems.length > 0 && (
          <BecauseYouWatchedRow historyItems={historyItems} />
        )}
      </div>
    </div>
  )
}

function HomeRow({ source }) {
  const { apiKey } = useApiKey()
  const state = useData(() => getRow(source), [source.label, apiKey])
  return (
    <Row
      title={source.label}
      items={state.data}
      loading={state.loading}
      error={state.error}
      onRetry={state.retry}
    />
  )
}

function ContinueWatchingRow({ items }) {
  return (
    <section className="relative px-4 sm:px-6 lg:px-10">
      <div className="mb-3 flex items-center gap-2 pl-1">
        <HistoryIcon className="h-5 w-5 text-brand" />
        <h2 className="text-lg font-bold text-cream sm:text-xl">Seguir viendo</h2>
        <Link to="/history" className="ml-auto text-xs font-semibold text-mist transition hover:text-white">
          Ver todo
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth py-5">
        {items.slice(0, 12).map((entry) => (
          <HistoryCard key={entry.key} entry={entry} />
        ))}
      </div>
    </section>
  )
}

function HistoryCard({ entry }) {
  return (
    <div className="cinema-continue-card shrink-0">
      <MovieCard
        media={entry}
        getPath={watchPath}
        progress={{ current: entry.positionSeconds, total: entry.durationSeconds }}
      />
    </div>
  )
}

function watchPath(entry) {
  if (entry.mediaType === 'tv' && entry.season) {
    return `/watch/${entry.mediaType}/${entry.id}?s=${entry.season}&e=${entry.episode ?? 1}`
  }
  return `/watch/${entry.mediaType}/${entry.id}`
}

function BecauseYouWatchedRow({ historyItems }) {
  const { apiKey } = useApiKey()
  const recent = historyItems[0]
  const state = useData(
    () => getRecommendationsForHistory(historyItems),
    [recent?.key, apiKey]
  )
  if (!state.data?.length && !state.loading) return null
  return (
    <Row
      title={`Porque viste ${recent?.title || 'un título'}`}
      items={state.data}
      loading={state.loading}
      error={state.error}
      onRetry={state.retry}
    />
  )
}
