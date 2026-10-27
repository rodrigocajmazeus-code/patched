import { useEffect, useMemo, useState } from 'react'
import { playbackReportScope, readPlaybackReport, savePlaybackReport } from '../player/playbackReports.js'

const AUDIO = [
  ['unknown', 'No lo comprobé'],
  ['es-419', 'Español latino'],
  ['es-ES', 'Castellano'],
  ['ja', 'Japonés'],
  ['en', 'Inglés'],
  ['other', 'Otro idioma'],
]
const SUBTITLES = [
  ['unknown', 'No lo comprobé'],
  ['es', 'Subtítulos españoles visibles'],
  ['other', 'Subtítulos de otro idioma'],
  ['none', 'Sin subtítulos visibles'],
]
const PICTURE = [
  ['unknown', 'No la evalué'],
  ['blurry', 'Borrosa / pixelada'],
  ['acceptable', 'Aceptable'],
  ['sharp', 'Nítida'],
]
const BUFFERING = [
  ['unknown', 'No lo evalué'],
  ['none', 'Sin pausas de carga'],
  ['sometimes', 'Algunas pausas'],
  ['often', 'Pausas frecuentes'],
]
const RESOLUTIONS = [
  ['unknown', 'No aparece / no comprobé'],
  ['360p', '360p'], ['480p', '480p'], ['720p', '720p'],
  ['1080p', '1080p'], ['1440p', '1440p'], ['2160p', '2160p (4K)'],
  ['other', 'Otra resolución indicada'],
]
const resultText = {
  works: 'Episodio y reproducción confirmados por ti',
  unavailable: 'Marcaste que no cargó',
  'wrong-content': 'Marcaste un título o episodio equivocado',
}

function localStorageIfAvailable() {
  try { return window.localStorage } catch { return null }
}

export default function PlaybackVerificationPanel({ mediaType, id, season, episode, providerId, requestedVariant }) {
  const scope = useMemo(() => ({ mediaType, id, season, episode, providerId, requestedVariant }), [mediaType, id, season, episode, providerId, requestedVariant])
  const scopeKey = playbackReportScope(scope)
  const [saved, setSaved] = useState(null)
  const [result, setResult] = useState('works')
  const [audio, setAudio] = useState('unknown')
  const [subtitles, setSubtitles] = useState('unknown')
  const [picture, setPicture] = useState('unknown')
  const [buffering, setBuffering] = useState('unknown')
  const [displayedResolution, setDisplayedResolution] = useState('unknown')
  const [error, setError] = useState('')

  useEffect(() => {
    const prior = readPlaybackReport(localStorageIfAvailable(), scope)
    setSaved(prior)
    setResult(prior?.result || 'works')
    setAudio(prior?.audio || 'unknown')
    setSubtitles(prior?.subtitles || 'unknown')
    setPicture(prior?.picture || 'unknown')
    setBuffering(prior?.buffering || 'unknown')
    setDisplayedResolution(prior?.displayedResolution || 'unknown')
    setError('')
  }, [scopeKey])

  const submit = event => {
    event.preventDefault()
    const record = savePlaybackReport(localStorageIfAvailable(), scope, { result, audio, subtitles, picture, buffering, displayedResolution })
    if (!record) { setError('No se pudo guardar en este navegador. Revisa los permisos de almacenamiento.'); return }
    setSaved(record)
    window.dispatchEvent(new Event('streambox:playback-report-saved'))
    setError('')
  }

  return (
    <details className="rounded-xl border border-white/15 bg-white/[.04] px-4 py-3 text-sm" aria-label="Registrar comprobación audiovisual">
      <summary className="cursor-pointer font-semibold text-white">
        {saved ? `Tu comprobación: ${resultText[saved.result]}` : '¿Funciona este episodio? Registrar audio y subtítulos'}
      </summary>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <p className="text-xs leading-5 text-mist">Solo guardamos tu comprobación para este título, episodio, servidor y variante. Abrir el iframe o ver la palabra «Latino» no es una confirmación.</p>
        <fieldset className="flex flex-wrap gap-3 text-xs text-white/90">
          <legend className="mb-2 font-bold">¿Qué ocurrió realmente?</legend>
          {[['works', 'Se ve y es el episodio correcto'], ['unavailable', 'No carga'], ['wrong-content', 'Contenido equivocado']].map(([value, label]) => (
            <label key={value} className="inline-flex items-center gap-1.5"><input type="radio" checked={result === value} onChange={() => setResult(value)} />{label}</label>
          ))}
        </fieldset>
        {result === 'works' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-white">Audio que escuchaste
              <select value={audio} onChange={event => setAudio(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-surface px-3 py-2 text-white">
                {AUDIO.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-white">Subtítulos que viste
              <select value={subtitles} onChange={event => setSubtitles(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-surface px-3 py-2 text-white">
                {SUBTITLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        )}
        {result === 'works' && <fieldset className="rounded-lg border border-white/10 bg-black/20 p-3">
          <legend className="px-1 text-xs font-bold text-white">Calidad observada (opcional)</legend>
          <p className="mb-3 text-xs text-mist">Mira 30–60 segundos en pantalla completa. La nitidez es tu percepción, no una medición de resolución. Solo indica 720p/1080p si el menú del proveedor lo muestra expresamente.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold text-white">Nitidez de imagen
              <select value={picture} onChange={event => setPicture(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-surface px-3 py-2 text-white">
                {PICTURE.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-white">Pausas durante reproducción
              <select value={buffering} onChange={event => setBuffering(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-surface px-3 py-2 text-white">
                {BUFFERING.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-white">Resolución indicada en el reproductor
              <select value={displayedResolution} onChange={event => setDisplayedResolution(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-surface px-3 py-2 text-white">
                {RESOLUTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </fieldset>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-xs font-black text-white hover:brightness-110">Guardar mi comprobación</button>
          {saved && <span className="text-xs text-emerald-300">Guardado solo en este navegador · {new Date(saved.checkedAt).toLocaleDateString('es-PE')}</span>}
        </div>
        {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
      </form>
    </details>
  )
}
