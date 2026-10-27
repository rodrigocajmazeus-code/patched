import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  INVENTORY_PROVIDERS, INVENTORY_STORAGE_KEY, AVAILABILITY_LABELS,
  parseInventoryText, makeInventory, mergeInventory, readInventories, readReports, writeInventories, findAvailability,
} from '../player/availabilityIndex.js'

const names = {moviemaster:'MovieMaster',facilitoplay:'FacilitoPlay',vidrift:'VidRift'}
const origins = {'official-claimed':'Identificada por ti como lista oficial','community':'Lista de una comunidad','personal':'Lista personal'}
const statuses = {
  observed:'border-emerald-700/50 bg-emerald-900/20 text-emerald-200',
  failed:'border-amber-700/50 bg-amber-900/20 text-amber-200',
  'listed-episode':'border-sky-700/50 bg-sky-900/20 text-sky-200',
  'listed-series':'border-sky-700/50 bg-sky-900/20 text-sky-200',
  'listed-title':'border-sky-700/50 bg-sky-900/20 text-sky-200',
  unknown:'border-white/10 bg-white/5 text-mist',
}
function storage() { try { return window.localStorage } catch { return null } }
function read() { return readInventories(storage()) }
function Button({children,...props}) { return <button {...props} className={`rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-40 ${props.className || ''}`}>{children}</button> }
export default function InventoryPage() {
  const [datasets,setDatasets] = useState(read)
  const [provider,setProvider] = useState('moviemaster')
  const [defaultType,setDefaultType] = useState('movie')
  const [sourceType,setSourceType] = useState('community')
  const [sourceLabel,setSourceLabel] = useState('')
  const [file,setFile] = useState(null)
  const [feedback,setFeedback] = useState('')
  const [type,setType] = useState('movie')
  const [id,setId] = useState('27205')
  const [season,setSeason] = useState('1')
  const [episode,setEpisode] = useState('1')
  const [reports,setReports] = useState(() => readReports(storage()))

  const importFile = async event => {
    event.preventDefault()
    setFeedback('')
    const form = event.currentTarget
    if (!file || !sourceLabel.trim()) { setFeedback('Selecciona un archivo y escribe de dónde lo obtuviste.'); return }
    if (file.size > 8_000_000) { setFeedback('El archivo excede el tamaño permitido (8 MB).'); return }
    try {
      const parsed = parseInventoryText(await file.text(),defaultType)
      const dataset = makeInventory({providerId:provider,sourceType,sourceLabel,parsed})
      if (!dataset) throw Error('Datos de origen inválidos.')
      const merged = mergeInventory(datasets,dataset)
      if (!writeInventories(storage(),merged)) throw Error('No hay suficiente espacio en el almacenamiento de este navegador.')
      setDatasets(merged)
      setFeedback(`Guardados ${parsed.entries.length} IDs para ${names[provider]}. ${parsed.duplicated} duplicados y ${parsed.rejected} registros inválidos descartados. Esto NO verifica reproducciones.`)
      setFile(null)
      form.reset()
    } catch(error) { setFeedback(error?.message || 'No se pudo importar el archivo.') }
  }
  const remove = index => {
    if (!window.confirm('¿Eliminar únicamente este inventario importado? Tus pruebas audiovisuales no se borrarán.')) return
    const updated = datasets.filter((_,i) => i !== index)
    if (writeInventories(storage(),updated)) { setDatasets(updated);setFeedback('Inventario eliminado.') }
    else setFeedback('No se pudo guardar el cambio.')
  }
  const request = {mediaType:type, id,season,episode}
  const valid = /^\d+$/.test(id) && Number(id) > 0 &&
    (type === 'movie' || (/^[1-9]\d*$/.test(season) && /^[1-9]\d*$/.test(episode)))
  const found = valid ? INVENTORY_PROVIDERS.map(providerId => ({providerId, result:findAvailability({...request,providerId},reports,datasets)})) : []
  const watchLink = valid ? `/watch/${type}/${id}${type === 'tv' ? `?s=${season}&e=${episode}` : ''}` : '#'
  return <div className="mx-auto max-w-5xl px-4 pb-24 pt-28 text-white sm:px-6">
    <Link to="/cobertura" className="text-xs font-semibold text-mist hover:text-white">← Volver a cobertura</Link>
    <p className="mt-5 text-xs font-black uppercase tracking-[.22em] text-brand">PATCHED · Índice local</p>
    <h1 className="mt-2 text-3xl font-black">Disponibilidad conocida</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-mist">Cruza tus comprobaciones reales con listas de IDs TMDB importadas por ti. No accede a ninguna API privada, no rastrea reproductores, no descarga videos y no asegura que un título de la lista se reproduzca. Los datos permanecen en este navegador.</p>
    <section className="mt-8 rounded-xl border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-lg font-black">Consultar un título</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-semibold">Tipo <select className="mt-1 w-full rounded-lg bg-surface p-2 text-white" value={type} onChange={e=>setType(e.target.value)}><option value="movie">Película</option><option value="tv">Serie / anime</option></select></label>
        <label className="text-xs font-semibold">TMDB ID <input type="text" inputMode="numeric" value={id} onChange={e=>setId(e.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2 text-white" /></label>
        {type === 'tv' && <><label className="text-xs font-semibold">Temporada <input type="text" inputMode="numeric" value={season} onChange={e=>setSeason(e.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2 text-white" /></label>
        <label className="text-xs font-semibold">Episodio <input type="text" inputMode="numeric" value={episode} onChange={e=>setEpisode(e.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2 text-white" /></label></>}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {found.map(({providerId,result}) => <div key={providerId} className={`rounded-lg border p-3 ${statuses[result.status]}`}>
          <p className="text-sm font-bold">{names[providerId]}</p>
          <p className="mt-2 text-xs font-semibold">{AVAILABILITY_LABELS[result.status]}</p>
          {result.dataset && <p className="mt-1 text-xs opacity-80">Fuente: {result.dataset.sourceLabel} · {origins[result.dataset.sourceType]}</p>}
          {result.report && <p className="mt-1 text-xs opacity-80">Comprobado el {new Date(result.report.checkedAt).toLocaleDateString('es-PE')}{result.mixed ? ' · otras variantes fallaron' : ''}</p>}
        </div>)}
      </div>
      {valid && <Link to={watchLink} className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white">Abrir ficha del título</Link>}
      <Button type="button" className="ml-2" onClick={()=>setReports(readReports(storage()))}>Actualizar mis pruebas</Button>
    </section>
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-lg font-black">Importar una lista TXT o JSON</h2>
      <p className="mt-2 text-xs leading-5 text-mist">Utiliza solo listas publicadas para reutilización o archivos propios. La procedencia la declaras tú: PATCHED no comprueba si realmente son oficiales. Los IDs importados significan «incluido en una lista», no «reproducción confirmada».</p>
      <form className="mt-5 space-y-4" onSubmit={importFile}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold">Proveedor <select value={provider} onChange={e=>setProvider(e.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2 text-white">{INVENTORY_PROVIDERS.map(v=><option key={v} value={v}>{names[v]}</option>)}</select></label>
          <label className="text-xs font-semibold">IDs numéricos del archivo <select value={defaultType} onChange={e=>setDefaultType(e.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2 text-white"><option value="movie">Películas</option><option value="tv">Series</option></select></label>
          <label className="text-xs font-semibold">Procedencia <select value={sourceType} onChange={e=>setSourceType(e.target.value)} className="mt-1 w-full rounded-lg bg-surface p-2 text-white"><option value="community">Lista de comunidad</option><option value="official-claimed">Publicación aparentemente oficial</option><option value="personal">Recopilación personal</option></select></label>
        </div>
        <label className="block text-xs font-semibold">Nombre y origen de la lista <input value={sourceLabel} onChange={e=>setSourceLabel(e.target.value)} maxLength={100} placeholder="Ej.: export oficial publicado el 26-10-2026" className="mt-1 w-full rounded-lg bg-surface p-2 text-white" /></label>
        <label className="block text-xs font-semibold">Archivo local <input type="file" accept=".txt,.json,text/plain,application/json" onChange={e=>setFile(e.target.files?.[0] || null)} className="mt-2 block max-w-full text-xs text-white" /></label>
        <Button type="submit" disabled={!file || !sourceLabel.trim()}>Importar IDs</Button>
      </form>
      <details className="mt-4 text-xs text-mist"><summary className="cursor-pointer font-bold text-cream">Ver formatos compatibles</summary>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3">{`# lista TXT, un ID por línea\n27205\n603\ntv:1429\nepisode:1429:1:1\n\n# lista JSON\n{"entries":[{"type":"movie","tmdbId":27205},{"type":"tv","tmdbId":1429}]}`}</pre>
      </details>
      {feedback && <p className="mt-3 text-xs font-semibold text-amber-200" role="status">{feedback}</p>}
    </section>
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-lg font-black">Inventarios guardados ({datasets.length})</h2>
      <p className="mt-2 text-xs text-mist">No se suben a un servidor. Espacio ocupado: {new Blob([JSON.stringify(datasets)]).size.toLocaleString('es-PE')} bytes aprox.</p>
      {!datasets.length && <p className="mt-3 text-sm text-mist">Todavía no importaste ningún inventario. Puedes consultar desde ya tus comprobaciones audiovisuales.</p>}
      <div className="mt-4 space-y-2">
        {datasets.map((dataset,index)=><div key={`${dataset.providerId}:${dataset.sourceLabel}:${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3">
          <div><p className="text-sm font-bold">{names[dataset.providerId]} · {dataset.entries.length.toLocaleString('es-PE')} IDs</p>
            <p className="mt-1 text-xs text-mist">{dataset.sourceLabel} · {origins[dataset.sourceType]} · {new Date(dataset.importedAt).toLocaleDateString('es-PE')}</p></div>
          <Button type="button" onClick={()=>remove(index)}>Eliminar lista</Button>
        </div>)}
      </div>
    </section>
  </div>
}
