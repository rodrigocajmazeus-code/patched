// Solo pruebas aisladas. Ningún iframe se declara libre de anuncios por marketing.
// El laboratorio nunca promueve automáticamente un proveedor a PATCHED.
export const LAB_SOURCES = Object.freeze([
  { id: 'stellar', name: 'Stellar', origin: 'https://stellar.rip',
    documentation: 'https://stellar.rip/en/api', referrerPolicy: 'strict-origin-when-cross-origin',
    note: 'Interfaz en español; el idioma de la pista depende del video. Eventos documentados.' },
  { id: 'vidnest', name: 'VidNest', origin: 'https://vidnest.fun',
    documentation: 'https://vidnest.fun/', referrerPolicy: 'strict-origin-when-cross-origin',
    note: 'Agregador de servidores; la pista de audio y los anuncios no están verificados.' },
  { id: 'vidcore-org', name: 'VidCore.org', origin: 'https://vidcore.org',
    documentation: 'https://vidcore.org/', referrerPolicy: 'strict-origin-when-cross-origin',
    note: 'No confundir con vidcore.net. Sus promesas de cero anuncios no están verificadas.' },
  { id: 'embedwave', name: 'EmbedWave', origin: 'https://embedwave.cc',
    documentation: 'https://embedwave.cc/docs', referrerPolicy: 'no-referrer',
    note: 'Usa servidores externos: no se presume que sean todos libres de anuncios.' },
])
function numeric(value, min) {
  if (!/^(0|[1-9]\d*)$/.test(String(value))) throw new TypeError('Se requiere un número entero válido.')
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < min) throw new TypeError('Identificador o capítulo inválido.')
  return number
}
export function sourceLabUrl(sourceId, request) {
  const source = LAB_SOURCES.find(item => item.id === sourceId)
  if (!source) throw new TypeError('Proveedor desconocido.')
  if (request.mediaType !== 'movie' && request.mediaType !== 'tv') throw new TypeError('Tipo inválido.')
  const id = numeric(request.id, 1)
  const isTv = request.mediaType === 'tv'
  const season = isTv ? numeric(request.season, 0) : null
  const episode = isTv ? numeric(request.episode, 1) : null
  const lang = request.locale === 'es-ES' ? 'es-ES' : 'es-419'
  const suffix = isTv ? '/tv/' + id + '/' + season + '/' + episode : '/movie/' + id
  switch (sourceId) {
    case 'stellar': return 'https://stellar.rip/' + lang + '/watch/embed/' +
      (isTv ? 'tv/' + id + '-' + season + '-' + episode : 'movie/' + id) + '?autoPlay=false'
    case 'vidnest': return 'https://vidnest.fun' + suffix
    case 'vidcore-org': return 'https://vidcore.org/embed' + suffix
    case 'embedwave': return 'https://embedwave.cc/embed' + suffix
    default: throw new TypeError('Proveedor desconocido.')
  }
}
export function labSourceFromId(id) {
  return LAB_SOURCES.find(source => source.id === id) || null
}
export function labEvidenceKey(sourceId, request) {
  return [sourceId, request.mediaType, request.id,
    request.mediaType === 'tv' ? request.season : '',
    request.mediaType === 'tv' ? request.episode : ''].join(':')
}
