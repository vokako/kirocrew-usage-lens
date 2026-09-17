/*
 * Render test: the aggregation and the SVG chart primitives, against a REAL
 * payload dumped from the backend.
 *
 * Deliberately not a DOM test. The page's data arrives in an effect, so
 * server-rendering the default export only ever produces the skeleton; what is
 * worth asserting is the part that can silently be wrong — the arithmetic in
 * model.ts and the geometry in charts.tsx — and both are pure. `renderToStaticMarkup`
 * exercises them without jsdom, a bundler harness, or a live gateway.
 *
 * Run: node test/render.mjs   (fixture written by test/fixture.py)
 */
import { readFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

import { build } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// Bundle the two source modules for node. They are TS/TSX, and importing them
// through esbuild here is what keeps the test honest: it runs the same code the
// browser bundle is built from, not a transpiled copy that could drift.
//
// Written to a real file rather than imported as a data: URL — a data: module
// cannot resolve the bare `react/jsx-runtime` specifier the JSX transform emits.
const scratch = join(here, '.bundle.mjs')
await build({
  entryPoints: [join(here, 'entry.ts')],
  outfile: scratch,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
})
const { model, charts } = await import(pathToFileURL(scratch).href)
rmSync(scratch, { force: true })

const series = JSON.parse(readFileSync(join(root, 'test', 'fixture.json'), 'utf8'))
let failures = 0
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures += 1
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('payload:')
check('fixture has rows', series.rows.length > 0, String(series.rows.length))
check('every row is 8 wide', series.rows.every(r => r.length === 8))

console.log('aggregation:')
const all = model.total(series.rows)
const reconciled = series.rows.reduce((sum, r) => sum + r[model.COL.credits], 0)
check('total credits reconcile with the rows', Math.abs(all.credits - reconciled) < 1e-6)
check('total matches the backend figure', Math.abs(all.credits - series.totals.credits) < 0.02,
  `${all.credits} vs ${series.totals.credits}`)

const { current, prior } = model.windowRows(series, 3)
check('a 3d window is a strict subset', current.length > 0 && current.length <= series.rows.length)
check('the prior window does not overlap the current one',
  current.every(row => !prior.includes(row)))

for (const dim of ['model', 'surface', 'agent', 'job', 'session']) {
  const rows = model.ranked(series, current, prior, dim)
  const sum = rows.reduce((total, row) => total + row.cell.credits, 0)
  const windowTotal = model.total(current).credits
  check(`${dim}: every credit is attributed`, Math.abs(sum - windowTotal) < 1e-6,
    `${sum} vs ${windowTotal}`)
  check(`${dim}: ranked descending by credits`,
    rows.every((row, i) => i === 0 || rows[i - 1].cell.credits >= row.cell.credits))
}

console.log('per-turn metric:')
const cell = { credits: 30, turns: 3 }
check('credits metric', model.metricOf(cell, 'credits') === 30)
check('turns metric', model.metricOf(cell, 'turns') === 3)
check('per-turn metric', model.metricOf(cell, 'per_turn') === 10)
check('per-turn of a turnless cell is 0, not NaN',
  model.metricOf({ credits: 5, turns: 0 }, 'per_turn') === 0)

console.log('charts render:')
const dim = 'model'
const ranked = model.ranked(series, current, prior, dim).slice(0, 6)
const colours = new Map(ranked.map((row, i) => [row.key, model.PALETTE[i % model.PALETTE.length]]))
const buckets = [...new Set(current.map(row => model.bucketOf(series, row, 'hour')))].sort()
const stacks = ranked.map(row => {
  const cells = model.groupBy(
    current.filter(one => model.dimValue(series, one, dim) === row.key),
    one => model.bucketOf(series, one, 'hour'),
  )
  return {
    name: row.key,
    color: colours.get(row.key),
    values: buckets.map(b => (cells.get(b) ? cells.get(b).credits : 0)),
  }
})

const bars = renderToStaticMarkup(h(charts.StackedBars, { labels: buckets, series: stacks }))
check('stacked bars produce an svg', bars.startsWith('<svg'))
check('one rect per non-zero segment, plus hit areas',
  (bars.match(/<rect/g) || []).length >= buckets.length)
check('bar geometry carries no NaN', !/NaN|Infinity/.test(bars))
check('y ticks rendered', (bars.match(/<line/g) || []).length >= 5)

const doughnut = renderToStaticMarkup(
  h(charts.Doughnut, {
    slices: ranked.map(row => ({ name: row.key, value: row.cell.credits, color: colours.get(row.key) })),
  }),
)
check('doughnut produces an svg', doughnut.startsWith('<svg'))
check('one arc per slice', (doughnut.match(/stroke-dasharray/g) || []).length === ranked.length)
check('doughnut geometry carries no NaN', !/NaN|Infinity/.test(doughnut))

const days = [...new Set(current.map(row => model.bucketOf(series, row, 'day')))].sort()
const lines = renderToStaticMarkup(
  h(charts.Lines, {
    labels: days,
    series: ranked.slice(0, 3).map(row => {
      const cells = model.groupBy(
        current.filter(one => model.dimValue(series, one, dim) === row.key),
        one => model.bucketOf(series, one, 'day'),
      )
      return {
        name: row.key,
        color: colours.get(row.key),
        values: days.map(d => (cells.get(d) && cells.get(d).turns ? cells.get(d).credits / cells.get(d).turns : null)),
      }
    }),
  }),
)
check('lines produce an svg', lines.startsWith('<svg'))
check('a polyline per series with data', (lines.match(/<polyline/g) || []).length >= 1)
check('gaps do not emit NaN points', !/NaN|Infinity/.test(lines))

console.log('empty input is not a crash:')
const blank = { ...series, rows: [], dims: { ...series.dims, hours: [] } }
check('ranked on no rows', model.ranked(blank, [], [], 'model').length === 0)
check('bars on no buckets still render',
  renderToStaticMarkup(h(charts.StackedBars, { labels: [], series: [] })).startsWith('<svg'))
check('doughnut with a zero total renders a placeholder ring',
  renderToStaticMarkup(h(charts.Doughnut, { slices: [] })).includes('var(--border)'))

if (failures) {
  console.log(`\n${failures} failure(s)`)
  process.exit(1)
}
console.log('\nall checks passed')
