import { useMemo } from 'react'
import { useData } from '../hooks/useData.js'
import { getTrending, getRow } from '../api/dataService.js'
import { useApiKey } from '../context/ApiKeyContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'
import FeaturedCarousel from '../components/FeaturedCarousel.jsx'
import CategoryNavigation from '../components/CategoryNavigation.jsx'
import Row from '../components/Row.jsx'
import CatalogExplorer from '../components/CatalogExplorer.jsx'
import { sortByPopularity } from '../data/media.js'

export default function TypePage({ mediaType, sources, label, trendingFetch = null, excludeAnime = false, catalogSection = null }) {
  const { apiKey } = useApiKey()
  const { country } = usePreferences()
  const trending = useData(() => (trendingFetch ? trendingFetch() : getTrending(mediaType, country)), [mediaType, apiKey, country])
  const featured = useMemo(
    () => (trending.data && trending.data.length ? sortByPopularity(excludeAnime ? trending.data.filter(m => !m.isAnime) : trending.data).slice(0, 6) : []),
    [trending.data, excludeAnime]
  )

  return (
    <div className="cinema-category-page pb-10">
      <FeaturedCarousel items={featured} label={label} />
      <CategoryNavigation />
      {catalogSection && <div className="relative z-10 flex justify-center py-5"><a href="#catalogo" className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-cream transition hover:bg-white/10">Explorar catálogo y filtros ↓</a></div>}
      <div className="relative z-10 mt-4 space-y-10">
        {sources.map((source) => (
          <TypeRow key={source.label} source={source} excludeAnime={excludeAnime} />
        ))}
        {catalogSection && <CatalogExplorer section={catalogSection} />}
      </div>
    </div>
  )
}

function TypeRow({ source, excludeAnime = false }) {
  const { apiKey } = useApiKey()
  const state = useData(
    () => (source.fetch ? source.fetch() : getRow(source)),
    [source.label, apiKey]
  )
  return (
    <Row
      title={source.label}
      items={excludeAnime && Array.isArray(state.data) ? state.data.filter(item => !item.isAnime) : state.data}
      loading={state.loading}
      error={state.error}
      onRetry={state.retry}
    />
  )
}
