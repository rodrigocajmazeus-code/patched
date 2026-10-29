// A small, editorial directory of recognisable channels and official viewing destinations.
// A listing never asserts that PATCHED has a licensed or verified stream.
const MOVISTAR = 'https://www.movistar.com.pe/tv-en-vivo'
const MOVISTAR_APP = 'https://www.movistar.com.pe/movistar-tv-app'
const DISNEY = 'https://www.disneyplus.com/'
const official = (id, name, category, url, note, extra = {}) =>
  ({ id, name, category, access: 'web', links: [{ label: 'Abrir transmisión o portal oficial', url }], note, ...extra })
const cable = (id, name, category, channelNumber, note = '') =>
  ({ id, name, category, access: 'operator', number: channelNumber,
    links: [{ label: 'Ver opciones de Movistar TV', url: MOVISTAR_APP },
      { label: 'Consultar parrilla oficial', url: MOVISTAR }],
    note: note || 'El canal se ofrece según plan y operador; no hay emisión gratuita integrada.' })
const espn = (id, name, number) =>
  ({ id, name, category: 'deportes', access: 'premium', number,
    links: [{ label: 'Ver deportes en Disney+ Premium', url: DISNEY },
      { label: 'Consultar Movistar TV App', url: MOVISTAR_APP }],
    note: 'ESPN por streaming requiere el plan Premium de Disney+ en Latinoamérica. La oferta exacta depende del territorio y el operador.' })

export const FEATURED_CHANNELS = Object.freeze([
  official('tvperu', 'TVPerú', 'peru', 'https://www.tvperu.gob.pe/play',
    'La televisión pública tiene su plataforma TVPerú Play, con señal en vivo.',
    { featured: true }),
  official('atv', 'ATV', 'peru', 'https://www.atv.pe/envivo-atv/',
    'ATV publica una señal en vivo gratuita desde su web oficial.', { featured: true }),
  official('panamericana', 'Panamericana TV', 'peru', 'https://panamericana.pe/tvenvivo',
    'Panamericana ofrece señal en vivo gratuitamente en su sitio.', { featured: true }),
  official('latina', 'Latina TV', 'peru', 'https://www.latina.pe/',
    'La web oficial de Latina muestra sus señales en vivo.', { featured: true }),
  official('america', 'América TV', 'peru', 'https://tvgo.americatv.com.pe/',
    'La plataforma oficial América tvgo ofrece acceso a su señal; ciertas funciones pueden requerir cuenta.'),
  official('ipe', 'Canal IPe', 'infantil', 'https://www.tvperu.gob.pe/play',
    'Canal público infantil del IRTP; revisa la sección en vivo en TVPerú Play.'),
  official('pluto', 'Pluto TV', 'gratis', 'https://plutotv.com.pe/',
    'Servicio FAST gratuito: series, películas, noticias y canales de entretenimiento. No es Disney Channel ni ESPN.',
    { featured: true }),
  official('plex', 'Plex TV gratis', 'gratis', 'https://www.plex.tv/es/watch-free-tv/',
    'TV gratuita con publicidad. La lista de canales puede variar por región y no incluye las señales premium de cable.'),
  official('samsung', 'Samsung TV Plus', 'gratis', 'https://www.samsung.com/pe/tvs/smart-tv/samsung-tv-plus/',
    'Televisión gratuita en dispositivos Samsung compatibles; disponibilidad según equipo y región.'),

  { ...cable('disney', 'Disney Channel', 'infantil', '412'), featured: true },
  cable('disney-junior', 'Disney Junior', 'infantil', '416'),
  cable('cartoon-network', 'Cartoon Network', 'infantil', '402'),
  cable('discovery-kids', 'Discovery Kids', 'infantil', '404'),
  cable('cartoonito', 'Cartoonito', 'infantil', '408'),
  cable('nickelodeon', 'Nickelodeon', 'infantil', '410'),
  cable('tooncast', 'Tooncast', 'infantil', '418'),
  cable('nickjr', 'Nick Jr.', 'infantil', '427'),
  cable('dreamworks', 'DreamWorks', 'infantil', '404'),

  { ...espn('espn', 'ESPN', '502'), featured: true },
  espn('espn2', 'ESPN 2', '503'),
  espn('espn3', 'ESPN 3', '504'),
  espn('espn4', 'ESPN 4', '505'),
  espn('espn5', 'ESPN 5', '506'),
  espn('espn6', 'ESPN 6', '507'),
  espn('espn7', 'ESPN 7', '508'),
  { id: 'espn-premium', name: 'ESPN Premium (Argentina)', category: 'deportes', access: 'premium',
    links: [{ label: 'Consultar Disney+ y programación ESPN', url: DISNEY }],
    note: 'Canal del mercado argentino; no equivale a un canal abierto de Perú ni se garantiza en tu plan.' },

  cable('hbo', 'HBO', 'peliculas', '820'),
  cable('hbo-plus', 'HBO Plus', 'peliculas', '826'),
  cable('hbo-family', 'HBO Family', 'peliculas', '823'),
  cable('tnt', 'TNT', 'peliculas', '102'),
  cable('tnt-series', 'TNT Series', 'peliculas', '103'),
  cable('warner', 'Warner Channel', 'peliculas', '106'),
  cable('fx', 'FX', 'peliculas', '109'),
  cable('star', 'Star Channel', 'peliculas', '108'),
  cable('natgeo', 'National Geographic', 'peliculas', '206'),
])

export const FEATURED_TV_FILTERS = Object.freeze([
  { id: 'destacados', label: 'Destacados' },
  { id: 'todos', label: 'Todos' },
  { id: 'peru', label: 'TV peruana' },
  { id: 'infantil', label: 'Infantiles' },
  { id: 'deportes', label: 'Deportes' },
  { id: 'peliculas', label: 'Series y películas' },
  { id: 'gratis', label: 'TV gratis' },
])

export const TV_ACCESS = Object.freeze({
  web: { title: 'Portal oficial', description: 'Acceso a la web de la cadena; la señal se reproduce allí si está disponible.' },
  operator: { title: 'TV de operador', description: 'Necesita un servicio de TV que incluya el canal.' },
  premium: { title: 'Suscripción', description: 'Requiere un plan o plataforma de pago compatible.' },
})

export function filterFeaturedChannels(channels, { category = 'destacados', query = '', freeOnly = false } = {}) {
  const normalized = String(query).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return channels.filter(channel => {
    if (freeOnly && channel.access !== 'web') return false
    if (category === 'destacados' && !channel.featured && !normalized) return false
    if (!['destacados', 'todos'].includes(category) && channel.category !== category) return false
    if (normalized) {
      const label = (channel.name + ' ' + channel.note).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      if (!label.includes(normalized)) return false
    }
    return true
  })
}
