/*
 * Usage Lens frontend tests — node:test, no jsdom, no browser.
 *
 *   node --test tests/            (or: npm run test:ui)
 *
 * What is tested and why: the page's data arrives in an effect, so
 * server-rendering the default export only ever produces the skeleton. What CAN be
 * silently wrong is the arithmetic in src/model.ts and the geometry in
 * src/charts.tsx — both pure — so those are exercised directly, against synthetic
 * payloads built here plus (when present) a real one dumped by tests/fixture.py.
 *
 * The sources are TS/TSX, so esbuild bundles them for node first. That is
 * deliberate: the test runs the same code the browser bundle is built from rather
 * than a hand-transpiled copy that could drift.
 */
import { test, describe, before } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

import { build } from 'esbuild'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement as h } from 'react'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

let model
let charts

before(async () => {
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
  // A real file, not a data: URL — a data: module cannot resolve the bare
  // `react/jsx-runtime` specifier the JSX transform emits.
  ;({ model, charts } = await import(pathToFileURL(scratch).href))
  rmSync(scratch, { force: true })
})

/* ------------------------------------------------------------------ helpers */

/** A payload with the given rows. `hours` are display-clock `YYYY-MM-DDTHH` keys. */
function payload({
  hours = ['2026-09-10T00'],
  models = ['m1'],
  surfaces = ['dashboard'],
  agents = ['a1'],
  jobs = ['Unscheduled · interactive chat'],
  sessions = ['chat-1-1'],
  rows = [[0, 0, 0, 0, 0, 0, 10, 1]],
  titles = {},
  cycle = {},
  official = {},
} = {}) {
  const credits = rows.reduce((sum, r) => sum + r[6], 0)
  return {
    generated_at: '2026-09-17T23:00:00+08:00',
    tz: 'Asia/Shanghai',
    window_days: 0,
    shards: 1,
    cycle: {
      source: 'kiro-api',
      resets: '2026-10-01',
      start_utc: '2026-09-01T00:00:00+00:00',
      start_hour: '2026-09-01T08',
      prev_start_hour: '2026-08-01T08',
      end_hour: '2026-10-01T08',
      ...cycle,
    },
    official,
    dims: { hours, model: models, surface: surfaces, agent: agents, job: jobs, session: sessions },
    rows,
    labels: { session: titles },
    totals: { credits, turns: rows.reduce((sum, r) => sum + r[7], 0) },
  }
}

const noBadNumbers = (markup, label) => {
  assert.ok(!/NaN/.test(markup), `${label}: NaN in output`)
  assert.ok(!/Infinity/.test(markup), `${label}: Infinity in output`)
  assert.ok(!/undefined/.test(markup), `${label}: undefined in output`)
}

/* -------------------------------------------------------------- formatting */

describe('fmt', () => {
  test('rounds small values to one decimal', () => {
    assert.equal(model.fmt(0), '0')
    assert.equal(model.fmt(0.04), '0')
    assert.equal(model.fmt(0.06), '0.1')
    assert.equal(model.fmt(12.34), '12.3')
    assert.equal(model.fmt(999.94), '999.9')
  })

  test('drops the decimal at a thousand and above', () => {
    assert.equal(model.fmt(1000), '1,000')
    assert.equal(model.fmt(1234.6), '1,235')
  })

  test('handles negatives on both sides of the threshold', () => {
    assert.equal(model.fmt(-3.55), '-3.5')
    assert.equal(model.fmt(-4200), '-4,200')
  })

  test('a non-finite value renders as a dash, never as "NaN"', () => {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.equal(model.fmt(value), '—')
    }
  })
})

describe('metricOf', () => {
  test('each metric reads its own field', () => {
    const cell = { credits: 30, turns: 3 }
    assert.equal(model.metricOf(cell, 'credits'), 30)
    assert.equal(model.metricOf(cell, 'turns'), 3)
    assert.equal(model.metricOf(cell, 'per_turn'), 10)
  })

  test('per-turn of a turnless cell is 0, not a division by zero', () => {
    assert.equal(model.metricOf({ credits: 5, turns: 0 }, 'per_turn'), 0)
    assert.equal(model.metricOf({ credits: 0, turns: 0 }, 'per_turn'), 0)
  })

  test('an unknown metric falls through to per-turn rather than undefined', () => {
    assert.equal(typeof model.metricOf({ credits: 4, turns: 2 }, 'nonsense'), 'number')
  })
})

describe('deltaPct', () => {
  test('a rise and a fall', () => {
    assert.equal(model.deltaPct(150, 100), 50)
    assert.equal(model.deltaPct(50, 100), -50)
  })

  test('no prior spend has no percentage', () => {
    assert.equal(model.deltaPct(10, 0), null)
    assert.equal(model.deltaPct(0, 0), null)
  })
})

/* ------------------------------------------------------------------ windows */

describe('hourMinus', () => {
  test('anchors on the NEWEST row, not on wall-clock now', () => {
    const p = payload({ hours: ['2026-09-01T00', '2026-09-10T12'] })
    assert.equal(model.hourMinus(p, 24), '2026-09-09T12')
  })

  test('crosses a month boundary', () => {
    const p = payload({ hours: ['2026-09-01T05'] })
    assert.equal(model.hourMinus(p, 24), '2026-08-31T05')
  })

  test('an empty payload yields an empty bound instead of throwing', () => {
    assert.equal(model.hourMinus(payload({ hours: [], rows: [] }), 24), '')
  })
})

describe('rowsBetween', () => {
  const p = payload({
    hours: ['2026-09-01T00', '2026-09-02T00', '2026-09-03T00'],
    rows: [
      [0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 2, 1],
      [2, 0, 0, 0, 0, 0, 4, 1],
    ],
  })

  test('the lower bound is inclusive and the upper bound exclusive', () => {
    const got = model.rowsBetween(p, '2026-09-02T00', '2026-09-03T00')
    assert.deepEqual(got.map(r => r[6]), [2])
  })

  test('an empty upper bound means open-ended', () => {
    assert.equal(model.rowsBetween(p, '2026-09-02T00', '').length, 2)
  })

  test('a bound outside the data returns nothing rather than everything', () => {
    assert.equal(model.rowsBetween(p, '2027-01-01T00', '').length, 0)
  })
})

describe('windowRows', () => {
  const hours = ['2026-08-20T08', '2026-09-01T08', '2026-09-05T08', '2026-09-17T08']
  const rows = hours.map((_, i) => [i, 0, 0, 0, 0, 0, (i + 1) * 10, 1])
  const p = payload({ hours, rows })

  test('a day-count window compares against an equal-length lookback', () => {
    const { current, prior } = model.windowRows(p, '14')
    assert.ok(current.length > 0)
    assert.ok(current.every(r => !prior.includes(r)), 'windows must be disjoint')
  })

  test('"all" takes every row and offers no comparison', () => {
    const { current, prior } = model.windowRows(p, 'all')
    assert.equal(current.length, rows.length)
    assert.equal(prior.length, 0)
  })

  test('the cycle window starts exactly at the cycle boundary, inclusive', () => {
    const { current } = model.windowRows(p, 'cycle')
    assert.deepEqual(current.map(r => hours[r[0]]), ['2026-09-01T08', '2026-09-05T08', '2026-09-17T08'])
  })

  test('the cycle comparison is the SAME ELAPSED SPAN of the preceding cycle', () => {
    // Newest row is 2026-09-17T08, so 385 hours have elapsed since the boundary;
    // the comparison covers the first 385 hours of the previous cycle only.
    const p2 = payload({
      hours: ['2026-08-01T08', '2026-08-20T08', '2026-09-01T08', '2026-09-17T08'],
      rows: [0, 1, 2, 3].map(i => [i, 0, 0, 0, 0, 0, 10, 1]),
    })
    const { prior } = model.windowRows(p2, 'cycle')
    assert.deepEqual(prior.map(r => p2.dims.hours[r[0]]), ['2026-08-01T08'])
  })

  test('a whole prior cycle is compared once the current one has run as long', () => {
    const p2 = payload({
      hours: ['2026-08-01T08', '2026-08-20T08', '2026-09-01T08', '2026-09-30T08'],
      rows: [0, 1, 2, 3].map(i => [i, 0, 0, 0, 0, 0, 10, 1]),
    })
    const { prior } = model.windowRows(p2, 'cycle')
    assert.deepEqual(prior.map(r => p2.dims.hours[r[0]]), ['2026-08-01T08', '2026-08-20T08'])
  })

  test('the comparison window never reaches into the current cycle', () => {
    // A 28-day previous cycle plus a long-elapsed current one would overrun.
    const p2 = payload({
      hours: ['2026-08-15T08', '2026-09-01T08', '2026-12-31T08'],
      rows: [0, 1, 2].map(i => [i, 0, 0, 0, 0, 0, 10, 1]),
    })
    const { current, prior } = model.windowRows(p2, 'cycle')
    assert.ok(prior.every(r => p2.dims.hours[r[0]] < p2.cycle.start_hour))
    assert.ok(!current.some(r => prior.includes(r)))
  })

  test('a row one hour before the boundary is excluded', () => {
    const edge = payload({
      hours: ['2026-09-01T07', '2026-09-01T08'],
      rows: [[0, 0, 0, 0, 0, 0, 1, 1], [1, 0, 0, 0, 0, 0, 2, 1]],
    })
    assert.deepEqual(model.windowRows(edge, 'cycle').current.map(r => r[6]), [2])
  })

  test('an empty payload yields empty windows for every option', () => {
    const empty = payload({ hours: [], rows: [] })
    for (const win of ['1', '3', '7', '14', '30', 'cycle', 'all']) {
      const { current, prior } = model.windowRows(empty, win)
      assert.equal(current.length, 0, win)
      assert.equal(prior.length, 0, win)
    }
  })

  test('every window advertised in the UI is handled', () => {
    for (const { key } of model.WINDOWS) {
      assert.doesNotThrow(() => model.windowRows(p, key), `window ${key}`)
    }
  })
})

describe('hour-key arithmetic', () => {
  test('addHours moves forward and backward across a day boundary', () => {
    assert.equal(model.addHours('2026-09-01T22', 3), '2026-09-02T01')
    assert.equal(model.addHours('2026-09-01T01', -3), '2026-08-31T22')
  })

  test('addHours on an empty key is empty, not an invalid date', () => {
    assert.equal(model.addHours('', 5), '')
  })

  test('hoursBetween is signed and whole', () => {
    assert.equal(model.hoursBetween('2026-09-01T00', '2026-09-02T00'), 24)
    assert.equal(model.hoursBetween('2026-09-02T00', '2026-09-01T00'), -24)
    assert.equal(model.hoursBetween('2026-09-01T00', '2026-09-01T00'), 0)
  })

  test('hoursBetween with a missing bound is 0 rather than NaN', () => {
    assert.equal(model.hoursBetween('', '2026-09-01T00'), 0)
    assert.equal(model.hoursBetween('2026-09-01T00', ''), 0)
  })
})

describe('windowDays', () => {
  test('a numeric window is its own day count', () => {
    assert.equal(model.windowDays(payload(), '7'), 7)
  })

  test('"all" is 0, meaning unbounded', () => {
    assert.equal(model.windowDays(payload(), 'all'), 0)
  })

  test('the cycle counts elapsed days and is never below 1', () => {
    const future = payload({ cycle: { start_utc: new Date(Date.now() + 3600e3).toISOString() } })
    assert.ok(model.windowDays(future, 'cycle') >= 1)
    const old = payload({ cycle: { start_utc: '2026-09-01T00:00:00+00:00' } })
    assert.ok(model.windowDays(old, 'cycle') >= 1)
  })
})

/* -------------------------------------------------------------- aggregation */

describe('total and groupBy', () => {
  test('an empty input totals to zero, not NaN', () => {
    assert.deepEqual(model.total([]), { credits: 0, turns: 0 })
  })

  test('groupBy sums credits and counts turns per key', () => {
    const p = payload({
      models: ['a', 'b'],
      rows: [
        [0, 0, 0, 0, 0, 0, 5, 2],
        [0, 1, 0, 0, 0, 0, 7, 3],
        [0, 0, 0, 0, 0, 0, 1, 1],
      ],
    })
    const got = model.groupBy(p.rows, r => p.dims.model[r[1]])
    assert.deepEqual(got.get('a'), { credits: 6, turns: 3 })
    assert.deepEqual(got.get('b'), { credits: 7, turns: 3 })
  })

  test('groupBy on nothing is an empty map', () => {
    assert.equal(model.groupBy([], () => 'k').size, 0)
  })
})

describe('ranked', () => {
  const p = payload({
    models: ['low', 'high', 'mid'],
    rows: [
      [0, 0, 0, 0, 0, 0, 1, 1],
      [0, 1, 0, 0, 0, 0, 100, 1],
      [0, 2, 0, 0, 0, 0, 50, 1],
    ],
  })

  test('sorted by credits descending', () => {
    const got = model.ranked(p, p.rows, [], 'model')
    assert.deepEqual(got.map(r => r.key), ['high', 'mid', 'low'])
  })

  test('ties break by name so the order is stable across renders', () => {
    const tied = payload({
      models: ['zebra', 'apple'],
      rows: [[0, 0, 0, 0, 0, 0, 5, 1], [0, 1, 0, 0, 0, 0, 5, 1]],
    })
    const got = model.ranked(tied, tied.rows, [], 'model')
    assert.deepEqual(got.map(r => r.key), ['apple', 'zebra'])
  })

  test('every credit in the window is attributed to exactly one row', () => {
    for (const dim of ['model', 'surface', 'agent', 'job', 'session']) {
      const got = model.ranked(p, p.rows, [], dim)
      const sum = got.reduce((total, r) => total + r.cell.credits, 0)
      assert.equal(sum, model.total(p.rows).credits, dim)
    }
  })

  test('a value absent from the prior window reports no delta', () => {
    const got = model.ranked(p, p.rows, [], 'model')
    assert.ok(got.every(r => r.deltaPct === null))
  })

  test('a delta is computed against the prior window', () => {
    const prior = [[0, 1, 0, 0, 0, 0, 50, 1]]
    const got = model.ranked(p, p.rows, prior, 'model')
    assert.equal(got.find(r => r.key === 'high').deltaPct, 100)
  })

  test('a prior window with zero credits reports no delta rather than infinity', () => {
    const prior = [[0, 1, 0, 0, 0, 0, 0, 1]]
    const got = model.ranked(p, p.rows, prior, 'model')
    assert.equal(got.find(r => r.key === 'high').deltaPct, null)
  })

  test('an empty current window ranks nothing', () => {
    assert.equal(model.ranked(p, [], p.rows, 'model').length, 0)
  })
})

/* ------------------------------------------------------------------- labels */

describe('labels', () => {
  test('a session shows its stored title, and its slot as a sub-label', () => {
    const p = payload({ sessions: ['chat-1-1'], titles: { 'chat-1-1': 'Ship it' } })
    assert.equal(model.labelOf(p, 'session', 'chat-1-1'), 'Ship it')
    assert.equal(model.subLabelOf(p, 'session', 'chat-1-1'), 'chat-1-1')
  })

  test('an untitled session falls back to its slot with no sub-label', () => {
    const p = payload({ sessions: ['chat-2-1'] })
    assert.equal(model.labelOf(p, 'session', 'chat-2-1'), 'chat-2-1')
    assert.equal(model.subLabelOf(p, 'session', 'chat-2-1'), '')
  })

  test('a blank dimension value gets an explicit placeholder', () => {
    assert.equal(model.labelOf(payload(), 'model', ''), '(unlabelled)')
  })

  test('unscheduled job rows are identifiable and carry a kind', () => {
    assert.ok(model.isUnscheduled(`${model.UNSCHEDULED_PREFIX}subagent`))
    assert.ok(!model.isUnscheduled('nightly-sweep'))
    assert.ok(!model.isUnscheduled(''))
  })
})

/* -------------------------------------------------------------- unit jumps */

describe('unitJumps', () => {
  /** Two windows either side of the cycle boundary, with given per-turn costs. */
  const twoCycles = (nowPer, wasPer, { nowTurns = 4, wasTurns = 4 } = {}) =>
    payload({
      hours: ['2026-08-05T08', '2026-09-10T08'],
      models: ['m1'],
      rows: [
        [0, 0, 0, 0, 0, 0, wasPer * wasTurns, wasTurns],
        [1, 0, 0, 0, 0, 0, nowPer * nowTurns, nowTurns],
      ],
    })

  test('a tripling is reported with its ratio', () => {
    const jumps = model.unitJumps(twoCycles(30, 10), 'cycle')
    assert.equal(jumps.length, 1)
    assert.equal(jumps[0].name, 'm1')
    assert.equal(jumps[0].was, 10)
    assert.equal(jumps[0].now, 30)
    assert.equal(jumps[0].ratio, 3)
  })

  test('the threshold is inclusive at exactly 1.5x', () => {
    assert.equal(model.unitJumps(twoCycles(15, 10), 'cycle').length, 1)
    assert.equal(model.unitJumps(twoCycles(14.9, 10), 'cycle').length, 0)
  })

  test('a fall is not a jump', () => {
    assert.equal(model.unitJumps(twoCycles(5, 10), 'cycle').length, 0)
  })

  test('a model present in only one window is skipped, not reported as infinite', () => {
    const p = payload({
      hours: ['2026-08-05T08', '2026-09-10T08'],
      models: ['old', 'new'],
      rows: [
        [0, 0, 0, 0, 0, 0, 40, 4],
        [1, 1, 0, 0, 0, 0, 400, 4],
      ],
    })
    assert.deepEqual(model.unitJumps(p, 'cycle'), [])
  })

  test('a turnless window cannot produce a ratio', () => {
    const p = payload({
      hours: ['2026-08-05T08', '2026-09-10T08'],
      rows: [
        [0, 0, 0, 0, 0, 0, 40, 0],
        [1, 0, 0, 0, 0, 0, 400, 4],
      ],
    })
    assert.deepEqual(model.unitJumps(p, 'cycle'), [])
  })

  test('a free prior window cannot produce a ratio', () => {
    assert.deepEqual(model.unitJumps(twoCycles(30, 0), 'cycle'), [])
  })

  test('results are ordered by ratio, biggest first', () => {
    const p = payload({
      hours: ['2026-08-05T08', '2026-09-10T08'],
      models: ['double', 'quadruple'],
      rows: [
        [0, 0, 0, 0, 0, 0, 40, 4],
        [0, 1, 0, 0, 0, 0, 40, 4],
        [1, 0, 0, 0, 0, 0, 80, 4],
        [1, 1, 0, 0, 0, 0, 160, 4],
      ],
    })
    assert.deepEqual(model.unitJumps(p, 'cycle').map(j => j.name), ['quadruple', 'double'])
  })

  test('the "all" window probes 30 days rather than an unbounded span', () => {
    assert.doesNotThrow(() => model.unitJumps(payload(), 'all'))
  })

  test('an empty payload reports no jumps', () => {
    assert.deepEqual(model.unitJumps(payload({ hours: [], rows: [] }), 'cycle'), [])
  })
})

/* ------------------------------------------------------------------- charts */

const series = (values, name = 's1', color = '#5b8dfb') => ({ name, color, values })

describe('StackedBars', () => {
  test('renders an svg with a rect per non-zero segment', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['a', 'b'], series: [series([1, 2]), series([3, 0], 's2', '#f2777a')] }),
    )
    assert.ok(markup.startsWith('<svg'))
    // 3 coloured segments + 2 invisible hit areas
    assert.equal((markup.match(/<rect/g) || []).length, 5)
    noBadNumbers(markup, 'StackedBars')
  })

  test('no labels still renders a frame', () => {
    const markup = renderToStaticMarkup(h(charts.StackedBars, { labels: [], series: [] }))
    assert.ok(markup.startsWith('<svg'))
    noBadNumbers(markup, 'StackedBars empty')
  })

  test('an all-zero series draws no bars and no NaN', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['a', 'b'], series: [series([0, 0])] }),
    )
    assert.equal((markup.match(/class="ul-bar"/g) || []).length, 0)
    noBadNumbers(markup, 'StackedBars zeros')
  })

  test('a single bucket is not divided by zero', () => {
    const markup = renderToStaticMarkup(h(charts.StackedBars, { labels: ['only'], series: [series([5])] }))
    noBadNumbers(markup, 'StackedBars single')
  })

  test('negative values are skipped rather than drawn upside down', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['a'], series: [series([-5])] }),
    )
    assert.equal((markup.match(/class="ul-bar"/g) || []).length, 0)
    noBadNumbers(markup, 'StackedBars negative')
  })

  test('a series shorter than the label list is padded, not crashed', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['a', 'b', 'c'], series: [series([1])] }),
    )
    noBadNumbers(markup, 'StackedBars ragged')
  })

  test('very large values still produce finite geometry', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['a'], series: [series([1e12])] }),
    )
    noBadNumbers(markup, 'StackedBars huge')
  })

  test('many buckets thin out the x labels instead of overprinting', () => {
    const labels = Array.from({ length: 200 }, (_, i) => `h${i}`)
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels, series: [series(labels.map(() => 1))] }),
    )
    const texts = (markup.match(/class="ul-axis"/g) || []).length
    assert.ok(texts < 40, `expected thinned labels, got ${texts} axis texts`)
  })

  test('thousand-scale ticks are distinct, not two gridlines both reading "2k"', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['a'], series: [series([2000])] }),
    )
    const ticks = [...markup.matchAll(/class="ul-axis"[^>]*>([^<]+)</g)].map(m => m[1])
    const scaled = ticks.filter(t => t.endsWith('k'))
    assert.equal(new Set(scaled).size, scaled.length, `duplicate tick labels: ${ticks.join(', ')}`)
    assert.ok(scaled.includes('1.5k'), `expected a 1.5k tick, got ${ticks.join(', ')}`)
  })

  test('the label formatter is applied when given', () => {
    const markup = renderToStaticMarkup(
      h(charts.StackedBars, { labels: ['2026-09-01T08'], series: [series([1])], labelOf: () => 'PRETTY' }),
    )
    assert.ok(markup.includes('PRETTY'))
  })
})

describe('Lines', () => {
  test('renders a polyline per series with data', () => {
    const markup = renderToStaticMarkup(
      h(charts.Lines, { labels: ['d1', 'd2'], series: [series([1, 2]), series([3, 4], 's2', '#79c98a')] }),
    )
    assert.equal((markup.match(/<polyline/g) || []).length, 2)
    noBadNumbers(markup, 'Lines')
  })

  test('a gap is spanned rather than emitting a NaN point', () => {
    const markup = renderToStaticMarkup(
      h(charts.Lines, { labels: ['d1', 'd2', 'd3'], series: [series([1, null, 3])] }),
    )
    assert.equal((markup.match(/<circle/g) || []).length, 2)
    noBadNumbers(markup, 'Lines gap')
  })

  test('an all-null series draws nothing at all', () => {
    const markup = renderToStaticMarkup(
      h(charts.Lines, { labels: ['d1', 'd2'], series: [series([null, null])] }),
    )
    assert.equal((markup.match(/<polyline/g) || []).length, 0)
    noBadNumbers(markup, 'Lines all null')
  })

  test('a single point is centred rather than divided by zero', () => {
    const markup = renderToStaticMarkup(h(charts.Lines, { labels: ['d1'], series: [series([7])] }))
    noBadNumbers(markup, 'Lines single')
  })

  test('no series still renders a frame', () => {
    const markup = renderToStaticMarkup(h(charts.Lines, { labels: [], series: [] }))
    assert.ok(markup.startsWith('<svg'))
    noBadNumbers(markup, 'Lines empty')
  })
})

describe('Doughnut', () => {
  test('one arc per slice, with a total in the middle', () => {
    const markup = renderToStaticMarkup(
      h(charts.Doughnut, {
        slices: [
          { name: 'a', value: 30, color: '#5b8dfb' },
          { name: 'b', value: 70, color: '#f2777a' },
        ],
      }),
    )
    assert.equal((markup.match(/stroke-dasharray/g) || []).length, 2)
    assert.ok(markup.includes('100'))
    noBadNumbers(markup, 'Doughnut')
  })

  test('a zero total draws a placeholder ring instead of dividing by zero', () => {
    const markup = renderToStaticMarkup(h(charts.Doughnut, { slices: [] }))
    assert.ok(markup.includes('var(--border)'))
    noBadNumbers(markup, 'Doughnut empty')
  })

  test('slices that sum to zero also fall back to the ring', () => {
    const markup = renderToStaticMarkup(
      h(charts.Doughnut, { slices: [{ name: 'a', value: 0, color: '#5b8dfb' }] }),
    )
    assert.ok(markup.includes('var(--border)'))
    noBadNumbers(markup, 'Doughnut zeros')
  })

  test('a single slice fills the ring', () => {
    const markup = renderToStaticMarkup(
      h(charts.Doughnut, { slices: [{ name: 'only', value: 42, color: '#5b8dfb' }] }),
    )
    assert.equal((markup.match(/stroke-dasharray/g) || []).length, 1)
    noBadNumbers(markup, 'Doughnut single')
  })

  test('a thousands total is abbreviated so it fits the ring', () => {
    const markup = renderToStaticMarkup(
      h(charts.Doughnut, { slices: [{ name: 'a', value: 12345, color: '#5b8dfb' }] }),
    )
    assert.ok(markup.includes('12k'))
  })
})

describe('Legend', () => {
  test('one entry per item, each with its swatch', () => {
    const markup = renderToStaticMarkup(
      h(charts.Legend, { items: [{ name: 'a', color: '#5b8dfb' }, { name: 'b', color: '#f2777a' }] }),
    )
    assert.equal((markup.match(/ul-legend-item/g) || []).length, 2)
    assert.equal((markup.match(/ul-sw/g) || []).length, 2)
  })

  test('no items renders an empty container, not a crash', () => {
    assert.ok(renderToStaticMarkup(h(charts.Legend, { items: [] })).includes('ul-legend'))
  })
})

/* ------------------------------------------- integration over a real payload */

describe('real payload', () => {
  const fixturePath = join(root, 'tests', 'fixture.json')
  const available = existsSync(fixturePath)
  const series_ = available ? JSON.parse(readFileSync(fixturePath, 'utf8')) : null

  test('the fixture matches the payload contract', { skip: !available }, () => {
    for (const key of ['generated_at', 'tz', 'shards', 'cycle', 'official', 'dims', 'rows', 'labels', 'totals']) {
      assert.ok(key in series_, `missing ${key}`)
    }
    assert.ok(series_.rows.every(r => r.length === 8))
    for (const r of series_.rows) {
      for (const [i, name] of ['hours', 'model', 'surface', 'agent', 'job', 'session'].entries()) {
        assert.ok(r[i] >= 0 && r[i] < series_.dims[name].length, `${name} index out of range`)
      }
    }
  })

  test('the reported total reconciles with the rows', { skip: !available }, () => {
    const summed = series_.rows.reduce((sum, r) => sum + r[6], 0)
    assert.ok(Math.abs(summed - series_.totals.credits) < 0.02)
  })

  test('every dimension attributes the whole window', { skip: !available }, () => {
    const { current, prior } = model.windowRows(series_, 'cycle')
    const windowTotal = model.total(current).credits
    for (const dim of ['model', 'surface', 'agent', 'job', 'session']) {
      const sum = model.ranked(series_, current, prior, dim).reduce((t, r) => t + r.cell.credits, 0)
      assert.ok(Math.abs(sum - windowTotal) < 1e-6, dim)
    }
  })

  test('no job row is blank and unscheduled rows name their kind', { skip: !available }, () => {
    const { current, prior } = model.windowRows(series_, 'all')
    const jobs = model.ranked(series_, current, prior, 'job')
    assert.ok(jobs.every(r => r.key.length > 0))
    assert.ok(
      jobs.filter(r => model.isUnscheduled(r.key)).every(r => r.key.length > model.UNSCHEDULED_PREFIX.length),
    )
  })

  test('charts render over the real payload without bad geometry', { skip: !available }, () => {
    const { current, prior } = model.windowRows(series_, 'cycle')
    const top = model.ranked(series_, current, prior, 'model').slice(0, 8)
    const colours = new Map(top.map((r, i) => [r.key, model.PALETTE[i % model.PALETTE.length]]))
    const buckets = [...new Set(current.map(r => model.bucketOf(series_, r, 'hour')))].sort()
    const stacks = top.map(r => {
      const cells = model.groupBy(
        current.filter(one => model.dimValue(series_, one, 'model') === r.key),
        one => model.bucketOf(series_, one, 'hour'),
      )
      return {
        name: r.key,
        color: colours.get(r.key),
        values: buckets.map(b => (cells.get(b) ? cells.get(b).credits : 0)),
      }
    })
    noBadNumbers(renderToStaticMarkup(h(charts.StackedBars, { labels: buckets, series: stacks })), 'real bars')
    noBadNumbers(
      renderToStaticMarkup(
        h(charts.Doughnut, {
          slices: top.map(r => ({ name: r.key, value: r.cell.credits, color: colours.get(r.key) })),
        }),
      ),
      'real doughnut',
    )
  })
})
