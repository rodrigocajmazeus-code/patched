export const EPISODE_PAGE_SIZE = 48
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export function filterEpisodes(episodes, query) {
  const needle = normalize(query.trim())
  return episodes.filter(item => !needle || normalize(item.title).includes(needle) || String(item.number) === needle)
}
export function episodePage(episodes, page, size = EPISODE_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(episodes.length / size))
  const index = Math.max(0, Math.min(pages - 1, page))
  return { items: episodes.slice(index * size, (index + 1) * size), index, pages }
}
