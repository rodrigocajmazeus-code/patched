import { useState } from 'react'
import { useProvider } from '../context/ProviderContext.jsx'
import { providerContinuityScope } from '../player/providerContinuity.js'
import { readRememberedProvider, saveRememberedProvider } from '../player/providerMemory.js'
import { applyPreferredOrder, optionsForPreference, selectEpisodeProvider } from '../player/providerSelection.js'

export function useEpisodeProvider(request) {
  const context = useProvider()
  const { providers, playbackPreference, excludedProviders, restrictedFrames } = context
  const providerOptions = optionsForPreference(context.providerOptions, playbackPreference)
  const scope = providerContinuityScope({
    ...request, playbackPreference, providers, excludedProviders, providerOptions,
  })
  const [manual, setManual] = useState(null)
  const selection = applyPreferredOrder(selectEpisodeProvider({ request, preference: playbackPreference, providers,
    options: providerOptions, excluded: excludedProviders, restricted: restrictedFrames }), playbackPreference, restrictedFrames)
  const manualActive = manual?.scope === scope && (!manual.providerId ||
    selection.candidates.some(candidate => candidate.providerId === manual.providerId && candidate.available))
  const remembered = readRememberedProvider(request)
  const rememberedAvailable = remembered &&
    selection.candidates.some(c => c.providerId === remembered && c.available)
  const providerId = manualActive ? manual.providerId : rememberedAvailable ? remembered : selection.providerId
  const setProvider = id => {
    if (id && !selection.candidates.some(c => c.providerId === id && c.available)) return
    setManual({ scope, providerId: id || null })
    saveRememberedProvider(request, id || null)
    if (id) context.setProvider(id)
  }
  return { ...context, providerOptions, providerId, setProvider, selection,
    selectionReason: manualActive ? (providerId ? 'Fuente elegida manualmente. Tu preferencia se conserva; el idioma real debe comprobarse dentro del reproductor.' : 'Elige otra fuente explícitamente. No se cambia el idioma solicitado.') : selection.reason }
}
