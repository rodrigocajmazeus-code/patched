import { useState } from 'react'
import { Link } from 'react-router-dom'
import { posterUrl, POSTER_PLACEHOLDER } from '../api/tmdb.js'
import { useMyList } from '../context/MyListContext.jsx'
import { useRatings } from '../context/RatingsContext.jsx'
import { PlusIcon, CheckIcon } from './icons.jsx'
export default function MovieCard({media,size='md',fill=false,getPath,progress=null}) {
  const {has,toggle}=useMyList()
  const {get:getRating}=useRatings()
  const [failed,setFailed]=useState(false)
  const saved=has(media.key)
  const path=getPath?getPath(media):'/watch/'+media.mediaType+'/'+media.id
  const rating=getRating(media.key)
  const percentage=progress?.total>0?Math.max(0,Math.min(100,(progress.current/progress.total)*100)):0
  return <article className={'cinema-card'+(fill?' cinema-card-fill':'')+(size==='lg'?' cinema-card-large':'')}>
    <div className="cinema-card-art"><Link to={path} className="cinema-card-link" aria-label={'Ver detalles de '+media.title}><img src={failed?POSTER_PLACEHOLDER:posterUrl(media.poster,size==='lg'?'w500':'w342')} alt={media.title} loading="lazy" decoding="async" onError={()=>setFailed(true)} /><span className="cinema-card-open" aria-hidden="true">Ver detalles ↗</span></Link><button className="cinema-card-save" aria-label={(saved?'Quitar de mi lista: ':'Añadir a mi lista: ')+media.title} aria-pressed={saved} onClick={()=>toggle(media)}>{saved?<CheckIcon className="h-4 w-4" />:<PlusIcon className="h-4 w-4" />}</button>{percentage>0&&<div className="cinema-card-progress" role="progressbar" aria-label="Progreso de reproducción" aria-valuenow={Math.round(percentage)} aria-valuemin={0} aria-valuemax={100}><span style={{width:percentage+'%'}} /></div>}</div>
    <div className="cinema-card-info"><p><span>{media.mediaType==='tv'?'SERIE':'PELÍCULA'}</span>{media.rating>0&&<span className="cinema-card-rating">★ {media.rating.toFixed(1)}</span>}</p><h3><Link to={path}>{media.title}</Link></h3><p><span>{media.year||'Sin fecha'}</span>{rating>0&&<span>Tu nota: {rating}/10</span>}{progress?.total>progress?.current&&<span>{Math.ceil((progress.total-progress.current)/60)} min restantes</span>}</p></div>
  </article>
}
