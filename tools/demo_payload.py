#!/usr/bin/env python3
"""Generate the anonymised demo payload the offline preview renders.

Deterministic (fixed seed), and deliberately synthetic: a screenshot taken from a
real payload would publish the author's session titles, cron job names, and actual
spend. The shape is drawn from a real cycle so the charts look like the real thing —
scheduled work dominating, a handful of models, and one model's per-turn cost
tripling part-way through the cycle, which is what makes the unit-cost banner appear.

    python3 tools/demo_payload.py           # writes tools/preview/demo-payload.json
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent / "preview" / "demo-payload.json"
TZ = timezone(timedelta(hours=8))  # the display clock the demo is captured on

# The cycle under display: 2026-09-01T00:00Z → 2026-10-01T00:00Z, which on a +08:00
# clock starts at 08:00 — the offset that makes a local-month filter wrong.
CYCLE_START = datetime(2026, 9, 1, tzinfo=timezone.utc)
# The preceding cycle is generated too, so the "vs prior" column and the unit-cost
# banner have something to compare against. A screenshot where every delta reads
# "new" shows none of the machinery the page is for.
PREV_CYCLE_START = datetime(2026, 8, 1, tzinfo=timezone.utc)
CAPTURED_AT = datetime(2026, 9, 18, 2, 0, tzinfo=timezone.utc)
# The day gpt-5.6-sol's per-turn cost steps up, so the banner has something to find.
# Early enough in the cycle that the cycle's AVERAGE per-turn cost clears the
# banner's 1.5x threshold against the prior cycle, which is what a reader would see.
REPRICED_ON = datetime(2026, 9, 8, tzinfo=timezone.utc)

MODELS = ["gpt-5.6-sol", "claude-opus-5", "claude-fable-5.1", "claude-haiku-4.5"]
SURFACES = ["cron", "dashboard", "subagent", "bg:consolidation"]
AGENTS = ["assistant", "assistant-poc", "assistant-lite"]
JOBS = ["nightly-digest", "issue-triage", "docs-sync"]
UNSCHEDULED = "Unscheduled · "


def build() -> dict:
    rng = random.Random(20260918)
    hours: list[str] = []
    hour_index: dict[str, int] = {}
    models: list[str] = []
    surfaces: list[str] = []
    agents: list[str] = []
    jobs: list[str] = []
    sessions: list[str] = []
    buckets: dict[tuple[int, ...], list[float]] = {}

    def intern(table: list[str], value: str) -> int:
        if value not in table:
            table.append(value)
        return table.index(value)

    def add(when: datetime, model: str, surface: str, agent: str, job: str, session: str,
            credits: float, turns: int = 1) -> None:
        key = when.astimezone(TZ).strftime("%Y-%m-%dT%H")
        if key not in hour_index:
            hour_index[key] = len(hours)
            hours.append(key)
        cell = buckets.setdefault(
            (
                hour_index[key],
                intern(models, model),
                intern(surfaces, surface),
                intern(agents, agent),
                intern(jobs, job),
                intern(sessions, session),
            ),
            [0.0, 0],
        )
        cell[0] += credits
        cell[1] += turns

    at = PREV_CYCLE_START
    run = 0
    while at < CAPTURED_AT:
        repriced = at >= REPRICED_ON
        in_current = at >= CYCLE_START
        # The prior cycle is quieter, so the current one reads as a real increase
        # rather than as two identical months.
        density = 0.92 if in_current else 0.75
        interactive_chance = 0.45 if in_current else 0.3
        # The dominant scheduled job: a fixed-workload sweep every 30 minutes. Its
        # per-turn cost is what steps up, because identical work costing more is
        # exactly the signal the page exists to surface.
        if at.minute == 0 and rng.random() < density:
            run += 1
            base = 9.5 if not repriced else 31.0
            add(at, "gpt-5.6-sol", "cron", "assistant-poc", JOBS[0],
                f"cron:{JOBS[0]}:run{run}", base * rng.uniform(0.85, 1.15))
        # A six-hourly triage job on a cheaper model.
        if at.hour % 6 == 0 and at.minute == 0:
            add(at, "claude-haiku-4.5", "cron", "assistant-lite", JOBS[1],
                f"cron:{JOBS[1]}:run{run}", rng.uniform(0.6, 1.4))
        # A weekly docs sync.
        if at.weekday() == 0 and at.hour == 4:
            add(at, "claude-fable-5.1", "cron", "assistant", JOBS[2],
                f"cron:{JOBS[2]}:run{run}", rng.uniform(18.0, 26.0))
        # Interactive work, clustered into working hours on the display clock.
        local_hour = at.astimezone(TZ).hour
        if 9 <= local_hour <= 23 and rng.random() < interactive_chance:
            model = rng.choice(["claude-opus-5", "claude-fable-5.1", "gpt-5.6-sol"])
            session = f"chat-{rng.randint(40, 62)}-{rng.randint(100000, 999999)}"
            add(at, model, "dashboard", "assistant", f"{UNSCHEDULED}interactive chat",
                session, rng.uniform(4.0, 38.0))
            if rng.random() < 0.18:
                add(at, "claude-opus-5", "subagent", "assistant",
                    f"{UNSCHEDULED}subagent", f"sub-{rng.randint(1000, 9999)}",
                    rng.uniform(1.5, 9.0))
        # Background maintenance: many turns, almost no credits.
        if rng.random() < 0.3:
            add(at, "claude-haiku-4.5", "bg:consolidation", "assistant-lite",
                f"{UNSCHEDULED}background", "_bg", rng.uniform(0.01, 0.25))
        at += timedelta(minutes=30)

    rows = [[*key, round(cell[0], 4), cell[1]] for key, cell in sorted(buckets.items())]
    local = sum(r[6] for r in rows)
    turns = sum(r[7] for r in rows)
    # The reconciliation card describes the CURRENT cycle, so Kiro's figure is
    # derived from that slice alone — not from everything the payload holds.
    cycle_start_key = CYCLE_START.astimezone(TZ).strftime("%Y-%m-%dT%H")
    cycle_local = sum(r[6] for r in rows if hours[r[0]] >= cycle_start_key)
    # Kiro's own meter counts credits this gateway never saw (the IDE, a hand-driven
    # CLI session), so the demo shows a realistic 65% coverage rather than a match.
    official_used = round(cycle_local / 0.647, 2)

    titles = {}
    for slot in sessions:
        if slot.startswith("chat-"):
            titles[slot] = rng.choice([
                "Trace the retry storm in the ingest worker",
                "Draft the migration plan for the search index",
                "Why is the nightly build 8 minutes slower",
                "Rewrite the onboarding page copy",
                "Review the auth refactor",
                "Chase the flaky integration test",
            ])

    return {
        "generated_at": CAPTURED_AT.astimezone(TZ).isoformat(timespec="seconds"),
        "tz": "Asia/Shanghai",
        "window_days": 0,
        "shards": (CAPTURED_AT.date() - PREV_CYCLE_START.date()).days + 1,
        "cycle": {
            "source": "kiro-api",
            "resets": "2026-10-01",
            "start_utc": CYCLE_START.isoformat(),
            "start_hour": CYCLE_START.astimezone(TZ).strftime("%Y-%m-%dT%H"),
            "prev_start_hour": (CYCLE_START - timedelta(days=31)).astimezone(TZ).strftime("%Y-%m-%dT%H"),
            "end_hour": "2026-10-01T08",
        },
        "official": {
            "credits_used": official_used,
            "credits_plan": 20000.0,
            "credits_overage": 0.0,
            "credits_covered": official_used,
            "percentage": round(official_used / 20000.0 * 100, 1),
            "cost_usd": 0.0,
            "overage_rate": 0.04,
            "plan": "Demo plan",
            "resets": "2026-10-01",
            "source": "api",
        },
        "dims": {
            "hours": hours,
            "model": models,
            "surface": surfaces,
            "agent": agents,
            "job": jobs,
            "session": sessions,
        },
        "rows": rows,
        "labels": {"session": titles},
        "totals": {"credits": round(local, 2), "turns": turns},
    }


def main() -> int:
    payload = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    print(
        f"wrote {OUT.relative_to(Path.cwd()) if OUT.is_relative_to(Path.cwd()) else OUT}: "
        f"{len(payload['rows'])} rows, {payload['totals']['credits']} credits, "
        f"{payload['totals']['turns']} turns"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
