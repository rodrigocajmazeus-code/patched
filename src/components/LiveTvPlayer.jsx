import { useEffect, useRef, useState } from 'react'

const FAILURE_TEXT = {
  network: 'La fuente no respondió o rechazó la conexión. Puede ser una caída, CORS o una restricción regional.',
  media: 'El navegador no pudo decodificar esta señal.',
  timeout: 'La emisión no empezó a reproducirse. Puede estar lenta o inactiva.',
  unsupported: 'Este navegador no admite el formato de esta emisión.',
}

// Diagnose actual player errors. No proxies, request-header spoofing or DRM bypass.
export default function LiveTvPlayer({ channel, onSourceError, onSourcePlaying }) {
  const videoRef = useRef(null)
  const handlersRef = useRef({})
  handlersRef.current = { onSourceError, onSourcePlaying }
  const resumeRef = useRef(false)
  const [error, setError] = useState('')
  const source = channel?.source

  useEffect(() => { resumeRef.current = false }, [channel?.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) return undefined
    let disposed = false
    let instance = null
    let timeout = null
    let failed = false
    let recovered = false
    const clear = () => { if (timeout) clearTimeout(timeout); timeout = null }
    const fail = (type, detail = '', status = null) => {
      if (disposed || failed) return
      failed = true
      clear()
      setError(FAILURE_TEXT[type] || 'La señal no se pudo reproducir.')
      handlersRef.current.onSourceError?.({ url: source.url, type, detail, status })
    }
    const onPlay = () => {
      resumeRef.current = true
      clear()
      timeout = setTimeout(() => fail('timeout', 'no-playing-event'), 20000)
    }
    const onPlaying = () => {
      clear()
      setError('')
      handlersRef.current.onSourcePlaying?.(source.url)
    }
    const onVideoError = () => {
      const code = video.error?.code || 0
      fail(code === 3 || code === 4 ? 'media' : 'network', 'video-error-' + code)
    }
    const resume = () => {
      if (resumeRef.current && !disposed) video.play().catch(() => {
        // Browser autoplay protection may require another user tap.
      })
    }

    setError('')
    video.pause()
    video.removeAttribute('src')
    video.load()
    video.addEventListener('play', onPlay)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('error', onVideoError)

    const init = async () => {
      try {
        if (source.type === 'mp4' || video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.url
          resume()
          return
        }
        const module = await import('hls.js')
        if (disposed) return
        const Hls = module.default
        if (!Hls.isSupported()) {
          fail('unsupported', 'hls-not-supported')
          return
        }
        instance = new Hls({ enableWorker: true })
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (disposed || !data.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
            recovered = true
            instance.recoverMediaError()
            return
          }
          fail(data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 'media',
            data.details || data.type || 'unknown', data.response?.code || null)
        })
        instance.on(Hls.Events.MANIFEST_PARSED, resume)
        instance.loadSource(source.url)
        instance.attachMedia(video)
      } catch {
        fail('unsupported', 'player-init-failed')
      }
    }
    init()
    return () => {
      disposed = true
      clear()
      video.removeEventListener('play', onPlay)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('error', onVideoError)
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
      <p className="max-w-sm text-xs leading-5 text-mist">No encontramos una señal HTTPS HLS/MP4 directa para este canal. Puede tener emisión en su página oficial.</p>
      {channel.website && <a href={channel.website} target="_blank" rel="noopener noreferrer" className="rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-cream hover:bg-white/10">Abrir web oficial ↗</a>}
    </div>
  )
  return (
    <div className="relative bg-black">
      <video ref={videoRef} className="aspect-video w-full bg-black" controls playsInline preload="metadata"
        aria-label={'Señal en vivo de ' + channel.name} />
      {error && <div role="alert" className="border-t border-red-500/20 bg-[#25191a] px-4 py-3 text-xs leading-5 text-rose-200">{error}</div>}
    </div>
  )
}
