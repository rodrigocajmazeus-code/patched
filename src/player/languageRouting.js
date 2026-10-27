// What StreamBox can REQUEST through the public URL, not what users hear.
// Provider-internal track selectors cannot be read or controlled cross-origin.
const REQUESTED_MOVIEMASTER = Object.freeze({
  'es-419': 'LAT',
  'es-ES': 'ESP',
  'ja-es': 'SUB',
  ja: 'SUB',
})

export function languageRouting(providerId, preference, requestedVariant = null) {
  if (!providerId) return { mode: 'none', message: 'Elige un servidor para intentar reproducir este episodio.' }
  if (preference === 'manual') return {
    mode: 'manual', message: 'Elección manual: utiliza los controles de idioma del reproductor si existen.',
  }
  if (providerId === 'moviemaster') {
    const variant = REQUESTED_MOVIEMASTER[preference] || requestedVariant
    return { mode: 'requested-variant', variant, message: `StreamBox solicitó ${variant} a MovieMaster. Su selector interno es independiente y puede ofrecer o reproducir otra pista. ${variant === 'SUB' ? 'SUB no garantiza inglés ni japonés con subtítulos españoles.' : 'La etiqueta no demuestra el audio escuchado.'}` }
  }
  if (providerId === 'vidcloud') return {
    mode: 'provider-controlled', message: 'VidCloud gestiona sus pistas dentro del reproductor. StreamBox no confirma aquí el audio o los subtítulos.',
  }
  return {
    mode: 'provider-controlled', message: 'Este servidor no ofrece a StreamBox un control verificable del idioma por URL. Cambia audio y subtítulos dentro del reproductor si están disponibles.',
  }
}

export function nextAvailableProvider(providerId, candidates, preferredOrder) {
  const available = new Set(candidates.filter(c => c.available).map(c => c.providerId))
  const order = preferredOrder.filter(id => available.has(id))
  if (order.length < 2) return null
  const current = order.indexOf(providerId)
  return order[(current + 1 + order.length) % order.length]
}
