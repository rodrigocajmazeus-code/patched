import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COVERAGE_CASES, COVERAGE_CATEGORIES, coverageWatchPath } from '../data/coverageCases.js'
import { PRIMARY_PROVIDER_ORDER } from '../data/providers.js'
import { parsePlaybackReports, PLAYBACK_REPORTS_KEY } from '../player/playbackReports.js'
import { coverageStatus, latestCoverageRecord, summarizeCoverage, summarizeObservedQuality } from '../player/coverageMetrics.js'

const names = { moviemaster: 'MovieMaster', facilitoplay: 'FacilitoPlay', vidrift: 'VidRift' }
const qualityLabels = { blurry:'Borrosa', acceptable:'Aceptable', sharp:'Nítida', unknown:'Sin evaluar' }
const bufferingLabels = { none:'Fluida', sometimes:'Pausas ocasionales', often:'Pausas frecuentes', unknown:'Sin evaluar' }
const styles = {
  'Funciona': 'border-emerald-600/30 bg-emerald-600/10 text-emerald-300',
  'No carga': 'border-red-600/30 bg-red-600/10 text-red-300',
  'Contenido equivocado': 'border-amber-600/30 bg-amber-600/10 text-amber-300',
  'Pendiente': 'border-white/10 bg-white/[.05] text-mist',
}

function storedReports() {
  try { return parsePlaybackReports(window.localStorage.getItem(PLAYBACK_REPORTS_KEY)) }
  catch { return [] }
}

export default function CoveragePage() {
  const [category, setCategory] = useState('anime')
  const [reports, setReports] = useState(storedReports)
  const selected = COVERAGE_CASES.filter(item => item.category === category)
  const overall = useMemo(() => summarizeCoverage(reports), [reports])
  const group = useMemo(() => summarizeCoverage(reports, selected), [reports, selected])
  const quality = useMemo(() => summarizeObservedQuality(reports, selected), [reports, selected])

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 text-white sm:px-6">
      <Link to="/" className="text-xs font-semibold text-mist hover:text-white">← Volver a PATCHED</Link>
      <div className="mb-6 mt-4">
        <p className="mb-2 text-xs font-black uppercase tracking-[.2em] text-brand">Laboratorio de reproducción</p>
        <h1 className="text-3xl font-black sm:text-4xl">Cobertura real de proveedores</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-mist">
          Estos títulos son una muestra de prueba, no un catálogo garantizado. Las fichas proceden de TMDB y no prueban disponibilidad de video.
          La matriz muestra únicamente comprobaciones que guardaste en este navegador.
        </p>
      </div>
      <Link to="/inventario" className="mb-6 inline-flex rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10">Consultar e importar inventarios TMDB →</Link>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Casos seleccionados', `${group.cases}`],
          ['Combinaciones comprobadas', `${overall.tested}/${overall.total}`],
          ['Funcionan', `${overall.works}`],
          ['Pendientes', `${overall.pending}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[.04] p-4">
            <p className="text-xs text-mist">{label}</p><p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Categoría de prueba">
        {COVERAGE_CATEGORIES.map(group => (
          <button key={group.id} type="button" onClick={() => setCategory(group.id)}
            aria-pressed={category === group.id}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${category === group.id ? 'bg-brand text-white' : 'border border-white/15 bg-white/[.05] text-cream hover:bg-white/10'}`}>
            {group.label}
          </button>
        ))}
        <button className="ml-auto rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-cream hover:bg-white/10" type="button" onClick={() => setReports(storedReports())}>
          Actualizar resultados
        </button>
      </div>
      <section aria-label="Calidad de imagen observada" className="mb-6 rounded-xl border border-white/10 bg-white/[.04] p-4">
        <h2 className="text-sm font-black text-white">Calidad observada en {category === 'anime' ? 'Anime' : category === 'series' ? 'Series' : 'Películas'}</h2>
        <p className="mt-1 text-xs text-mist">Valoraciones manuales de los casos de esta categoría. No es una medición de bitrate ni una garantía de HD para todos los títulos.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {quality.map(item => <div key={item.providerId} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-bold text-white">{names[item.providerId]}</p>
            <p className="mt-1 text-xs text-mist">Reproducciones útiles: {item.workingCases}/{selected.length}</p>
            <p className="mt-1 text-xs text-mist">Imagen evaluada: {item.evaluatedPicture} · Nítidas: {item.sharp} · Borrosas: {item.blurry}</p>
            <p className="mt-1 text-xs text-mist">Fluidas: {item.fluid} · Pausas frecuentes: {item.oftenBuffers}</p>
          </div>)}
        </div>
      </section>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[740px] border-collapse text-left text-sm">
          <thead className="bg-white/[.07] text-xs uppercase tracking-wide text-mist">
            <tr><th className="p-4">Título / caso</th>{PRIMARY_PROVIDER_ORDER.map(id => <th key={id} className="p-4">{names[id]}</th>)}<th className="p-4">Prueba</th></tr>
          </thead>
          <tbody>
            {selected.map(item => (
              <tr key={item.key} className="border-t border-white/10">
                <td className="p-4"><span className="font-bold">{item.title}</span><span className="mt-1 block text-xs text-mist">{item.mediaType === 'tv' ? `T${item.season} · E${item.episode}` : 'Película'}</span></td>
                {PRIMARY_PROVIDER_ORDER.map(id => {
                  const report = latestCoverageRecord(reports, item, id)
                  const status = coverageStatus(report)
                  return <td key={id} className="p-3"><span className={`inline-block rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${styles[status]}`}>{status}</span>{report?.result === 'works' && <span className="mt-1 block text-[11px] text-mist">Audio: {report.audio} · Sub: {report.subtitles}<span className="block">Variante: {report.key.split(':').at(-1) === '-' ? 'interna' : report.key.split(':').at(-1)}</span>
                    <span className="block">Imagen: {qualityLabels[report.picture] || 'Sin evaluar'} · {bufferingLabels[report.buffering] || 'Sin evaluar'}</span>
                    {report.displayedResolution && report.displayedResolution !== 'unknown' && <span className="block">Menú del servidor: {report.displayedResolution} (no medido)</span>}</span>}</td>
                })}
                <td className="p-3"><Link className="inline-block whitespace-nowrap rounded-lg bg-brand px-3 py-2 text-xs font-black text-white hover:brightness-110" to={coverageWatchPath(item)}>Abrir episodio</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[.04] p-5 text-sm leading-6 text-cream/80">
        <p className="font-bold text-white">Cómo probar la cobertura</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Abre un caso y prueba MovieMaster. Cambia a FacilitoPlay y VidRift desde el reproductor.</li>
          <li>Verifica que el episodio sea correcto, escucha el audio y comprueba los subtítulos.</li>
          <li>Guarda el resultado en «Registrar audio y subtítulos» debajo del reproductor.</li>
          <li>Vuelve aquí y pulsa «Actualizar resultados» para ver la matriz.</li>
        </ol>
        <p className="mt-3 text-mist">Compara el mismo episodio, en el mismo navegador y durante 30–60 segundos por fuente. Si la imagen es borrosa, mira si el reproductor externo ofrece calidad Auto/720p/1080p. No podemos subir la resolución real desde PATCHED ni leer las pistas de un iframe externo sin permiso o API. La nitidez es una evaluación visual, no una medición.</p>
        <p className="mt-3 text-mist">Un «Funciona» indica que al menos una variante funcionó en tu prueba; no significa que LAT, SUB y ESP funcionen todas, ni que haya garantía permanente. Cada servidor se evalúa por separado. No se realiza reconocimiento ni extracción automática del video de terceros.</p>
      </div>
    </div>
  )
}
