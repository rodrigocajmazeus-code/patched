import { useEffect, useMemo, useState } from 'react'
import LiveTvPlayer from '../components/LiveTvPlayer.jsx'
import { fetchLiveCatalog, searchLiveChannels } from '../tv/catalog.js'

const PERU_FIRST = ['PE', 'ES', 'MX', 'CO', 'AR', 'CL', 'EC', 'VE']
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

function ChannelCard({ channel, selected, favorite, onSelect, onFavorite }) {
  return (
    <article className={'group relative min-w-0 overflow-hidden rounded-lg border bg-[#19221e] transition-colors ' + (selected ? 'border-[#91baa5]' : 'border-white/10 hover:border-white/30')}>
      <button type="button" onClick={() => onSelect(channel)} aria-pressed={selected}
        className="flex min-h-[140px] w-full flex-col items-start px-3 pb-3 pt-4 text-left">
        <span className="relative mb-3 flex h-12 w-20 items-center justify-center rounded-md bg-[#101614] text-2xl">
          {channel.flag}
          {channel.logo && <img src={channel.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full rounded-md object-contain p-1" onError={event => { event.currentTarget.style.display = 'none' }} />}
        </span>
        <strong className="line-clamp-2 text-sm leading-5 text-cream">{channel.name}</strong>
        <span className="mt-1 text-[11px] text-mist">{channel.flag} {channel.countryName}</span>
        <span className={'mt-2 text-[10px] font-semibold ' + (channel.source ? 'text-[#a9d7ae]' : 'text-[#aab0b1]')}>
          {channel.source ? 'Señal disponible para intentar' : 'Solo sitio oficial'}
        </span>
      </button>
      <button type="button" onClick={() => onFavorite(channel.id)} aria-label={(favorite ? 'Quitar de' : 'Añadir a') + ' favoritos: ' + channel.name}
        aria-pressed={favorite} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0c120f]/90 text-base text-cream hover:text-brand">
        {favorite ? '♥' : '♡'}
      </button>
    </article>
  )
}

export default function LiveTvPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('all')
  const [category, setCategory] = useState('all')
  const [playableOnly, setPlayableOnly] = useState(true)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState(savedFavorites)
  const [selectedId, setSelectedId] = useState(null)
  const [visibleCount, setVisibleCount] = useState(40)

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
    .filter(item => data.channels.some(c => c.country === item.code))
    .sort((a, b) => {
      const ai = PERU_FIRST.indexOf(a.code)
      const bi = PERU_FIRST.indexOf(b.code)
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.name.localeCompare(b.name)
    }), [data])

  const matching = useMemo(() => searchLiveChannels(data?.channels || [], {
    query, country, category, playableOnly, favoritesOnly, favorites,
  }), [data, query, country, category, playableOnly, favoritesOnly, favorites])

  const selected = useMemo(() => data?.channels.find(item => item.id === selectedId) || null, [data, selectedId])
  const candidates = data?.channels.filter(item => item.source).length || 0
  const toggleFavorite = id => setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id].slice(0, 400))
  const updateFilter = setter => value => { setter(value); setVisibleCount(40) }

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

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.65fr)]" aria-label="Reproductor de TV">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <LiveTvPlayer channel={selected} />
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-white/10 bg-[#18221e] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand">Señal seleccionada</p>
            <h2 className="text-2xl font-semibold text-cream">{selected?.name || 'Elige un canal'}</h2>
            <p className="text-xs leading-6 text-mist">{selected ? selected.flag + ' ' + selected.countryName : 'Busca por nombre, país o categoría. Los canales marcados con señal pueden probarse directamente en PATCHED.'}</p>
            {selected?.source && <p className="text-xs text-mist">Formato: {selected.source.type.toUpperCase()}{selected.source.quality ? ' · ' + selected.source.quality : ''}{selected.source.labels?.length ? ' · ' + selected.source.labels.join(', ') : ''}</p>}
            {selected?.website && <a href={selected.website} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit rounded-md border border-white/20 px-4 py-2.5 text-xs font-bold text-cream hover:bg-white/10">Abrir página oficial ↗</a>}
            {selected?.source && <p className="text-xs leading-5 text-mist">Si no carga, puede ser por CORS, región o caída de la fuente. No usamos proxies para sortear restricciones.</p>}
          </div>
        </section>

        <section className="mt-8" aria-label="Explorar canales">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Explorar canales</h2>
              <p className="mt-1 text-xs text-mist">{loading ? 'Consultando emisoras…' : data ? data.channels.length.toLocaleString('es-PE') + ' fichas en el directorio · ' + candidates.toLocaleString('es-PE') + ' con señal candidata' : 'Directorio pendiente'}</p>
            </div>
            <a href="https://github.com/iptv-org/iptv" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand hover:underline">Fuente del directorio ↗</a>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
            <label className="grid gap-1 text-xs text-mist">
              Buscar canal
              <input type="search" value={query} onChange={e => updateFilter(setQuery)(e.target.value)}
                placeholder="Nombre de canal o país…" className="w-full rounded-md border border-white/15 bg-[#1b2922] px-3 py-3 text-sm text-cream outline-none focus:border-brand" />
            </label>
            <label className="grid gap-1 text-xs text-mist">
              País
              <select value={country} onChange={e => updateFilter(setCountry)(e.target.value)}
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
            <label className="flex items-center gap-2"><input type="checkbox" checked={playableOnly} onChange={e => updateFilter(setPlayableOnly)(e.target.checked)} /> Solo señales con reproductor</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={favoritesOnly} onChange={e => updateFilter(setFavoritesOnly)(e.target.checked)} /> Mis favoritos ({favorites.length})</label>
            {!loading && data && <span className="text-mist">{matching.length.toLocaleString('es-PE')} resultados</span>}
          </div>

          {loading && <p role="status" className="mt-10 rounded-lg border border-white/10 bg-[#18221e] px-5 py-8 text-sm text-mist">Cargando canales, emisoras y señales…</p>}
          {!loading && error && <div role="alert" className="mt-8 rounded-lg border border-white/10 bg-[#18221e] p-5"><p className="text-sm text-mist">{error}</p><button type="button" onClick={() => setReload(x => x + 1)} className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-bold text-black">Volver a intentar</button></div>}
          {!loading && !error && matching.length === 0 && <p className="mt-8 rounded-lg border border-white/10 bg-[#18221e] p-5 text-sm text-mist">No hay resultados con esos filtros. Prueba otro país o desmarca «Solo señales con reproductor».</p>}
          {!loading && !error && matching.length > 0 && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {matching.slice(0, visibleCount).map(channel =>
                  <ChannelCard key={channel.id} channel={channel} selected={selectedId === channel.id}
                    favorite={favorites.includes(channel.id)} onSelect={setSelectedId} onFavorite={toggleFavorite} />
                )}
              </div>
              {matching.length > visibleCount && <div className="mt-7 flex justify-center"><button type="button" onClick={() => setVisibleCount(n => n + 40)} className="rounded-md border border-white/20 px-5 py-3 text-sm font-semibold hover:bg-white/10">Cargar más canales ({matching.length - visibleCount} restantes)</button></div>}
            </>
          )}
        </section>

        <p className="mt-12 border-t border-white/10 pt-5 text-xs leading-6 text-mist">Datos de <a className="text-brand hover:underline" href="https://github.com/iptv-org/api" target="_blank" rel="noopener noreferrer">IPTV-org</a>. Este módulo no aloja emisiones, no certifica su disponibilidad ni verifica los derechos de cada enlace. Las señales dependen de terceros; para el acceso autorizado y estable, utiliza el sitio oficial de cada canal. Los favoritos se guardan solo en este navegador.</p>
      </div>
    </div>
  )
}
