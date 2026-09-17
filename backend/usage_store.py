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


def _cron_names(home: Path) -> dict[str, str]:
    """job id -> name, from the cron registry. Live jobs only; a deleted job keeps its id."""
    out: dict[str, str] = {}
    try:
        registry = json.loads((home / "crons.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return out
    for job in registry.get("jobs") or []:
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
                title = str(meta.get("title") or "").strip()
            except (OSError, ValueError):
                title = ""
            if title:
                out[slot] = title
            break
    return out


def _job_of(slot: str, names: dict[str, str]) -> str:
    """The cron job label for *slot*, or '' when the slot is not scheduled work."""
    if not slot.startswith("cron:"):
        return ""
    parts = slot.split(":")
    job_id = parts[1] if len(parts) > 1 else ""
    if not job_id:
        return "cron"
    name = names.get(job_id)
    return name if name else f"{job_id} (deleted)"


def _shards_in_window(directory: Path, days: int) -> list[Path]:
    """In-window shards, filtered by FILENAME date — no stat per candidate."""
    if not directory.is_dir():
        return []
    span = days if days else MAX_LOOKBACK_DAYS
    floor = (datetime.now().astimezone() - timedelta(days=span + 1)).date().isoformat()
    return sorted(
        path
        for path in directory.glob("*.jsonl")
        if path.is_file() and path.stem >= floor
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
            try:
                when = datetime.fromisoformat(stamp).astimezone(tz)
            except ValueError:
                continue
            try:
                credits = float(row.get("credits") or 0.0)
            except (TypeError, ValueError):
                continue
            # Shards written before the gateway's persist-side guard can hold bare
            # NaN / Infinity, which json.loads accepts. One would poison every
            # total it touches and produce a body the browser cannot parse.
            if not math.isfinite(credits):
                continue

            slot = str(row.get("slot") or "")
            if slot.startswith("chat-"):
                chat_slots.add(slot)
            bucket = buckets[
                (
                    when.strftime("%Y-%m-%dT%H"),
                    str(row.get("model") or "(unlabelled)"),
                    str(row.get("surface") or "(unlabelled)"),
                    str(row.get("agent") or "(default)"),
                    _job_of(slot, names),
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

    payload = {
        "generated_at": datetime.now(tz).isoformat(timespec="seconds"),
        "tz": resolved_tz,
        "window_days": days,
        "shards": len(shards),
        "dims": dims,
        "rows": rows,
        "labels": {"session": _session_titles(home, chat_slots)},
        "totals": {"credits": round(total_credits, 2), "turns": total_turns},
    }
    if key is not None:
        _cache.clear()  # one window at a time; the UI refetches on change
        _cache[key] = (time.time(), payload)
    return payload
