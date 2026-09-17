/*
 * Usage Lens — where the credits went.
 *
 * One fetch of the folded usage payload, then every control is a pure
 * re-aggregation: window, granularity, dimension, and metric never hit the
 * network again. See src/model.ts for the arithmetic and src/charts.tsx for the
 * SVG chart primitives.
 */
import { useEffect, useMemo, useState } from 'react'
import { useAppApi } from '@kirocrew/app-sdk'
import { Card, CardTitle, Btn, StatCard, ContentSkeleton, EmptyState, PageHeader } from '@kirocrew/app-sdk/ui'

import { Doughnut, Legend, Lines, StackedBars, type SeriesDef } from './charts'
import { STYLES } from './styles'
import {
  COL, DIMENSIONS, METRICS, PALETTE, WINDOWS,
  bucketOf, deltaPct, dimValue, fmt, groupBy, isUnscheduled, labelOf, metricOf, ranked,
  subLabelOf, total, unitJumps, windowDays, windowRows,
  type DimKey, type Gran, type Metric, type Series, type WindowKey,
} from './model'

const STYLE_ID = 'usage-lens-styles'
// How many dimension values get a colour and a chart series. Everything else
// still appears in the table — a top-N cut in the ONE place that lists every
// row would hide exactly the long-tail creep this page exists to surface.
const TOP_SERIES = 8
const TOP_LINES = 5

function useStyles(): void {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const tag = document.createElement('style')
    tag.id = STYLE_ID
    tag.textContent = STYLES
    document.head.appendChild(tag)
  }, [])
}

function Seg<T extends string | number>({ label, options, value, onChange }: {
  label: string
  options: { key: T; label: string }[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div className="ul-group">
      <span className="ul-group-label">{label}</span>
      <span className="ul-seg" role="group" aria-label={label}>
        {options.map(option => (
          <button
            key={String(option.key)}
            type="button"
            aria-pressed={option.key === value}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </span>
    </div>
  )
}

function Delta({ value, suffix = 'vs prior window' }: { value: number | null; suffix?: string }) {
  if (value === null) return <span className="ul-delta ul-flat">no prior window</span>
  const rounded = Math.round(value)
  if (rounded === 0) return <span className="ul-delta ul-flat">flat {suffix}</span>
  return (
    <span className={`ul-delta ${rounded > 0 ? 'ul-up' : 'ul-down'}`}>
      {rounded > 0 ? '▲' : '▼'} {Math.abs(rounded)}% {suffix}
    </span>
  )
}

export default function UsageLens() {
  useStyles()
  const api = useAppApi()

  const [series, setSeries] = useState<Series | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<WindowKey>('cycle')
  const [gran, setGran] = useState<Gran>('hour')
  const [dim, setDim] = useState<DimKey>('model')
  const [metric, setMetric] = useState<Metric>('credits')

  // The browser's zone, not the gateway's: day boundaries should fall where the
  // person reading the chart experiences midnight.
  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    } catch {
      return ''
    }
  }, [])

  const load = () => {
    setLoading(true)
    // days=0 fetches every retained shard, so each window (and its prior window
    // for comparison) is a client-side slice of one response.
    api
      .get<Series>(`/api/apps/usage-lens/series?days=0${tz ? `&tz=${encodeURIComponent(tz)}` : ''}`)
      .then(payload => {
        setSeries(payload)
        setError('')
      })
      .catch((problem: unknown) => setError(problem instanceof Error ? problem.message : String(problem)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [tz])

  const view = useMemo(() => {
    if (!series) return null
    const { current, prior } = windowRows(series, days)
    const now = total(current)
    const before = total(prior)
    const rows = ranked(series, current, prior, dim)
    const top = rows.slice(0, TOP_SERIES)
    const colours = new Map(top.map((row, index) => [row.key, PALETTE[index % PALETTE.length]]))

    const buckets = [...new Set(current.map(row => bucketOf(series, row, gran)))].sort()
    const byBucket = top.map<SeriesDef>(row => {
      const cells = groupBy(
        current.filter(one => dimValue(series, one, dim) === row.key),
        one => bucketOf(series, one, gran),
      )
      return {
        name: labelOf(series, dim, row.key),
        color: colours.get(row.key)!,
        values: buckets.map(bucket => {
          const cell = cells.get(bucket)
          return cell ? metricOf(cell, metric) : 0
        }),
      }
    })

    const days_ = [...new Set(current.map(row => bucketOf(series, row, 'day')))].sort()
    const unit = top.slice(0, TOP_LINES).map<SeriesDef>(row => {
      const cells = groupBy(
        current.filter(one => dimValue(series, one, dim) === row.key),
        one => bucketOf(series, one, 'day'),
      )
      return {
        name: labelOf(series, dim, row.key),
        color: colours.get(row.key)!,
        values: days_.map(day => {
          const cell = cells.get(day)
          return cell && cell.turns ? cell.credits / cell.turns : null
        }),
      }
    })

    return {
      now,
      before,
      rows,
      top,
      colours,
      buckets,
      byBucket,
      unitLabels: days_,
      unit,
      jumps: unitJumps(series, days),
      distinct: new Set(current.map(row => row[COL[dim]])).size,
      // Reconciliation against Kiro's own month-to-date figure. Only meaningful for
      // the cycle window: on any other window the two cover different spans, and a
      // "coverage" percentage computed across mismatched spans would be a lie.
      reconcile:
        days === 'cycle' && typeof series.official.credits_used === 'number'
          ? {
              official: series.official.credits_used,
              local: now.credits,
              gap: series.official.credits_used - now.credits,
              coveragePct: series.official.credits_used
                ? (now.credits / series.official.credits_used) * 100
                : null,
            }
          : null,
    }
  }, [series, days, gran, dim, metric])

  const dimLabel = DIMENSIONS.find(one => one.key === dim)!.label
  const metricLabel = METRICS.find(one => one.key === metric)!.label

  return (
    <div className="ul-root">
      <PageHeader
        title="Usage Lens"
        subtitle="Credits by model, surface, agent, scheduled job, and session — from the gateway's own usage shards"
        actions={
          <Btn onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Btn>
        }
      />
      <div className="ul-body">
        <div className="ul-controls">
          <Seg
            label="Window"
            options={WINDOWS.map(one => ({ key: one.key, label: one.label }))}
            value={days}
            onChange={setDays}
          />
          <Seg
            label="Granularity"
            options={[{ key: 'hour' as Gran, label: 'Hourly' }, { key: 'day' as Gran, label: 'Daily' }]}
            value={gran}
            onChange={setGran}
          />
          <Seg label="Break down by" options={DIMENSIONS} value={dim} onChange={setDim} />
          <Seg label="Metric" options={METRICS} value={metric} onChange={setMetric} />
        </div>

        {error ? (
          <EmptyState
            title="Could not read usage data"
            subtitle={error}
            action={<Btn onClick={load}>Try again</Btn>}
          />
        ) : !series || !view ? (
          <ContentSkeleton rows={6} />
        ) : series.rows.length === 0 ? (
          <EmptyState
            title="No usage recorded yet"
            subtitle="The gateway writes one row per agent turn to usage/tokens. Run a turn, then refresh."
            action={<Btn onClick={load}>Refresh</Btn>}
          />
        ) : (
          <>
            {view.jumps.length > 0 && (
              <div className="ul-flag">
                <div>
                  <div className="ul-flag-title">Unit cost jumped</div>
                  <p className="ul-flag-body">
                    Against the preceding window of equal length,{' '}
                    {view.jumps.map((jump, index) => (
                      <span key={jump.name}>
                        {index > 0 ? '; ' : ''}
                        <span className="ul-mono">{jump.name}</span> went from {fmt(jump.was)} to{' '}
                        {fmt(jump.now)} credits per turn (×{jump.ratio.toFixed(1)})
                      </span>
                    ))}
                    . Same work costing more looks like this; more work at the same price does not —
                    check the credits-per-turn trend below to tell them apart.
                  </p>
                </div>
              </div>
            )}

            <div className="ul-kpis">
              <StatCard
                label="Credits"
                value={fmt(view.now.credits)}
                sub={<Delta value={deltaPct(view.now.credits, view.before.credits)} />}
                accent
              />
              <StatCard
                label="Turns"
                value={view.now.turns.toLocaleString()}
                sub={<Delta value={deltaPct(view.now.turns, view.before.turns)} />}
              />
              <StatCard
                label="Credits / turn"
                value={fmt(view.now.turns ? view.now.credits / view.now.turns : 0)}
                sub={
                  <Delta
                    value={deltaPct(
                      view.now.turns ? view.now.credits / view.now.turns : 0,
                      view.before.turns ? view.before.credits / view.before.turns : 0,
                    )}
                  />
                }
              />
              <StatCard label={`Distinct ${dimLabel.toLowerCase()}`} value={String(view.distinct)} />
            </div>

            {view.reconcile && (
              <Card style={{ marginBottom: 14 }}>
                <CardTitle>Against Kiro's own meter — this billing cycle</CardTitle>
                <div className="ul-recon">
                  <div className="ul-recon-cell">
                    <span className="ul-recon-label">Kiro reports</span>
                    <span className="ul-recon-value">{fmt(view.reconcile.official)}</span>
                    <span className="ul-recon-sub">
                      {series.official.credits_plan
                        ? `of ${fmt(series.official.credits_plan)} in ${series.official.plan || 'plan'}`
                        : 'credits used'}
                      {typeof series.official.cost_usd === 'number' && series.official.cost_usd > 0
                        ? ` · $${series.official.cost_usd.toFixed(2)} overage`
                        : ''}
                    </span>
                  </div>
                  <div className="ul-recon-cell">
                    <span className="ul-recon-label">This page can attribute</span>
                    <span className="ul-recon-value">{fmt(view.reconcile.local)}</span>
                    <span className="ul-recon-sub">
                      {view.reconcile.coveragePct !== null
                        ? `${view.reconcile.coveragePct.toFixed(1)}% of Kiro's figure`
                        : 'from the local usage shards'}
                    </span>
                  </div>
                  <div className="ul-recon-cell">
                    <span className="ul-recon-label">Unattributed</span>
                    <span className="ul-recon-value ul-up">{fmt(view.reconcile.gap)}</span>
                    <span className="ul-recon-sub">Kiro usage that did not go through this gateway</span>
                  </div>
                </div>
                <p className="ul-chart-note">
                  The two will not match, and the gap is the useful part. Kiro's meter counts every
                  credit on the account — the Kiro IDE, and any <span className="ul-mono">kiro-cli</span>{' '}
                  session you drive yourself. This page can only see turns the gateway ran, so the
                  difference is your usage from everywhere else. Cycle boundary:{' '}
                  <span className="ul-mono">{series.cycle.start_utc.slice(0, 10)}</span> to{' '}
                  <span className="ul-mono">{series.cycle.resets}</span> UTC
                  {series.cycle.source === 'kiro-api'
                    ? ", from Kiro's own reset date"
                    : ' (assumed UTC calendar month — Kiro did not report a reset date)'}
                  , shown on your clock from{' '}
                  <span className="ul-mono">{series.cycle.start_hour.replace('T', ' ')}:00</span>.{' '}
                  Day {windowDays(series, 'cycle')} of the cycle.
                </p>
              </Card>
            )}

            <div className="ul-charts">
              <Card>
                <CardTitle>{`${metricLabel} over time — ${gran === 'hour' ? 'hourly' : 'daily'}, stacked by ${dimLabel.toLowerCase()}`}</CardTitle>
                <StackedBars
                  labels={view.buckets}
                  series={view.byBucket}
                  labelOf={raw => (gran === 'hour' ? `${raw.slice(5, 10)} ${raw.slice(11, 13)}h` : raw.slice(5))}
                  unit={metric === 'turns' ? ' turns' : ' credits'}
                />
                <Legend
                  items={view.top.map(row => ({
                    name: labelOf(series, dim, row.key),
                    color: view.colours.get(row.key)!,
                  }))}
                />
              </Card>
              <Card>
                <CardTitle>{`Share of credits by ${dimLabel.toLowerCase()}`}</CardTitle>
                <Doughnut
                  slices={view.top.map(row => ({
                    name: labelOf(series, dim, row.key),
                    value: row.cell.credits,
                    color: view.colours.get(row.key)!,
                  }))}
                />
                <p className="ul-chart-note">
                  Always credits, whichever metric is selected above: a share of a per-turn ratio has
                  no meaning.
                </p>
              </Card>
            </div>

            <Card style={{ marginBottom: 14 }}>
              <CardTitle>Credits per turn, by day</CardTitle>
              <p className="ul-chart-note">
                The price signal. A line that steps up while its work stays the same size is a
                repricing or a context blow-up, not more work.
              </p>
              <Lines labels={view.unitLabels.map(day => day.slice(5))} series={view.unit} />
            </Card>

            <Card>
              <CardTitle>{`By ${dimLabel.toLowerCase()} — ${view.rows.length} ${view.rows.length === 1 ? 'entry' : 'entries'}`}</CardTitle>
              <div className="ul-table-wrap">
                <table className="ul-table">
                  <thead>
                    <tr>
                      <th>{dimLabel}</th>
                      <th>Credits</th>
                      <th>Share</th>
                      <th>Turns</th>
                      <th>Credits / turn</th>
                      <th>vs prior window</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map(row => {
                      const sub = subLabelOf(series, dim, row.key)
                      return (
                        <tr key={row.key}>
                          <td>
                            <span className={`ul-name${isUnscheduled(row.key) ? ' ul-unscheduled' : ''}`}>
                              <span
                                className="ul-sw"
                                style={{ background: view.colours.get(row.key) || 'var(--border-strong, var(--border))' }}
                              />
                              <span>{labelOf(series, dim, row.key)}</span>
                            </span>
                            {sub ? <span className="ul-sub ul-mono">{sub}</span> : null}
                          </td>
                          <td>{fmt(row.cell.credits)}</td>
                          <td>
                            {view.now.credits > 0
                              ? `${((row.cell.credits / view.now.credits) * 100).toFixed(1)}%`
                              : '—'}
                          </td>
                          <td>{row.cell.turns.toLocaleString()}</td>
                          <td>{fmt(row.cell.turns ? row.cell.credits / row.cell.turns : 0)}</td>
                          <td>
                            {row.deltaPct === null ? (
                              <span className="ul-flat">new</span>
                            ) : (
                              <span className={row.deltaPct >= 0 ? 'ul-up' : 'ul-down'}>
                                {row.deltaPct >= 0 ? '+' : ''}
                                {Math.round(row.deltaPct)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="ul-foot">
                {`${series.shards} daily shard${series.shards === 1 ? '' : 's'} · times in ${series.tz} · generated ${series.generated_at.replace('T', ' ').slice(0, 16)}`}
                <br />
                Credits are the only cost figure the gateway records for every turn: token counts and
                USD cost are written by the <span className="ul-mono">claude_code</span> and{' '}
                <span className="ul-mono">bedrock</span> providers only, and are zero on ACP turns.
                Subagent turns are attributed to the <span className="ul-mono">subagent</span> surface —
                they carry no pointer back to the session that spawned them.
                <br />
                Under <strong>Scheduled job</strong>, a row prefixed{' '}
                <span className="ul-mono">Unscheduled ·</span> is not a job: it is interactive chat,
                a subagent, the task runner, or background maintenance, named by which one.
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
