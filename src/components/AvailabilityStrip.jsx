import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AVAILABILITY_LABELS, findAvailability, readInventories, readReports, INVENTORY_PROVIDERS } from '../player/availabilityIndex.js'

const name = {moviemaster:'MovieMaster',facilitoplay:'FacilitoPlay',vidrift:'VidRift'}
const visual = {observed:'text-emerald-300', failed:'text-amber-300', 'listed-episode':'text-sky-200', 'listed-series':'text-sky-200', 'listed-title':'text-sky-200', unknown:'text-mist'}
function stored() {
  try { return { reports:readReports(window.localStorage), inventories:readInventories(window.localStorage) } }
  catch { return { reports:[], inventories:[] } }
}
export default function AvailabilityStrip({ mediaType, id, season, episode }) {
  const [state,setState] = useState(stored)
  useEffect(() => {
    const refresh = () => setState(stored())
    window.addEventListener('streambox:playback-report-saved', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('streambox:playback-report-saved', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return <section className="mx-auto w-full max-w-screen-2xl border-b border-white/10 px-4 py-3 sm:px-6 lg:px-10" aria-label="Información histórica de disponibilidad">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="font-bold text-cream">Datos previos:</span>
      {INVENTORY_PROVIDERS.map(providerId => {
        const { status } = findAvailability({ mediaType, id, season, episode, providerId }, state.reports, state.inventories)
        return <span key={providerId} className={visual[status]} title={AVAILABILITY_LABELS[status]}>{name[providerId]}: {AVAILABILITY_LABELS[status]}</span>
      })}
      <Link to="/inventario" className="font-bold text-white underline decoration-white/40 underline-offset-2 hover:text-brand">Ver inventarios</Link>
    </div>
    <p className="mt-1 text-[11px] text-mist">Histórico local, no verificación en tiempo real. La presencia en una lista no demuestra reproducción.</p>
  </section>
}
