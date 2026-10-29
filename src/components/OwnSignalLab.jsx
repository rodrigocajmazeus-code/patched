import { useState } from 'react'
import LiveTvPlayer from './LiveTvPlayer.jsx'
import { authorizedStreamCandidate } from '../tv/ownSignal.js'

export default function OwnSignalLab() {
  const [draft, setDraft] = useState('')
  const [source, setSource] = useState(null)
  const [message, setMessage] = useState('')
  const test = () => {
    const candidate = authorizedStreamCandidate(draft)
    if (!candidate) {
      setMessage('Necesitas una URL HTTPS directa que termine en .m3u8 o .mp4.')
      return
    }
    setSource(candidate)
    setMessage('Señal cargada para prueba. Si no arranca, pulsa reproducir y revisa CORS o el formato.')
  }
  return (
    <details className="mt-8 rounded-xl border border-white/10 bg-[#16221c] p-5 sm:p-6">
      <summary className="text-base font-semibold text-cream">Laboratorio: probar mi propia señal autorizada</summary>
      <p className="mt-3 max-w-3xl text-xs leading-6 text-mist">
        Si tienes una señal HLS o MP4 con permiso de reproducción (por ejemplo, de un sintonizador
        de TV propia o un servidor multimedia), puedes probarla directamente aquí.
        PATCHED no extrae contenidos de plataformas ajenas ni elimina suscripciones, DRM o CORS.
        La dirección no se guarda en el navegador ni se envía a PATCHED.
      </p>
      <label className="mt-4 grid max-w-3xl gap-2 text-xs text-mist">
        URL de señal HTTPS
        <input type="url" value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="https://mi-servidor.example/live/index.m3u8"
          className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream focus:border-brand focus:outline-none" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={test}
          className="min-h-11 rounded-md bg-brand px-4 text-xs font-bold text-[#101614] hover:bg-brand-hover">
          Probar señal autorizada
        </button>
        {source && <button type="button" onClick={() => { setSource(null); setDraft(''); setMessage('Señal descartada de esta sesión.') }}
          className="min-h-11 rounded-md border border-white/20 px-4 text-xs font-semibold text-cream">
          Quitar señal
        </button>}
      </div>
      {message && <p role="status" className="mt-3 text-xs text-mist">{message}</p>}
      {source && <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-white/10">
        <LiveTvPlayer key={source.url} channel={{ id: 'usuario', name: 'Señal propia', source }}
          onSourcePlaying={() => setMessage('El navegador está reproduciendo esta señal.')}
          onSourceError={error => setMessage('Error de la señal: ' + error.type + '. Revisa la fuente y sus permisos de acceso.')} />
      </div>}
    </details>
  )
}
