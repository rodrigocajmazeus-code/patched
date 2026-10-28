// The directory is indexed in full, but only viewport rows are mounted in the DOM.
export const LIVE_TV_ROW_HEIGHT = 188

export function tvGridColumns(width) {
  if (width >= 1280) return 5
  if (width >= 1024) return 4
  if (width >= 640) return 3
  return 2
}

export function visibleTvRows({ itemCount, columns, top, viewportHeight, overscan = 4, rowHeight = LIVE_TV_ROW_HEIGHT }) {
  const safeCount = Math.max(0, Math.floor(itemCount) || 0)
  const safeColumns = Math.max(1, Math.floor(columns) || 1)
  const safeHeight = Math.max(1, rowHeight)
  const totalRows = Math.ceil(safeCount / safeColumns)
  const pad = Math.max(0, Math.floor(overscan) || 0)
  const firstRow = Math.min(totalRows, Math.max(0, Math.floor(-top / safeHeight) - pad))
  const lastRow = Math.max(firstRow, Math.min(totalRows, Math.ceil((viewportHeight - top) / safeHeight) + pad))
  return {
    firstRow,
    lastRow,
    start: Math.min(safeCount, firstRow * safeColumns),
    end: Math.min(safeCount, lastRow * safeColumns),
    totalRows,
    totalHeight: totalRows * safeHeight,
  }
}
