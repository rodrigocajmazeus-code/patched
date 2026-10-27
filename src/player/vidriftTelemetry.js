/**
 * Pasarela de telemetría VidRift para cuando se integre en StreamBox.
 * Basada en la API pública documentada en https://vidrift.net/ .
 * NUNCA infiere que el idioma, los subtítulos o el episodio se hayan
 * verificado audiovisualmente. No genera informes `works` automáticos.
 */
export const VIDRIFT_EMBED_ORIGIN = 'https://embed.vidrift.net'
const TYPES = new Set(['vidrift:state','vidrift:progress','vidrift:paused','vidrift:unpaused',
  'vidrift:ended','vidrift:episode','vidrift:command-error'])
const nInt = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 && /^\d+$/.test(String(v)) ? Number(v) : null
const finiteSeconds = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000000 ? v : null
const cleanString = v => typeof v === 'string' ? v.slice(0,90) : ''
function options(list) {
  return (Array.isArray(list) ? list : []).slice(0,40).map(item=>({
    value:cleanString(item?.value),label:cleanString(item?.label),state:cleanString(item?.state),
  })).filter(v=>v.value)
}

/**
 * Only accept exact matching iframe window, origin, media id and episode.
 * Changes of episode are surfaced as hints rather than automatically updating
 * the app's current video. `expected`={mediaType,id,season?,episode?}.
 */
export function readVidRiftTelemetry(event, iframeWindow, expected) {
  if (!iframeWindow || event?.origin !== VIDRIFT_EMBED_ORIGIN || event.source !== iframeWindow) return null
  const d = event.data
  if (!d || typeof d !== 'object' || Array.isArray(d) || !TYPES.has(d.type)) return null
  const id = nInt(expected?.id)
  if (!id || !['movie','tv'].includes(expected?.mediaType) || nInt(d.tmdbId) !== id || d.mediaType !== expected.mediaType) return null
  const sameEpisode = expected.mediaType === 'movie' ||
    (nInt(expected.season) === nInt(d.season) && nInt(expected.episode) === nInt(d.episode))
  // Player's episode-change notification is not proof the new episode is correct.
  if (d.type === 'vidrift:episode' && expected.mediaType === 'tv' && nInt(d.season) && nInt(d.episode)) {
    return {kind:'episode-hint',season:Number(d.season),episode:Number(d.episode),
      needsUserConfirmation:true,confirmedAudiovisualIdentity:false}
  }
  if (!sameEpisode) return null
  if (d.type === 'vidrift:state') return {
    kind:'state', paused:typeof d.paused === 'boolean' ? d.paused : null,
    currentTime:finiteSeconds(d.currentTime),duration:finiteSeconds(d.duration),
    server:cleanString(d.server),quality:cleanString(d.quality),audio:cleanString(d.audio),subtitle:cleanString(d.subtitle),
    servers:options(d.servers),qualities:options(d.qualities),audios:options(d.audios),subtitles:options(d.subtitles),
    // Label is provider-reported, never proof of resolution or heard audio.
    bitrateMeasured:false,heardAudioVerified:false,playbackVerified:false,
  }
  if (d.type === 'vidrift:progress') {
    const currentTime=finiteSeconds(d.currentTime)
    const duration=finiteSeconds(d.duration)
    if (currentTime === null || duration === null || duration <= 0 || currentTime > duration + 15) return null
    return {kind:'progress',currentTime,duration,playbackTelemetry:true,
      playbackVerified:false,heardAudioVerified:false,confirmedAudiovisualIdentity:false}
  }
  if (d.type === 'vidrift:paused' || d.type === 'vidrift:unpaused') {
    return {kind: d.type === 'vidrift:paused' ? 'paused' : 'unpaused',currentTime:finiteSeconds(d.currentTime)}
  }
  if (d.type === 'vidrift:ended') return {kind:'ended',confirmedAudiovisualIdentity:false}
  if (d.type === 'vidrift:command-error') return {kind:'command-error',command:cleanString(d.command),field:cleanString(d.field),reason:cleanString(d.reason)}
  return null
}
export function vidriftStateRequest() { return Object.freeze({type:'vidrift:get-state'}) }
