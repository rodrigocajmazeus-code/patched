import { buildFacilitoplayUrl, parseFacilitoplayEvent } from './providers/facilitoplay.js'

const cases = {
  inception: { mediaType: 'movie', id: 27205 },
  breakingbad: { mediaType: 'tv', id: 1396, season: 1, episode: 1 },
  aot: { mediaType: 'tv', id: 1429, season: 1, episode: 1 },
  kimetsu: { mediaType: 'tv', id: 85937, season: 1, episode: 1 },
}
const $ = id => document.getElementById(id)
const storageKey = 'facilitoplay.isolated-lab.observations.v2'
let records = []
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
  if (Array.isArray(saved)) records = saved.slice(-500)
} catch { /* Storage can be unavailable; JSON export remains usable. */ }
$('log').textContent = JSON.stringify(records, null, 2)
let frameLoaded = false
let current, frame, timer, generation = 0
const status = text => { $('status').textContent = text }
function log(kind, detail = {}) {
  if (records.length >= 500) records.shift()
  records.push({ at: new Date().toISOString(), request: current, kind, ...detail })
  $('log').textContent = JSON.stringify(records, null, 2)
  try { localStorage.setItem(storageKey, JSON.stringify(records)) } catch { /* Non-blocking. */ }
}
function stop() {
  generation++
  clearTimeout(timer)
  frame?.remove()
  frame = null
  frameLoaded = false
}
$('open').onclick = () => {
  stop()
  current = { ...cases[$('case').value] }
  const url = buildFacilitoplayUrl(current)
  $('notes').value = ''
  $('result').value = 'unverified'
  $('playback').value = 'unobserved'
  $('identity').value = 'unobserved'
  $('audio').value = ''
  $('subtitles').value = ''
  $('frame-status').textContent = 'Carga de iframe: pendiente.'
  $('feedback').textContent = ''
  $('request').textContent = `Solicitado: ${JSON.stringify(current)} · ${url}`
  status('Conectando; reproducción sin verificar')
  const token = generation
  frame = document.createElement('iframe')
  frame.title = `FacilitoPlay · ${$('case').selectedOptions[0].textContent}`
  frame.allow = 'autoplay; fullscreen; picture-in-picture'
  frame.allowFullscreen = true
  frame.referrerPolicy = 'strict-origin-when-cross-origin'
  frame.onload = () => {
    if (token !== generation) return
    frameLoaded = true
    $('frame-status').textContent = 'Evento load del iframe recibido; no confirma el video ni que la página interna haya cargado correctamente.'
    // Do not overwrite a stronger provider error/ready signal with iframe.onload.
    log('frame-loaded', { playbackVerified: false })
  }
  frame.onerror = () => {
    if (token !== generation) return
    status('Error de iframe; reproducción sin verificar')
    log('frame-error')
  }
  frame.src = url
  $('screen').replaceChildren(frame)
  log('request', { url, origin: location.origin })
  timer = setTimeout(() => {
    status('Sin señal del proveedor tras 20 s; revisar el iframe. Reproducción sin verificar.')
    log('no-signal', { seconds: 20 })
  }, 20000)
}
$('stop').onclick = () => { log('stopped', { frameLoaded }); stop(); $('screen').textContent = 'Iframe detenido'; $('frame-status').textContent = 'Iframe detenido.'; status('Detenido'); current = null }
window.addEventListener('message', event => {
  if (!frame || !current) return
  const parsed = parseFacilitoplayEvent(event, frame.contentWindow, current)
  if (!parsed) return
  clearTimeout(timer)
  log('provider-event', parsed)
  if (!parsed.identityMatches) {
    status('Identidad reportada diferente o incompleta: reproducción correcta sin verificar')
    return
  }
  const messages = {
    ready: 'Proveedor listo; reproducción e identidad audiovisual sin verificar',
    play: 'Proveedor informa play; confirmar imagen, audio e identidad manualmente',
    time: 'Proveedor informa avance; identidad audiovisual y audio aún requieren comprobación',
    pause: 'Proveedor informa pausa', ended: 'Proveedor informa finalización',
    unavailable: 'Proveedor informa contenido no disponible', error: 'Proveedor informa error de reproducción',
  }
  status(messages[parsed.event] + (parsed.reason ? ` · ${parsed.reason}` : ''))
})
$('record').onclick = () => {
  if (!frame || !current) { $('feedback').textContent = 'Abre un caso primero.'; return }
  if (!$('notes').value.trim()) { $('feedback').textContent = 'Describe evidencia antes de registrar.'; return }
  log('manual-observation', {
    result: $('result').value, notes: $('notes').value.trim(), frameLoaded,
    playback: $('playback').value, identity: $('identity').value,
    audio: $('audio').value.trim() || 'unobserved',
    subtitles: $('subtitles').value.trim() || 'unobserved',
    observer: 'manual',
  })
  $('feedback').textContent = 'Observación registrada para el título actualmente abierto.'
}
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ schema: 2, exportedAt: new Date().toISOString(), origin: location.origin, records }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = 'facilitoplay-observaciones.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
