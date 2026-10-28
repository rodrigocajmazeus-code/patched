// Fuentes públicas de demostración y páginas oficiales. Las señales oficiales se
// abren en su sitio de origen hasta tener permiso y una integración documentada.
export const LIVE_TEST_SOURCES = [
  {
    id: 'akamai-live',
    name: 'Prueba en directo · Akamai',
    detail: 'Transmisión HLS de laboratorio. No es un canal de televisión comercial.',
    url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
  },
  {
    id: 'akamai-eight',
    name: 'Prueba alternativa · Akamai',
    detail: 'Segunda fuente HLS pública para comparar búfer y estabilidad.',
    url: 'https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8',
  },
]

export const OFFICIAL_LIVE_CHANNELS = [
  {
    id: 'tvperu',
    name: 'TVPerú',
    kind: 'Televisión pública · Perú',
    url: 'https://www.irtpplay.gob.pe/tvperu/envivo',
  },
  {
    id: 'ipe',
    name: 'Canal IPe',
    kind: 'Cultura y educación · Perú',
    url: 'https://www.irtpplay.gob.pe/canalipe/envivo',
  },
  {
    id: 'nasa',
    name: 'NASA Live',
    kind: 'Ciencia y espacio · Internacional',
    url: 'https://www.nasa.gov/live/',
  },
]

// Rechaza protocolos peligrosos, credenciales en URL y enlaces no HLS.
// Solo se valida la forma de la URL; el navegador verificará permisos y CORS.
export function parseLiveHlsUrl(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { ok: false, error: 'Introduce una URL HLS.' }
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') {
      return { ok: false, error: 'La fuente debe utilizar HTTPS.' }
    }
    if (parsed.username || parsed.password) {
      return { ok: false, error: 'No introduzcas credenciales en la URL.' }
    }
    if (!/\.m3u8$/i.test(parsed.pathname)) {
      return { ok: false, error: 'Se necesita una URL de manifiesto .m3u8.' }
    }
    return { ok: true, url: parsed.href }
  } catch {
    return { ok: false, error: 'La URL no es válida.' }
  }
}
