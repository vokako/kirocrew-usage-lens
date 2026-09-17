/*
 * One raw stylesheet, injected once, every colour drawn from a theme token.
 *
 * The dashboard hosts an app's UI inside its own document, so the theme
 * variables are already in scope — a hardcoded hex here would survive exactly
 * one theme. Class names are `ul-` prefixed for the same reason a page-scoped
 * sheet needs a namespace: this CSS lands in the dashboard's document, not in
 * an iframe of its own.
 */
export const STYLES = String.raw`
  .ul-root { display:flex; flex:1; min-height:0; flex-direction:column; color:var(--text); background:var(--bg); }
  .ul-body { flex:1; min-height:0; overflow-y:auto; padding:0 24px 32px; }

  /* Control bar. Wraps rather than scrolls: four groups on a narrow window
     should stack, not hide the dimension picker off the right edge. */
  .ul-controls { display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin:0 0 16px; }
  .ul-group { display:flex; align-items:center; gap:7px; }
  .ul-group-label { color:var(--muted); font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
  .ul-seg { display:inline-flex; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
  .ul-seg button {
    padding:4px 11px; border:0; background:var(--bg); color:var(--muted);
    font:inherit; font-size:12px; cursor:pointer; transition:background 120ms ease, color 120ms ease;
  }
  .ul-seg button + button { border-left:1px solid var(--border); }
  .ul-seg button:hover { background:var(--bg-hover); color:var(--text); }
  .ul-seg button[aria-pressed='true'] { background:var(--accent); color:var(--bg); font-weight:650; }

  .ul-kpis { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(158px,1fr)); margin:0 0 16px; }
  .ul-delta { font-size:11px; }
  .ul-up { color:var(--danger); }
  .ul-down { color:var(--ok); }
  .ul-flat { color:var(--muted); }

  .ul-charts { display:grid; gap:14px; grid-template-columns:minmax(0,2fr) minmax(0,1fr); margin:0 0 14px; }
  @media (max-width:1000px) { .ul-charts { grid-template-columns:minmax(0,1fr); } }
  .ul-chart-note { margin:2px 0 10px; color:var(--muted); font-size:12px; line-height:1.45; }

  /* Charts are inline SVG with a fixed viewBox: no canvas, so no
     container/canvas sizing feedback loop, and no charting dependency to bundle. */
  .ul-svg { display:block; width:100%; height:auto; overflow:visible; }
  .ul-axis { fill:var(--muted); font-size:9px; }
  .ul-grid { stroke:var(--border); stroke-width:1; }
  .ul-bar:hover { opacity:.82; }

  .ul-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:10px; }
  .ul-legend-item { display:inline-flex; align-items:center; gap:6px; min-width:0; color:var(--text); font-size:11.5px; }
  .ul-sw { flex:none; width:9px; height:9px; border-radius:2px; }
  .ul-legend-name { min-width:0; max-width:30ch; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .ul-table-wrap { overflow-x:auto; }
  .ul-table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
  .ul-table th, .ul-table td { padding:6px 10px; border-bottom:1px solid var(--border); text-align:right; white-space:nowrap; }
  .ul-table th:first-child, .ul-table td:first-child { text-align:left; white-space:normal; min-width:16ch; }
  .ul-table th {
    position:sticky; top:0; z-index:1; background:var(--card);
    color:var(--muted); font-size:11px; font-weight:600; letter-spacing:.03em; text-transform:uppercase;
  }
  .ul-table tbody tr:hover { background:var(--bg-hover); }
  .ul-table tbody tr:last-child td { border-bottom:0; }
  .ul-name { display:inline-flex; align-items:center; gap:7px; min-width:0; }
  .ul-sub { display:block; color:var(--muted); font-size:11px; }
  .ul-mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11.5px; }

  /* Reconciliation against Kiro's own meter: three figures that must be read
     together — what Kiro says, what this page can account for, and the remainder. */
  .ul-recon { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); margin:4px 0 2px; }
  .ul-recon-cell { display:flex; flex-direction:column; gap:2px; min-width:0; }
  .ul-recon-label { color:var(--muted); font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; }
  .ul-recon-value { color:var(--text-strong); font-size:21px; font-weight:650; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
  .ul-recon-sub { color:var(--muted); font-size:11.5px; line-height:1.4; }

  /* An unscheduled row under the job dimension is not a job — quieter, so the
     scheduled rows it sits beside stay the ones the eye lands on. */
  .ul-unscheduled { color:var(--muted); }

  /* The one interpretive element on the page: a repricing or a context blow-up
     shows as a credits-per-turn jump the totals alone do not explain. */
  .ul-flag {
    display:flex; gap:10px; align-items:flex-start; margin:0 0 14px; padding:10px 13px;
    border:1px solid color-mix(in srgb, var(--warn) 40%, var(--border));
    border-left:3px solid var(--warn); border-radius:var(--radius-lg,8px);
    background:color-mix(in srgb, var(--warn) 8%, var(--card));
  }
  .ul-flag-title { color:var(--text-strong); font-size:13px; font-weight:650; }
  .ul-flag-body { margin:3px 0 0; color:var(--text); font-size:12.5px; line-height:1.5; }
  .ul-foot { margin-top:14px; color:var(--muted); font-size:11px; line-height:1.6; }
`
