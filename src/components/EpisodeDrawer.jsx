import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSeasonEpisodes } from '../api/dataService.js'
import { stillUrl } from '../api/tmdb.js'
import { useApiKey } from '../context/ApiKeyContext.jsx'
import { useData } from '../hooks/useData.js'
import { episodePage, filterEpisodes, EPISODE_PAGE_SIZE } from './episodePickerModel.js'

export default function EpisodeDrawer({ id, title, seasons, season, episode, onSelect, onClose }) {
  const dialog = useRef(null)
  const scroll = useRef(null)
  const { apiKey } = useApiKey()
  const [browseSeason, setBrowseSeason] = useState(season)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(null)
  const { data, loading, error, retry } = useData(() => getSeasonEpisodes(id, browseSeason), [id, browseSeason, apiKey])
  useEffect(() => {
    const previousFocus = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const node = dialog.current
    node.showModal()
    return () => { node.close(); document.body.style.overflow = overflow; if (previousFocus?.isConnected) previousFocus.focus() }
  }, [])
  const episodes = loading ? [] : data || []
  const filtered = filterEpisodes(episodes, query)
  const selectedIndex = filtered.findIndex(item => browseSeason === season && item.number === episode)
  const current = episodePage(filtered, page ?? Math.floor(Math.max(0, selectedIndex) / EPISODE_PAGE_SIZE))
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }) }, [browseSeason, query, current.index])
  return createPortal(<dialog ref={dialog} className="patched-episodes" aria-labelledby="episode-drawer-title" onKeyDown={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="patched-episodes-shell">
      <header><div><p className="cinema-eyebrow">EXPLORAR EPISODIOS</p><h2 id="episode-drawer-title">{title}</h2><p>Viendo T{season} · E{episode}</p></div><button className="cinema-icon-button" aria-label="Cerrar episodios" onClick={onClose}>×</button></header>
      <div className="patched-episode-tools"><label>Temporada<select aria-label="Seleccionar temporada" value={browseSeason} onChange={event => { setBrowseSeason(Number(event.target.value)); setPage(null); setQuery('') }}>{seasons.map(item => <option key={item.season_number} value={item.season_number}>Temporada {item.season_number}</option>)}</select></label><label>Buscar episodio<input type="search" placeholder="Título o número" value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} /></label></div>
      <div ref={scroll} className="patched-episode-scroll" aria-busy={loading}>
        {loading ? <p role="status" className="patched-portal-status"><span className="patched-portal" />Escaneando episodios…</p> : error ? <p role="alert">No encontramos la señal del catálogo. <button onClick={retry}>Reintentar</button></p> : <div className="patched-episode-grid">{current.items.map(item => {
          const selected = browseSeason === season && item.number === episode
          return <button key={item.id || item.number} aria-current={selected ? 'true' : undefined} className="patched-episode-card" aria-label={'Ver episodio ' + item.number + ': ' + item.title} onClick={() => { onSelect({ season: browseSeason, episode: item.number }); onClose() }}>
            <div className="patched-episode-image">{item.still ? <img src={stillUrl(item.still, 'w300')} alt="" loading="lazy" /> : <span>E{item.number}</span>}{selected && <b>Seleccionado</b>}</div>
            <div><p>Episodio {item.number}{item.runtime > 0 ? ' · ' + item.runtime + ' min' : ''}</p><h3>{item.title}</h3></div>
          </button>
        })}</div>}
        {!loading && !error && !filtered.length && <p>No hay episodios que coincidan en esta temporada.</p>}
      </div>
      <footer><span>{loading ? 'Localizando capítulos…' : error ? 'Catálogo no disponible' : filtered.length + (filtered.length === 1 ? ' episodio' : ' episodios')} · Temporada {browseSeason}</span>{current.pages > 1 && <label>Ver episodios<select aria-label="Rango de episodios" value={current.index} onChange={event => setPage(Number(event.target.value))}>{Array.from({length: current.pages}, (_, index) => { const slice = episodePage(filtered, index).items; return <option key={index} value={index}>{slice[0].number} – {slice.at(-1).number}</option> })}</select></label>}<button className="cinema-button" onClick={onClose}>Cerrar</button></footer>
    </div>
  </dialog>, document.body)
}
