import { useEffect, useMemo, useRef, useState } from 'react'
import { audioLabel, sortAudioTracks, subtitleLabel } from '../player/language.js'
import { mapHlsLevels, hlsLevelLabel, canSelectHlsLevel } from '../player/hlsQuality.js'

function userFacingError(error) {
  const msg = String(error?.message || error || '')
  if (/network|fragload|manifestload|404|cors/i.test(msg)) return 'No se pudo descargar el video o su manifiesto. Revisa disponibilidad y CORS de tu fuente.'
  return 'No fue posible reproducir esta fuente. Comprueba que el formato y las pistas sean compatibles.'
}

function findPreferredId(renditions, previousId) {
  return renditions.some(r => r.id === previousId) ? previousId : renditions[0]?.id || ''
}

/**
 * Reproductor para medios propios/autorizados. No controla iframes de terceros.
 * MP4: cambia entre archivos de audio/idioma ya sincronizados.
 * HLS: lee pistas reales del manifiesto con hls.js, sin crear pistas ficticias.
 */
export default function ControlledPlayer({ entry }) {
  const renditions = useMemo(() => (entry?.renditions || []).filter(r => r?.url && r?.id), [entry])
  const subtitles = useMemo(() => (entry?.subtitles || []).filter(t => t?.url && t?.language), [entry])
  const [selectedId, setSelectedId] = useState(() => findPreferredId(renditions, ''))
  const [audioTracks, setAudioTracks] = useState([])
  const [activeAudio, setActiveAudio] = useState(-1)
  const [hlsSubtitles, setHlsSubtitles] = useState([])
  const [activeHlsSubtitle, setActiveHlsSubtitle] = useState(-1)
  const [qualityLevels, setQualityLevels] = useState([])
  const [selectedQuality, setSelectedQuality] = useState(-1)
  const [activeQuality, setActiveQuality] = useState(-1)
  const [nativeHlsPlayback, setNativeHlsPlayback] = useState(false)
  const [subtitle, setSubtitle] = useState('off')
  const [error, setError] = useState('')
  const [playback, setPlayback] = useState('Preparado')
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const nextPosition = useRef(null)
  const selectedSubtitleRef = useRef('off')
  const selected = renditions.find(r => r.id === selectedId) || renditions[0]

  useEffect(() => {
    if (renditions.length && !renditions.some(r => r.id === selectedId)) setSelectedId(renditions[0].id)
  }, [renditions, selectedId])

  // Changing sources retains the timestamp and play/pause state when feasible.
  const changeRendition = (id) => {
    const video = videoRef.current
    if (video) nextPosition.current = { position: video.currentTime || 0, playing: !video.paused }
    setError('')
    setSelectedId(id)
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !selected) return
    let disposed = false
    let instance = null
    const sourceUrl = selected.url
    setAudioTracks([])
    setActiveAudio(-1)
    setHlsSubtitles([])
    setActiveHlsSubtitle(-1)
    setQualityLevels([])
    setSelectedQuality(-1)
    setActiveQuality(-1)
    setNativeHlsPlayback(false)
    setSubtitle(prev => prev.startsWith('file:') ? prev : 'off')
    setError('')
    setPlayback('Preparando video…')

    const restoreProgress = () => {
      const saved = nextPosition.current
      if (!saved || disposed) return
      nextPosition.current = null
      try { if (Number.isFinite(saved.position) && saved.position > 0) video.currentTime = Math.min(saved.position, Math.max(0, (video.duration || saved.position + 1) - 0.25)) } catch {}
      if (saved.playing) video.play().catch(() => {})
      const selectedSubtitle = selectedSubtitleRef.current
      if (selectedSubtitle.startsWith('file:')) {
        const idx = Number(selectedSubtitle.slice(5))
        if (video.textTracks) for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = i === idx ? 'showing' : 'disabled'
      }
    }
    video.addEventListener('loadedmetadata', restoreProgress)

    if (selected.kind === 'hls') {
      const nativeHls = Boolean(video.canPlayType('application/vnd.apple.mpegurl'))
      if (nativeHls) {
        setNativeHlsPlayback(true)
        video.src = sourceUrl
        video.load()
      } else {
        import('hls.js').then(({ default: Hls }) => {
          if (disposed) return
          if (!Hls.isSupported()) {
            setError('Este navegador no admite HLS. Prueba otro navegador o una fuente MP4 autorizada.')
            return
          }
          instance = new Hls({ enableWorker: true })
          hlsRef.current = instance
          const refreshQualityLevels = () => {
            if (disposed) return
            setQualityLevels(mapHlsLevels(instance.levels))
          }
          instance.on(Hls.Events.MANIFEST_PARSED, refreshQualityLevels)
          instance.on(Hls.Events.LEVELS_UPDATED, refreshQualityLevels)
          instance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => { if (!disposed) setActiveQuality(data.level) })
          instance.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
            if (!disposed) { setAudioTracks(sortAudioTracks((data.audioTracks || []).map((t, index) => ({ ...t, index })))); setActiveAudio(instance.audioTrack) }
          })
          instance.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => { if (!disposed) setActiveAudio(data.id) })
          instance.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => { if (!disposed) setHlsSubtitles((data.subtitleTracks || []).map((t, index) => ({ ...t, index }))) })
          instance.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => { if (!disposed) setActiveHlsSubtitle(data.id) })
          instance.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal && !disposed) { setPlayback('Error'); setError(userFacingError(data.details || data.type)) }
          })
          instance.attachMedia(video)
          instance.loadSource(sourceUrl)
        }).catch(() => {
          if (!disposed) setError('No se pudo cargar el motor HLS. Comprueba la instalación de hls.js.')
        })
      }
    } else {
      video.src = sourceUrl
      video.load()
    }
    return () => {
      disposed = true
      video.removeEventListener('loadedmetadata', restoreProgress)
      try { instance?.destroy() } catch {}
      if (hlsRef.current === instance) hlsRef.current = null
      video.removeAttribute('src')
      video.load()
    }
  }, [selected?.url, selected?.kind])

  function changeQualityLevel(value) {
    const level = Number(value)
    const hls = hlsRef.current
    if (!hls || !canSelectHlsLevel(qualityLevels, value)) return
    // -1 enables the existing adaptive bitrate controller. Never fabricate levels.
    hls.currentLevel = level
    setSelectedQuality(level)
  }

  function changeAudioTrack(index) {
    const hls = hlsRef.current
    if (hls && Number.isInteger(index)) {
      hls.audioTrack = index
      setActiveAudio(index)
    }
  }

  function changeSubtitle(value) {
    selectedSubtitleRef.current = value
    setSubtitle(value)
    const hls = hlsRef.current
    if (hls) {
      hls.subtitleTrack = value.startsWith('hls:') ? Number(value.slice(4)) : -1
      hls.subtitleDisplay = value.startsWith('hls:')
    }
    const native = videoRef.current?.textTracks
    // hls.js itself owns the text tracks created from its manifest.
    if (native && !value.startsWith('hls:')) for (let i = 0; i < native.length; i++) {
      native[i].mode = value === `file:${i}` ? 'showing' : 'disabled'
    }
  }

  if (!selected) return <div className="rounded-xl border border-white/15 bg-black p-5 text-sm text-white/70">No hay una fuente autorizada configurada para este título.</div>

  const externalAudioChoices = renditions.length > 1
  const multiaudioChoices = audioTracks.length > 1
  return <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111] p-3 sm:p-4">
    <div className="overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} controls playsInline preload="metadata" className="aspect-video w-full bg-black" onPlaying={() => setPlayback('Reproduciendo')} onWaiting={() => setPlayback('Almacenando en búfer…')} onPause={() => setPlayback('Pausado')} onError={() => setError('Error de formato, permiso de origen o disponibilidad del video.')}>
        {subtitles.map((item, i) => <track key={`${item.language}:${i}`} kind="subtitles" src={item.url} srcLang={item.language} label={item.label || subtitleLabel(item.language)} />)}
      </video>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-white/60" role="status">{playback}</span>
      {externalAudioChoices && <label className="flex items-center gap-2 text-xs font-semibold text-white/80">Audio
        <select className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white" value={selected.id} onChange={e => changeRendition(e.target.value)}>
          {renditions.map(r => <option key={r.id} value={r.id}>{r.label || audioLabel(r.language)}</option>)}
        </select>
      </label>}
      {selected.kind === 'hls' && qualityLevels.length > 1 && <label className="flex items-center gap-2 text-xs font-semibold text-white/80">Calidad HLS
        <select aria-label="Calidad de la fuente HLS propia" className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white" value={selectedQuality} onChange={e => changeQualityLevel(e.target.value)}>
          <option value={-1}>Automática</option>
          {qualityLevels.map(item => <option key={item.index} value={item.index}>
            {hlsLevelLabel(item)}
          </option>)}
        </select>
        <span className="text-[11px] font-normal text-white/50">{activeQuality >= 0 ? `Actual: ${qualityLevels.find(item => item.index === activeQuality)?.height || 'nivel'}${qualityLevels.find(item => item.index === activeQuality)?.height ? 'p' : ''}` : 'Calidad aún no informada'}</span>
      </label>}
      {multiaudioChoices && <label className="flex items-center gap-2 text-xs font-semibold text-white/80">Audio HLS
        <select className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white" value={activeAudio} onChange={e => changeAudioTrack(Number(e.target.value))}>
          {audioTracks.map(t => <option key={t.index} value={t.index}>{t.name || audioLabel(t.lang || t.language)}</option>)}
        </select>
      </label>}
      {(subtitles.length > 0 || hlsSubtitles.length > 0) && <label className="flex items-center gap-2 text-xs font-semibold text-white/80">Subtítulos
        <select className="rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white" value={subtitle} onChange={e => changeSubtitle(e.target.value)}>
          <option value="off">Desactivados</option>
          {subtitles.map((t, i) => <option key={`file-${i}`} value={`file:${i}`}>{t.label || subtitleLabel(t.language)}</option>)}
          {hlsSubtitles.map(t => <option key={`hls-${t.index}`} value={`hls:${t.index}`}>{t.name || subtitleLabel(t.lang || t.language)}</option>)}
        </select>
      </label>}
    </div>
    {selected.kind === 'hls' && nativeHlsPlayback && <p className="text-xs text-white/50">En este navegador HLS se reproduce de forma nativa: la calidad se decide dentro del navegador. PATCHED no inventa un selector 1080p.</p>}
    {selected.kind === 'hls' && !nativeHlsPlayback && qualityLevels.length === 1 && <p className="text-xs text-white/50">El manifiesto HLS ofrece una sola calidad. No se puede seleccionar otra que el servidor no entregue.</p>}
    {selected.kind === 'hls' && !multiaudioChoices && <p className="text-xs text-white/50">Audio HLS: se mostrará un selector solo si el manifiesto declara varias pistas compatibles.</p>}
    {!externalAudioChoices && !multiaudioChoices && selected.kind !== 'hls' && <p className="text-xs text-white/50">Esta fuente ofrece una sola versión de audio declarada; no se inventan otros idiomas.</p>}
    {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200" role="alert">{error}</p>}
  </div>
}
