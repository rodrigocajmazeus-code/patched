import { useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_TRANSLATIONS, SPANISH_FOCUS_COUNTRIES, fetchIptvCatalog, filterIptvCatalog,
} from '../data/iptvCatalog.js'

const PAGE_SIZE = 48
const STORAGE_KEY = 'patched:tv-favoritos:v1'

function initialFavorites() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.filter(x => typeof x === 'string').slice(0, 2000) : []
  } catch { return [] }
}

function formatCategory(value) {
  return CATEGORY_TRANSLATIONS[value] || value
}

function Card({ channel, favorite, onFavorite, onPlay }) {
  const source = channel.sources[0]
  return <article className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-white/10 bg-[#19221e] p-3 sm:p-4">
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#26392e] text-sm font-bold text-brand">
          {channel.logo
            ? <img src={channel.logo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" onError={e => { e.currentTarget.style.display = 'none' }} />
            : channel.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white" title={channel.name}>{channel.name}</h3>
          <p className="mt-1 truncate text-[11px] text-white/50">{channel.flag} {channel.countryName}</p>
        </div>
        <button
          type="button"
          aria-label={favorite ? 'Quitar de favoritos: ' + channel.name : 'Añadir a favoritos: ' + channel.name}
          aria-pressed={favorite}
          title={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={() => onFavorite(channel.id)}
          className={'shrink-0 rounded border px-2 py-1 text-lg ' +
            (favorite ? 'border-brand/50 text-brand' : 'border-white/10 text-white/45 hover:text-white')}
        >{favorite ? '★' : '☆'}</button>
      </div>
      <p className="mt-3 line-clamp-1 text-[11px] text-white/45">
        {channel.categoryNames.slice(0, 3).join(' · ') || 'Sin categoría'}
      </p>
      <p className="mt-2 text-[11px] text-white/55">
        {source
          ? 'HLS candidato' + (source.quality ? ' · ' + source.quality : '')
          : 'Sin fuente HLS compatible declarada'}
      </p>
    </div>
    <div className="flex flex-wrap gap-2">
      {source && <button
        type="button" onClick={() => onPlay(channel)}
        className="min-h-10 flex-1 rounded bg-brand px-3 py-2 text-xs font-semibold text-ink hover:bg-brand-hover"
      >Probar señal</button>}
      {channel.website && <a
        href={channel.website} target="_blank" rel="noopener noreferrer"
        className="flex min-h-10 flex-1 items-center justify-center rounded border border-white/20 px-3 py-2 text-center text-xs text-white/80 hover:border-white/50"
      >Sitio oficial ↗</a>}
    </div>
  </article>
}

export default function InternationalTvCatalog({ onPlayChannel }) {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [favorites, setFavorites] = useState(initialFavorites)
  const [scope, setScope] = useState('focus')
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('')
  const [onlyHls, setOnlyHls] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchIptvCatalog(controller.signal).then(data => {
      if (!controller.signal.aborted) { setCatalog(data); setLoading(false) }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setError('No se pudo cargar el directorio internacional. Revisa tu conexión y vuelve a intentarlo.')
        setLoading(false)
      }
    })
    return () => controller.abort()
  }, [retry])

  function toggleFavorite(id) {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const countries = useMemo(() => {
    const found = new Map()
    for (const item of catalog) if (item.country && !found.has(item.country)) found.set(item.country, {
      code: item.country, name: item.countryName, flag: item.flag,
    })
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [catalog])

  const categories = useMemo(() => {
    const found = new Set(catalog.flatMap(channel => channel.categories))
    return [...found].sort((a, b) => formatCategory(a).localeCompare(formatCategory(b), 'es'))
  }, [catalog])

  const languages = useMemo(() => {
    const found = new Map()
    for (const item of catalog) for (const lang of item.languages) {
      if (!found.has(lang.code)) found.set(lang.code, lang)
    }
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [catalog])

  const visible = useMemo(() => {
    const result = filterIptvCatalog(catalog, { scope, query, country, category, language, onlyHls, favorites })
    // Favoritos y búsquedas conservan orden alfabético; la selección inicial
    // pone al frente a Perú y España, después Latinoamérica.
    if (scope === 'focus' && !query.trim()) result.sort((a, b) => {
      const priority = c => c.country === 'PE' ? 0 : c.country === 'ES' ? 1
        : SPANISH_FOCUS_COUNTRIES.includes(c.country) ? 2 : 3
      return priority(a) - priority(b) || Number(b.hasHlsCandidate) - Number(a.hasHlsCandidate)
        || a.name.localeCompare(b.name, 'es')
    })
    return result
  }, [catalog, scope, query, country, category, language, onlyHls, favorites])

  const hlsCount = useMemo(() => catalog.filter(c => c.hasHlsCandidate).length, [catalog])
  const listed = visible.slice(0, page * PAGE_SIZE)

  function resetPage(update) { update(); setPage(1) }

  return <section aria-labelledby="tv-directory-heading" className="mt-12 border-t border-white/10 pt-9">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-brand">Directorio internacional</p>
        <h2 id="tv-directory-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Explorar canales</h2>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-white/55">
          Datos públicos de IPTV-org. Este directorio muestra canales catalogados, no señales verificadas.
          Solo se ofrecen pruebas para HLS HTTPS sin cabeceras personalizadas; que una fuente figure aquí
          no garantiza reproducción ni permisos de retransmisión.
        </p>
      </div>
      <a className="text-xs text-brand underline underline-offset-4" target="_blank" rel="noopener noreferrer"
        href="https://github.com/iptv-org/api">Origen de los datos ↗</a>
    </div>

    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/[.035] p-3">
        <strong className="block text-2xl font-semibold">{loading ? '…' : catalog.length.toLocaleString('es-PE')}</strong>
        <span className="text-[11px] text-white/50">Canales en el directorio</span>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[.035] p-3">
        <strong className="block text-2xl font-semibold">{loading ? '…' : hlsCount.toLocaleString('es-PE')}</strong>
        <span className="text-[11px] text-white/50">Con HLS candidato</span>
      </div>
      <div className="col-span-2 rounded-lg border border-white/10 bg-white/[.035] p-3 sm:col-span-1">
        <strong className="block text-2xl font-semibold">{favorites.length.toLocaleString('es-PE')}</strong>
        <span className="text-[11px] text-white/50">Favoritos en este celular</span>
      </div>
    </div>

    <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Región de canales">
      {[
        { value: 'focus', label: 'Perú · España · Latinoamérica' },
        { value: 'world', label: 'Todo el mundo' },
        { value: 'favorites', label: 'Mis favoritos' },
      ].map(item => <button key={item.value} type="button"
        aria-pressed={scope === item.value}
        onClick={() => resetPage(() => { setScope(item.value); setCountry('') })}
        className={'min-h-10 rounded border px-3 py-2 text-xs font-semibold ' +
          (scope === item.value ? 'border-brand bg-brand/15 text-brand' : 'border-white/15 text-white/70 hover:text-white')}
      >{item.label}</button>)}
    </div>

    <div className="mt-4 grid gap-3 rounded-lg border border-white/10 bg-[#16201b] p-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="sm:col-span-2 lg:col-span-4">
        <span className="mb-1 block text-[11px] text-white/65">Buscar canal</span>
        <input type="search" value={query} onChange={e => resetPage(() => setQuery(e.target.value))}
          placeholder="Nombre del canal, país o categoría" className="w-full border border-white/15 bg-[#0e1712] px-3 py-3 text-sm text-white" />
      </label>
      <label>
        <span className="mb-1 block text-[11px] text-white/65">País</span>
        <select value={country} onChange={e => resetPage(() => setCountry(e.target.value))}
          className="w-full border border-white/15 bg-[#0e1712] px-2 py-2 text-xs">
          <option value="">Todos los países</option>
          {countries.filter(c => scope !== 'focus' || SPANISH_FOCUS_COUNTRIES.includes(c.code)).map(c =>
            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-[11px] text-white/65">Categoría</span>
        <select value={category} onChange={e => resetPage(() => setCategory(e.target.value))}
          className="w-full border border-white/15 bg-[#0e1712] px-2 py-2 text-xs">
          <option value="">Todas</option>
          {categories.map(c => <option key={c} value={c}>{formatCategory(c)}</option>)}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-[11px] text-white/65">Idioma declarado</span>
        <select value={language} onChange={e => resetPage(() => setLanguage(e.target.value))}
          className="w-full border border-white/15 bg-[#0e1712] px-2 py-2 text-xs">
          <option value="">Todos</option>
          {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-2 pt-4 text-xs text-white/70">
        <input type="checkbox" checked={onlyHls} onChange={e => resetPage(() => setOnlyHls(e.target.checked))}
          className="h-4 w-4" />
        Solo candidatos HLS
      </label>
    </div>

    {loading && <div role="status" className="mt-7 rounded-lg border border-white/10 bg-white/[.035] p-6 text-sm text-white/65">
      Cargando el directorio internacional y combinando países, fuentes e idiomas…
    </div>}
    {!loading && error && <div role="alert" className="mt-7 rounded-lg border border-red-400/30 bg-red-500/10 p-6">
      <p className="text-sm text-red-200">{error}</p>
      <button type="button" className="mt-4 rounded border border-white/25 px-4 py-2 text-xs" onClick={() => setRetry(n => n + 1)}>
        Volver a intentar
      </button>
    </div>}

    {!loading && !error && <>
      <p role="status" className="mt-6 text-xs text-white/55">
        {visible.length.toLocaleString('es-PE')} canales coinciden con los filtros.
        {visible.length > 0 ? ' Mostrando ' + listed.length.toLocaleString('es-PE') + '.' : ''}
      </p>
      {visible.length === 0 && <p className="mt-5 rounded-lg border border-white/10 p-5 text-sm text-white/60">
        No hay canales con esos filtros. Prueba con otra región, idioma o categoría.
      </p>}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listed.map(c => <Card key={c.id} channel={c} favorite={favorites.includes(c.id)}
          onFavorite={toggleFavorite} onPlay={onPlayChannel} />)}
      </div>
      {listed.length < visible.length && <button type="button"
        className="mx-auto mt-7 block min-h-11 rounded border border-white/25 px-6 py-3 text-sm font-semibold hover:border-brand"
        onClick={() => setPage(n => n + 1)}>
        Mostrar más canales ({(visible.length - listed.length).toLocaleString('es-PE')} restantes)
      </button>}
    </>}
  </section>
}
