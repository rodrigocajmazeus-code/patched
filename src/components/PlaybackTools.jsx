import { useEffect, useMemo, useState } from 'react'
import {
  episodeSupportKey,
  ISSUE_CHOICES,
  LANGUAGE_CHOICES,
  normalizeExternalWatchUrl,
  readEpisodeSupport,
  saveEpisodeSupport,
} from '../player/episodeSupport.js'

export default function PlaybackTools({ mediaType, id, season, episode, providerId, onReload }) {
  const request = useMemo(() => ({ mediaType, id, season, episode }), [mediaType, id, season, episode])
  const scope = episodeSupportKey(request)
  const [record, setRecord] = useState(() => readEpisodeSupport(request))
  const [draftUrl, setDraftUrl] = useState(record.externalUrl)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const next = readEpisodeSupport(request)
    setRecord(next)
    setDraftUrl(next.externalUrl)
    setMessage('')
  }, [scope])

  const current = record.providers?.[providerId] || {}
  const issue = ISSUE_CHOICES.some(c => c.value === current.issue) ? current.issue : 'untested'
  const language = LANGUAGE_CHOICES.some(c => c.value === current.language) ? current.language : 'unknown'

  const persist = (next) => {
    setRecord(next)
    if (!saveEpisodeSupport(request, next)) {
      setMessage('El navegador no permitió guardar los datos; esta sesión podría perderlos.')
    } else {
      setMessage('Guardado en este navegador.')
    }
  }

  const updateSource = (field, value) => {
    if (!providerId) return
    const providers = {
      ...record.providers,
      [providerId]: { ...current, [field]: value, checkedAt: new Date().toISOString() },
    }
    persist({ ...record, providers })
  }

  const saveExternal = () => {
    if (!draftUrl.trim()) {
      persist({ ...record, externalUrl: '' })
      setMessage('Enlace externo eliminado de este episodio.')
      return
    }
    const normalized = normalizeExternalWatchUrl(draftUrl)
    if (!normalized) {
      setMessage('Enlace inválido. Usa una dirección HTTPS completa de una página que conozcas.')
      return
    }
    persist({ ...record, externalUrl: normalized })
    setDraftUrl(normalized)
  }

  const copyReport = async () => {
    const ep = mediaType === 'tv' ? `T${season}E${episode}` : 'Película'
    const line = [
      `PATCHED · ${mediaType} ${id} · ${ep}`,
      `Fuente: ${providerId || 'sin elegir'}`,
      `Resultado: ${ISSUE_CHOICES.find(c => c.value === issue)?.label}`,
      `Idioma: ${LANGUAGE_CHOICES.find(c => c.value === language)?.label}`,
      `Observación: manual; no es una verificación automática de PATCHED.`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(line)
      setMessage('Informe copiado. Puedes pegarlo en el chat para revisar el fallo.')
    } catch {
      setMessage('No se pudo copiar. Revisa los permisos del navegador.')
    }
  }

  return (
    <section className="mx-auto w-full max-w-screen-2xl border-b border-white/10 bg-[#141d19] px-4 py-3 sm:px-6 lg:px-10" aria-label="Herramientas de reproducción">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onReload}
          className="min-h-10 rounded-md border border-brand/40 bg-brand/10 px-4 text-xs font-bold text-cream hover:bg-brand/20">
          ↻ Recargar reproductor
        </button>
        <details className="w-full sm:w-auto sm:min-w-[320px] rounded-md border border-white/15 bg-white/5 px-3 py-2">
          <summary className="text-xs font-bold text-cream">Idioma, fallos y enlace externo ▾</summary>
          <div className="mt-4 grid gap-3 text-xs sm:min-w-[380px]">
            <p className="leading-5 text-mist">Si una fuente se detiene, recárgala y adelanta manualmente hasta el punto del fallo. PATCHED no puede recuperar por sí solo el video dentro de otro sitio.</p>
            <label className="grid gap-1">
              <span className="font-semibold text-cream">Resultado de esta opción en este episodio</span>
              <select value={issue} disabled={!providerId} onChange={(e) => updateSource('issue', e.target.value)}
                className="w-full border border-white/20 bg-surface p-2 text-cream">
                {ISSUE_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="font-semibold text-cream">Idioma que comprobaste escuchando</span>
              <select value={language} disabled={!providerId} onChange={(e) => updateSource('language', e.target.value)}
                className="w-full border border-white/20 bg-surface p-2 text-cream">
                {LANGUAGE_CHOICES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={copyReport}
              className="min-h-10 rounded-md border border-white/20 px-3 font-semibold text-cream hover:bg-white/10">
              Copiar diagnóstico de este episodio
            </button>
            <div className="mt-1 border-t border-white/10 pt-3">
              <p className="font-semibold text-cream">Enlace externo para este episodio</p>
              <p className="mt-1 leading-5 text-mist">Pega una página que hayas probado personalmente. PATCHED la guardará solo en este navegador y la abrirá fuera del reproductor; no la incrusta ni verifica sus idiomas.</p>
              <input type="url" value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)}
                autoComplete="off" placeholder="https://ejemplo.com/ver/episodio" aria-label="Enlace externo comprobado"
                className="mt-2 w-full border border-white/20 bg-[#0e1511] px-3 py-2 text-cream" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={saveExternal}
                  className="min-h-10 rounded-md bg-brand px-3 font-bold text-black hover:bg-brand-hover">Guardar enlace</button>
                {record.externalUrl && <a href={record.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center rounded-md border border-white/20 px-3 font-semibold text-cream hover:bg-white/10">
                  Abrir enlace externo ↗
                </a>}
              </div>
            </div>
          </div>
        </details>
      </div>
      {message && <p role="status" className="mt-2 text-xs text-mist">{message}</p>}
      <p className="mt-2 text-[11px] leading-4 text-mist">Las comprobaciones son tuyas, por capítulo y fuente. No se comparten entre dispositivos ni demuestran disponibilidad permanente.</p>
    </section>
  )
}
