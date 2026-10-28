import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIptvCatalog, filterIptvCatalog, isDirectHlsCandidate,
  safeHttpsUrl, SPANISH_FOCUS_COUNTRIES,
} from '../src/data/iptvCatalog.js'

const fixture = {
  channels: [
    { id: 'PeruCanal.pe', name: 'Perú Canal', country: 'PE', categories: ['news'], is_nsfw: false },
    { id: 'Espana.es', name: 'España Canal', country: 'ES', categories: ['sports'], is_nsfw: false },
    { id: 'USA.us', name: 'USA Canal', country: 'US', categories: ['science'], is_nsfw: false },
    { id: 'Adult.pe', name: 'Adult', country: 'PE', categories: ['general'], is_nsfw: true },
    { id: 'Closed.pe', name: 'Closed', country: 'PE', closed: '2020-01-01' },
    { id: 'Replaced.pe', name: 'Replaced', country: 'PE', replaced_by: 'PeruCanal.pe' },
  ],
  feeds: [
    { channel: 'PeruCanal.pe', id: 'main', languages: ['spa'] },
    { channel: 'Espana.es', id: 'main', languages: ['spa'] },
    { channel: 'USA.us', id: 'main', languages: ['eng'] },
  ],
  streams: [
    { channel: 'PeruCanal.pe', feed: 'main', title: 'Señal HD', quality: '720p', url: 'https://cdn.test/stream.m3u8?key=test' },
    { channel: 'PeruCanal.pe', feed: 'main', title: 'Señal Repetida', url: 'https://cdn.test/stream.m3u8?key=test' },
    { channel: 'Espana.es', feed: 'main', url: 'https://cdn.test/protected.m3u8', referrer: 'https://web.test' },
    { channel: 'USA.us', feed: 'main', url: 'https://cdn.test/usa.m3u8' },
    { channel: 'Adult.pe', url: 'https://cdn.test/adult.m3u8' },
  ],
  countries: [
    { code: 'PE', name: 'Perú', flag: '🇵🇪' }, { code: 'ES', name: 'España', flag: '🇪🇸' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  ],
  languages: [{ code: 'spa', name: 'Spanish' }, { code: 'eng', name: 'English' }],
  categories: [{ id: 'news', name: 'News' }, { id: 'sports', name: 'Sports' }],
  logos: [{ channel: 'PeruCanal.pe', in_use: true, url: 'https://cdn.test/logo.png' }],
}

test('URL: se permite solamente HTTPS sin credenciales', () => {
  assert.equal(safeHttpsUrl('https://example.org/channel'), 'https://example.org/channel')
  for (const url of ['ftp://example.org/x', 'http://example.org/x', 'javascript:alert(1)',
    'https://a:b@example.org/channel', 'data:image/svg+xml,x', 'no hay url']) {
    assert.equal(safeHttpsUrl(url), '')
  }
})

test('HLS: solo streams compatibles sin cabeceras especiales', () => {
  assert.equal(isDirectHlsCandidate({ url: 'https://live.org/a.m3u8?token=abc' }), true)
  assert.equal(isDirectHlsCandidate({ url: 'https://live.org/a.mp4' }), false)
  assert.equal(isDirectHlsCandidate({ url: 'http://live.org/a.m3u8' }), false)
  assert.equal(isDirectHlsCandidate({ url: 'https://live.org/a.m3u8', user_agent: 'custom' }), false)
  assert.equal(isDirectHlsCandidate({ url: 'https://live.org/a.m3u8', referrer: 'https://other.org' }), false)
})

test('une metadatos y fuentes, excluye NSFW y canales cerrados', () => {
  const catalog = buildIptvCatalog(fixture)
  assert.deepEqual(catalog.map(x => x.id).sort(), ['Espana.es', 'PeruCanal.pe', 'USA.us'])
  const peru = catalog.find(x => x.country === 'PE')
  assert.equal(peru.countryName, 'Perú')
  assert.equal(peru.flag, '🇵🇪')
  assert.equal(peru.sources.length, 1)
  assert.equal(peru.streamsCount, 2)
  assert.equal(peru.sources[0].quality, '720p')
  assert.deepEqual(peru.languages, [{ code: 'spa', name: 'Spanish' }])
  assert.equal(peru.logo, 'https://cdn.test/logo.png')
  const espana = catalog.find(x => x.country === 'ES')
  assert.equal(espana.hasHlsCandidate, false)
  assert.equal(espana.streamsCount, 1)
})

test('filtros de búsqueda internacional, categoría, idioma y favoritos', () => {
  const catalog = buildIptvCatalog(fixture)
  assert.equal(filterIptvCatalog(catalog, { scope: 'focus' }).length, 2)
  assert.deepEqual(filterIptvCatalog(catalog, { scope: 'world', onlyHls: true })
    .map(x => x.country).sort(), ['PE', 'US'])
  assert.deepEqual(filterIptvCatalog(catalog, { scope: 'world', query: 'peru' })
    .map(x => x.country), ['PE'])
  assert.deepEqual(filterIptvCatalog(catalog, { scope: 'world', category: 'science' })
    .map(x => x.country), ['US'])
  assert.deepEqual(filterIptvCatalog(catalog, { scope: 'world', language: 'eng' })
    .map(x => x.country), ['US'])
  assert.deepEqual(filterIptvCatalog(catalog, { scope: 'favorites', favorites: ['PeruCanal.pe'] })
    .map(x => x.country), ['PE'])
  assert.equal(SPANISH_FOCUS_COUNTRIES.includes('PE'), true)
  assert.equal(SPANISH_FOCUS_COUNTRIES.includes('ES'), true)
})

test('datos corruptos producen un error explícito', () => {
  assert.throws(() => buildIptvCatalog({ channels: null, streams: [] }), TypeError)
})
