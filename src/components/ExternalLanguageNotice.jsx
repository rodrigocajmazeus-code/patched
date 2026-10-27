import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProviderObservation } from '../data/providerObservations.js'
import { useProvider } from '../context/ProviderContext.jsx'
import { getProvider } from '../data/providers.js'
import { providerExperience } from '../data/providerExperience.js'

const CHECK_STORAGE = 'streambox.lab.title-verification.v1'
function loadCheck(key) {
  try { return JSON.parse(localStorage.getItem(CHECK_STORAGE) || '{}')[key]?.value || '' } catch { return '' }
}
function saveCheck(key, value) {
  try {
    const records = JSON.parse(localStorage.getItem(CHECK_STORAGE) || '{}')
    records[key] = { value, at: new Date().toISOString() }
    localStorage.setItem(CHECK_STORAGE, JSON.stringify(records))
  } catch { /* localStorage puede estar bloqueado */ }
}

export default function ExternalLanguageNotice({ providerOptions, providerId, mediaType, id, season = 1, episode = 1, title, showFlag = true }) {
  const { restrictedFrames } = useProvider()
  const provider = getProvider(providerId)
  const experience = providerExperience.find(r => r.providerId === providerId)
  const variant = providerId === 'moviemaster' ? providerOptions.moviemaster.requestedVariant : providerId === 'vidcloud' ? 'sub' : null
  // Same local key used by the 1.1 content-check panel when present.
  const key = `${mediaType}:${id}:${mediaType === 'tv' ? `${season}:${episode}` : ''}:${providerId}${variant ? `:${variant}` : ''}`
  const [status, setStatus] = useState(() => loadCheck(key))
  useEffect(() => setStatus(loadCheck(key)), [key])
  const mark = (value) => { saveCheck(key, value); setStatus(value) }
  const observation = getProviderObservation(providerId, mediaType, id, season, episode, variant)

  return <details className="mx-auto mt-3 w-full max-w-screen-2xl px-4 sm:px-6 lg:px-10" aria-label="Idiomas y verificación">
    <summary className="cursor-pointer py-2 text-xs font-semibold text-mist hover:text-white">Información sobre idiomas y verificación del episodio</summary>
    <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/[.06] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-amber-100">{provider.experimental ? `${provider.name} · proveedor experimental` : 'Fuente externa: audio y subtítulos sin verificar'}</p>
          <p className="mt-1 text-xs leading-5 text-white/65">
            {`Fuente actual: ${providerId}.`} Los idiomas y subtítulos dependen del título y del proveedor. El catálogo identifica la obra, pero no confirma que el video sea correcto. Selecciona audio y subtítulos dentro del reproductor.
          </p>
          {variant && <p className="mt-2 text-xs text-amber-100">Variante solicitada: {variant}. No confirma idioma reproducido; puede existir una sustitución del proveedor.</p>}
          {experience && <p className="mt-2 text-xs text-amber-100">{experience.summary}</p>}
          <p className="mt-2 text-xs text-amber-100">{restrictedFrames ? 'Restricciones experimentales activas; compatibilidad de reproducción pendiente. No eliminan anuncios internos.' : 'Modo de compatibilidad sin sandbox: no se garantiza bloqueo de ventanas o redirecciones del proveedor.'}</p>
          {provider.experimental && <p className="mt-2 text-xs leading-5 text-amber-100">
            {observation ? `${observation.summary} ${observation.observer === 'user' ? 'Prueba manual del usuario' : 'Observación visual del agente; audio no verificado'}, ${observation.reportedOn}, en ${observation.environment}.` : 'Este título y episodio no tienen una prueba registrada: disponibilidad desconocida.'}
            {' '}Estos resultados son históricos: comprueba reproducción e identidad en esta sesión. Esta integración no envía órdenes de reanudación o sincronización.
          </p>}
        </div>
        {!provider.experimental && <Link to="/laboratorio-audio" className="shrink-0 self-start rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 sm:self-center">
          Probar selector multidioma
        </Link>}
      </div>
      {showFlag && <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
        <span className="text-xs text-white/80">¿Coincide con «{title || 'este título'}»?</span>
        <button type="button" onClick={() => mark('right')} aria-pressed={status === 'right'} className={`rounded-full border px-3 py-1.5 text-xs ${status === 'right' ? 'border-emerald-400 text-emerald-200' : 'border-white/20 text-white/75'}`}>Sí coincide</button>
        <button type="button" onClick={() => mark('wrong')} aria-pressed={status === 'wrong'} className={`rounded-full border px-3 py-1.5 text-xs ${status === 'wrong' ? 'border-amber-400 text-amber-100' : 'border-white/20 text-white/75'}`}>No coincide</button>
        {status === 'wrong' && <span role="status" className="text-xs text-amber-200">Fuente marcada como incorrecta en este navegador.</span>}
      </div>}
    </div>
  </details>
}
