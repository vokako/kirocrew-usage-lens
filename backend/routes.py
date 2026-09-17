"""Usage Lens backend routes.

Registered through ``backend.hooks.routes`` in ``app.json``. Paths are RELATIVE to
``/api/apps/usage-lens``, and every handler takes ``(request, ctx)`` — the
external-app contract, which differs from builtins: adding routes to the aiohttp
router directly never dispatches for an installed app, because the RouteRegistry
catch-all shadows it.

Endpoints:

* ``GET /series?days=<1|3|7|14|30|0>&tz=<IANA zone>`` — the folded usage payload for
  one window. ``days=0`` means every retained shard. ``tz`` defaults to the
  gateway host's own zone; the UI passes the browser's so the day boundaries match
  what the reader sees on their own clock.
* ``GET /health`` — whether the shard directory exists and how many shards are in
  it, so the page can tell "no spend yet" from "the gateway never wrote a shard".

Read-only by construction: no handler writes, and the app declares no storage,
cron, spawn, or network permission.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any

from aiohttp import web

# The backend package is loaded by path, so a sibling import needs this directory
# on the path — without it ``import usage_store`` fails once the gateway loads
# this module under its own package name.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from usage_store import ALLOWED_DAYS, read_series, usage_dir  # noqa: E402

logger = logging.getLogger(__name__)


def _unauthorized(request: web.Request) -> web.Response | None:
    """401 unless this request carries a user, per the app-route contract."""
    if request.get("user") is None:
        return web.json_response({"error": "unauthorized"}, status=401)
    return None


async def handle_series(request: web.Request, ctx: Any) -> web.Response:
    denied = _unauthorized(request)
    if denied is not None:
        return denied

    raw_days = request.query.get("days")
    try:
        days = int(raw_days) if raw_days is not None else 7
    except ValueError:
        days = 7
    if days not in ALLOWED_DAYS:
        # Clamped rather than refused: a stale bookmark should still render.
        days = 7

    tz_name = (request.query.get("tz") or "").strip() or None
    try:
        payload = await asyncio.to_thread(read_series, days, tz_name)
    except Exception:  # noqa: BLE001 — a read failure is a 500 with a reason, not a stack trace
        logger.exception("usage-lens: reading usage shards failed")
        return web.json_response({"error": "could not read usage shards"}, status=500)
    return web.json_response(payload)


async def handle_health(request: web.Request, ctx: Any) -> web.Response:
    denied = _unauthorized(request)
    if denied is not None:
        return denied
    directory = usage_dir()
    exists = directory.is_dir()
    shards = len(list(directory.glob("*.jsonl"))) if exists else 0
    return web.json_response(
        {"status": "ok", "usage_dir": str(directory), "exists": exists, "shards": shards}
    )


def register_routes(ctx: Any) -> list:
    """Declare Usage Lens's backend routes.

    ``AppRoute`` is imported lazily so a gateway without the route registry still
    loads the app's UI instead of failing the whole install.
    """
    from kiro_crew.apps.route_registry import AppRoute

    logger.info("usage-lens: registering backend routes")
    return [
        AppRoute(method="GET", path="/series", handler=handle_series),
        AppRoute(method="GET", path="/health", handler=handle_health),
    ]
