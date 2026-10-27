import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHistory } from '../context/HistoryContext.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { TrashIcon } from '../components/icons.jsx'
function watchPath(entry){return '/watch/'+entry.mediaType+'/'+entry.id+(entry.mediaType==='tv'&&entry.season?'?s='+entry.season+'&e='+(entry.episode??1):'')}
export default function HistoryPage(){
  const {items,remove,clear}=useHistory()
  const [confirmClear,setConfirmClear]=useState(false)
  return <div className="cinema-library-page mx-auto max-w-screen-2xl px-4 pb-16 pt-24 sm:px-6 lg:px-10"><p className="cinema-eyebrow">TU ESPACIO / RECIENTES</p><div className="cinema-library-heading"><div><h1>Historial</h1><p>{items.length} títulos en tu recorrido. Continúa desde el progreso guardado.</p></div>{items.length>0&&<button className="cinema-button cinema-button-secondary" onClick={()=>confirmClear?clear():setConfirmClear(true)} onBlur={()=>setConfirmClear(false)}><TrashIcon className="h-4 w-4" />{confirmClear?'Confirmar borrado':'Vaciar historial'}</button>}</div>{items.length===0?<div className="cinema-empty"><span aria-hidden="true">↺</span><h2>Tu historial todavía está vacío</h2><p>Los títulos que abras aparecerán aquí. Tu progreso se conserva en este navegador.</p><Link className="cinema-button cinema-button-primary" to="/">Explorar títulos</Link></div>:<div className="cinema-media-grid mt-8">{items.map(entry=><div key={entry.key} className="cinema-history-entry"><MovieCard media={entry} fill getPath={watchPath} progress={{current:entry.positionSeconds,total:entry.durationSeconds}} /><button type="button" className="cinema-history-remove" aria-label={'Quitar del historial: '+entry.title} onClick={()=>remove(entry.key)}><TrashIcon className="h-3 w-3" />Quitar del historial</button></div>)}</div>}</div>
}
