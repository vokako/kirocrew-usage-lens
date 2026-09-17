"""Read the gateway's per-turn usage shards and fold them into one compact payload.

The gateway writes one JSONL row per agent turn to ``<data home>/usage/tokens/YYYY-MM-DD.jsonl``:

    {"_type":"tokens","ts":"...","slot":"cron:af8ca73c:5eb22ea0","agent":"...",
     "provider":"acp","model":"gpt-5.6-sol","credits":107.5,"cost":0.0,
     "surface":"cron","turns":0,"duration_ms":...,"context_used":...,"context_window":...}

This module is the READ side. It is deliberately stdlib-only and never writes: the
shards are the gateway's data, and an analytics app has no business mutating them.

Design notes
------------
* **One payload, client-side slicing.** Every dimension switch in the UI is a
  re-aggregation of the same rows, so the server folds once (turn rows ->
  hour x model x surface x agent x job x session buckets) and the browser does the
  rest. A 30-day window on a busy install is ~4k buckets / ~200 KB of JSON, which
  costs one request instead of one per interaction.
* **Dimensions are interned.** Rows travel as arrays of small ints plus a string
  table per dimension, which is what keeps that payload from tripling.
* **Cron rollup by job, not by run.** A job with ``persistent_session=false`` gets
  a fresh slot per run (``cron:<job id>:<run id>``), so per-slot rows bury it in
  hundreds of anonymous entries. The job id is the second segment either way, so
  that is the rollup key, and ``crons.json`` supplies the human name.
* **Cache on shard identity.** Shards are append-only, so a key of
  ``(name, mtime, size)`` per in-window shard invalidates exactly when a turn is
  written, with a short TTL as a clock-skew net. Same approach the gateway's own
  usage handler uses, for the same reason: this runs in the gateway process.
* **``credits`` is the only real cost metric.** ``cost`` (USD) is populated only by
  the ``claude_code`` / ``bedrock`` providers and is 0.0 for ACP turns, and
  ``input`` / ``output`` token counts are 0 there too, so a token-based view would
  read as "free" on the default provider. Credits are always written.
"""

from __future__ import annotations

import json
import math
import os
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Windows the UI offers, in days. 0 means "every retained shard".
ALLOWED_DAYS = (1, 3, 7, 14, 30, 0)
# A shard older than this is not read even for the "all" window: the gateway
# retires them around 30 days, and an unbounded scan on a years-old install is a
# cost with no reader.
MAX_LOOKBACK_DAYS = 60
_CACHE_TTL_SECS = 60
# Marks a job-dimension row that is not a scheduled job. One prefix, so the UI can
# style them as a group and a reader can tell a job from everything else at a glance.
UNSCHEDULED_PREFIX = "Unscheduled · "

_cache: dict[tuple, tuple[float, dict[str, Any]]] = {}


def data_home() -> Path:
    """The live KiroCrew data home, resolved per call (never captured at import).

    ``KIROCREW_HOME`` is per-process and a pod sets its own, so binding this to a
    module constant would freeze whichever home happened to exist at import time.
    """
    try:
        from kiro_crew.config.paths import data_home as _core_data_home

        return Path(_core_data_home())
    except Exception:  # noqa: BLE001 — an app must survive a core refactor
        return Path(os.environ.get("KIROCREW_HOME") or (Path.home() / ".kiro" / "crew"))


def usage_dir() -> Path:
    return data_home() / "usage" / "tokens"


def resolve_tz(name: str | None) -> ZoneInfo | timezone:
    """The requested zone, else the host's. Never raises on a bad name."""
    if name:
        try:
            return ZoneInfo(name)
        except (ZoneInfoNotFoundError, ValueError):
            pass
    local = datetime.now().astimezone().tzinfo
    return local if local is not None else timezone.utc


def official_usage() -> dict[str, Any]:
    """Kiro's OWN month-to-date figures, or ``{}`` when they are not available.

    The gateway keeps these in-process: it reads them from ``GetUsageLimits`` on the
    CodeWhisperer runtime service — the same API the Kiro IDE credit meter reads —
    and falls back to scraping ``kiro-cli /usage``. Reading its cache costs nothing
    and, critically, spends no credits; calling that API again from here would.

    Wrapped in a broad except and degraded to ``{}`` on any failure: this reaches
    into a host internal, so a refactor upstream must cost this app its comparison
    figures, not its whole page.
    """
    try:
        from kiro_crew.dashboard.handlers.usage import get_usage_cache

        cache = get_usage_cache() or {}
    except Exception:  # noqa: BLE001 — an unavailable comparison is not an error
        return {}
    if cache.get("credits_plan") is None:
        return {}  # an {"available": False} sentinel is truthy but carries no figures
    keep = (
        "credits_used",
        "credits_plan",
        "credits_overage",
        "credits_covered",
        "percentage",
        "cost_usd",
        "overage_rate",
        "plan",
        "resets",
        "source",
    )
    return {key: cache[key] for key in keep if key in cache}


def _month_floor_utc(when: datetime) -> datetime:
    return when.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _shift_months(when: datetime, months: int) -> datetime:
    """The 1st of the month *months* away from *when*'s month, at 00:00."""
    total = (when.year * 12 + when.month - 1) + months
    year, month = divmod(total, 12)
    return when.replace(year=year, month=month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)


def billing_cycle(tz: ZoneInfo | timezone, resets: str | None) -> dict[str, Any]:
    """The current Kiro billing cycle, expressed as hour keys on the DISPLAY clock.

    Kiro resets plan credits at the start of the billing cycle, and the reset instant
    it reports (``nextDateReset``) is UTC — so the boundary is NOT local midnight on
    the 1st. In Asia/Shanghai that is an eight-hour difference, which is exactly the
    band of turns a naive local-month filter files under the wrong cycle.

    The arithmetic therefore happens in UTC and the boundaries are converted to the
    requested zone on the way out, as ``YYYY-MM-DDTHH`` keys the UI compares directly
    against ``dims.hours``. ``prev_start_hour`` is the PRECEDING cycle rather than an
    equal-length lookback, so a month-over-month reading lines up with the invoice.

    ``source`` is ``kiro-api`` when the reset date came from Kiro and
    ``assumed-utc-month`` when it did not — a UTC calendar month matches the
    documented behaviour ("credits reset monthly", "requests pause until your limits
    reset at the start of the next month"), but it is an assumption, and the UI says
    so rather than implying an authoritative boundary.
    """
    end: datetime | None = None
    if resets:
        try:
            end = datetime.strptime(str(resets)[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            end = None
    if end is not None:
        source = "kiro-api"
        start = _shift_months(end, -1)
    else:
        source = "assumed-utc-month"
        start = _month_floor_utc(datetime.now(timezone.utc))
        end = _shift_months(start, 1)

    def hour_key(when: datetime) -> str:
        return when.astimezone(tz).strftime("%Y-%m-%dT%H")

    return {
        "source": source,
        "resets": end.date().isoformat(),
        "start_utc": start.isoformat(),
        "start_hour": hour_key(start),
        "prev_start_hour": hour_key(_shift_months(start, -1)),
        "end_hour": hour_key(end),
    }


def _cron_names(home: Path) -> dict[str, str]:
    """job id -> name, from the cron registry. Live jobs only; a deleted job keeps its id."""
    out: dict[str, str] = {}
    try:
        registry = json.loads((home / "crons.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return out
    # The registry's root is an object with a "jobs" list, but a hand-edited or
    # half-written file can be a list, a string, or null — none of which have .get.
    if not isinstance(registry, dict):
        return out
    jobs = registry.get("jobs")
    if not isinstance(jobs, list):
        return out
    for job in jobs:
        if not isinstance(job, dict):
            continue
        job_id = str(job.get("id") or "")
        if job_id:
            out[job_id] = str(job.get("name") or "") or job_id
    return out


def _session_titles(home: Path, slots: set[str]) -> dict[str, str]:
    """slot -> stored title, from the FIRST line of each session log.

    Only the metadata line is read, so this stays O(sessions) file opens with one
    small read each rather than parsing transcripts.
    """
    out: dict[str, str] = {}
    sessions = home / "sessions"
    if not sessions.is_dir():
        return out
    for slot in slots:
        for stem in (f"dashboard_{slot}", slot):
            path = sessions / f"{stem}.jsonl"
            if not path.is_file():
                continue
            try:
                with path.open("r", encoding="utf-8", errors="replace") as handle:
                    meta = json.loads(handle.readline() or "{}")
                # A valid JSON first line need not be an object: `null`, a number, or
                # a bare string all parse, and none of them have .get.
                title = str(meta.get("title") or "").strip() if isinstance(meta, dict) else ""
            except (OSError, ValueError):
                title = ""
            if title:
                out[slot] = title
            break
    return out


def _surface_group(surface: str, slot: str) -> str:
    """What KIND of unscheduled work a row is, for the job dimension's other rows.

    The job dimension answers "which scheduled job spent this", and everything
    that is not a cron used to collapse into one bucket the UI rendered as
    "(not scheduled)" — a single row holding interactive chat, subagents, the task
    runner, and every background maintenance pass at once. That is a label, not an
    answer: the biggest row on the page said only "not one of the things you asked
    about". These rows now say what they actually were.

    ``bg:*`` surfaces (consolidation, chat_nav, tips, …) collapse to one
    ``background`` group deliberately: individually they are fractions of a credit,
    and a dozen near-zero rows would push the rows that matter off the top.
    """
    if surface.startswith("bg:") or slot == "_bg":
        return "background"
    if surface == "subagent":
        return "subagent"
    if surface == "taskrunner":
        return "task runner"
    if surface == "dashboard" or slot.startswith("chat-"):
        return "interactive chat"
    if surface == "workflow" or surface == "workflow_pool":
        return "workflow"
    if surface and surface != "(unlabelled)":
        return surface
    return "other"


def _job_of(slot: str, surface: str, names: dict[str, str]) -> str:
    """The job-dimension value for *slot*.

    A scheduled row gets its job's NAME, rolled up across runs: a job with
    ``persistent_session=false`` gets a fresh slot per run
    (``cron:<job id>:<run id>``), so the job id is the second segment either way
    and that is the rollup key. An unscheduled row gets ``Unscheduled · <kind>``,
    which keeps it visibly distinct from a real job while still saying what it was.
    """
    if not slot.startswith("cron:"):
        return f"{UNSCHEDULED_PREFIX}{_surface_group(surface, slot)}"
    parts = slot.split(":")
    job_id = parts[1] if len(parts) > 1 else ""
    if not job_id:
        return f"{UNSCHEDULED_PREFIX}cron (unidentified)"
    name = names.get(job_id)
    return name if name else f"{job_id} (deleted)"


_SHARD_NAME = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_ts(raw: str) -> datetime | None:
    """Parse a shard row's timestamp, or None.

    The gateway writes an offset-aware ISO-8601 string (``+00:00``), but a ``Z``
    suffix is the same instant and ``fromisoformat`` only learned to accept it in
    Python 3.11 — so normalise it here rather than silently dropping every row on
    an older interpreter. A NAIVE timestamp is interpreted in the host's zone,
    which is what ``astimezone`` on a naive value does anyway; it is stated here so
    the behaviour is a decision rather than an accident.
    """
    if not raw:
        return None
    text = raw.strip()
    if text.endswith(("Z", "z")):
        text = f"{text[:-1]}+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _shards_in_window(directory: Path, days: int) -> list[Path]:
    """In-window shards, filtered by FILENAME date — no stat per candidate.

    The name must be exactly ``YYYY-MM-DD``: a stem that is not a date cannot be
    compared against the cutoff (``"backup" > "2026-08-01"`` lexicographically, so
    a loose check silently pulls in unrelated files), and the gateway never writes
    one.
    """
    if not directory.is_dir():
        return []
    span = days if days else MAX_LOOKBACK_DAYS
    floor = (datetime.now().astimezone() - timedelta(days=span + 1)).date().isoformat()
    return sorted(
        path
        for path in directory.glob("*.jsonl")
        if path.is_file() and _SHARD_NAME.match(path.stem) and path.stem >= floor
    )


def _cache_key(shards: list[Path], days: int, tz_name: str) -> tuple | None:
    try:
        return (
            days,
            tz_name,
            tuple((path.name, path.stat().st_mtime, path.stat().st_size) for path in shards),
        )
    except OSError:
        return None


def read_series(days: int = 7, tz_name: str | None = None) -> dict[str, Any]:
    """Fold the in-window usage shards into the UI's payload.

    Returns ``{generated_at, tz, window_days, shards, dims, rows, labels, totals}``
    where each row is ``[hour, model, surface, agent, job, session, credits, turns]``
    and the first six entries index into ``dims``.
    """
    if days not in ALLOWED_DAYS:
        days = 7
    home = data_home()
    tz = resolve_tz(tz_name)
    resolved_tz = str(getattr(tz, "key", None) or tz)
    shards = _shards_in_window(usage_dir(), days)

    key = _cache_key(shards, days, resolved_tz)
    if key is not None:
        hit = _cache.get(key)
        if hit and (time.time() - hit[0]) < _CACHE_TTL_SECS:
            return hit[1]

    span = days if days else MAX_LOOKBACK_DAYS
    cutoff = (datetime.now(timezone.utc) - timedelta(days=span)).isoformat()
    names = _cron_names(home)

    buckets: dict[tuple[str, str, str, str, str, str], list[float]] = defaultdict(
        lambda: [0.0, 0]
    )
    chat_slots: set[str] = set()
    total_credits = 0.0
    total_turns = 0

    for shard in shards:
        try:
            text = shard.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue  # a corrupt shard loses its own rows, not the whole window
        for line in text.splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if not isinstance(row, dict) or row.get("_type") != "tokens":
                continue
            stamp = str(row.get("ts") or "")
            if not stamp or stamp < cutoff:
                continue
            parsed = _parse_ts(stamp)
            if parsed is None:
                continue
            when = parsed.astimezone(tz)
            raw_credits = row.get("credits")
            # Numbers only. A STRING is refused rather than coerced: the gateway
            # always writes a number, so a string means the row came from something
            # else — and `float("nan")` would walk straight past the finite check
            # below if strings were accepted. A missing key or ``None`` is a free
            # turn (0.0), which is a real thing a turn can cost.
            if raw_credits is None:
                credits = 0.0
            elif isinstance(raw_credits, (int, float)):  # bool is an int; True == 1.0
                credits = float(raw_credits)
            else:
                continue
            # Shards written before the gateway's persist-side guard can hold bare
            # NaN / Infinity, which json.loads accepts. One would poison every
            # total it touches and produce a body the browser cannot parse.
            if not math.isfinite(credits):
                continue

            slot = str(row.get("slot") or "")
            surface = str(row.get("surface") or "(unlabelled)")
            if slot.startswith("chat-"):
                chat_slots.add(slot)
            bucket = buckets[
                (
                    when.strftime("%Y-%m-%dT%H"),
                    str(row.get("model") or "(unlabelled)"),
                    surface,
                    str(row.get("agent") or "(default)"),
                    _job_of(slot, surface, names),
                    slot or "(no slot)",
                )
            ]
            bucket[0] += credits
            bucket[1] += 1
            total_credits += credits
            total_turns += 1

    dims: dict[str, list[str]] = {
        name: [] for name in ("hours", "model", "surface", "agent", "job", "session")
    }
    index: dict[str, dict[str, int]] = {name: {} for name in dims}

    def intern(kind: str, value: str) -> int:
        table = index[kind]
        found = table.get(value)
        if found is None:
            found = table[value] = len(dims[kind])
            dims[kind].append(value)
        return found

    rows: list[list[float]] = []
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
                int(turns),
            ]
        )

    official = official_usage()
    payload = {
        "generated_at": datetime.now(tz).isoformat(timespec="seconds"),
        "tz": resolved_tz,
        "window_days": days,
        "shards": len(shards),
        "cycle": billing_cycle(tz, official.get("resets")),
        "official": official,
        "dims": dims,
        "rows": rows,
        "labels": {"session": _session_titles(home, chat_slots)},
        "totals": {"credits": round(total_credits, 2), "turns": total_turns},
    }
    if key is not None:
        _cache.clear()  # one window at a time; the UI refetches on change
        _cache[key] = (time.time(), payload)
    return payload
