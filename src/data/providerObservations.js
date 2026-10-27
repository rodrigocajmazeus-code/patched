// User report in this chat, 2026-10-26. Historical observations, not live checks.
const manualUserObservations = [
  { providerId: 'facilitoplay', mediaType: 'movie', id: 27205, playback: 'confirmed',
    summary: 'Inception: reproducción correcta con audio español latino.',
    audio: { 'es-419': 'confirmed' }, subtitles: 'unknown' },
  { providerId: 'facilitoplay', mediaType: 'tv', id: 1429, season: 1, episode: 1, playback: 'confirmed',
    summary: 'Attack on Titan T1E1: latino sin audio; castellano y versión subtitulada funcionan.',
    audio: { 'es-419': 'silent', 'es-ES': 'confirmed' }, subtitles: 'subtitled-version-confirmed' },
  { providerId: 'facilitoplay', mediaType: 'tv', id: 85937, season: 1, episode: 1, playback: 'confirmed',
    summary: 'Kimetsu T1E1: audio latino funciona; japonés no aparece en la prueba. Se pueden desactivar los subtítulos.',
    audio: { 'es-419': 'confirmed', ja: 'not-offered-in-test' }, subtitles: 'can-disable' },
  { providerId: 'facilitoplay', mediaType: 'tv', id: 1396, season: 1, episode: 1, playback: 'unknown',
    summary: 'Breaking Bad T1E1: sin resultado confirmado.', audio: null, subtitles: 'unknown' },
].map(record => Object.freeze({ ...record, reportedOn: '2026-10-26', observer: 'user',
  identity: record.playback === 'confirmed' ? 'title-and-episode-confirmed-by-user' : 'unknown',
  environment: 'Brave · laboratorio iframe', streamboxPlayback: 'unverified',
  audiovisualIdentity: 'not-independently-checked-by-agent',
}))

const labObservations = [
  { providerId: 'moviemaster', id: 1429, requestedVariant: 'LAT', audio: null, subtitles: 'unknown', fallback: 'no-label-change-observed',
    summary: 'Attack on Titan T1E1: video y avance observados en laboratorio al solicitar LAT. Etiqueta Latino; idioma escuchado, episodio exacto y subtítulos sin verificar.' },
  { providerId: 'moviemaster', id: 85937, requestedVariant: 'SUB', audio: null, subtitles: 'unknown', fallback: 'SUB-to-Latino-label-confirmed',
    summary: 'Kimetsu T1E1: video observado al solicitar SUB, pero el selector solo ofreció opciones Latino. Sustitución visible; audio e identidad exacta pendientes.' },
  { providerId: 'vidcloud', id: 85937, requestedVariant: 'sub', audio: null, subtitles: 'spanish-displayed', fallback: 'unknown',
    summary: 'Kimetsu T1E1: video observado en laboratorio; subtítulos españoles seleccionados y visibles. Audio japonés e identidad exacta pendientes de comprobación manual.' },
].map(record => Object.freeze({ ...record, mediaType: 'tv', season: 1, episode: 1,
  playback: 'video-only', observer: 'agent-visual-only', reportedOn: '2026-10-26',
  environment: 'navegador integrado · laboratorio', streamboxPlayback: 'unverified', audiovisualIdentity: 'unverified' }))

// A later manual listening report supersedes the older ambiguous MovieMaster test
// *only for this requested episode and LAT variant*. This is not a provider-wide
// guarantee and cannot be inferred from an iframe load or a LAT label.
const currentUserObservations = [
  { providerId: 'moviemaster', mediaType: 'tv', id: 1429, season: 1, episode: 1,
    requestedVariant: 'LAT', playback: 'confirmed', streamboxPlayback: 'confirmed-by-user',
    audio: { 'es-419': 'confirmed' }, subtitles: 'unknown',
    observer: 'user', source: 'user-report-in-chat', reportedOn: '2026-10-26',
    environment: 'StreamBox · navegador local; reporte de escucha del usuario',
    identity: 'title-and-episode-confirmed-by-user', audiovisualIdentity: 'title-and-episode-confirmed-by-user',
    summary: 'Attack on Titan T1E1: el usuario informó que escuchó el doblaje latino en MovieMaster dentro de StreamBox. Resultado limitado a este episodio; sin verificación independiente.' },
].map(record => Object.freeze(record))

// Latest explicit user reports take precedence for this exact episode/variant.
// Retain the earlier lab records as history; do not promote them to audio proof.
const milestoneUserObservations = [
  { providerId: 'moviemaster', id: 1429, requestedVariant: 'LAT',
    playback: 'video-only', streamboxPlayback: 'video-confirmed-by-user',
    audio: { 'es-419': 'not-confirmed' }, heardAudio: 'other-language-or-no-audio',
    subtitles: 'unknown', fallback: 'unknown',
    summary: 'Attack on Titan T1E1: el usuario confirmó el episodio correcto. Resultado auditivo: «otro idioma o sin audio». LAT no confirmado; no se afirma silencio definitivo.' },
  { providerId: 'vidcloud', id: 85937, requestedVariant: 'sub',
    playback: 'confirmed', streamboxPlayback: 'confirmed-by-user',
    audio: { ja: 'confirmed' }, heardAudio: 'ja',
    subtitles: 'pending-definitive-user-verification', fallback: 'unknown',
    summary: 'Kimetsu T1E1: el usuario confirmó el episodio correcto y escuchó audio japonés. Subtítulos españoles pendientes de verificación definitiva. Resultado exclusivo de este episodio y proveedor.' },
].map(record => Object.freeze({ ...record, mediaType: 'tv', season: 1, episode: 1,
  observer: 'user', source: 'user-report-in-chat', testedCommit: '33e0004',
  reportedOn: '2026-10-26', environment: 'StreamBox · commit 33e0004; navegador no especificado',
  identity: 'title-and-episode-confirmed-by-user', audiovisualIdentity: 'title-and-episode-confirmed-by-user',
}))

export const providerObservations = Object.freeze([...currentUserObservations, ...milestoneUserObservations, ...manualUserObservations, ...labObservations])

export function getProviderObservation(providerId, mediaType, id, season = 1, episode = 1, requestedVariant = null) {
  return providerObservations.find(record => record.providerId === providerId && record.mediaType === mediaType &&
    record.id === Number(id) && (!record.requestedVariant || record.requestedVariant === requestedVariant) &&
    (mediaType !== 'tv' || (record.season === Number(season) && record.episode === Number(episode)))) || null
}
