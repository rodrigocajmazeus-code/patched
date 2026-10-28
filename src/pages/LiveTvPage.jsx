import { useEffect, useMemo, useRef, useState } from 'react'
import LiveTvPlayer from '../components/LiveTvPlayer.jsx'
import VirtualChannelGrid from '../components/VirtualChannelGrid.jsx'
import PeruCableGuide from '../components/PeruCableGuide.jsx'
import { fetchLiveCatalog, searchLiveChannels } from '../tv/catalog.js'

const PERU_FIRST = ['PE', 'ES', 'MX', 'CO', 'AR', 'CL', 'EC', 'VE']
const LATAM = new Set(['PE', 'MX', 'CO', 'AR', 'CL', 'EC', 'VE', 'BO', 'UY', 'PY', 'BR', 'CR', 'PA', 'GT', 'HN', 'SV', 'NI', 'DO', 'CU', 'HT', 'PR'])
const CATEGORY_NAMES = {
  general: 'General', news: 'Noticias', sports: 'Deportes', movies: 'Películas',
  entertainment: 'Entretenimiento', music: 'Música', documentary: 'Documentales',
  kids: 'Infantil', education: 'Educación', animation: 'Animación', culture: 'Cultura',
  lifestyle: 'Estilo de vida', religious: 'Religión', cooking: 'Cocina', travel: 'Viajes',
  business: 'Negocios', outdoor: 'Aire libre', science: 'Ciencia',
}

function savedFavorites() {
  try {
    const value = JSON.parse(window.localStorage.getItem('patched.live-tv.favorites.v1') || '[]')
    return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, 400) : []
  } catch {
    return []
  }
}

export default function LiveTvPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('all')
  const [category, setCategory] = useState('all')
  const [playableOnly, setPlayableOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [region, setRegion] = useState('world')
  const [sourceIndex, setSourceIndex] = useState(0)
  const [favorites, setFavorites] = useState(savedFavorites)
  const [selectedId, setSelectedId] = useState(null)
  const [returnScroll, setReturnScroll] = useState(null)
  const playerAreaRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchLiveCatalog().then(result => {
      if (active) {
        setData(result)
        setLoading(false)
      }
    }).catch(() => {
      if (active) {
        setError('No se pudo cargar el directorio internacional. Comprueba tu conexión y vuelve a intentarlo.')
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    try { window.localStorage.setItem('patched.live-tv.favorites.v1', JSON.stringify(favorites)) } catch { /* storage disabled */ }
  }, [favorites])

  const options = useMemo(() => (data?.countries || [])
    .filter(item => new Set(data.channels.map(c => c.country)).has(item.code))
    .sort((a, b) => {
      const ai = PERU_FIRST.indexOf(a.code)
      const bi = PERU_FIRST.indexOf(b.code)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.name.localeCompare(b.name)
    }), [data])

  const matching = useMemo(() => {
    const matches = searchLiveChannels(data?.channels || [], {
      query, country, category, playableOnly, favoritesOnly, favorites,
    })
    return region === 'latam' ? matches.filter(channel => LATAM.has(channel.country)) : matches
  }, [data, query, country, category, playableOnly, favoritesOnly, favorites, region])

  const selected = useMemo(() => data?.channels.find(item => item.id === selectedId) || null, [data, selectedId])
  const playbackChannel = useMemo(() => selected ? {
    ...selected,
    source: selected.sources?.[sourceIndex] || selected.source,
  } : null, [selected, sourceIndex])
  const candidates = data?.totals?.candidates || 0
  const toggleFavorite = id => setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id].slice(0, 400))
  const updateFilter = setter => value => setter(value)
  const selectChannel = item => {
    setReturnScroll(window.scrollY)
    setSelectedId(item.id)
    setSourceIndex(0)
    playerAreaRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
  const pickRegion = (value, selectedCountry = 'all') => {
    setRegion(value)
    setCountry(selectedCountry)
  }

  return (
    <div className="min-h-screen bg-ink px-4 pb-28 pt-28 text-cream sm:px-6 lg:px-10">
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-brand">PATCHED · Señales del mundo</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">TV en vivo</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">Un directorio internacional para encontrar y probar canales abiertos. El catálogo no equivale a una lista de señales verificadas: algunas pueden fallar, estar restringidas por país o no permitir reproducción externa.</p>
          </div>
          <div className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-[#a9d7ae]">● LABORATORIO</div>
        </div>

        <section ref={playerAreaRef} className="mt-6 grid scroll-mt-24 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.65fr)]" aria-label="Reproductor de TV">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <LiveTvPlayer channel={playbackChannel} />
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-white/10 bg-[#18221e] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand">Señal seleccionada</p>
            <h2 className="text-2xl font-semibold text-cream">{selected?.name || 'Elige un canal'}</h2>
            <p className="text-xs leading-6 text-mist">{selected ? selected.flag + ' ' + selected.countryName : 'Busca por nombre, país o categoría. Los canales marcados con señal pueden probarse directamente en PATCHED.'}</p>
            {playbackChannel?.source && <p className="text-xs text-mist">Formato: {playbackChannel.source.type.toUpperCase()}{playbackChannel.source.quality ? ' · ' + playbackChannel.source.quality : ''}{playbackChannel.source.labels?.length ? ' · ' + playbackChannel.source.labels.join(', ') : ''}</p>}
            {selected?.sources?.length > 1 && <label className="grid gap-1 text-xs text-mist">
              Elegir señal alternativa ({selected.sources.length} registradas)
              <select value={sourceIndex} onChange={e => setSourceIndex(Number(e.target.value))}
                className="w-full rounded-md border border-white/15 bg-[#0f1914] px-3 py-2.5 text-sm text-cream">
                {selected.sources.map((source, index) => <option key={source.url} value={index}>Señal {index + 1}{source.quality ? ' · ' + source.quality : ''}{source.labels?.length ? ' · ' + source.labels.join(', ') : ''}</option>)}
              </select>
            </label>}
            {selected?.website && <a href={selected.website} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit rounded-md border border-white/20 px-4 py-2.5 text-xs font-bold text-cream hover:bg-white/10">Abrir página oficial ↗</a>}
            {playbackChannel?.source && <p className="text-xs leading-5 text-mist">Si no carga, prueba otra señal registrada del canal. También puede fallar por CORS, región o caída de la fuente; no usamos proxies para sortear restricciones.</p>}
            {returnScroll !== null && <button type="button" onClick={() => window.scrollTo({ top: returnScroll, behavior: 'auto' })}
              className="w-fit rounded-md border border-white/20 px-4 py-2.5 text-xs font-bold text-cream hover:bg-white/10">← Volver donde estaba en el catálogo</button>}
          </div>
        </section>

        <PeruCableGuide />

        <section className="mt-8" aria-label="Explorar canales">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Explorar canales</h2>
              <p className="mt-1 text-xs text-mist">{loading ? 'Consultando emisoras…' : data ? data.channels.length.toLocaleString('es-PE') + ' canales listados · ' + candidates.toLocaleString('es-PE') + ' con señal candidata (sin verificar)' : 'Directorio pendiente'}</p>
            </div>
            <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand hover:underline">Fuente del directorio ↗</a>
          </div>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Regiones">
            {[
              { id: 'world', country: 'all', label: '🌍 Todo el mundo' },
              { id: 'world', country: 'PE', label: '🇵🇪 Perú' },
              { id: 'latam', country: 'all', label: '🌎 Latinoamérica' },
              { id: 'world', country: 'ES', label: '🇪🇸 España' },
            ].map(item => <button key={item.label} type="button"
              aria-pressed={region === item.id && country === item.country}
              onClick={() => pickRegion(item.id, item.country)}
              className={'rounded-full border px-3 py-2 text-xs font-semibold transition ' + (region === item.id && country === item.country ? 'border-brand bg-brand/15 text-cream' : 'border-white/15 text-mist hover:border-white/35 hover:text-cream')}>
              {item.label}
            </button>)}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
            <label className="grid gap-1 text-xs text-mist">
              Buscar canal
              <input type="search" value={query} onChange={e => updateFilter(setQuery)(e.target.value)}
                placeholder="Nombre de canal o país…" className="w-full rounded-md border border-white/15 bg-[#1b2922] px-3 py-3 text-sm text-cream outline-none focus:border-brand" />
            </label>
            <label className="grid gap-1 text-xs text-mist">
              País
              <select value={country} onChange={e => { setRegion('world'); updateFilter(setCountry)(e.target.value) }}
                className="w-full rounded-md border border-white/15 bg-[#1b2922] px-3 py-3 text-sm text-cream">
                <option value="all">Todos los países</option>
                {options.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-mist">
              Categoría
              <select value={category} onChange={e => updateFilter(setCategory)(e.target.value)}
                className="w-full rounded-md border border-white/15 bg-[#1b2922] px-3 py-3 text-sm text-cream">
                <option value="all">Todas las categorías</option>
                {data?.categories.map(c => <option key={c.id} value={c.id}>{CATEGORY_NAMES[c.id] || c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-cream/85">
            <label className="flex items-center gap-2"><input type="checkbox" checked={playableOnly} onChange={e => updateFilter(setPlayableOnly)(e.target.checked)} /> Solo señales para intentar reproducir</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={favoritesOnly} onChange={e => updateFilter(setFavoritesOnly)(e.target.checked)} /> Mis favoritos ({favorites.length})</label>
            {!loading && data && <span className="font-semibold text-brand">{matching.length.toLocaleString('es-PE')} canales disponibles para explorar · sin paginación</span>}
          </div>

          {loading && <p role="status" className="mt-10 rounded-lg border border-white/10 bg-[#18221e] px-5 py-8 text-sm text-mist">Cargando canales, emisoras y señales…</p>}
          {!loading && error && <div role="alert" className="mt-8 rounded-lg border border-white/10 bg-[#18221e] p-5"><p className="text-sm text-mist">{error}</p><button type="button" onClick={() => setReload(x => x + 1)} className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-bold text-black">Volver a intentar</button></div>}
          {!loading && !error && matching.length === 0 && <p className="mt-8 rounded-lg border border-white/10 bg-[#18221e] p-5 text-sm text-mist">No hay resultados con esos filtros. Prueba otra región o desmarca «Solo señales para intentar reproducir».</p>}
          {!loading && !error && matching.length > 0 && (
            <>
              <p className="mt-4 text-xs leading-5 text-mist">Toda la lista está disponible desde ahora: desliza para recorrerla sin pulsar «Cargar más». Para cuidar tu celular, PATCHED dibuja únicamente las tarjetas cercanas a tu pantalla.</p>
              <VirtualChannelGrid channels={matching} selectedId={selectedId} favorites={favorites}
                onSelect={selectChannel} onFavorite={toggleFavorite} />
            </>
          )}
        </section>

        <p className="mt-12 border-t border-white/10 pt-5 text-xs leading-6 text-mist">Datos de <a className="text-brand hover:underline" href="https://github.com/iptv-org/api" target="_blank" rel="noopener noreferrer">IPTV-org</a>. Este módulo no aloja emisiones, no certifica su disponibilidad ni verifica los derechos de cada enlace. Las señales dependen de terceros; para el acceso autorizado y estable, utiliza el sitio oficial de cada canal. Los favoritos se guardan solo en este navegador.</p>
      </div>
    </div>
  )
}
