import { useEffect, useRef, useState } from 'react'

export default function LiveTvPlayer({ channel }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')
  const source = channel?.source

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) return undefined
    let disposed = false
    let instance = null
    setError('')
    video.pause()
    video.removeAttribute('src')
    video.load()

    const init = async () => {
      try {
        if (source.type === 'mp4' || video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.url
          return
        }
        const module = await import('hls.js')
        if (disposed) return
        const Hls = module.default
        if (!Hls.isSupported()) {
          setError('Este navegador no admite el formato de esta señal.')
          return
        }
        instance = new Hls({ enableWorker: true, lowLatencyMode: true })
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal && !disposed) {
            setError('La señal no pudo reproducirse. Puede estar caída, restringida por región o bloquear este navegador (CORS).')
          }
        })
        instance.loadSource(source.url)
        instance.attachMedia(video)
      } catch {
        if (!disposed) setError('No se pudo iniciar el reproductor.')
      }
    }
    init()
    return () => {
      disposed = true
      video.pause()
      if (instance) instance.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [source?.url, source?.type])

  if (!channel) return (
    <div className="flex aspect-video items-center justify-center bg-[#080d0b] px-5 text-center text-sm text-mist">
      Selecciona un canal del catálogo para ver sus opciones de transmisión.
    </div>
  )
  if (!source) return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#080d0b] px-6 text-center">
      <p className="text-lg font-semibold text-cream">{channel.name}</p>
      <p className="max-w-sm text-xs leading-5 text-mist">Este canal figura en el directorio, pero no dispone de una señal HTTPS compatible con nuestro reproductor.</p>
      {channel.website && <a href={channel.website} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-cream hover:bg-white/10">Abrir web oficial ↗</a>}
    </div>
  )
  return (
    <div className="relative bg-black">
      <video ref={videoRef} className="aspect-video w-full bg-black" controls playsInline preload="none"
        onError={() => setError('No se pudo cargar esta emisión. Prueba otra señal o abre la web oficial.')} aria-label={'Señal en vivo de ' + channel.name} />
      {error && <div role="alert" className="border-t border-red-500/20 bg-[#25191a] px-4 py-3 text-xs leading-5 text-rose-200">{error}</div>}
    </div>
  )
}
