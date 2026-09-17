# Usage Lens

A Kiro Crew app that answers one question: **where did the credits go?**

The gateway already writes one row per agent turn to `<data home>/usage/tokens/YYYY-MM-DD.jsonl`,
carrying the model, the surface, the agent, the session slot, and the credits that turn
cost. The built-in Spend view rolls that up by model, channel, and session over a fixed
7-day window. Usage Lens reads the same shards and adds the cuts that view does not have:

- **Per scheduled job.** A cron with `persistent_session=false` gets a fresh slot per run
  (`cron:<job id>:<run id>`), so a job that fires every 15 minutes shows up as ~2,900
  anonymous background rows a month. Usage Lens rolls those up by job id and names them
  from `crons.json`, so one job is one row.
- **Per agent**, which nothing else surfaces — useful when several agents share one model.
- **Any window at any granularity**: 24h / 3d / 7d / 14d / 30d / this billing cycle / all,
  hourly or daily, every figure compared against the preceding window of equal length — and for
  the cycle window, against the PRECEDING cycle, so "vs prior" means what the invoice means.
- **Reconciliation against Kiro's own meter.** On the cycle window the page shows Kiro's
  month-to-date credits beside what it can attribute locally, and names the remainder for
  what it is: usage that did not go through this gateway (the Kiro IDE, or a `kiro-cli`
  session you drive yourself). The two are not supposed to match; the gap is the finding.
- **Credits per turn**, plotted per day. This is the cut that separates *the same work now
  costs more* from *we did more work* — the totals alone cannot tell you which happened,
  and a repricing is invisible in them until the month ends.
- **An automatic flag** when a model's credits-per-turn rises by half or more against the
  prior window.

Read-only by construction: no writes, and the manifest declares no storage, cron, spawn,
or network permission.

## Install

```bash
npm install          # esbuild + typescript, for the UI bundle
npm run check        # typecheck, build ui/index.mjs, backend self-test, UI render test
kirocrew app install /path/to/kirocrew-usage-lens
kirocrew app enable usage-lens
```

`kirocrew app enable` is refused while third-party app execution is off, because this app
ships Python that runs inside the gateway process. Either trust this one app
(`agent.apps_trusted`, in Settings) or set `agent.apps_allow_third_party=true` to allow
every third-party app's code. That gate is deliberate — read `backend/` before you open it.

The page then appears in the sidebar at `/usage-lens`.

## How it works

```
usage/tokens/*.jsonl          one JSONL row per agent turn, written by the gateway
        │
        ▼
backend/usage_store.py        folds turn rows into
                              hour x model x surface x agent x job x session buckets,
                              interns each dimension, caches on (shard, mtime, size)
        │  GET /api/apps/usage-lens/series?days=0&tz=<IANA>
        ▼
src/model.ts                  every window / dimension / metric switch is a re-slice of
                              that one payload — no refetch
        │
        ▼
src/charts.tsx                inline SVG with a fixed viewBox: no charting dependency,
                              and no canvas/container sizing feedback loop
```

Design notes worth knowing before you extend it:

- **`credits` is the only cost metric that is always populated.** `cost` (USD) and the
  `input` / `output` token counts are written by the `claude_code` and `bedrock` providers
  only; on ACP turns they are `0`, so a token- or dollar-based view reads as "free" on the
  default provider.
- **Subagent turns cannot be attributed to their parent.** The row carries no pointer back
  to the session that spawned it, so a subagent appears under the `subagent` surface and
  nowhere else. Unlike the built-in Spend panel, Usage Lens still *counts* those credits —
  money with no row is worse than a row you have to interpret.
- **Older shards can hold bare `NaN` / `Infinity`.** `json.loads` accepts those, and one
  would poison every total it touches and produce a body the browser cannot parse, so such
  rows are dropped.
- **The cycle boundary is a UTC instant, not local midnight.** Kiro resets plan credits at the
  start of the billing cycle and reports that instant (`nextDateReset`) in UTC, so a naive
  local-month filter misfiles every turn in the offset band — eight hours' worth in
  Asia/Shanghai, measured at ~350 credits on one real cycle. The backend does the month
  arithmetic in UTC and converts the boundaries to the display zone before they leave.
- **Hour keys are pre-converted to the requested zone** and compared as strings, so the
  UI's day boundaries fall where the reader's own midnight is (it passes the browser's
  zone). Window arithmetic anchors on the newest row, not `Date.now()`, so the view stays
  meaningful on a gateway that has been idle.

## Standalone HTML export

`tools/export-html.py` writes the same analysis as one self-contained HTML file — useful
when you want a snapshot to keep, mail, or read without the gateway running:

```bash
python3 tools/export-html.py --out ~/usage.html [--days 30] [--tz Asia/Shanghai]
```

It embeds the aggregated data and pulls Chart.js from jsdelivr; it needs no server and
makes no other network calls.

## Layout

```
app.json                 manifest: one UI page, one backend route hook, no other permissions
backend/usage_store.py   shard reader + fold (stdlib only)
backend/routes.py        GET /series, GET /health  (paths are relative to /api/apps/usage-lens)
backend/selftest.py      synthetic-shard self-test; no pytest, no gateway, no network
test/fixture.py          dumps a real /series payload (or a synthetic one) for the UI test
test/render.mjs          aggregation + SVG geometry, server-rendered against that payload
src/                     the page: model.ts (arithmetic), charts.tsx (SVG), index.tsx (layout)
scripts/build.mjs        esbuild -> ui/index.mjs, host modules external
tools/export-html.py     standalone HTML export
ui/index.mjs             the built artifact app.json points at (tracked on purpose)
```

## Licence

MIT.
