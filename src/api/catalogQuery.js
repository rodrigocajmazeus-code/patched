// Pure TMDB catalogue query generation; no video availability is implied.
export const CATALOG_MAX_PAGE = 500
export const CATALOG_SORTS = Object.freeze(['popular', 'rating', 'recent'])
export const CATALOG_PERIODS = Object.freeze(['all', '2020s', '2010s', '2000s', 'classic'])
export const CATALOG_KINDS = Object.freeze(['all', 'tv', 'movie'])

export function catalogPageNumber(value) {
  const page = Number(value)
  return Number.isInteger(page) ? Math.min(CATALOG_MAX_PAGE, Math.max(1, page)) : 1
}

export function buildCatalogRequests({ section, kind = 'all', page = 1, sort = 'popular', period = 'all', country = '' }) {
  if (!['anime', 'series', 'movies'].includes(section)) throw new TypeError('Sección de catálogo no reconocida')
  const selectedKind = CATALOG_KINDS.includes(kind) ? kind : 'all'
  const selectedSort = CATALOG_SORTS.includes(sort) ? sort : 'popular'
  const selectedPeriod = CATALOG_PERIODS.includes(period) ? period : 'all'
  const types = section === 'anime'
    ? (selectedKind === 'all' ? ['tv', 'movie'] : [selectedKind])
    : [section === 'series' ? 'tv' : 'movie']
  return types.map((mediaType) => {
    const datePrefix = mediaType === 'tv' ? 'first_air_date' : 'primary_release_date'
    const sortBy = selectedSort === 'recent'
      ? `${datePrefix}.desc`
      : selectedSort === 'rating' ? 'vote_average.desc' : 'popularity.desc'
    const params = {
      page: catalogPageNumber(page),
      include_adult: false,
      sort_by: sortBy,
    }
    // Limit to titles that have premiered. Availability of a player remains unverified.
    params[`${datePrefix}.lte`] = new Date().toISOString().slice(0, 10)
    if (selectedSort === 'rating') params['vote_count.gte'] = 100
    const ranges = {
      '2020s': ['2020-01-01', '2029-12-31'],
      '2010s': ['2010-01-01', '2019-12-31'],
      '2000s': ['2000-01-01', '2009-12-31'],
      classic: ['1900-01-01', '1999-12-31'],
    }
    if (ranges[selectedPeriod]) {
      params[`${datePrefix}.gte`] = ranges[selectedPeriod][0]
      // Do not overwrite the current-date upper bound for the 2020s.
      if (selectedPeriod !== '2020s') params[`${datePrefix}.lte`] = ranges[selectedPeriod][1]
    }
    if (section === 'anime') {
      params.with_genres = 16
      params.with_original_language = 'ja'
    } else if (country) {
      params.with_origin_country = country
    }
    return { mediaType, path: `/discover/${mediaType}`, params }
  })
}

export function mergeCatalogItems(previous, next) {
  const seen = new Set()
  return [...(previous || []), ...(next || [])].filter((item) => {
    if (!item?.key || seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

export function catalogHasMore(results, page) {
  if (!Array.isArray(results) || !results.length) return false
  return results.some((result) => page < Math.min(CATALOG_MAX_PAGE, Math.max(0, Number(result.totalPages) || 0)))
}
