import { Link } from 'react-router-dom'
import ControlledPlayer from '../components/ControlledPlayer.jsx'

const preferWebM = typeof document !== 'undefined' && Boolean(document.createElement('video').canPlayType('video/webm; codecs="vp9, opus"'))
const ext = preferWebM ? 'webm' : 'mp4'

const DEMO = {
  title: 'Laboratorio audiovisual — prueba propia',
  renditions: [
    { id: 'es', language: 'es-419', label: 'Español latino (demo)', kind: 'file', url: `/audiolab/idiomas-es.${ext}` },
    { id: 'en', language: 'en', label: 'Inglés (demo)', kind: 'file', url: `/audiolab/idiomas-en.${ext}` },
  ],
  subtitles: [
    { language: 'es', label: 'Español', url: '/audiolab/idiomas.es.vtt' },
    { language: 'en', label: 'Inglés', url: '/audiolab/idiomas.en.vtt' },
  ],
}

export default function AudioLabPage() {
  return <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-32 text-white sm:px-6">
    <Link to="/" className="text-xs text-white/60 hover:text-white">← Volver al inicio</Link>
    <div className="mb-7 mt-6 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-red-300">Prueba técnica local</p>
      <h1 className="text-3xl font-black sm:text-4xl">Audio y subtítulos seleccionables</h1>
      <p className="max-w-2xl text-sm leading-6 text-white/65">Esta demostración incluye dos videos de prueba creados para el proyecto y dos archivos WebVTT. Cambia de idioma y activa/desactiva subtítulos sin depender de servidores de películas.</p>
    </div>
    <ControlledPlayer entry={DEMO} />
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[.04] p-5 text-sm leading-6 text-white/70">
      <h2 className="mb-2 font-bold text-white">Qué demuestra y qué no</h2>
      <p>Demuestra cambios entre pistas preparadas y subtítulos reales con archivos propios. No añade automáticamente doblajes a películas comerciales, no comprueba contenidos de VidCore/VidFast/VidRock y no elimina DRM.</p>
    </div>
  </div>
}
