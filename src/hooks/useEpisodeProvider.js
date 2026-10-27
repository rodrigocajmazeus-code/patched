import { useState } from 'react'
import { useProvider } from '../context/ProviderContext.jsx'
import { applyPreferredOrder, optionsForPreference, selectEpisodeProvider } from '../player/providerSelection.js'

export function useEpisodeProvider(request) {
  const context = useProvider()
  const { providers, playbackPreference, excludedProviders, restrictedFrames } = context
  const providerOptions = optionsForPreference(context.providerOptions, playbackPreference)
  const scope = JSON.stringify([request.mediaType, request.id, request.season, request.episode,
    playbackPreference, providers.map(p => p.id), excludedProviders, providerOptions, restrictedFrames])
  const [manual, setManual] = useState(null)
  const selection = applyPreferredOrder(selectEpisodeProvider({ request, preference: playbackPreference, providers,
    options: providerOptions, excluded: excludedProviders, restricted: restrictedFrames }), playbackPreference, restrictedFrames)
  const manualActive = manual?.scope === scope
  const providerId = manualActive ? manual.providerId : selection.providerId
  const setProvider = id => {
    if (id && !selection.candidates.some(c => c.providerId === id && c.available)) return
    setManual({ scope, providerId: id || null })
    if (id) context.setProvider(id)
  }
  return { ...context, providerOptions, providerId, setProvider, selection,
    selectionReason: manualActive ? (providerId ? 'Fuente elegida manualmente. Tu preferencia se conserva; el idioma real debe comprobarse dentro del reproductor.' : 'Elige otra fuente explícitamente. No se cambia el idioma solicitado.') : selection.reason }
}
