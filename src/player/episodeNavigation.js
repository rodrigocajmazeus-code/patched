// Navigation only uses episode numbers provided by the catalog. Never invent
// playback availability or assume the next episode has an active stream.
export function adjacentEpisode({ seasons = [], episodes = [], season, episode }, direction) {
  if (direction !== 1 && direction !== -1) return null
  const currentSeason = Number(season)
  const currentEpisode = Number(episode)
  if (!Number.isSafeInteger(currentSeason) || !Number.isSafeInteger(currentEpisode)) return null
  const ordered = [...new Set(episodes.map(item => Number(item.number)).filter(Number.isSafeInteger))].sort((a, b) => a - b)
  const inSeason = direction === 1
    ? ordered.find(value => value > currentEpisode)
    : [...ordered].reverse().find(value => value < currentEpisode)
  if (inSeason != null) return { season: currentSeason, episode: inSeason }
  // If metadata for this season is still loading, do not accidentally skip it.
  if (!ordered.includes(currentEpisode)) return null
  const others = seasons
    .filter(item => Number.isSafeInteger(item.season_number) && item.season_number > 0 &&
      (direction === 1 ? item.season_number > currentSeason : item.season_number < currentSeason) &&
      Number(item.episode_count) > 0)
    .sort((a, b) => direction * (a.season_number - b.season_number))
  const target = others[0]
  if (!target) return null
  return { season: target.season_number, episode: direction === 1 ? 1 : Number(target.episode_count) }
}

export function readEpisodeNumber(params, key) {
  const value = new URLSearchParams(params).get(key)
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : 1
}

// Called from event handlers, not an effect: route changes and component state
// cannot race one another, and copied links retain the selected episode.
export function watchQuery(current, { mediaType, season, episode, playing }) {
  const next = new URLSearchParams(current)
  if (mediaType === 'tv') {
    if (!Number.isSafeInteger(season) || season < 1 || !Number.isSafeInteger(episode) || episode < 1) {
      throw new TypeError('Temporada o episodio inválido')
    }
    next.set('s', String(season))
    next.set('e', String(episode))
  }
  next.delete('autoplay')
  if (playing) next.set('play', '1')
  else next.delete('play')
  return next
}
