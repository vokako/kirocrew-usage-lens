#!/usr/bin/env python3
"""Self-test for the Usage Lens backend. No pytest, no network, no gateway.

Builds a synthetic shard directory, points the reader at it, and asserts the folded
payload says what the UI depends on. Run with ``python3 backend/selftest.py``.
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import usage_store  # noqa: E402

FAILURES: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"  ok   {label}")
    else:
        FAILURES.append(f"{label}{f' — {detail}' if detail else ''}")
        print(f"  FAIL {label}{f' — {detail}' if detail else ''}")


def row(ts: str, *, slot: str, model: str, surface: str, credits: float, agent: str = "a") -> str:
    return json.dumps(
        {
            "_type": "tokens",
            "ts": ts,
            "slot": slot,
            "agent": agent,
            "provider": "acp",
            "model": model,
            "credits": credits,
            "cost": 0.0,
            "surface": surface,
        }
    )


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        home = Path(tmp)
        tokens = home / "usage" / "tokens"
        tokens.mkdir(parents=True)

        # Two cron runs of ONE job with per-run sessions, one persistent-session
        # cron, one dashboard chat, plus rows that must be discarded.
        (tokens / "2026-09-16.jsonl").write_text(
            "\n".join(
                [
                    row("2026-09-16T02:00:00+00:00", slot="cron:abc123:run1", model="m1", surface="cron", credits=10.0),
                    row("2026-09-16T03:00:00+00:00", slot="cron:abc123:run2", model="m1", surface="cron", credits=20.0),
                    row("2026-09-16T03:30:00+00:00", slot="cron:zzz999", model="m1", surface="cron", credits=5.0),
                    row("2026-09-16T04:00:00+00:00", slot="chat-7-1", model="m2", surface="dashboard", credits=7.5),
                    '{"_type":"other","ts":"2026-09-16T05:00:00+00:00","credits":999}',
                    row("2026-09-16T05:00:00+00:00", slot="chat-7-1", model="m2", surface="dashboard", credits=float("nan")),
                    "   ",
                    "{ not json",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        (home / "crons.json").write_text(
            json.dumps({"version": 2, "jobs": [{"id": "abc123", "name": "nightly-sweep"}]}),
            encoding="utf-8",
        )
        sessions = home / "sessions"
        sessions.mkdir()
        (sessions / "dashboard_chat-7-1.jsonl").write_text(
            json.dumps({"_type": "metadata", "title": "Ship the thing"}) + "\n",
            encoding="utf-8",
        )

        usage_store.data_home = lambda: home  # type: ignore[assignment]
        usage_store._cache.clear()
        payload = usage_store.read_series(days=0, tz_name="UTC")

    print("fold:")
    check("every valid row counted", payload["totals"]["turns"] == 4, str(payload["totals"]))
    check("NaN / wrong-type / malformed rows dropped", payload["totals"]["credits"] == 42.5, str(payload["totals"]))
    check("timezone echoed", payload["tz"] == "UTC", payload["tz"])

    jobs = payload["dims"]["job"]
    print("cron rollup:")
    check("per-run slots roll up to one job", jobs.count("nightly-sweep") == 1, str(jobs))
    check("job named from the registry", "nightly-sweep" in jobs, str(jobs))
    check("unknown job id marked deleted", any(j.startswith("zzz999") and "deleted" in j for j in jobs), str(jobs))
    check(
        "an unscheduled row says what it WAS, not just 'not scheduled'",
        "Unscheduled · interactive chat" in jobs,
        str(jobs),
    )
    check("no empty job label survives", "" not in jobs, str(jobs))

    print("unscheduled classification:")
    cases = [
        (("dashboard", "chat-7-1"), "interactive chat"),
        (("subagent", "sub-abc"), "subagent"),
        (("taskrunner", "task-1"), "task runner"),
        (("bg:consolidation", "_bg"), "background"),
        (("bg:tips", "chat-9-1"), "background"),
        (("telegram:x:direct:1", "telegram:x:direct:1"), "telegram:x:direct:1"),
    ]
    for (surface, slot), expected in cases:
        got = usage_store._job_of(slot, surface, {})
        check(
            f"{surface or '(none)'} -> {expected}",
            got == f"{usage_store.UNSCHEDULED_PREFIX}{expected}",
            got,
        )

    print("billing cycle:")
    from datetime import timezone as _tz  # noqa: PLC0415
    from zoneinfo import ZoneInfo as _ZI  # noqa: PLC0415

    cycle = usage_store.billing_cycle(_ZI("Asia/Shanghai"), "2026-10-01")
    check("reset date is honoured", cycle["resets"] == "2026-10-01", str(cycle))
    check("cycle starts one month earlier, in UTC", cycle["start_utc"].startswith("2026-09-01T00:00:00"), str(cycle))
    check(
        "the UTC boundary is converted to the display clock, not assumed local midnight",
        cycle["start_hour"] == "2026-09-01T08",
        cycle["start_hour"],
    )
    check("previous cycle start is the month before", cycle["prev_start_hour"] == "2026-08-01T08", str(cycle))
    check("source is attributed to Kiro", cycle["source"] == "kiro-api")
    utc_cycle = usage_store.billing_cycle(_tz.utc, "2026-01-01")
    check("a January reset walks back across the year", utc_cycle["start_hour"] == "2025-12-01T00", str(utc_cycle))
    check("prev start too", utc_cycle["prev_start_hour"] == "2025-11-01T00", str(utc_cycle))
    assumed = usage_store.billing_cycle(_tz.utc, None)
    check("no reset date falls back to a UTC month, and says so", assumed["source"] == "assumed-utc-month")
    check("assumed cycle still has both boundaries", bool(assumed["start_hour"] and assumed["resets"]))
    check("a malformed reset date does not raise", usage_store.billing_cycle(_tz.utc, "not-a-date")["source"] == "assumed-utc-month")

    print("payload extras:")
    check("cycle block present", set(payload["cycle"]) >= {"start_hour", "prev_start_hour", "resets", "source"})
    check("official block present (possibly empty)", isinstance(payload["official"], dict))

    print("labels and dimensions:")
    check("session title resolved", payload["labels"]["session"].get("chat-7-1") == "Ship the thing")
    check("models interned", sorted(payload["dims"]["model"]) == ["m1", "m2"], str(payload["dims"]["model"]))
    check("surfaces interned", sorted(payload["dims"]["surface"]) == ["cron", "dashboard"])
    check("hours are local-hour keys", all(len(h) == 13 and h[10] == "T" for h in payload["dims"]["hours"]))

    print("row shape:")
    widths = {len(r) for r in payload["rows"]}
    check("rows are 8 wide", widths == {8}, str(widths))
    check(
        "indices are in range",
        all(
            0 <= r[i] < len(payload["dims"][name])
            for r in payload["rows"]
            for i, name in enumerate(("hours", "model", "surface", "agent", "job", "session"))
        ),
    )
    credited = sum(r[6] for r in payload["rows"])
    check("row credits reconcile with the total", abs(credited - 42.5) < 1e-6, str(credited))
    check("payload is JSON-serialisable", isinstance(json.dumps(payload), str))

    print("guards:")
    check("bad timezone falls back instead of raising", usage_store.resolve_tz("Not/AZone") is not None)
    check("out-of-range window clamps", usage_store.read_series(days=99, tz_name="UTC")["window_days"] == 7)

    if FAILURES:
        print(f"\n{len(FAILURES)} failure(s):")
        for line in FAILURES:
            print(f"  - {line}")
        return 1
    print("\nall checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
