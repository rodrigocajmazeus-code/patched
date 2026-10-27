import { COVERAGE_CASES } from '../data/coverageCases.js'
import { PRIMARY_PROVIDER_ORDER } from '../data/providers.js'

const STATUS = Object.freeze({ works: 'Funciona', unavailable: 'No carga', 'wrong-content': 'Contenido equivocado' })

// Solo los reportes hechos por el usuario en ESTE navegador cuentan como pruebas.
// Múltiples variantes (LAT, ESP, SUB) se conservan, pero no se cuentan dos veces.
export function latestCoverageRecord(reports, item, providerId) {
  const prefix = `${item.key}:${providerId}:`
  const matching = [...reports]
    .filter(report => report.observer === 'user-local' && report.key.startsWith(prefix))
    .sort((a, b) => (Date.parse(b.checkedAt) || 0) - (Date.parse(a.checkedAt) || 0))
  // Si LAT funciona y SUB falla, el proveedor sigue teniendo UNA variante útil.
  // El resultado debe seguir mostrando el idioma y variante que realmente funcionó.
  return matching.find(report => report.result === 'works') || matching[0] || null
}

export function coverageStatus(report) {
  return report && STATUS[report.result] ? STATUS[report.result] : 'Pendiente'
}

export function summarizeCoverage(reports, cases = COVERAGE_CASES, providers = PRIMARY_PROVIDER_ORDER) {
  const summary = { cases: cases.length, total: cases.length * providers.length, tested: 0, works: 0, unavailable: 0, wrongContent: 0, pending: 0 }
  for (const item of cases) {
    for (const providerId of providers) {
      const report = latestCoverageRecord(reports, item, providerId)
      if (!report) { summary.pending++; continue }
      summary.tested++
      if (report.result === 'works') summary.works++
      if (report.result === 'unavailable') summary.unavailable++
      if (report.result === 'wrong-content') summary.wrongContent++
    }
  }
  return summary
}

// Calidad percibida en la muestra, nunca resolución real detectada.
// No atribuye a un proveedor general una calificación por un solo episodio.
export function summarizeObservedQuality(reports, cases = COVERAGE_CASES, providers = PRIMARY_PROVIDER_ORDER) {
  return providers.map(providerId => {
    const summary = { providerId, workingCases: 0, evaluatedPicture: 0, sharp: 0, blurry: 0, fluid: 0, oftenBuffers: 0 }
    for (const item of cases) {
      const report = latestCoverageRecord(reports, item, providerId)
      if (!report || report.result !== 'works') continue
      summary.workingCases++
      if (report.picture && report.picture !== 'unknown') summary.evaluatedPicture++
      if (report.picture === 'sharp') summary.sharp++
      if (report.picture === 'blurry') summary.blurry++
      if (report.buffering === 'none') summary.fluid++
      if (report.buffering === 'often') summary.oftenBuffers++
    }
    return summary
  })
}
