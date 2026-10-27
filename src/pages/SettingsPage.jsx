import { useEffect, useState } from 'react'
import { useApiKey } from '../context/ApiKeyContext.jsx'
import { useProvider } from '../context/ProviderContext.jsx'
import { useMyList } from '../context/MyListContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { validateTmdbApiKey } from '../api/tmdb.js'
import { COUNTRIES } from '../data/countries.js'
import { SpinnerIcon } from '../components/icons.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { getEnabledProviders } from '../data/providers.js'
import { PLAYBACK_PREFERENCES } from '../player/providerSelection.js'

export default function SettingsPage() {
  const { experimentalEnabled, setExperimentalEnabled, movieMasterVariant, setMovieMasterVariant,
    playbackPreference, setPlaybackPreference, excludedProviders, setExcludedProviders, restrictedFrames, setRestrictedFrames } = useProvider()
  const { apiKey, updateApiKey, hasApiKey } = useApiKey()
  const { items } = useMyList()
  const { country, setCountry } = usePreferences()
  const [draft, setDraft] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { setDraft(apiKey) }, [apiKey])

  const saveKey = async () => {
    const nextKey = draft.trim()
    if (!nextKey) {
      setMessage({ type: 'error', text: 'Introduce una clave de TMDB antes de guardar.' })
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const valid = await validateTmdbApiKey(nextKey)
      if (!valid) {
        setMessage({ type: 'error', text: 'TMDB rechazó esta clave. Revísala y vuelve a intentarlo.' })
        return
      }

      updateApiKey(nextKey)
      setMessage({ type: 'success', text: 'Clave guardada. Actualizando el catálogo.' })
    } catch {
      setMessage({ type: 'error', text: 'No se pudo verificar la clave. Comprueba tu conexión.' })
    } finally {
      setSaving(false)
    }
  }

  const removeKey = () => {
    updateApiKey('')
    setDraft('')
    setMessage({ type: 'success', text: 'Clave eliminada. Añade tu clave para recuperar el catálogo.' })
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-brand">PATCHED</p>
      <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Configuración</h1>
      <p className="mt-1.5 text-sm text-mist">Gestiona la conexión del catálogo y tus títulos guardados.</p>

      {/* API Key Card */}
      <section aria-label="Motor experimental" className="mt-6 rounded-2xl border border-white/12 bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-extrabold text-white">Motor experimental</h2>
        <label className="mt-3 flex items-center gap-3 text-sm text-white">
          <input id="experimental-providers" type="checkbox" checked={experimentalEnabled} onChange={event => setExperimentalEnabled(event.target.checked)} />
          Habilitar VidCloud adicional (experimental)
        </label>
        <p className="mt-2 text-xs text-mist">Orden principal: MovieMaster → FacilitoPlay → VidRift. Prioridad de fuente no significa idioma confirmado. Los proveedores anteriores se conservan; VidCloud requiere una correspondencia revisada y elección manual.</p>
        <label htmlFor="moviemaster-variant" className="mt-4 block text-sm text-white">Variante solicitada a MovieMaster</label>
        <select id="moviemaster-variant" value={movieMasterVariant} onChange={event => setMovieMasterVariant(event.target.value)} className="mt-2 rounded border border-white/20 bg-surface p-2 text-white">
          <option value="LAT">Solicitar LAT (no confirma audio latino)</option>
          <option value="ESP">Solicitar ESP (no confirma castellano)</option>
          <option value="SUB">Solicitar SUB (no confirma japonés ni subtítulos)</option>
        </select>
        <p className="mt-2 text-xs text-mist">Esta variante se usa en modo manual. Con una preferencia de idioma explícita, la petición se alinea con ella (LAT, ESP o SUB), sin garantizar disponibilidad. MovieMaster puede sustituir la variante.</p>
        <label htmlFor="settings-playback-preference" className="mt-4 block text-sm text-white">Preferencia de reproducción</label>
        <select id="settings-playback-preference" className="mt-2 rounded border border-white/20 bg-surface p-2 text-white" value={playbackPreference} onChange={event => setPlaybackPreference(event.target.value)}>
          {PLAYBACK_PREFERENCES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="mt-2 text-xs text-mist">Se abre la primera fuente prioritaria habilitada, conservando el idioma solicitado y las advertencias. En modo manual esperará tu elección. Si un proveedor informa un fallo confirmado, PATCHED intentará la siguiente opción disponible; un iframe silencioso no implica que haya fallado.</p>
        <label className="mt-4 flex items-center gap-3 text-sm text-white">
          <input id="restricted-frames" type="checkbox" checked={restrictedFrames} onChange={event => setRestrictedFrames(event.target.checked)} />
          Probar restricciones de ventanas y navegación (experimental)
        </label>
        <p className="mt-2 text-xs text-mist">Puede romper reproductores; compatibilidad pendiente. No elimina publicidad interna. VidCloud y VidRift se deshabilitan en este modo porque documentan incompatibilidad; no se retiran restricciones silenciosamente. Apagado inicialmente para conservar las reproducciones comprobadas.</p>
        <fieldset className="mt-4 space-y-2 text-sm text-white">
          <legend>Excluir fuentes del reproductor principal (selección automática y manual)</legend>
          {getEnabledProviders(true).map(p => <label key={p.id} className="flex items-center gap-3">
            <input type="checkbox" aria-label={`Excluir ${p.id}`} checked={excludedProviders.includes(p.id)} onChange={event => setExcludedProviders(event.target.checked ? [...excludedProviders, p.id] : excludedProviders.filter(id => id !== p.id))} />
            {p.name}
          </label>)}
        </fieldset>
        <p className="mt-2 text-xs text-mist">FacilitoPlay tiene un reporte del usuario de publicidad molesta, con mecanismo no identificado. Sigue como alternativa en el orden elegido; puedes excluirlo, conservando tu elección de idioma.</p>
      </section>

      <div className="mt-6 rounded-2xl border border-white/12 bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white">Clave de TMDB</h2>
            <p className="mt-0.5 text-xs text-mist">Se utiliza para consultar los metadatos del catálogo</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[8px] font-black uppercase tracking-wider ${
              hasApiKey
                ? 'border-emerald-400/28 bg-emerald-400/8 text-cream'
                : 'border-white/12 bg-surface-light text-cream'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-mist'}`}
            />
            {hasApiKey ? 'Configurada' : 'Sin configurar'}
          </span>
        </div>

        <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.16em] text-mist">
          API Key
        </label>
        <div className="mt-2 flex overflow-hidden rounded-lg border border-white/12 bg-[#0d0d0d]">
          <input
            type={showKey ? 'text' : 'password'}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setMessage(null) }}
            placeholder="Introduce tu clave de TMDB v3"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="min-h-[48px] flex-1 px-3.5 text-sm text-white outline-none placeholder:text-mist"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="w-[60px] border-l border-white/12 text-[9px] font-black uppercase tracking-wider text-cream transition hover:bg-white/5"
          >
            {showKey ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-mist">
          Tu clave se guarda en este navegador y se envía directamente a TMDB.
        </p>

        {message && (
          <p
            className={`mt-2.5 text-xs leading-relaxed ${
              message.type === 'error' ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={saveKey}
            disabled={saving}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-brand text-sm font-black text-white transition hover:bg-brand-hover disabled:opacity-55"
          >
            {saving && <SpinnerIcon className="h-4 w-4" />}
            {saving ? 'Verificando…' : 'Guardar clave'}
          </button>
          {hasApiKey && (
            <button
              onClick={removeKey}
              disabled={saving}
              className="inline-flex min-h-[44px] min-w-[82px] items-center justify-center rounded-lg bg-surface-light text-sm font-extrabold text-cream transition hover:bg-white/10 disabled:opacity-55"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {/* País del catálogo Card */}
      <div className="mt-6 rounded-2xl border border-white/12 bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-white">País del catálogo</h2>
            <p className="mt-0.5 text-xs text-mist">
              Filtra las secciones de Inicio, Películas y Series por país.
            </p>
          </div>
        </div>

        <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.16em] text-mist">
          País
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mt-2 w-full cursor-pointer rounded-lg border border-white/12 bg-[#0d0d0d] px-3.5 py-3 text-sm font-bold text-white outline-none transition focus:border-brand"
        >
          <option value="">Todos los países</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        <p className="mt-2 text-[10px] leading-relaxed text-mist">
          Las tendencias se sustituyen por selecciones del país, porque TMDB no permite filtrarlas por región.
        </p>
      </div>

      {/* My List section */}
      <div className="mt-8 border-t border-white/8 pt-6">
        <div className="mb-4">
          <h2 className="text-xl font-black text-white sm:text-2xl">Mi lista</h2>
          <p className="mt-1 text-xs text-mist">
            {items.length} título guardado{items.length === 1 ? '' : 's'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-white/12 px-6 py-8 text-center">
            <p className="text-base font-extrabold text-cream">Todavía no hay títulos guardados</p>
            <p className="mt-1.5 max-w-sm text-xs text-mist">
              Usa el botón + de un título para guardarlo aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <MovieCard key={item.key} media={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
