/*
 * Stand-ins for `@kirocrew/app-sdk/ui`, styled from the same theme variables the
 * dashboard injects. These are a FAITHFUL APPROXIMATION, not the host's own
 * components: the preview exists so the page can be looked at and iterated on
 * without a gateway, so treat spacing here as indicative and the dashboard as the
 * source of truth for chrome.
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export function Card({ children, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        background: 'var(--card)',
        color: 'var(--card-fg, inherit)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg, 8px)',
        padding: '12px 14px',
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={{
        color: 'var(--text-strong)',
        fontSize: 13,
        fontWeight: 650,
        marginBottom: 8,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Btn({ children, style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{
        font: 'inherit',
        fontSize: 12,
        padding: '5px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        color: 'var(--text)',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function StatCard({ label, value, sub, accent }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg, 8px)',
        padding: '11px 13px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: 'var(--muted)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: 'var(--text-strong)',
          fontSize: 22,
          fontWeight: 650,
          letterSpacing: '-.01em',
          fontVariantNumeric: 'tabular-nums',
          margin: '2px 0 1px',
        }}
      >
        {value}
      </div>
      {sub ?? null}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: {
  title: ReactNode
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        padding: '18px 24px 14px',
        flex: 'none',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 style={{ margin: 0, color: 'var(--text-strong)', fontSize: 19, fontWeight: 650 }}>
          {title}
        </h1>
        {subtitle ? (
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.45 }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ flex: 'none' }}>{actions}</div> : null}
    </div>
  )
}

export function ContentSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          style={{
            height: 46,
            borderRadius: 8,
            background: 'var(--bg-hover, rgba(255,255,255,.05))',
          }}
        />
      ))}
    </div>
  )
}

export function EmptyState({ title, subtitle, action }: {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div style={{ padding: '48px 8px', textAlign: 'center' }}>
      <div style={{ color: 'var(--text-strong)', fontSize: 15, fontWeight: 650 }}>{title}</div>
      {subtitle ? (
        <p style={{ margin: '6px auto 0', maxWidth: 460, color: 'var(--muted)', fontSize: 13 }}>
          {subtitle}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  )
}
