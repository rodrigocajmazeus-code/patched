import test from 'node:test'
import assert from 'node:assert/strict'
import { LIVE_TV_ROW_HEIGHT, tvGridColumns, visibleTvRows } from '../src/tv/virtualGrid.js'

test('responsive grid has two to five columns', () => {
  assert.deepEqual([360, 640, 1024, 1280].map(tvGridColumns), [2, 3, 4, 5])
})
test('ten thousand channels remain available without paginating or truncation', () => {
  const top = visibleTvRows({ itemCount: 10000, columns: 2, top: 0, viewportHeight: 780 })
  const bottom = visibleTvRows({ itemCount: 10000, columns: 2, top: -(5000 * LIVE_TV_ROW_HEIGHT - 780), viewportHeight: 780 })
  assert.equal(top.totalRows, 5000)
  assert.equal(top.totalHeight, 5000 * LIVE_TV_ROW_HEIGHT)
  assert.ok(top.end < 100)
  assert.equal(bottom.end, 10000)
  assert.ok(bottom.start > 9900)
})
test('scrolling into the middle mounts only nearby rows', () => {
  const range = visibleTvRows({ itemCount: 12000, columns: 4, top: -25000, viewportHeight: 720 })
  assert.ok(range.start > 0)
  assert.ok(range.end - range.start <= 80)
})
test('empty list is safely handled', () => {
  assert.deepEqual(visibleTvRows({ itemCount: 0, columns: 2, top: 0, viewportHeight: 500 }), {
    firstRow: 0, lastRow: 0, start: 0, end: 0, totalRows: 0, totalHeight: 0,
  })
})
test('grid never renders out-of-bounds on very distant scroll positions', () => {
  const range = visibleTvRows({ itemCount: 25, columns: 3, top: -100000, viewportHeight: 700 })
  assert.ok(range.start <= 25)
  assert.ok(range.end <= 25)
  assert.ok(range.end >= range.start)
})
