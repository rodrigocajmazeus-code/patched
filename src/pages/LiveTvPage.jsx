import { useMemo, useState } from 'react'
import { FEATURED_CHANNELS, FEATURED_TV_FILTERS, TV_ACCESS, filterFeaturedChannels } from '../tv/featuredChannels.js'
import OwnSignalLab from '../components/OwnSignalLab.jsx'

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem('patched.tv.editorial.favorites.v1') || '[]')
    return Array.isArray(saved) ? saved.filter(id => typeof id === 'string').slice(0, 80) : []
  } catch {
    return []
  }
}

const accessStyles = {
  web: 'border-emerald-200/25 text-[#b4d7be]',
  operator: 'border-white/20 text-mist',
  premium: 'border-amber-200/25 text-[#f1d7a5]',
}
const colorStyles = {
  peru: 'from-[#193b35] to-[#111e1c]',
  infantil: 'from-[#354039] to-[#1b2020]',
  deportes: 'from-[#314034] to-[#17231b]',
  peliculas: 'from-[#342f38] to-[#19191e]',
  gratis: 'from-[#1d3e3c] to-[#182322]',
}

function ChannelTile({ channel, chosen, starred, onSelect, onStar }) {
  return (
    <div className={'relative rounded-xl border bg-[#18221d] transition ' +
      (chosen ? 'border-brand' : 'border-white/10 hover:border-white/30')}>
      <button type="button" aria-pressed={chosen} onClick={() => onSelect(channel.id)}
        className="w-full overflow-hidden rounded-xl text-left">
        <div className={'flex h-24 items-end bg-gradient-to-br px-4 py-3 ' + (colorStyles[channel.category] || colorStyles.peru)}>
          <span className="max-w-[90%] text-xl font-extrabold tracking-tight text-cream sm:text-2xl">{channel.name}</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <span className={'w-fit rounded-full border px-2 py-1 text-[10px] font-semibold ' + accessStyles[channel.access]}>
            {TV_ACCESS[channel.access].title}
          </span>
          <span className="line-clamp-2 min-h-10 text-xs leading-5 text-mist">{channel.note}</span>
        </div>
      </button>
      <button type="button" aria-label={(starred ? 'Quitar de favoritos: ' : 'Agregar a favoritos: ') + channel.name}
        aria-pressed={starred} onClick={() => onStar(channel.id)}
        className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/50 px-2.5 py-1.5 text-lg text-white">
        {starred ? '♥' : '♡'}
      </button>
    </div>
  )
}

export default function LiveTvPage() {
  const [category, setCategory] = useState('destacados')
  const [query, setQuery] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState(readSaved)
  const [selectedId, setSelectedId] = useState('tvperu')
  const filtered = useMemo(() => filterFeaturedChannels(FEATURED_CHANNELS, { category, query, freeOnly })
    .filter(c => !favoritesOnly || favorites.includes(c.id)), [category, query, freeOnly, favoritesOnly, favorites])
  const selected = FEATURED_CHANNELS.find(c => c.id === selectedId) || FEATURED_CHANNELS[0]

  const toggleFavorite = id => {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id].slice(0, 80)
    setFavorites(next)
    try { localStorage.setItem('patched.tv.editorial.favorites.v1', JSON.stringify(next)) } catch { /* optional storage */ }
  }

  return (
    <div className="min-h-screen bg-ink px-4 pb-28 pt-28 text-cream sm:px-6 lg:px-10">
      <div className="mx-auto max-w-screen-2xl">
        <div className="border-b border-white/10 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-brand">PATCHED · Televisión seleccionada</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">TV en vivo</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mist">
            Solo los canales que importan. Accede a señales abiertas y portales gratuitos, o encuentra dónde ver
            Disney, ESPN y otros canales de cable desde Perú. Sin miles de fichas vacías ni reproductores falsos.
          </p>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]" aria-label="Canal seleccionado">
          <div className="flex min-h-[235px] flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-br from-[#263f34] via-[#15231d] to-[#0e1614] p-5 sm:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.17em] text-brand">Seleccionado</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{selected.name}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-cream/75">{selected.note}</p>
              {selected.number && <p className="mt-3 text-xs text-[#b4d7be]">Movistar TV: canal {selected.number} (según plan)</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.links.map(link => <a key={link.url + link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-md border border-brand/30 bg-brand px-4 py-2 text-xs font-bold text-[#101614] hover:bg-brand-hover">
                {link.label} ↗
              </a>)}
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-[#19241e] p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-brand">Cómo verlo</p>
            <h3 className="mt-3 text-xl font-semibold">{TV_ACCESS[selected.access].title}</h3>
            <p className="mt-2 text-sm leading-6 text-mist">{TV_ACCESS[selected.access].description}</p>
            <p className="mt-4 text-xs leading-5 text-mist">
              PATCHED abre la plataforma correspondiente en otra pestaña. Si el canal requiere una cuenta,
              la autenticación y la reproducción se gestionan en el sitio oficial.
            </p>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Canales principales</h2>
          <p className="text-xs text-mist">{FEATURED_CHANNELS.length} opciones seleccionadas, no miles de enlaces sin comprobar</p>
        </div>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar canales">
          {FEATURED_TV_FILTERS.map(item => <button type="button" key={item.id} onClick={() => setCategory(item.id)}
            aria-pressed={category === item.id}
            className={'shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold ' +
              (category === item.id ? 'border-brand bg-brand/15 text-cream' : 'border-white/15 text-mist hover:text-cream')}>
            {item.label}
          </button>)}
        </nav>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="grid min-w-[180px] flex-1 gap-2 text-xs text-mist">Buscar
            <input type="search" value={query} onChange={e => { setQuery(e.target.value); if (e.target.value.trim()) setCategory('todos') }}
              placeholder="Disney, ESPN, HBO, TVPerú…" className="min-h-11 rounded-md border border-white/15 bg-[#19251e] px-3 text-sm text-cream focus:border-brand focus:outline-none" />
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 text-xs text-cream/85">
            <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} /> Portales abiertos o gratuitos
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 text-xs text-cream/85">
            <input type="checkbox" checked={favoritesOnly} onChange={e => setFavoritesOnly(e.target.checked)} /> Favoritos ({favorites.length})
          </label>
        </div>
        <p className="mt-3 text-xs text-mist">{filtered.length} resultados. Los canales premium se muestran como accesos, no como transmisiones gratuitas.</p>

        {filtered.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map(channel => <ChannelTile key={channel.id} channel={channel}
              chosen={selected.id === channel.id} starred={favorites.includes(channel.id)}
              onSelect={setSelectedId} onStar={toggleFavorite} />)}
          </div>
        ) : <p className="mt-5 rounded-xl border border-white/10 bg-[#19241e] p-6 text-sm text-mist">
          No hay canales con esos filtros. Desmarca «Portales abiertos o gratuitos» o selecciona «Todos».
        </p>}

        <OwnSignalLab />

        <section className="mt-10 rounded-xl border border-white/10 bg-[#17201b] p-5">
          <h2 className="text-lg font-semibold">Por qué no se reproducen aquí ESPN y Disney</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-mist">
            La programación de pago se entrega mediante los sistemas de sus respectivos titulares y operadores.
            Es posible abrir sus aplicaciones oficiales desde PATCHED y usar una suscripción existente.
            No disponemos de una interfaz autorizada para insertar esas señales directamente en nuestro reproductor.
          </p>
          <p className="mt-3 text-xs leading-5 text-mist">
            Si buscas televisión gratuita similar, prueba Pluto TV, Plex o la televisión pública peruana.
            No ofrecen necesariamente los mismos contenidos de ESPN o Disney Channel.
          </p>
        </section>
      </div>
    </div>
  )
}
