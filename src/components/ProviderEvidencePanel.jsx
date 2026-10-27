import { useEffect, useMemo, useState } from 'react'
import { readInventories, readReports } from '../player/availabilityIndex.js'
import { recommendVideoProviders } from '../player/evidenceRecommender.js'
import { PRIMARY_PROVIDER_ORDER } from '../data/providers.js'

const SIGNALS = new Set(['language-observed', 'playback-observed', 'subtitles-unconfirmed'])
function readStoredEvidence() {
  try {
    return { reports: readReports(window.localStorage), inventories: readInventories(window.localStorage) }
  } catch { return { reports: [], inventories: [] } }
}

function labelFor(id) {
  return `Opción ${PRIMARY_PROVIDER_ORDER.indexOf(id) + 1}`
}

export default function ProviderEvidencePanel({ request, preference, selectedProviderId, candidates, onChoose, vidriftTelemetry }) {
  const [stored, setStored] = useState(readStoredEvidence)
  useEffect(() => {
    const refresh = () => setStored(readStoredEvidence())
    window.addEventListener('streambox:playback-report-saved', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('streambox:playback-report-saved', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  const available = useMemo(() => new Set((candidates || []).filter(c => c.available).map(c => c.providerId)), [candidates])
  const excluded = useMemo(() => PRIMARY_PROVIDER_ORDER.filter(id => !available.has(id)), [available])
  const evidence = useMemo(() => recommendVideoProviders({
    request, preference, reports: stored.reports, inventories: stored.inventories, excluded,
  }), [request, preference, stored, excluded])
  const suggested = evidence.candidates.find(c => SIGNALS.has(c.evidence))
  const canChoose = suggested && available.has(suggested.providerId) && suggested.providerId !== selectedProviderId
  const state = vidriftTelemetry?.state
  const progress = vidriftTelemetry?.progress

  return <section className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-cream/85" aria-label="Recomendación histórica de proveedor">
    <p className="mb-2 font-bold text-white">Señales comprobadas</p>
    {suggested ? (
      <p className="leading-5">{labelFor(suggested.providerId)}: {suggested.statusLabel.toLowerCase()}{suggested.stale ? ' (comprobación antigua)' : ''}. {canChoose ? 'Puedes elegirla manualmente.' : 'No cambiaremos tu fuente automáticamente.'}</p>
    ) : <p className="leading-5">Aún no hay reproducción comprobada para esta preferencia. Se conserva el orden de opciones establecido.</p>}
    {canChoose && <button type="button" onClick={() => onChoose(suggested.providerId)} className="mt-2 rounded-full border border-white/30 px-3 py-2 font-bold text-white hover:bg-white/10">Probar {labelFor(suggested.providerId)}</button>}
    <ul className="mt-3 space-y-1 text-mist">
      {PRIMARY_PROVIDER_ORDER.map(id => {
        const item = evidence.candidates.find(candidate => candidate.providerId === id)
        return <li key={id}><span className="font-semibold text-cream/90">{labelFor(id)}:</span> {item?.statusLabel || 'No disponible en esta selección'}{item?.stale ? ' (antiguo)' : ''}{id === selectedProviderId ? ' · elegida' : ''}</li>
      })}
    </ul>
    {selectedProviderId === 'vidrift' && <div className="mt-3 border-t border-white/10 pt-3">
      <p className="font-bold text-cream/90">Datos comunicados por Opción 3</p>
      {state ? <p className="mt-1 leading-5">Calidad indicada: {state.quality || 'sin dato'} · Audio anunciado: {state.audio || 'sin dato'} · Subtítulos anunciados: {state.subtitle || 'sin dato'}.</p> : <p className="mt-1">Sin datos de pistas recibidos del reproductor.</p>}
      {progress && <p className="mt-1">Progreso comunicado: {Math.floor(progress.currentTime)} s / {Math.floor(progress.duration)} s.</p>}
      {vidriftTelemetry?.episodeHint && <p className="mt-1">El reproductor indicó otro episodio. No se modificó la navegación ni se marcó como comprobado.</p>}
      {vidriftTelemetry?.error && <p className="mt-1">El reproductor indicó un error: {vidriftTelemetry.error}</p>}
      <p className="mt-1 text-mist">Estos datos son declarados por el reproductor, no verifican imagen, idioma escuchado, episodio correcto ni resolución real.</p>
    </div>}
    <p className="mt-3 text-mist">Registro local histórico, no una consulta de disponibilidad en tiempo real. Una lista importada no certifica que el video funcione.</p>
  </section>
}
