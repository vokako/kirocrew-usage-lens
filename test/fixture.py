#!/usr/bin/env python3
"""Dump a real /series payload to test/fixture.json for the render test.

Calls the backend reader directly, so it needs neither a running gateway nor a
dashboard token. Falls back to a small synthetic payload when the host has no
usage shards, so the test suite still runs on a fresh install or in CI.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

import usage_store  # noqa: E402


def synthetic() -> dict:
    """Two models over three days, one of them tripling its per-turn cost."""
    hours = [f"2026-09-{day:02d}T{hour:02d}" for day in (15, 16, 17) for hour in (9, 13, 21)]
    rows: list[list[float]] = []
    for index, _hour in enumerate(hours):
        rows.append([index, 0, 0, 0, 0, 0, 8.0 if index < 6 else 26.0, 1])
        rows.append([index, 1, 1, 0, 1, 1, 3.5, 1])
    credits = sum(row[6] for row in rows)
    return {
        "generated_at": "2026-09-17T23:00:00+08:00",
        "tz": "Asia/Shanghai",
        "window_days": 0,
        "shards": 3,
        "dims": {
            "hours": hours,
            "model": ["synth-a", "synth-b"],
            "surface": ["dashboard", "cron"],
            "agent": ["kirocrew"],
            "job": ["", "nightly"],
            "session": ["chat-1-1", "cron:nightly:run1"],
        },
        "rows": rows,
        "labels": {"session": {"chat-1-1": "Synthetic session"}},
        "totals": {"credits": round(credits, 2), "turns": len(rows)},
    }


def main() -> int:
    payload = usage_store.read_series(days=0, tz_name="Asia/Shanghai")
    if not payload.get("rows"):
        print("no usage shards on this host — writing a synthetic fixture")
        payload = synthetic()
    out = HERE / "fixture.json"
    out.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(
        f"wrote {out.name}: {len(payload['rows'])} rows, "
        f"{payload['totals']['credits']} credits, {payload['shards']} shards"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
