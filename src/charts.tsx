/*
 * Charts as inline SVG with a fixed viewBox.
 *
 * Deliberately not a charting library: a canvas-based chart sized from its
 * container needs an explicit pixel height or it and the container size each
 * other forever, and bundling one would put ~200 KB of third-party code into an
 * app whose entire job is three chart types. A fixed viewBox scales with CSS,
 * has no measurement feedback path, and inherits theme tokens for free.
 */
import type { ReactNode } from 'react'

export interface SeriesDef { name: string; color: string; values: (number | null)[] }

const PAD = { top: 8, right: 6, bottom: 20, left: 42 }

function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10
  return step * magnitude
}

const tickText = (value: number): string =>
  value >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value * 10) / 10)

/** Show at most `max` x labels, evenly spaced, always including the last. */
function labelStride(count: number, max: number): number {
  return Math.max(1, Math.ceil(count / max))
}

interface FrameProps {
  width: number
  height: number
  max: number
  labels: string[]
  labelOf?: (raw: string) => string
  maxLabels?: number
  children: (scale: (v: number) => number, plot: { w: number; h: number }) => ReactNode
}

/** Shared plot frame: y grid + ticks, x labels, and a scale for the children. */
function Frame({ width, height, max, labels, labelOf, maxLabels = 12, children }: FrameProps) {
  const plot = { w: width - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom }
  const top = niceCeil(max)
  const scale = (value: number) => plot.h - (value / top) * plot.h
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(fraction => top * fraction)
  const stride = labelStride(labels.length, maxLabels)
  return (
    <svg className="ul-svg" viewBox={`0 0 ${width} ${height}`} role="img" preserveAspectRatio="none">
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {ticks.map(value => (
          <g key={value}>
            <line className="ul-grid" x1={0} x2={plot.w} y1={scale(value)} y2={scale(value)} />
            <text className="ul-axis" x={-6} y={scale(value) + 3} textAnchor="end">
              {tickText(value)}
            </text>
          </g>
        ))}
        {children(scale, plot)}
        {labels.map((raw, index) =>
          index % stride === 0 || index === labels.length - 1 ? (
            <text
              key={raw}
              className="ul-axis"
              x={((index + 0.5) / labels.length) * plot.w}
              y={plot.h + 13}
              textAnchor="middle"
            >
              {labelOf ? labelOf(raw) : raw}
            </text>
          ) : null,
        )}
      </g>
    </svg>
  )
}

export interface StackedBarsProps {
  labels: string[]
  series: SeriesDef[]
  labelOf?: (raw: string) => string
  unit?: string
  height?: number
}

/** Time on x, one stacked bar per bucket, one colour per dimension value. */
export function StackedBars({ labels, series, labelOf, unit = '', height = 260 }: StackedBarsProps) {
  const width = 720
  const totals = labels.map((_, index) =>
    series.reduce((sum, one) => sum + (one.values[index] ?? 0), 0),
  )
  const max = Math.max(...totals, 0)
  const slot = labels.length ? (width - PAD.left - PAD.right) / labels.length : 0
  const barWidth = Math.max(1, Math.min(slot * 0.78, 34))
  return (
    <Frame width={width} height={height} max={max} labels={labels} labelOf={labelOf}>
      {(scale, plot) =>
        labels.map((raw, index) => {
          let cursor = 0
          const x = (index + 0.5) * slot - barWidth / 2
          return (
            <g key={raw}>
              <title>{`${labelOf ? labelOf(raw) : raw} · ${Math.round(totals[index] * 10) / 10}${unit}`}</title>
              {series.map(one => {
                const value = one.values[index] ?? 0
                if (value <= 0) return null
                const y = scale(cursor + value)
                const bottom = scale(cursor)
                cursor += value
                return (
                  <rect
                    key={one.name}
                    className="ul-bar"
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(0.6, bottom - y)}
                    fill={one.color}
                  />
                )
              })}
              {/* Invisible full-height hit area so the tooltip works on a short bar. */}
              <rect x={index * slot} y={0} width={slot} height={plot.h} fill="transparent" />
            </g>
          )
        })
      }
    </Frame>
  )
}

export interface LinesProps {
  labels: string[]
  series: SeriesDef[]
  height?: number
}

/** One polyline per series, gaps spanned — for the credits-per-turn trend. */
export function Lines({ labels, series, height = 210 }: LinesProps) {
  const width = 720
  const max = Math.max(
    ...series.flatMap(one => one.values.map(value => value ?? 0)),
    0,
  )
  return (
    <Frame width={width} height={height} max={max} labels={labels}>
      {(scale, plot) => {
        const x = (index: number) =>
          labels.length > 1 ? (index / (labels.length - 1)) * plot.w : plot.w / 2
        return series.map(one => {
          const points = one.values
            .map((value, index) => (value === null ? null : `${x(index)},${scale(value)}`))
            .filter((point): point is string => point !== null)
          if (!points.length) return null
          return (
            <g key={one.name}>
              <polyline
                points={points.join(' ')}
                fill="none"
                stroke={one.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {one.values.map((value, index) =>
                value === null ? null : (
                  <circle key={index} cx={x(index)} cy={scale(value)} r={2.2} fill={one.color}>
                    <title>{`${one.name} · ${labels[index]} · ${Math.round(value * 10) / 10}`}</title>
                  </circle>
                ),
              )}
            </g>
          )
        })
      }}
    </Frame>
  )
}

export interface Slice { name: string; value: number; color: string }

/** Share of total as a doughnut. Values are credits; a share of a ratio is meaningless. */
export function Doughnut({ slices, size = 200, thickness = 26 }: {
  slices: Slice[]
  size?: number
  thickness?: number
}) {
  const total = slices.reduce((sum, one) => sum + one.value, 0)
  const radius = size / 2 - thickness / 2 - 1
  const centre = size / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <svg className="ul-svg" viewBox={`0 0 ${size} ${size}`} role="img" style={{ maxHeight: size }}>
      {total <= 0 ? (
        <circle cx={centre} cy={centre} r={radius} fill="none" stroke="var(--border)" strokeWidth={thickness} />
      ) : (
        slices.map(one => {
          const length = (one.value / total) * circumference
          const dash = `${length} ${circumference - length}`
          // -90deg so the first slice starts at 12 o'clock rather than 3.
          const node = (
            <circle
              key={one.name}
              cx={centre}
              cy={centre}
              r={radius}
              fill="none"
              stroke={one.color}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${centre} ${centre})`}
            >
              <title>{`${one.name} · ${Math.round(one.value * 10) / 10} (${((one.value / total) * 100).toFixed(1)}%)`}</title>
            </circle>
          )
          offset += length
          return node
        })
      )}
      <text x={centre} y={centre - 2} textAnchor="middle" style={{ fill: 'var(--text-strong)', fontSize: 19, fontWeight: 650 }}>
        {total >= 1000 ? `${Math.round(total / 1000)}k` : Math.round(total)}
      </text>
      <text x={centre} y={centre + 15} textAnchor="middle" style={{ fill: 'var(--muted)', fontSize: 10 }}>
        credits
      </text>
    </svg>
  )
}

export function Legend({ items }: { items: { name: string; color: string; sub?: string }[] }) {
  return (
    <div className="ul-legend">
      {items.map(item => (
        <span className="ul-legend-item" key={item.name} title={item.sub || item.name}>
          <span className="ul-sw" style={{ background: item.color }} />
          <span className="ul-legend-name">{item.name}</span>
        </span>
      ))}
    </div>
  )
}
