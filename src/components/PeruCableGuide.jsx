import { PERU_KIDS_CABLE, PERU_CABLE_GUIDE_URL, PERU_CABLE_SOURCE_URL } from '../tv/peruCable.js'

export default function PeruCableGuide() {
  return (
    <section className="mt-8 rounded-xl border border-white/10 bg-[#17211c] p-4 sm:p-6" aria-label="Canales infantiles de cable en Perú">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-brand">Guía de cable · Perú</p>
          <h2 className="mt-1 text-xl font-semibold text-cream">Disney y otros canales infantiles</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-mist">
            Estos canales figuran en la programación oficial de Movistar Perú. No tienen una señal abierta autorizada
            integrada en PATCHED: para verlos necesitas acceso al servicio correspondiente.
            Los números son de la guía de Movistar, no de todos los operadores.
          </p>
        </div>
        <a href={PERU_CABLE_GUIDE_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center rounded-md border border-white/20 px-3 text-xs font-semibold text-cream hover:bg-white/10">
          Ver opciones oficiales ↗
        </a>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {PERU_KIDS_CABLE.map(item => <div key={item.id} className="flex min-w-0 flex-col rounded-lg border border-white/10 bg-[#101814] p-3">
          <span className="text-2xl" aria-hidden="true">{item.icon}</span>
          <strong className="mt-2 min-h-10 text-xs leading-5 text-cream">{item.name}</strong>
          <span className="text-[11px] text-mist">Canal {item.number}</span>
          <span className="mt-2 text-[10px] text-[#c8b59b]">TV de paga · No integrado</span>
        </div>)}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-mist">
        <a href={PERU_CABLE_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
          Consultar guía original de canales ↗
        </a>
        {' '}· Disney+ es un servicio de streaming distinto de Disney Channel en vivo.
      </p>
    </section>
  )
}
