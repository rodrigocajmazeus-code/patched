// User report in chat. No title/episode or ad mechanism was specified.
export const providerExperience = Object.freeze([
  Object.freeze({ providerId: 'facilitoplay', observer: 'user', reportedOn: '2026-10-26',
    source: 'user-report-in-chat', titleScope: 'unspecified', advertising: 'bothersome-reported',
    inFrameAds: 'unknown', popupWindows: 'unknown', topLevelRedirects: 'unknown',
    subtitleExperience: 'useful-reported',
    summary: 'El usuario reporta publicidad molesta en FacilitoPlay y subtítulos útiles. Título y mecanismo publicitario no especificados.' }),
  Object.freeze({ providerId: 'vidcore', observer: 'user', reportedOn: '2026-10-26',
    source: 'user-report-in-chat', titleScope: 'unspecified', advertising: 'unknown',
    subtitleExperience: 'not-found-in-user-session',
    summary: 'El usuario no encontró subtítulos en su sesión de VidCore; título no especificado. No demuestra ausencia general.' }),
])
export function hasReportedAds(providerId) {
  return providerExperience.some(r => r.providerId === providerId && r.advertising === 'bothersome-reported')
}
