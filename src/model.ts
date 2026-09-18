/*
 * The payload shape and every aggregation the page performs.
 *
 * The backend folds turn rows into hour x model x surface x agent x job x session
 * buckets ONCE; each of these functions re-slices that same array. Keeping the
 * arithmetic here (rather than in the components) is what lets the window,
 * granularity, dimension, and metric controls all be pure re-renders with no
 * refetch.
 */

export interface Cycle {
  source: 'kiro-api' | 'assumed-utc-month'
  resets: string
  start_utc: string
  /** Cycle boundaries as `YYYY-MM-DDTHH` keys on the payload's display clock. */
  start_hour: string
  prev_start_hour: string
  end_hour: string
}

/** Kiro's own month-to-date figures, for comparison. Empty when unavailable. */
export interface Official {
  credits_used?: number
  credits_plan?: number
  credits_overage?: number
  credits_covered?: number
  percentage?: number
  cost_usd?: number
  overage_rate?: number
  plan?: string
  resets?: string
  source?: string
}

export interface Series {
  generated_at: string
  tz: string
  window_days: number
  shards: number
  cycle: Cycle
  official: Official
  dims: Record<DimKey | 'hours', string[]>
  rows: number[][]
  labels: { session?: Record<string, string> }
  totals: { credits: number; turns: number }
}

export type DimKey = 'model' | 'surface' | 'agent' | 'job' | 'session'
export type Metric = 'credits' | 'turns' | 'per_turn'
export type Gran = 'hour' | 'day'
/** A window is a number of days, or Kiro's own billing cycle, or everything. */
export type WindowKey = '1' | '3' | '7' | '14' | '30' | 'cycle' | 'all'

// Row layout, mirrored from backend/usage_store.read_series.
export const COL = {
  hour: 0,
  model: 1,
  surface: 2,
  agent: 3,
  job: 4,
  session: 5,
  credits: 6,
  turns: 7,
} as const

export const DIMENSIONS: { key: DimKey; label: string }[] = [
  { key: 'model', label: 'Model' },
  { key: 'surface', label: 'Surface' },
  { key: 'agent', label: 'Agent' },
  { key: 'job', label: 'Scheduled job' },
  { key: 'session', label: 'Session' },
]

export const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: '1', label: '24h' },
  { key: '3', label: '3d' },
  { key: '7', label: '7d' },
  { key: '14', label: '14d' },
  { key: '30', label: '30d' },
  { key: 'cycle', label: 'This cycle' },
  { key: 'all', label: 'All' },
]

export const METRICS: { key: Metric; label: string }[] = [
  { key: 'credits', label: 'Credits' },
  { key: 'turns', label: 'Turns' },
  { key: 'per_turn', label: 'Credits / turn' },
]

/* Ten hues, then wrap. Fixed rather than theme-derived: these identify series
   against each other, and a palette mixed from one accent cannot keep ten
   categories apart. */
export const PALETTE = [
  '#5b8dfb', '#f2777a', '#79c98a', '#e0b252', '#b48ce3',
  '#4bc3d4', '#ef8f57', '#8fa1c7', '#d76fa8', '#6fbf73',
]

export interface Cell { credits: number; turns: number }

export const emptyCell = (): Cell => ({ credits: 0, turns: 0 })

export function metricOf(cell: Cell, metric: Metric): number {
  if (metric === 'credits') return cell.credits
  if (metric === 'turns') return cell.turns
  return cell.turns ? cell.credits / cell.turns : 0
}

/** Format a credit figure: thousands lose their decimal, small values keep one. */
export function fmt(value: number): string {
  if (!isFinite(value)) return '—'
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString()
  return (Math.round(value * 10) / 10).toLocaleString()
}

/**
 * Window bounds on the DATA's clock.
 *
 * Hour keys are `YYYY-MM-DDTHH` already converted to the payload's zone, so
 * comparing them as strings is a valid ordering and arithmetic can treat them as
 * UTC — the offset is identical on both sides and cancels out. Anchoring to the
 * newest row rather than to `Date.now()` keeps the window meaningful on a
 * gateway that has been idle for a day.
 */
export function hourMinus(series: Series, hours: number): string {
  const all = series.dims.hours
  if (!all.length) return ''
  const newest = all[all.length - 1]
  const at = Date.parse(`${newest.slice(0, 10)}T${newest.slice(11, 13)}:00:00Z`)
  return new Date(at - hours * 3_600_000).toISOString().slice(0, 13)
}

export function rowsBetween(series: Series, lo: string, hi: string): number[][] {
  return series.rows.filter(row => {
    const hour = series.dims.hours[row[COL.hour]]
    return hour >= lo && (hi === '' || hour < hi)
  })
}

/** An hour key shifted by `hours`, on the same clock. */
export function addHours(hourKey: string, hours: number): string {
  if (!hourKey) return ''
  const at = Date.parse(`${hourKey.slice(0, 10)}T${hourKey.slice(11, 13)}:00:00Z`)
  return new Date(at + hours * 3_600_000).toISOString().slice(0, 13)
}

/** Whole hours from `from` to `to`, negative when `to` is earlier. */
export function hoursBetween(from: string, to: string): number {
  if (!from || !to) return 0
  const a = Date.parse(`${from.slice(0, 10)}T${from.slice(11, 13)}:00:00Z`)
  const b = Date.parse(`${to.slice(0, 10)}T${to.slice(11, 13)}:00:00Z`)
  return Math.round((b - a) / 3_600_000)
}

/**
 * Rows for the selected window, plus the comparison window before it.
 *
 * For a day-count window the comparison is an equal-length lookback. For the
 * billing cycle it is the SAME ELAPSED SPAN of the preceding cycle, not the whole
 * of it: on day 17 of a month, comparing against a complete previous month reports
 * a fall of about a third no matter what the user did. The bound is clamped to the
 * current cycle's start so a short previous cycle cannot reach forward into this one.
 */
export function windowRows(series: Series, win: WindowKey) {
  if (win === 'all') return { current: series.rows, prior: [] as number[][], lo: '' }
  if (win === 'cycle') {
    const { start_hour, prev_start_hour } = series.cycle
    const hours = series.dims.hours
    const newest = hours.length ? hours[hours.length - 1] : start_hour
    const elapsed = Math.max(1, hoursBetween(start_hour, newest) + 1)
    let priorEnd = addHours(prev_start_hour, elapsed)
    if (priorEnd > start_hour) priorEnd = start_hour
    return {
      current: rowsBetween(series, start_hour, ''),
      prior: rowsBetween(series, prev_start_hour, priorEnd),
      lo: start_hour,
    }
  }
  const days = Number(win)
  const lo = hourMinus(series, days * 24)
  const priorLo = hourMinus(series, days * 48)
  return {
    current: rowsBetween(series, lo, ''),
    prior: rowsBetween(series, priorLo, lo),
    lo,
  }
}

/** Days spanned by a window. `all` is 0; the cycle counts from its own start. */
export function windowDays(series: Series, win: WindowKey): number {
  if (win === 'cycle') {
    return Math.max(1, Math.round((Date.now() - Date.parse(series.cycle.start_utc)) / 86_400_000))
  }
  if (win === 'all') return 0
  return Number(win)
}

export function total(rows: number[][]): Cell {
  const out = emptyCell()
  for (const row of rows) {
    out.credits += row[COL.credits]
    out.turns += row[COL.turns]
  }
  return out
}

export function groupBy(
  rows: number[][],
  key: (row: number[]) => string,
): Map<string, Cell> {
  const out = new Map<string, Cell>()
  for (const row of rows) {
    const k = key(row)
    let cell = out.get(k)
    if (!cell) out.set(k, (cell = emptyCell()))
    cell.credits += row[COL.credits]
    cell.turns += row[COL.turns]
  }
  return out
}

export const dimValue = (series: Series, row: number[], dim: DimKey): string =>
  series.dims[dim][row[COL[dim]]]

export const bucketOf = (series: Series, row: number[], gran: Gran): string => {
  const hour = series.dims.hours[row[COL.hour]]
  return gran === 'hour' ? hour : hour.slice(0, 10)
}

/** Prefix the backend puts on a job-dimension row that is not a scheduled job. */
export const UNSCHEDULED_PREFIX = 'Unscheduled · '

export const isUnscheduled = (raw: string): boolean => raw.startsWith(UNSCHEDULED_PREFIX)

/** Human label for a dimension value; sessions get their stored title. */
export function labelOf(series: Series, dim: DimKey, raw: string): string {
  if (dim === 'session') {
    const title = series.labels.session?.[raw]
    return title ? title : raw
  }
  return raw || '(unlabelled)'
}

/** Secondary line under a label — currently the slot key behind a session title. */
export function subLabelOf(series: Series, dim: DimKey, raw: string): string {
  return dim === 'session' && series.labels.session?.[raw] ? raw : ''
}

export interface Ranked { key: string; cell: Cell; deltaPct: number | null }

/** Dimension values ranked by credits, each carrying its prior-window delta. */
export function ranked(
  series: Series,
  current: number[][],
  prior: number[][],
  dim: DimKey,
): Ranked[] {
  const now = groupBy(current, row => dimValue(series, row, dim))
  const was = groupBy(prior, row => dimValue(series, row, dim))
  return [...now.entries()]
    .sort((a, b) => b[1].credits - a[1].credits || a[0].localeCompare(b[0]))
    .map(([key, cell]) => {
      const before = was.get(key)
      return {
        key,
        cell,
        // A value with no prior spend has no percentage to report; the table
        // renders that as "new" rather than as a fabricated infinity.
        deltaPct: before && before.credits > 0
          ? ((cell.credits - before.credits) / before.credits) * 100
          : null,
      }
    })
}

export function deltaPct(now: number, before: number): number | null {
  return before > 0 ? ((now - before) / before) * 100 : null
}

export interface UnitJump { name: string; was: number; now: number; ratio: number }

/**
 * Models whose credits-per-turn rose by at least half against the preceding
 * window of equal length.
 *
 * This is the one thing totals cannot tell you: spend rising because you worked
 * more looks identical to spend rising because the same work costs more, until
 * you divide by turns. A ratio needs turns on BOTH sides, so a model that only
 * appeared in one window is skipped rather than reported as an infinite jump.
 */
export function unitJumps(series: Series, win: WindowKey, threshold = 1.5): UnitJump[] {
  const { current, prior } = windowRows(series, win === 'all' ? '30' : win)
  const now = groupBy(current, row => dimValue(series, row, 'model'))
  const was = groupBy(prior, row => dimValue(series, row, 'model'))
  const out: UnitJump[] = []
  for (const [name, cell] of now) {
    const before = was.get(name)
    if (!before || !before.turns || !cell.turns) continue
    const nowPer = cell.credits / cell.turns
    const wasPer = before.credits / before.turns
    if (wasPer > 0 && nowPer / wasPer >= threshold) {
      out.push({ name, was: wasPer, now: nowPer, ratio: nowPer / wasPer })
    }
  }
  return out.sort((a, b) => b.ratio - a.ratio)
}
