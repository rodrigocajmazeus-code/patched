import { MOVIEMASTER_CASES, buildMovieMasterUrl, parseMovieMasterEvent, initialEvidence, reduceEvidence } from './moviemaster.js'
import { VIDCLOUD_CASE, buildVidCloudUrl, parseVidCloudEvent } from './vidcloud.js'

const evaluationCases = { ...MOVIEMASTER_CASES, 'vidcloud-kimetsu-sub': VIDCLOUD_CASE }

const $ = id => document.getElementById(id)
const storageKey = 'streambox.isolated.moviemaster.v1'
const manualFields = ['playback', 'identity', 'heardAudio', 'subtitles', 'subtitleControl', 'observedVariant', 'fallback']
let records = [], frame = null, current = null, timer, generation = 0, runId = null, previousTime = null
let evidence = initialEvidence()
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
  if (Array.isArray(saved)) records = saved.slice(-500)
} catch { /* Export still works without local storage. */ }
function render() {
  $('evidence').textContent = JSON.stringify(evidence, null, 2)
  $('log').textContent = JSON.stringify(records, null, 2)
}
function log(kind, detail = {}) {
  if (records.length >= 500) records.shift()
  records.push({ at: new Date().toISOString(), runId, request: current, kind, ...detail })
  try { localStorage.setItem(storageKey, JSON.stringify(records)) } catch { /* Non-blocking. */ }
  render()
}
function stop() {
  generation++
  clearTimeout(timer)
  frame?.remove()
  frame = null
}
$('open').onclick = () => {
  stop()
  current = { ...evaluationCases[$('case').value] }
  runId = crypto.randomUUID()
  previousTime = null
  evidence = initialEvidence()
  for (const id of manualFields) $(id).value = id === 'observedVariant' ? '' : 'unobserved'
  $('notes').value = ''; $('feedback').textContent = ''
  $('frame-status').textContent = 'Evento load de iframe: pendiente.'
  $('signals').textContent = 'Señales del proveedor: sin observar.'
  $('status').textContent = 'Conectando. Audio, subtítulos, identidad y fallback sin verificar.'
  const url = current.providerId === 'vidcloud' ? buildVidCloudUrl(current) : buildMovieMasterUrl(current)
  const token = generation
  $('request').textContent = `${current.title} · solicitado ${current.requestedVariant} · ${url}`
  frame = document.createElement('iframe')
  frame.title = `${current.providerId} · ${current.title} · solicitar ${current.requestedVariant}`
  frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'
  frame.allowFullscreen = true
  frame.referrerPolicy = current.providerId === 'moviemaster' ? 'origin' : 'strict-origin-when-cross-origin'
  frame.onload = () => {
    if (token !== generation) return
    evidence = reduceEvidence(evidence, 'iframe-load')
    $('frame-status').textContent = 'Evento load recibido. No acredita reproducción ni éxito de la página interna.'
    log('iframe-load')
  }
  frame.onerror = () => {
    if (token !== generation) return
    $('status').textContent = 'Error de iframe. No permite determinar idiomas ni disponibilidad.'
    log('iframe-error')
  }
  frame.src = url
  $('screen').replaceChildren(frame)
  log('request', { url, origin: location.origin, referrerPolicy: frame.referrerPolicy })
  timer = setTimeout(() => {
    $('status').textContent = 'Sin eventos del proveedor tras 20 s. Revisa el iframe: no demuestra fallo.'
    log('no-provider-signal', { seconds: 20 })
  }, 20000)
}
$('stop').onclick = () => {
  if (current) log('stopped', { evidence })
  stop(); current = null
  $('screen').textContent = 'Iframe detenido.'
  $('status').textContent = 'Detenido; los registros se conservan.'
}
window.addEventListener('message', event => {
  if (!frame || !current) return
  const parsed = current.providerId === 'vidcloud' ? parseVidCloudEvent(event, frame.contentWindow) : parseMovieMasterEvent(event, frame.contentWindow)
  if (!parsed) return
  clearTimeout(timer)
  if (['hello', 'ready'].includes(parsed.event)) evidence = reduceEvidence(evidence, 'provider-hello')
  if (parsed.event === 'time') {
    if (previousTime !== null && parsed.currentTime > previousTime + 0.15) evidence = reduceEvidence(evidence, 'provider-time-advance')
    previousTime = parsed.currentTime
  }
  $('signals').textContent = `Último evento: ${parsed.event}${parsed.event === 'time' ? ` · ${parsed.currentTime.toFixed(1)} / ${parsed.duration.toFixed(1)} s` : ''}. No acredita idioma, identidad ni fallback.`
  $('status').textContent = evidence.providerTimeAdvance ? 'Proveedor informa avance; verificar imagen, sonido, idioma y contenido manualmente.' : 'Proveedor respondió; reproducción audiovisual sin confirmar.'
  // mm:time is emitted every second. Keep the bounded report useful by sampling.
  if (parsed.event !== 'time' || !records.some(record => record.runId === runId && record.kind === 'provider-event' && record.event === 'time') || Math.floor(parsed.currentTime) % 10 === 0) log('provider-event', parsed)
  else render()
})
$('record').onclick = () => {
  if (!frame || !current) { $('feedback').textContent = 'Abre un caso primero.'; return }
  if (!$('notes').value.trim()) { $('feedback').textContent = 'Describe evidencia antes de registrar.'; return }
  const detail = Object.fromEntries(manualFields.map(id => [id, $(id).value.trim() || 'unobserved']))
  evidence = reduceEvidence(evidence, 'manual', detail)
  log('manual-observation', { observer: 'manual', evidence: { ...evidence }, notes: $('notes').value.trim() })
  $('feedback').textContent = 'Observación registrada para el caso abierto, no para otro título seleccionado.'
}
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ schema: 1, evaluation: 'moviemaster-vidcloud', exportedAt: new Date().toISOString(), origin: location.origin, records }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = 'proveedores-evaluacion.json'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
render()
