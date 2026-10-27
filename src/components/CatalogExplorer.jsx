import { useEffect, useRef, useState } from 'react'
import { useApiKey } from '../context/ApiKeyContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { getCatalogPage } from '../api/dataService.js'
import { mergeCatalogItems } from '../api/catalogQuery.js'
import MediaGrid from './MediaGrid.jsx'

const SORT_OPTIONS = [
  { value: 'popular', label: 'Más populares' },
  { value: 'recent', label: 'Más recientes' },
  { value: 'rating', label: 'Mejor valorados' },
]
const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todas las épocas' },
  { value: '2020s', label: '2020–hoy' },
  { value: '2010s', label: '2010–2019' },
  { value: '2000s', label: '2000–2009' },
  { value: 'classic', label: 'Antes del 2000' },
]
const KIND_OPTIONS = [
  { value: 'all', label: 'Todo el anime' },
  { value: 'tv', label: 'Series de anime' },
  { value: 'movie', label: 'Películas de anime' },
]
const emptyState = (key) => ({ key, items: [], page: 0, hasMore: true, loading: true, error: null })

/** Catalogue metadata discovery; verified playback remains in /cobertura. */
export default function CatalogExplorer({ section }) {
  const { apiKey } = useApiKey()
  const { country } = usePreferences()
  const [sort, setSort] = useState('popular')
  const [period, setPeriod] = useState('all')
  const [kind, setKind] = useState('all')
  const [retryToken, setRetryToken] = useState(0)
  const queryKey = JSON.stringify([section, sort, period, kind, country, apiKey, retryToken])
  const [state, setState] = useState(() => emptyState(queryKey))
  const revisionRef = useRef(0)
  const loadingRef = useRef(false)

  useEffect(() => {
    const revision = ++revisionRef.current
    loadingRef.current = true
    setState(emptyState(queryKey))
    getCatalogPage({ section, sort, period, kind, country, page: 1 })
      .then(result => {
        if (revision !== revisionRef.current) return
        setState({ key: queryKey, items: result.items, page: 1, hasMore: result.hasMore, loading: false, error: null })
      })
      .catch(error => {
        if (revision !== revisionRef.current) return
        setState({ ...emptyState(queryKey), loading: false, error })
      })
      .finally(() => { if (revision === revisionRef.current) loadingRef.current = false })
    return () => { revisionRef.current++ }
  }, [queryKey, section, sort, period, kind, country])

  const loadMore = () => {
    if (loadingRef.current || state.key !== queryKey || !state.hasMore || state.page < 1) return
    loadingRef.current = true
    const revision = revisionRef.current
    const nextPage = state.page + 1
    setState(previous => ({ ...previous, loading: true, error: null }))
    getCatalogPage({ section, sort, period, kind, country, page: nextPage })
      .then(result => {
        if (revision !== revisionRef.current) return
        setState(previous => ({
          ...previous,
          items: mergeCatalogItems(previous.items, result.items),
          page: nextPage,
          hasMore: result.hasMore,
          loading: false,
          error: null,
        }))
      })
      .catch(error => {
        if (revision !== revisionRef.current) return
        setState(previous => ({ ...previous, loading: false, error }))
      })
      .finally(() => { if (revision === revisionRef.current) loadingRef.current = false })
  }
  const current = state.key === queryKey ? state : emptyState(queryKey)

  return (
    <section id="catalogo" className="cinema-explorer mx-auto max-w-screen-2xl scroll-mt-24 px-4 pb-14 pt-8 sm:px-6 lg:px-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">Explorar</p>
          <h2 className="text-2xl font-black text-white sm:text-3xl">Explora el catálogo</h2>
          <p className="mt-1 max-w-2xl text-xs text-mist">Fichas de TMDB; que un título aparezca no garantiza que el video esté disponible en los proveedores.</p>
        </div>
        <span className="text-xs text-mist">{current.items.length} títulos cargados</span>
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        {section === 'anime' && <Selector label="Formato" value={kind} onChange={setKind} options={KIND_OPTIONS} />}
        <Selector label="Ordenar" value={sort} onChange={setSort} options={SORT_OPTIONS} />
        <Selector label="Época" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
      </div>
      {current.items.length === 0 ? (
        <MediaGrid items={current.items} loading={current.loading} error={current.error} onRetry={() => setRetryToken(n => n + 1)} emptyText="No encontramos títulos para estos filtros." />
      ) : <MediaGrid items={current.items} />}
      {current.items.length > 0 && current.error && (
        <p role="alert" className="mt-4 text-center text-sm text-red-300">No se cargó la siguiente página. Puedes reintentarlo.</p>
      )}
      {current.page > 0 && current.hasMore && (
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={loadMore} disabled={current.loading}
            className="rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/20 disabled:cursor-wait disabled:opacity-50">
            {current.loading ? 'Cargando títulos…' : current.error ? 'Reintentar página' : 'Cargar más títulos'}
          </button>
        </div>
      )}
      {current.items.length > 0 && !current.hasMore && <p className="mt-8 text-center text-sm text-mist">Llegaste al final de estos resultados.</p>}
    </section>
  )
}

function Selector({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-mist">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-white/20 bg-surface p-2.5 text-xs text-white">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}
