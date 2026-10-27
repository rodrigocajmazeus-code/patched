import { useEffect, useRef, useState } from 'react'

/* Esta vista distingue carga del iframe y avance audiovisual reportado por el proveedor.
   Nunca marca una película como disponible sólo por HTTP 200 / iframe.onload. */

export default function PlayerAuditPanel({frameLoaded, bridge, onChooseAnother}) {
  const [seconds,setSeconds]=useState(0)
  const [progress,setProgress]=useState(false)
  const start=useRef(Date.now())
  const previous=useRef(null)

  useEffect(()=>{
    const interval=setInterval(()=>{
      setSeconds(Math.floor((Date.now()-start.current)/1000))
      const observed=bridge.getState?.()
      const now=Number(observed?.time)
      if(observed?.updatedAt && Number.isFinite(now) && now>=1) {
        if(previous.current!==null && now-previous.current > 0.8) setProgress(true)
        previous.current=now
      }
    },1200)
    return ()=>clearInterval(interval)
  },[bridge])

  let status='Conectando al proveedor…'
  if(frameLoaded) status='La página del reproductor cargó; el video aún no está verificado.'
  if(progress) status='Se detectó avance del video informado por el proveedor.'
  if(!progress && seconds>=12) status='No se ha confirmado reproducción tras '+seconds+' s. Puedes cambiar de fuente.'
  const providerEvent = bridge.providerStatus?.event
  if(providerEvent === 'ready') status='El proveedor anuncia servidores; reproducción todavía sin confirmar.'
  if(providerEvent === 'play') status='El proveedor informa play; confirma imagen, sonido, idioma y contenido manualmente.'
  if(providerEvent === 'error') status='El proveedor informa un error de reproducción. '+(bridge.providerStatus.reason || '')
  if(providerEvent === 'unavailable') status='El proveedor informa contenido no disponible. '+(bridge.providerStatus.reason || '')
  if(providerEvent === 'content-mismatch') status='La identidad informada por el proveedor no coincide o está incompleta. Contenido sin verificar.'

  return (
    <div className="cue-player-audit" role="status" aria-live="polite">
      <div className="cue-audit-left">
        <strong>Estado de reproducción</strong>
        <span className={'cue-status-line'+(progress?' cue-status-positive':'')}>{status}</span>
        <small>{seconds} s desde la apertura · La disponibilidad, el idioma y los subtítulos dependen de la fuente.</small>
      </div>
      <div className="cue-audit-actions">
        <button type="button" onClick={onChooseAnother}>↻ Elegir otra fuente</button>
      </div>
    </div>
  )
}
