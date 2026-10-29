import { useEffect, useMemo, useRef, useState } from 'react'
import ControlledPlayer from '../components/ControlledPlayer.jsx'
import { LAB_SOURCES, labEvidenceKey, labSourceFromId, sourceLabUrl } from '../player/freeSourceLab.js'

const DEMO = Object.freeze({
  title: 'Big Buck Bunny — demostración HLS abierta (no es una película del catálogo)',
  renditions: [{ id: 'demo', label: 'HLS demo', language: 'en',
    kind: 'hls', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }],
  subtitles: [],
})
const TESTS = [
  { id: 'snk22', label: 'SNK T1E22', mediaType: 'tv', idTmdb: 1429, season: 1, episode: 22 },
  { id: 'snk23', label: 'SNK T1E23', mediaType: 'tv', idTmdb: 1429, season: 1, episode: 23 },
  { id: 'padrino', label: 'El padrino (TMDB 238)', mediaType: 'movie', idTmdb: 238 },
]
const STORAGE_KEY = 'patched.lab.sources.evidence.v1'
function readEvidence() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object').slice(-80) : []
  } catch { return [] }
}
function saveEvidence(items) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-80))) } catch { /* storage optional */ }
}
function manualStateLabel(value) {
  return { unknown: 'Sin comprobar', yes: 'Sí', no: 'No' }[value] || 'Sin comprobar'
}

export default function FreeSourceLabPage() {
  const [sourceId, setSourceId] = useState('stellar')
  const [testId, setTestId] = useState('snk22')
  const [locale, setLocale] = useState('es-419')
  const [active, setActive] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [providerEvent, setProviderEvent] = useState('')
  const [demo, setDemo] = useState(false)
  const [ad, setAd] = useState('unknown')
  const [video, setVideo] = useState('unknown')
  const [sound, setSound] = useState('unknown')
  const [audioLanguage, setAudioLanguage] = useState('unknown')
  const [identity, setIdentity] = useState('unknown')
  const [clicks, setClicks] = useState('unknown')
  const [evidence, setEvidence] = useState(readEvidence)
  const frameRef = useRef(null)
  const source = labSourceFromId(sourceId)
  const sample = TESTS.find(item => item.id === testId) || TESTS[0]
  const request = useMemo(() => ({
    mediaType: sample.mediaType, id: sample.idTmdb,
    season: sample.season, episode: sample.episode, locale,
  }), [sample, locale])
  const activeSource = active ? labSourceFromId(active.providerId) : null
  const currentKey = labEvidenceKey(sourceId, request)
  const lastObservation = evidence.findLast(item => item.key === currentKey)
  const chosenUrl = useMemo(() => {
    try { return sourceLabUrl(sourceId, request) } catch { return null }
  }, [sourceId, request])
  const closePlayer = () => { setActive(null); setDemo(false); setLoaded(false); setProviderEvent('') }
  const launch = () => {
    if (!chosenUrl) return
    setActive({ providerId: sourceId, url: chosenUrl, key: currentKey })
    setDemo(false); setLoaded(false); setProviderEvent('')
    setAd('unknown'); setVideo('unknown'); setSound('unknown'); setAudioLanguage('unknown'); setIdentity('unknown'); setClicks('unknown')
  }
  useEffect(() => {
    if (!active || active.providerId !== 'stellar') return
    const onMessage = event => {
      if (event.origin !== 'https://stellar.rip' || event.source !== frameRef.current?.contentWindow) return
      if (event.data?.type === 'STELLAR_EMBED_READY') {
        frameRef.current?.contentWindow?.postMessage({ type: 'STELLAR_EMBED_INIT' }, 'https://stellar.rip')
        setProviderEvent('El iframe declaró estar preparado; NO confirma video ni audio.')
        return
      }
      if (event.data?.type === 'PLAYER_EVENT' && event.data?.data &&
        typeof event.data.data === 'object') {
        const name = event.data.data.event
        if (['play', 'pause', 'timeupdate', 'ended', 'seeked'].includes(name)) {
          setProviderEvent('Stellar comunicó el evento «' + name + '». Verifica imagen, audio e identidad manualmente.')
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [active])
  const storeReport = () => {
    const record = {
      key: active?.key || currentKey,
      when: new Date().toISOString(), source: sourceId, test: sample.id,
      mediaType: request.mediaType, tmdbId: request.id,
      season: request.season ?? null, episode: request.episode ?? null,
      locale, ad, video, sound, audioLanguage, identity,
      clicks: clicks === 'unknown' ? null : Number(clicks),
      declaredBy: 'Prueba manual del usuario, no certificación del proveedor',
    }
    const next = [...evidence, record].slice(-80)
    setEvidence(next); saveEvidence(next)
  }
  const downloadEvidence = () => {
    const blob = new Blob([JSON.stringify({ application: 'PATCHED Source Lab', evidence }, null, 2)],
      { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'PATCHED-fuentes-resultados.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="min-h-screen bg-ink px-4 pb-28 pt-28 text-cream sm:px-6 lg:px-10">
    <div className="mx-auto max-w-5xl">
      <p className="text-[10px] font-bold uppercase tracking-[.24em] text-brand">PATCHED · Investigación independiente</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">Laboratorio S/0 de reproducción</h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-mist">
        Ninguna fuente comercial está aprobada ni se carga automáticamente. Compara los anuncios, el idioma y los clics en
        Chrome o Brave. El evento «iframe cargado» no significa que el video esté reproduciéndose.
        No se envían las observaciones a PATCHED; se guardan solo en este navegador.
      </p>

      <section className="mt-7 rounded-xl border border-brand/25 bg-[#14251d] p-4 sm:p-6" aria-label="Reproductor propio">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Primera comprobación · Motor propio</p>
        <h2 className="mt-2 text-xl font-bold">Reproductor HLS sin iframe comercial</h2>
        <p className="mt-2 text-xs leading-5 text-mist">
          Muestra pública abierta para pruebas de HLS.js, sin suscripción ni servidor nuestro.
          No contiene SNK ni otras películas comerciales: sirve para validar el motor real en Chrome y Android.
        </p>
        <button type="button" onClick={() => { setActive(null); setLoaded(false); setProviderEvent(''); setDemo(value => !value) }}
          className="mt-3 min-h-11 rounded-md bg-brand px-4 text-xs font-bold text-[#101614]">
          {demo ? 'Cerrar muestra' : 'Reproducir muestra HLS'}
        </button>
        {demo && <div className="mt-4"><ControlledPlayer entry={DEMO}/></div>}
      </section>

      <section className="mt-7 rounded-xl border border-white/10 bg-[#16221c] p-4 sm:p-6" aria-label="Proveedores en evaluación">
        <h2 className="text-xl font-bold">Comparar fuentes gratuitas (sin aprobación)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-mist">Proveedor
            <select value={sourceId} onChange={e => { closePlayer(); setSourceId(e.target.value) }}
              className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream">
              {LAB_SOURCES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-mist">Contenido de prueba
            <select value={testId} onChange={e => { closePlayer(); setTestId(e.target.value) }}
              className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream">
              {TESTS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-mist">Idioma de interfaz solicitado
            <select value={locale} onChange={e => { closePlayer(); setLocale(e.target.value) }}
              className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream">
              <option value="es-419">Español latino (interfaz)</option>
              <option value="es-ES">Castellano (interfaz)</option>
            </select>
          </label>
          <div className="rounded-md border border-white/10 p-3 text-xs leading-5 text-mist">
            <p>{source?.note}</p>
            <a href={source?.documentation} target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-block text-brand underline">Documentación del proveedor</a>
          </div>
        </div>
        <p className="mt-4 break-all text-[11px] text-mist">URL documentada: {chosenUrl || 'No válida'}</p>
        {lastObservation && <p className="mt-2 text-xs text-mist">
          Último reporte de esta fuente: anuncio {manualStateLabel(lastObservation.ad).toLowerCase()},
          reproducción {manualStateLabel(lastObservation.video).toLowerCase()}.
        </p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={launch} disabled={!chosenUrl}
            className="min-h-11 rounded-md bg-brand px-4 text-xs font-bold text-[#101614] disabled:opacity-40">
            Abrir iframe solo para esta prueba
          </button>
          {active && <button type="button" onClick={closePlayer}
            className="min-h-11 rounded-md border border-white/25 px-4 text-xs font-semibold">
            Cerrar iframe
          </button>}
        </div>
        {active && <div className="mt-4">
          <div className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
            <iframe key={active.url} ref={frameRef} title={'Reproductor experimental ' + activeSource?.name}
              src={active.url} referrerPolicy={activeSource?.referrerPolicy}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen
              onLoad={() => {
                setLoaded(true)
                if (active.providerId === 'stellar') frameRef.current?.contentWindow?.postMessage(
                  { type: 'STELLAR_EMBED_INIT' }, 'https://stellar.rip')
              }}
              className="h-full w-full border-0" />
          </div>
          <p role="status" className="mt-2 text-xs text-mist">
            {loaded ? 'Iframe cargado; video NO confirmado.' : 'Cargando iframe…'} {providerEvent}
          </p>
          <p className="mt-1 text-xs text-mist">Solo tú puedes confirmar el anuncio, el audio y el capítulo mostrado dentro de un iframe externo.</p>
        </div>}
      </section>

      <section className="mt-7 rounded-xl border border-white/10 bg-[#16221c] p-4 sm:p-6" aria-label="Registro de pruebas">
        <h2 className="text-xl font-bold">Registrar resultado real</h2>
        <p className="mt-2 text-xs leading-5 text-mist">Completa después de observar el reproductor. Ninguna opción «Sí» se marca automáticamente.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['Anuncio invasivo', ad, setAd],
            ['Video iniciado', video, setVideo],
            ['Audio audible', sound, setSound],
            ['Contenido / episodio correcto', identity, setIdentity],
          ].map(([name, value, setter]) => <label key={name} className="grid gap-1 text-xs text-mist">{name}
            <select value={value} onChange={e => setter(e.target.value)}
              className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream">
              <option value="unknown">Sin comprobar</option><option value="yes">Sí</option><option value="no">No</option>
            </select>
          </label>)}
          <label className="grid gap-1 text-xs text-mist">Idioma de audio oído
            <select value={audioLanguage} onChange={e => setAudioLanguage(e.target.value)}
              className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream">
              <option value="unknown">Sin comprobar</option>
              <option value="es-419">Español latino</option>
              <option value="es-ES">Castellano (España)</option>
              <option value="ja">Japonés</option>
              <option value="en">Inglés</option>
              <option value="other">Otro idioma</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-mist">Clics para comenzar
            <select value={clicks} onChange={e => setClicks(e.target.value)}
              className="min-h-11 rounded-md border border-white/20 bg-[#101814] px-3 text-sm text-cream">
              <option value="unknown">Sin comprobar</option>
              {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n === 6 ? '6 o más' : n}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={storeReport} disabled={!active}
            className="min-h-11 rounded-md bg-brand px-4 text-xs font-bold text-[#101614] disabled:opacity-40">
            Guardar observación de la fuente abierta
          </button>
          <button type="button" onClick={downloadEvidence} disabled={!evidence.length}
            className="min-h-11 rounded-md border border-white/25 px-4 text-xs font-semibold disabled:opacity-40">
            Exportar JSON ({evidence.length})
          </button>
        </div>
        <p className="mt-3 text-xs text-mist">
          Las pruebas manuales no otorgan permisos sobre contenido de terceros. PATCHED no elimina DRM,
          restricciones de acceso ni publicidad incluida por el proveedor.
        </p>
      </section>
    </div>
  </div>
}
