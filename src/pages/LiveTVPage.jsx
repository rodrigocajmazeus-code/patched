import { useMemo, useState } from 'react'
import ControlledPlayer from '../components/ControlledPlayer.jsx'
import { LIVE_TEST_SOURCES, OFFICIAL_LIVE_CHANNELS, parseLiveHlsUrl } from '../data/liveSources.js'

export default function LiveTVPage() {
  const [activeStream, setActiveStream] = useState(null)
  const [customUrl, setCustomUrl] = useState('')
  const [customError, setCustomError] = useState('')
  const entry = useMemo(() => activeStream ? {
    title: activeStream.name,
    renditions: [{
      id: activeStream.id,
      kind: 'hls',
      label: activeStream.name,
      url: activeStream.url,
      language: 'und',
    }],
    subtitles: [],
  } : null, [activeStream])

  function chooseSource(source) {
    setActiveStream(source)
    setCustomError('')
  }

  function playCustomSource(event) {
    event.preventDefault()
    const result = parseLiveHlsUrl(customUrl)
    if (!result.ok) {
      setCustomError(result.error)
      return
    }
    chooseSource({
      id: 'custom-stream',
      name: 'Fuente HLS propia / autorizada',
      detail: 'La compatibilidad, CORS y los permisos dependen del servidor de origen.',
      url: result.url,
    })
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-28 pt-28 text-cream sm:px-8 sm:pt-32">
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[.23em] text-brand">
        <span className="inline-block h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
        Laboratorio de streaming
        <span className="text-white/30">/</span>
        Versión experimental
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-6xl">
        TV en vivo<span className="text-brand">.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
        Un espacio para comprobar la reproducción HLS desde el celular, sin alterar
        los proveedores de películas y series. Las fuentes de prueba no son canales comerciales.
      </p>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121916]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
                {activeStream ? activeStream.name : 'Reproductor sin iniciar'}
              </div>
              <span className="rounded border border-white/15 px-2 py-1 text-[10px] tracking-[.12em] text-white/55">
                HLS · M3U8
              </span>
            </div>
            {entry
              ? <div className="p-2 sm:p-3"><ControlledPlayer key={activeStream.url} entry={entry} /></div>
              : <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#080c0a] p-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 text-2xl text-white/80" aria-hidden="true">▶</div>
                  <p className="text-sm font-medium">Elige una fuente para iniciar la prueba</p>
                  <p className="max-w-xs text-xs leading-5 text-white/45">No se descargará vídeo hasta que selecciones una fuente.</p>
                </div>}
          </div>
          {activeStream && <p className="text-xs leading-6 text-white/55" role="status">
            {activeStream.detail} Si no reproduce, puede ser por CORS, formato, geobloqueo
            o disponibilidad. La carga del manifiesto no equivale a reproducción confirmada.
          </p>}
          <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Fuente HLS propia</h2>
            <p className="mt-2 text-xs leading-6 text-white/55">
              Prueba una dirección HTTPS .m3u8 de la que tengas permiso de uso. No se guarda la URL,
              no se descargan archivos y no se eliminan restricciones del servidor.
            </p>
            <form onSubmit={playCustomSource} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="sr-only">URL de manifiesto HLS autorizado</span>
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => { setCustomUrl(e.target.value); setCustomError('') }}
                  placeholder="https://ejemplo.com/directo.m3u8"
                  autoComplete="off"
                  inputMode="url"
                  spellCheck={false}
                  aria-label="URL de manifiesto HLS autorizado"
                  className="w-full rounded border border-white/15 bg-[#0e1712] px-3 py-3 text-xs text-white placeholder:text-white/35"
                />
              </label>
              <button type="submit" className="min-h-11 rounded bg-brand px-5 py-3 text-xs font-semibold text-ink transition hover:bg-brand-hover">
                Probar señal
              </button>
            </form>
            {customError && <p role="alert" className="mt-3 text-xs text-red-300">{customError}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="lab-tv-sources-heading">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="lab-tv-sources-heading" className="text-base font-semibold">Señales de prueba</h2>
              <span className="text-[10px] uppercase tracking-widest text-white/40">Laboratorio</span>
            </div>
            <div className="space-y-2">
              {LIVE_TEST_SOURCES.map((source, index) => {
                const selected = source.url === activeStream?.url
                return <button
                  key={source.id}
                  type="button"
                  onClick={() => chooseSource(source)}
                  aria-pressed={selected}
                  className={'w-full rounded-lg border px-4 py-4 text-left transition ' +
                    (selected ? 'border-brand/60 bg-brand/10' : 'border-white/10 bg-white/[.035] hover:border-white/30')}
                >
                  <span className="flex items-center justify-between gap-3">
                    <strong className="text-sm font-semibold">{source.name}</strong>
                    <span className="text-xs text-white/40">0{index + 1}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-white/50">{source.detail}</span>
                  <span className="mt-2 inline-block text-[11px] font-semibold text-brand">{selected ? 'Seleccionada' : 'Probar señal'}</span>
                </button>
              })}
            </div>
          </section>

          <section aria-labelledby="official-tv-heading">
            <h2 id="official-tv-heading" className="text-base font-semibold">Ver canales oficiales</h2>
            <p className="mt-2 text-xs leading-6 text-white/50">
              Estas señales se abren en los portales oficiales. Todavía no hay
              integración de reproducción dentro de Patched.
            </p>
            <div className="mt-3 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-white/[.035]">
              {OFFICIAL_LIVE_CHANNELS.map((channel) => (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 p-4 hover:bg-white/[.07]"
                >
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold">{channel.name}</strong>
                    <small className="mt-1 block text-xs text-white/45">{channel.kind}</small>
                  </span>
                  <span aria-hidden="true" className="text-sm text-brand">↗</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
      <p className="mt-8 max-w-3xl border-t border-white/10 pt-5 text-xs leading-6 text-white/45">
        Una señal pública y gratuita no concede automáticamente derecho a incrustarla o redistribuirla.
        Este módulo solo incorpora streams publicados para pruebas técnicas y enlaces oficiales externos.
        La reproducción real debe verificarse en cada navegador y región.
      </p>
    </section>
  )
}
