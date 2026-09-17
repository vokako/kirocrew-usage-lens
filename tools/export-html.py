#!/usr/bin/env python3
"""Build a self-contained KiroCrew credit-usage dashboard from the gateway's usage shards.

Reads  <data home>/usage/tokens/YYYY-MM-DD.jsonl  (one row per agent turn) and writes a
single HTML file with the aggregated data embedded, plus Chart.js from jsdelivr. No server,
no network calls at view time — the file works standalone and inside KiroCrew's artifact
iframe (whose CSP allows cdn.jsdelivr.net but blocks fetch/XHR).

Usage:
    python3 build.py [--out PATH] [--usage-dir PATH] [--days N] [--tz Asia/Shanghai]

Dimensions available in the UI: model, surface, agent, cron job, session.
Metrics: credits, turns, credits per turn (the price-change signal).
"""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent


def data_home() -> Path:
    return Path(os.environ.get("KIROCREW_HOME") or (Path.home() / ".kiro" / "crew"))


def cron_names(home: Path) -> dict[str, str]:
    """job id -> human name, from the cron registry (live jobs only)."""
    out: dict[str, str] = {}
    try:
        reg = json.loads((home / "crons.json").read_text())
    except (OSError, ValueError):
        return out
    for job in reg.get("jobs") or []:
        jid, name = str(job.get("id") or ""), str(job.get("name") or "")
        if jid:
            out[jid] = name or jid
    return out


def session_titles(home: Path, slots: set[str]) -> dict[str, str]:
    """slot key -> stored title, read from the FIRST line of each session log only."""
    out: dict[str, str] = {}
    sdir = home / "sessions"
    if not sdir.is_dir():
        return out
    for slot in slots:
        for stem in (f"dashboard_{slot}", slot):
            p = sdir / f"{stem}.jsonl"
            if not p.is_file():
                continue
            try:
                with p.open("r", encoding="utf-8", errors="replace") as fh:
                    meta = json.loads(fh.readline() or "{}")
            except (OSError, ValueError):
                break
            title = str(meta.get("title") or "").strip()
            if title:
                out[slot] = title
            break
    return out


def slot_dims(slot: str, surface: str, names: dict[str, str]) -> tuple[str, str]:
    """Return (job label, session label) for a usage row's slot key.

    Cron rows are keyed ``cron:<job id>`` (persistent session) or
    ``cron:<job id>:<run id>`` (fresh session per run), so the job is the
    SECOND segment in both shapes — that is what makes per-job rollup possible.
    """
    if slot.startswith("cron:"):
        parts = slot.split(":")
        jid = parts[1] if len(parts) > 1 else ""
        return (names.get(jid, f"{jid} (已删除)") if jid else "cron", slot)
    if slot == "_bg" or surface.startswith("bg:"):
        return ("", slot)
    return ("", slot)


def build(usage_dir: Path, home: Path, days: int | None, tz: ZoneInfo) -> dict:
    cutoff = None
    if days:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    names = cron_names(home)
    # (hour, model, surface, agent, job, slot) -> [credits, turns]
    buckets: dict[tuple[str, str, str, str, str, str], list[float]] = defaultdict(
        lambda: [0.0, 0]
    )
    seen_slots: set[str] = set()
    shards = sorted(p for p in usage_dir.glob("*.jsonl") if p.is_file())

    for shard in shards:
        try:
            text = shard.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if not isinstance(row, dict) or row.get("_type") != "tokens":
                continue
            ts = str(row.get("ts") or "")
            if not ts or (cutoff and ts < cutoff):
                continue
            try:
                when = datetime.fromisoformat(ts).astimezone(tz)
            except ValueError:
                continue
            credits = row.get("credits")
            try:
                credits = float(credits or 0.0)
            except (TypeError, ValueError):
                credits = 0.0
            if credits != credits or credits in (float("inf"), float("-inf")):
                continue  # NaN / Inf written by older shards

            surface = str(row.get("surface") or "")
            slot = str(row.get("slot") or "")
            seen_slots.add(slot)
            job, session = slot_dims(slot, surface, names)
            key = (
                when.strftime("%Y-%m-%dT%H"),
                str(row.get("model") or "(未标注)"),
                surface or "(未标注)",
                str(row.get("agent") or "(默认)"),
                job,
                session,
            )
            b = buckets[key]
            b[0] += credits
            b[1] += 1

    titles = session_titles(home, {s for s in seen_slots if s.startswith("chat-")})

    # Intern each dimension so rows travel as small int arrays.
    dims: dict[str, list[str]] = {k: [] for k in ("hours", "model", "surface", "agent", "job", "session")}
    idx: dict[str, dict[str, int]] = {k: {} for k in dims}

    def intern(kind: str, value: str) -> int:
        table = idx[kind]
        if value not in table:
            table[value] = len(dims[kind])
            dims[kind].append(value)
        return table[value]

    rows = []
    for (hour, model, surface, agent, job, session), (credits, turns) in sorted(buckets.items()):
        rows.append(
            [
                intern("hours", hour),
                intern("model", model),
                intern("surface", surface),
                intern("agent", agent),
                intern("job", job),
                intern("session", session),
                round(credits, 4),
                turns,
            ]
        )

    return {
        "generated_at": datetime.now(tz).isoformat(timespec="seconds"),
        "tz": str(tz),
        "shards": len(shards),
        "labels": {
            "session": {s: t for s, t in titles.items()},
        },
        "dims": dims,
        "rows": rows,
    }


TEMPLATE = r"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KiroCrew Credit 用量</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:16px; background:var(--bg,#0f1115); color:var(--text,#e6e6e6);
         font:13px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif; }
  .card { background:var(--card,#171a21); color:var(--card-fg,inherit);
          border:1px solid var(--border,#2a2f3a); border-radius:10px; padding:12px 14px; }
  .grid { display:grid; gap:12px; }
  .kpis { grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
  .charts { grid-template-columns:2fr 1fr; }
  @media (max-width:820px){ .charts{grid-template-columns:1fr} }
  .kpi-v { font-size:22px; font-weight:600; letter-spacing:-.01em; }
  .kpi-l { font-size:11px; color:var(--muted,#8b93a7); text-transform:uppercase; letter-spacing:.04em; }
  .kpi-d { font-size:11px; margin-top:2px; }
  .up { color:var(--danger,#f2777a); } .down { color:var(--ok,#79c98a); }
  .ctl { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:12px; }
  .seg { display:inline-flex; border:1px solid var(--border,#2a2f3a); border-radius:8px; overflow:hidden; }
  .seg button { font:inherit; font-size:12px; padding:5px 11px; border:0; cursor:pointer;
                background:var(--bg,#0f1115); color:var(--muted,#8b93a7); }
  .seg button[aria-pressed="true"] { background:var(--accent,#5b8dfb); color:var(--bg,#0f1115); font-weight:600; }
  .lbl { font-size:11px; color:var(--muted,#8b93a7); margin-right:2px; }
  table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
  th,td { padding:6px 8px; border-bottom:1px solid var(--border,#2a2f3a); text-align:right; white-space:nowrap; }
  th:first-child,td:first-child { text-align:left; white-space:normal; }
  th { font-size:11px; color:var(--muted,#8b93a7); font-weight:600; }
  tbody tr:hover { background:var(--bg-hover,rgba(255,255,255,.04)); }
  .sw { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:6px; }
  .foot { margin-top:12px; font-size:11px; color:var(--muted,#8b93a7); }
  h2 { font-size:12px; margin:0 0 8px; color:var(--muted,#8b93a7); font-weight:600;
       text-transform:uppercase; letter-spacing:.04em; }
  .note { border-left:3px solid var(--warn,#e0b252); background:var(--warn-subtle,rgba(224,178,82,.12));
          padding:8px 10px; border-radius:6px; margin-bottom:12px; font-size:12px; }
</style></head><body>

<div class="ctl">
  <span class="lbl">区间</span>
  <span class="seg" id="seg-win"></span>
  <span class="lbl" style="margin-left:6px">粒度</span>
  <span class="seg" id="seg-gran"></span>
  <span class="lbl" style="margin-left:6px">维度</span>
  <span class="seg" id="seg-dim"></span>
  <span class="lbl" style="margin-left:6px">指标</span>
  <span class="seg" id="seg-metric"></span>
</div>

<div id="alert"></div>

<div class="grid kpis" style="margin-bottom:12px" id="kpis"></div>

<div class="grid charts" style="margin-bottom:12px">
  <div class="card"><h2 id="ts-title">时间趋势</h2><div style="height:300px"><canvas id="ts"></canvas></div></div>
  <div class="card"><h2>占比</h2><div style="height:300px"><canvas id="pie"></canvas></div></div>
</div>

<div class="card" style="margin-bottom:12px">
  <h2>单位成本趋势 — 每 turn 消耗的 credits（涨价 / 上下文膨胀的信号）</h2>
  <div style="height:240px"><canvas id="unit"></canvas></div>
</div>

<div class="card">
  <h2 id="tbl-title">明细</h2>
  <table><thead><tr>
    <th>名称</th><th>credits</th><th>占比</th><th>turns</th><th>credits/turn</th><th>环比上一区间</th>
  </tr></thead><tbody id="tbody"></tbody></table>
</div>

<div class="foot" id="foot"></div>

<script>
const DATA = __DATA__;
const D = DATA.dims, ROWS = DATA.rows;
const COL = {hour:0, model:1, surface:2, agent:3, job:4, session:5, credits:6, turns:7};
const DIMS = [["model","模型"],["surface","来源"],["agent","Agent"],["job","定时任务"],["session","会话"]];
const WINS = [[1,"24 小时"],[3,"3 天"],[7,"7 天"],[14,"14 天"],[30,"30 天"],[0,"全部"]];
const GRANS = [["hour","按小时"],["day","按天"]];
const METRICS = [["credits","credits"],["turns","turns"],["per_turn","credits/turn"]];
const PALETTE = ["#5b8dfb","#f2777a","#79c98a","#e0b252","#b48ce3","#4bc3d4","#ef8f57","#8fa1c7","#d76fa8","#6fbf73"];

let state = {win:3, gran:"hour", dim:"model", metric:"credits"};

// ---- helpers -------------------------------------------------------------
const hourOf = i => D.hours[i];                       // "YYYY-MM-DDTHH" in DATA.tz
const dayOf  = i => D.hours[i].slice(0,10);
const maxHour = D.hours.length ? D.hours[D.hours.length-1] : "";
function hourMinus(hours){                            // window lower bound, on the data's clock
  if(!maxHour) return "";
  const [d,h] = maxHour.split("T");
  const t = new Date(Date.parse(d+"T"+h+":00:00Z") - hours*3600e3);
  return t.toISOString().slice(0,13);
}
function label(dim, raw){
  if(dim==="session"){ const t=(DATA.labels.session||{})[raw]; return t ? t+" · "+raw : raw; }
  if(dim==="job") return raw || "（非定时任务）";
  return raw || "（未标注）";
}
const fmt = n => n>=1000 ? Math.round(n).toLocaleString() : (Math.round(n*10)/10).toLocaleString();

function rowsIn(loHour, hiHour){
  return ROWS.filter(r => { const h=hourOf(r[COL.hour]); return h>=loHour && (!hiHour || h<hiHour); });
}
function agg(rows, keyFn){
  const m = new Map();
  for(const r of rows){
    const k = keyFn(r);
    let e = m.get(k); if(!e){ e = {credits:0, turns:0}; m.set(k,e); }
    e.credits += r[COL.credits]; e.turns += r[COL.turns];
  }
  return m;
}
const metricOf = e => state.metric==="credits" ? e.credits
                    : state.metric==="turns"   ? e.turns
                    : (e.turns ? e.credits/e.turns : 0);

// ---- render --------------------------------------------------------------
let charts = {};
function draw(){
  const hours = state.win ? state.win*24 : 24*3650;
  const lo = state.win ? hourMinus(hours) : "";
  const prevLo = state.win ? hourMinus(hours*2) : "";
  const cur = rowsIn(lo, ""), prev = state.win ? rowsIn(prevLo, lo) : [];
  const dim = state.dim, dimCol = COL[dim];

  // KPI
  const sum = rs => rs.reduce((a,r)=>({credits:a.credits+r[COL.credits], turns:a.turns+r[COL.turns]}),{credits:0,turns:0});
  const c = sum(cur), p = sum(prev);
  const delta = (now, was) => was>0 ? (now-was)/was*100 : null;
  const dTot = delta(c.credits, p.credits), dPer = delta(c.turns?c.credits/c.turns:0, p.turns?p.credits/p.turns:0);
  const chip = v => v===null ? '<span class="kpi-d" style="opacity:.6">无对比区间</span>'
    : `<span class="kpi-d ${v>=0?'up':'down'}">${v>=0?'▲':'▼'} ${Math.abs(Math.round(v))}% 环比</span>`;
  document.getElementById("kpis").innerHTML = [
    [`${fmt(c.credits)}`, "credits 合计", chip(dTot)],
    [`${c.turns.toLocaleString()}`, "turns", ""],
    [`${fmt(c.turns?c.credits/c.turns:0)}`, "credits / turn", chip(dPer)],
    [`${new Set(cur.map(r=>r[dimCol])).size}`, DIMS.find(d=>d[0]===dim)[1]+" 数量", ""],
  ].map(([v,l,d])=>`<div class="card"><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div>${d}</div>`).join("");

  // top values of the chosen dimension, by credits
  const byDim = agg(cur, r=>D[dim][r[dimCol]]);
  const ranked = [...byDim.entries()].sort((a,b)=>b[1].credits-a[1].credits);
  const top = ranked.slice(0,10).map(e=>e[0]);
  const colorOf = {}; top.forEach((k,i)=>colorOf[k]=PALETTE[i%PALETTE.length]);

  // time series, stacked by dimension
  const bucketOf = state.gran==="hour" ? (r=>hourOf(r[COL.hour]).replace("T"," ")+":00") : (r=>dayOf(r[COL.hour]));
  const bkeys = [...new Set(cur.map(bucketOf))].sort();
  const series = top.map(k=>{
    const m = agg(cur.filter(r=>D[dim][r[dimCol]]===k), bucketOf);
    return {label: label(dim,k), backgroundColor: colorOf[k], borderColor: colorOf[k],
            data: bkeys.map(b => m.has(b) ? Math.round(metricOf(m.get(b))*10)/10 : 0)};
  });
  const gridColor = "rgba(139,147,167,.18)";
  const axisFont = {color: getComputedStyle(document.body).color, font:{size:10}};
  charts.ts?.destroy();
  charts.ts = new Chart(document.getElementById("ts"), {
    type:"bar",
    data:{labels:bkeys, datasets:series},
    options:{responsive:true, maintainAspectRatio:false, animation:false,
      interaction:{mode:"index",intersect:false},
      scales:{x:{stacked:true, ticks:{...axisFont, maxRotation:60, autoSkipPadding:12}, grid:{display:false}},
              y:{stacked:true, ticks:axisFont, grid:{color:gridColor}}},
      plugins:{legend:{position:"bottom", labels:{...axisFont, boxWidth:9, boxHeight:9, padding:8}}}}
  });
  document.getElementById("ts-title").textContent =
    `时间趋势 — ${state.gran==="hour"?"每小时":"每天"} ${METRICS.find(m=>m[0]===state.metric)[1]}，按${DIMS.find(d=>d[0]===dim)[1]}堆叠`;

  // share doughnut (always credits — a share of "credits/turn" is meaningless)
  charts.pie?.destroy();
  charts.pie = new Chart(document.getElementById("pie"), {
    type:"doughnut",
    data:{labels: top.map(k=>label(dim,k)),
          datasets:[{data: top.map(k=>Math.round(byDim.get(k).credits*10)/10),
                     backgroundColor: top.map(k=>colorOf[k]), borderWidth:0}]},
    options:{responsive:true, maintainAspectRatio:false, animation:false, cutout:"52%",
      plugins:{legend:{position:"bottom", labels:{...axisFont, boxWidth:9, boxHeight:9, padding:6}},
        tooltip:{callbacks:{label:x=>` ${x.label}: ${fmt(x.raw)} (${(x.raw/c.credits*100).toFixed(1)}%)`}}}}
  });

  // unit-cost trend: credits per turn per day, top 5 of the dimension
  const days = [...new Set(cur.map(dayOf_r))].sort();
  function dayOf_r(r){ return dayOf(r[COL.hour]); }
  charts.unit?.destroy();
  charts.unit = new Chart(document.getElementById("unit"), {
    type:"line",
    data:{labels:days, datasets: top.slice(0,5).map(k=>{
      const m = agg(cur.filter(r=>D[dim][r[dimCol]]===k), dayOf_r);
      return {label: label(dim,k), borderColor: colorOf[k], backgroundColor: colorOf[k],
              spanGaps:true, tension:.25, pointRadius:2, borderWidth:2,
              data: days.map(d => m.has(d) && m.get(d).turns ? Math.round(m.get(d).credits/m.get(d).turns*10)/10 : null)};
    })},
    options:{responsive:true, maintainAspectRatio:false, animation:false,
      interaction:{mode:"index",intersect:false},
      scales:{x:{ticks:{...axisFont, maxRotation:60, autoSkipPadding:12}, grid:{display:false}},
              y:{ticks:axisFont, grid:{color:gridColor}, title:{display:true, text:"credits / turn", ...axisFont}}},
      plugins:{legend:{position:"bottom", labels:{...axisFont, boxWidth:9, boxHeight:9, padding:8}}}}
  });

  // table
  const prevDim = agg(prev, r=>D[dim][r[dimCol]]);
  document.getElementById("tbl-title").textContent = `明细 — 按${DIMS.find(d=>d[0]===dim)[1]}（${ranked.length} 项）`;
  document.getElementById("tbody").innerHTML = ranked.map(([k,e])=>{
    const was = prevDim.get(k), dv = was ? delta(e.credits, was.credits) : null;
    return `<tr>
      <td><span class="sw" style="background:${colorOf[k]||"var(--muted,#8b93a7)"}"></span>${label(dim,k)}</td>
      <td>${fmt(e.credits)}</td><td>${(e.credits/c.credits*100).toFixed(1)}%</td>
      <td>${e.turns.toLocaleString()}</td><td>${fmt(e.turns?e.credits/e.turns:0)}</td>
      <td>${dv===null ? '<span style="opacity:.5">新增</span>'
                      : `<span class="${dv>=0?'up':'down'}">${dv>=0?'+':''}${Math.round(dv)}%</span>`}</td></tr>`;
  }).join("");

  // spike alert: does any top model's credits/turn jump >=50% in the last 3 days?
  const alert = spike();
  document.getElementById("alert").innerHTML = alert
    ? `<div class="note"><strong>单位成本异动</strong> ${alert}</div>` : "";
  document.getElementById("foot").textContent =
    `数据源 usage/tokens 分片 ${DATA.shards} 个 · 时区 ${DATA.tz} · 生成于 ${DATA.generated_at} · `
    + `${ROWS.length.toLocaleString()} 个聚合行 · 重新生成：python3 build.py`;
}

function spike(){
  const recent = rowsIn(hourMinus(72), ""), before = rowsIn(hourMinus(72*2), hourMinus(72));
  const a = agg(recent, r=>D.model[r[COL.model]]), b = agg(before, r=>D.model[r[COL.model]]);
  const out = [];
  for(const [m,e] of [...a.entries()].sort((x,y)=>y[1].credits-x[1].credits).slice(0,4)){
    const p = b.get(m); if(!p || !p.turns || !e.turns) continue;
    const now = e.credits/e.turns, was = p.credits/p.turns;
    if(was>0 && now/was >= 1.5)
      out.push(`<code>${m}</code> 每 turn ${fmt(was)} → ${fmt(now)} credits（×${(now/was).toFixed(1)}）`);
  }
  return out.length ? "最近 3 天对比前 3 天：" + out.join("；") : "";
}

// ---- controls ------------------------------------------------------------
function seg(id, items, key){
  const el = document.getElementById(id);
  el.innerHTML = items.map(([v,l])=>`<button data-v="${v}" aria-pressed="${String(state[key])===String(v)}">${l}</button>`).join("");
  el.onclick = ev => {
    const b = ev.target.closest("button"); if(!b) return;
    state[key] = key==="win" ? Number(b.dataset.v) : b.dataset.v;
    [...el.children].forEach(x=>x.setAttribute("aria-pressed", String(x===b)));
    draw();
  };
}
seg("seg-win", WINS, "win"); seg("seg-gran", GRANS, "gran");
seg("seg-dim", DIMS, "dim"); seg("seg-metric", METRICS, "metric");
draw();
</script></body></html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default=str(HERE / "usage-dashboard.html"))
    ap.add_argument("--usage-dir", default=None)
    ap.add_argument("--days", type=int, default=0, help="0 = every retained shard")
    ap.add_argument("--tz", default="Asia/Shanghai")
    args = ap.parse_args()

    home = data_home()
    usage_dir = Path(args.usage_dir) if args.usage_dir else home / "usage" / "tokens"
    if not usage_dir.is_dir():
        print(f"usage dir not found: {usage_dir}")
        return 2

    payload = build(usage_dir, home, args.days or None, ZoneInfo(args.tz))
    html = TEMPLATE.replace("__DATA__", json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(
        f"wrote {out}  ({out.stat().st_size/1024:.0f} KB, "
        f"{len(payload['rows'])} aggregated rows, {payload['shards']} shards)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
