import { useState } from 'react'
import { Link } from 'react-router-dom'
import { backdropUrl, posterUrl } from '../api/tmdb.js'
import { useMyList } from '../context/MyListContext.jsx'
import { PlayIcon, PlusIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'

export default function FeaturedCarousel({items,label}) {
  const featured=(items||[]).filter(Boolean).slice(0,6)
  const [index,setIndex]=useState(0)
  const {has,toggle}=useMyList()
  if(!featured.length) return <section className="cinema-feature cinema-feature-loading" aria-label="Contenido destacado"><div className="cinema-feature-copy"><p className="cinema-eyebrow">PATCHED / SELECCIÓN</p><h1>Explora el catálogo</h1><p>Explora películas, series y anime.</p><Link to="/search" className="cinema-button cinema-button-primary">Explorar títulos</Link></div></section>
  const active=index%featured.length
  const media=featured[active]
  const path='/watch/'+media.mediaType+'/'+media.id
  const saved=has(media.key)
  return <section className="cinema-feature" aria-label="Contenido destacado">
    <div className="cinema-feature-art"><img key={media.key} src={backdropUrl(media.backdrop,'w1280')||posterUrl(media.poster,'w500')} alt="" fetchPriority="high" decoding="async" /></div>
    <div className="cinema-feature-shade" />
    <div className="cinema-feature-copy">
      <p className="cinema-eyebrow"><span />{({'Featured Film':'CINE DESTACADO','Featured Series':'SERIES DESTACADAS'})[label]||label||'EN PRIMER PLANO'} <b>/</b> {String(active+1).padStart(2,'0')}</p>
      <h1>{media.title}</h1>
      <div className="cinema-meta"><span>{media.mediaType==='tv'?'SERIE':'PELÍCULA'}</span><span>{media.year||'Sin fecha'}</span>{media.rating>0&&<span className="cinema-rating">★ {media.rating.toFixed(1)} <small>TMDB</small></span>}</div>
      <p className="cinema-feature-description">{media.overview ? (media.overview.length>220?media.overview.slice(0,220).trimEnd()+'…':media.overview) : 'Descubre la historia, sus protagonistas y los episodios disponibles en su ficha.'}</p>
      <div className="cinema-feature-actions"><Link to={path+'?play=1'} className="cinema-button cinema-button-primary"><PlayIcon className="h-4 w-4" />Ver ahora</Link><Link to={path} className="cinema-button cinema-button-secondary">Más información <span aria-hidden="true">↗</span></Link><button className="cinema-icon-button cinema-save" aria-label={saved?'Quitar de mi lista':'Añadir a mi lista'} aria-pressed={saved} onClick={()=>toggle(media)}>{saved?<CheckIcon className="h-5 w-5" />:<PlusIcon className="h-5 w-5" />}</button></div>
    </div>
    <div className="cinema-feature-bottom"><p>PELÍCULAS / SERIES / ANIME<br /><strong>SELECCIÓN DESTACADA</strong></p><div className="cinema-feature-picks">{featured.slice(0,3).map((m,i)=><button key={m.key} onClick={()=>setIndex(i)} aria-label={'Destacar '+m.title} aria-pressed={active===i}><img src={posterUrl(m.poster,'w185')} alt="" loading="lazy" /><span><small>0{i+1} / {m.mediaType==='tv'?'SERIE':'PELÍCULA'}</small><b>{m.title}</b></span></button>)}</div><div className="cinema-feature-controls"><span>{String(active+1).padStart(2,'0')} <small>/ {String(featured.length).padStart(2,'0')}</small></span><button className="cinema-icon-button" onClick={()=>setIndex((active+featured.length-1)%featured.length)} aria-label="Anterior destacado"><ChevronLeftIcon className="h-5 w-5" /></button><button className="cinema-icon-button" onClick={()=>setIndex((active+1)%featured.length)} aria-label="Siguiente destacado"><ChevronRightIcon className="h-5 w-5" /></button></div></div>
  </section>
}
