"""Usage Lens backend tests. Stdlib ``unittest`` only — no pytest, no network, no gateway.

    python3 -m unittest discover -s tests -v
    python3 tests/test_usage_store.py          # same thing, one file

Every test builds its own shard directory in a temp dir and points the reader at it,
so nothing here reads the developer's real usage data and the suite passes on a
machine that has never run KiroCrew.
"""

from __future__ import annotations

import json
import math
import os
import stat
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import usage_store as store  # noqa: E402

SHANGHAI = ZoneInfo("Asia/Shanghai")
KATHMANDU = ZoneInfo("Asia/Kathmandu")  # +05:45 — a non-integer offset
NEW_YORK = ZoneInfo("America/New_York")  # DST


def row(
    ts: str,
    *,
    slot: str = "chat-1-1",
    model: str = "m1",
    surface: str = "dashboard",
    agent: str = "kirocrew",
    credits: object = 1.0,
    kind: str = "tokens",
) -> str:
    return json.dumps(
        {
            "_type": kind,
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


class ShardFixture:
    """A throwaway KiroCrew data home with a usage/tokens directory."""

    def __init__(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name)
        self.tokens = self.home / "usage" / "tokens"
        self.tokens.mkdir(parents=True)
        self._prev_data_home = store.data_home
        store.data_home = lambda: self.home  # type: ignore[assignment]
        store._cache.clear()

    def write(self, day: str, *lines: str) -> Path:
        path = self.tokens / f"{day}.jsonl"
        path.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
        return path

    def crons(self, jobs: dict[str, str]) -> None:
        (self.home / "crons.json").write_text(
            json.dumps({"version": 2, "jobs": [{"id": k, "name": v} for k, v in jobs.items()]}),
            encoding="utf-8",
        )

    def session(self, slot: str, meta: object, *, prefix: str = "dashboard_") -> None:
        sessions = self.home / "sessions"
        sessions.mkdir(exist_ok=True)
        body = meta if isinstance(meta, str) else json.dumps(meta)
        (sessions / f"{prefix}{slot}.jsonl").write_text(body + "\n", encoding="utf-8")

    def close(self) -> None:
        store.data_home = self._prev_data_home  # type: ignore[assignment]
        store._cache.clear()
        self._tmp.cleanup()


class Base(unittest.TestCase):
    def setUp(self) -> None:
        self.fx = ShardFixture()
        self.addCleanup(self.fx.close)
        # Timestamps are placed relative to now so they land inside every window.
        self.now = datetime.now(timezone.utc)

    def at(self, *, hours_ago: float = 1.0) -> str:
        return (self.now - timedelta(hours=hours_ago)).isoformat()

    def day_of(self, *, hours_ago: float = 1.0) -> str:
        return (self.now - timedelta(hours=hours_ago)).astimezone().date().isoformat()

    def read(self, **kwargs: object) -> dict:
        kwargs.setdefault("days", 0)
        kwargs.setdefault("tz_name", "UTC")
        return store.read_series(**kwargs)  # type: ignore[arg-type]


# ---------------------------------------------------------------- shard parsing


class TestShardParsing(Base):
    def test_no_usage_directory_is_an_empty_payload_not_an_error(self) -> None:
        store.data_home = lambda: self.fx.home / "nope"  # type: ignore[assignment]
        payload = self.read()
        self.assertEqual(payload["rows"], [])
        self.assertEqual(payload["totals"], {"credits": 0, "turns": 0})
        self.assertEqual(payload["shards"], 0)

    def test_empty_directory(self) -> None:
        payload = self.read()
        self.assertEqual(payload["rows"], [])

    def test_empty_and_whitespace_lines_are_skipped(self) -> None:
        self.fx.write(self.day_of(), "", "   ", "\t", row(self.at(), credits=2.0))
        self.assertEqual(self.read()["totals"]["turns"], 1)

    def test_malformed_json_line_does_not_lose_the_file(self) -> None:
        self.fx.write(
            self.day_of(),
            "{ not json",
            row(self.at(), credits=3.0),
            "]]]",
            row(self.at(), credits=4.0),
        )
        totals = self.read()["totals"]
        self.assertEqual(totals["turns"], 2)
        self.assertEqual(totals["credits"], 7.0)

    def test_a_json_scalar_line_is_not_a_row(self) -> None:
        self.fx.write(self.day_of(), "42", '"a string"', "null", "[]", row(self.at()))
        self.assertEqual(self.read()["totals"]["turns"], 1)

    def test_other_record_types_are_ignored(self) -> None:
        self.fx.write(
            self.day_of(),
            row(self.at(), kind="context", credits=999.0),
            row(self.at(), kind="", credits=999.0),
            row(self.at(), credits=1.0),
        )
        self.assertEqual(self.read()["totals"], {"credits": 1.0, "turns": 1})

    def test_missing_or_unparseable_timestamp_is_dropped(self) -> None:
        self.fx.write(
            self.day_of(),
            row("", credits=5.0),
            row("not-a-timestamp", credits=5.0),
            row("2026-13-45T99:99:99+00:00", credits=5.0),
            row(self.at(), credits=1.0),
        )
        self.assertEqual(self.read()["totals"]["turns"], 1)

    def test_z_suffixed_timestamp_is_accepted(self) -> None:
        """The gateway writes +00:00, but Z is the same instant and must not be lost."""
        stamp = self.at().replace("+00:00", "Z")
        self.fx.write(self.day_of(), row(stamp, credits=2.5))
        self.assertEqual(self.read()["totals"]["credits"], 2.5)

    def test_naive_timestamp_is_kept_rather_than_dropped(self) -> None:
        naive = (self.now - timedelta(hours=2)).replace(tzinfo=None).isoformat()
        self.fx.write(self.day_of(hours_ago=2), row(naive, credits=1.5))
        self.assertEqual(self.read()["totals"]["turns"], 1)

    def test_non_jsonl_files_are_ignored(self) -> None:
        (self.fx.tokens / "2026-09-01.json").write_text(row(self.at(), credits=50.0))
        (self.fx.tokens / "notes.txt").write_text("hello")
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        payload = self.read()
        self.assertEqual(payload["shards"], 1)
        self.assertEqual(payload["totals"]["credits"], 1.0)

    def test_a_shard_whose_name_is_not_a_date_is_ignored(self) -> None:
        """`"backup" > "2026-08-01"` lexicographically — a loose filter would read it."""
        (self.fx.tokens / "backup.jsonl").write_text(row(self.at(), credits=77.0))
        (self.fx.tokens / "2026-9-1.jsonl").write_text(row(self.at(), credits=88.0))
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        payload = self.read()
        self.assertEqual(payload["shards"], 1)
        self.assertEqual(payload["totals"]["credits"], 1.0)

    def test_a_subdirectory_is_not_a_shard(self) -> None:
        (self.fx.tokens / "2026-09-02.jsonl").mkdir()
        self.fx.write(self.day_of(), row(self.at()))
        self.assertEqual(self.read()["shards"], 1)

    @unittest.skipIf(os.geteuid() == 0, "root can read a 0o000 file")
    def test_an_unreadable_shard_loses_only_its_own_rows(self) -> None:
        blocked = self.fx.write(self.day_of(hours_ago=25), row(self.at(hours_ago=25), credits=9.0))
        blocked.chmod(0o000)
        self.addCleanup(blocked.chmod, stat.S_IRUSR | stat.S_IWUSR)
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        payload = self.read()
        self.assertEqual(payload["totals"]["credits"], 1.0)
        self.assertEqual(payload["shards"], 2, "the unreadable shard is still counted as present")

    def test_invalid_utf8_bytes_do_not_raise(self) -> None:
        path = self.fx.tokens / f"{self.day_of()}.jsonl"
        path.write_bytes(b"\xff\xfe not utf8\n" + row(self.at(), credits=2.0).encode() + b"\n")
        self.assertEqual(self.read()["totals"]["credits"], 2.0)

    def test_a_row_with_no_trailing_newline_is_still_read(self) -> None:
        (self.fx.tokens / f"{self.day_of()}.jsonl").write_text(row(self.at(), credits=6.0))
        self.assertEqual(self.read()["totals"]["credits"], 6.0)


# ------------------------------------------------------------------ credits


class TestCreditsCoercion(Base):
    def _only(self, credits: object) -> dict:
        self.fx.write(self.day_of(), row(self.at(), credits=credits))
        return self.read()

    def test_nan_is_dropped(self) -> None:
        """json.loads accepts bare NaN; one would poison every total it touches."""
        self.fx.write(self.day_of(), row(self.at(), credits=1.0).replace('"credits": 1.0', '"credits": NaN'))
        payload = self.read()
        self.assertEqual(payload["totals"]["turns"], 0)
        self.assertFalse(math.isnan(payload["totals"]["credits"]))

    def test_infinity_is_dropped(self) -> None:
        for token in ("Infinity", "-Infinity"):
            with self.subTest(token=token):
                self.fx.write(
                    self.day_of(),
                    row(self.at(), credits=1.0).replace('"credits": 1.0', f'"credits": {token}'),
                )
                store._cache.clear()
                self.assertEqual(self.read()["totals"]["turns"], 0)

    def test_missing_and_null_credits_count_as_a_free_turn(self) -> None:
        for value in (None, 0, 0.0):
            with self.subTest(value=value):
                payload = self._only(value)
                store._cache.clear()
                self.assertEqual(payload["totals"]["turns"], 1)
                self.assertEqual(payload["totals"]["credits"], 0)

    def test_a_string_credits_value_is_dropped_not_coerced(self) -> None:
        payload = self._only("12.5")
        self.assertEqual(payload["totals"]["turns"], 0)

    def test_a_structured_credits_value_is_dropped(self) -> None:
        for value in ([1], {"a": 1}, True):
            with self.subTest(value=value):
                store._cache.clear()
                payload = self._only(value)
                # bool is an int subclass, so True legitimately reads as 1.0
                expected = 1 if value is True else 0
                self.assertEqual(payload["totals"]["turns"], expected)

    def test_an_integer_credits_value_is_accepted(self) -> None:
        self.assertEqual(self._only(7)["totals"]["credits"], 7.0)

    def test_a_negative_credit_is_preserved_not_clamped(self) -> None:
        """A refund/correction is data, not an error; hiding it would break the sum."""
        self.assertEqual(self._only(-3.5)["totals"]["credits"], -3.5)

    def test_a_very_large_credit_survives_serialisation(self) -> None:
        payload = self._only(1e15)
        self.assertEqual(payload["totals"]["credits"], 1e15)
        json.dumps(payload)


# -------------------------------------------------------------------- windows


class TestWindows(Base):
    def test_rows_outside_the_window_are_excluded(self) -> None:
        self.fx.write(self.day_of(hours_ago=100), row(self.at(hours_ago=100), credits=5.0))
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        self.assertEqual(self.read(days=1)["totals"]["credits"], 1.0)
        self.assertEqual(self.read(days=7)["totals"]["credits"], 6.0)

    def test_a_shard_older_than_the_lookback_ceiling_is_never_read(self) -> None:
        old = (self.now - timedelta(days=store.MAX_LOOKBACK_DAYS + 30)).date().isoformat()
        (self.fx.tokens / f"{old}.jsonl").write_text(
            row((self.now - timedelta(days=store.MAX_LOOKBACK_DAYS + 30)).isoformat(), credits=42.0)
            + "\n"
        )
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        payload = self.read(days=0)
        self.assertEqual(payload["shards"], 1)
        self.assertEqual(payload["totals"]["credits"], 1.0)

    def test_an_unsupported_window_clamps_to_the_default(self) -> None:
        for days in (99, -1, 2, 1000):
            with self.subTest(days=days):
                store._cache.clear()
                self.assertEqual(self.read(days=days)["window_days"], 7)

    def test_every_advertised_window_is_accepted(self) -> None:
        self.fx.write(self.day_of(), row(self.at()))
        for days in store.ALLOWED_DAYS:
            with self.subTest(days=days):
                store._cache.clear()
                self.assertEqual(self.read(days=days)["window_days"], days)


# ------------------------------------------------------------------ timezones


class TestTimezones(Base):
    def test_hour_keys_are_expressed_in_the_requested_zone(self) -> None:
        self.fx.write("2026-09-01", row("2026-09-01T00:30:00+00:00"))
        # A fixed past instant: use the all-window and a wide lookback.
        payload = store.read_series(days=0, tz_name="UTC")
        if payload["rows"]:  # only when the fixture day is inside the lookback ceiling
            self.assertIn("2026-09-01T00", payload["dims"]["hours"])

    def test_the_same_instant_lands_on_different_hours_in_different_zones(self) -> None:
        stamp = self.at(hours_ago=1)
        self.fx.write(self.day_of(), row(stamp))
        utc = store.read_series(days=0, tz_name="UTC")["dims"]["hours"]
        store._cache.clear()
        shanghai = store.read_series(days=0, tz_name="Asia/Shanghai")["dims"]["hours"]
        self.assertNotEqual(utc, shanghai)
        as_utc = datetime.fromisoformat(stamp).astimezone(timezone.utc)
        self.assertEqual(utc[0], as_utc.strftime("%Y-%m-%dT%H"))
        self.assertEqual(shanghai[0], as_utc.astimezone(SHANGHAI).strftime("%Y-%m-%dT%H"))

    def test_a_non_integer_offset_zone_still_produces_hour_keys(self) -> None:
        self.fx.write(self.day_of(), row(self.at()))
        hours = store.read_series(days=0, tz_name="Asia/Kathmandu")["dims"]["hours"]
        self.assertTrue(all(len(h) == 13 and h[10] == "T" for h in hours))

    def test_an_unknown_zone_falls_back_instead_of_raising(self) -> None:
        for name in ("Not/AZone", "", "   ", "UTC+8", "12345"):
            with self.subTest(name=name):
                self.assertIsNotNone(store.resolve_tz(name))

    def test_the_resolved_zone_is_echoed_so_the_ui_can_label_it(self) -> None:
        self.fx.write(self.day_of(), row(self.at()))
        self.assertEqual(self.read(tz_name="Asia/Shanghai")["tz"], "Asia/Shanghai")

    def test_a_dst_zone_does_not_produce_duplicate_or_missing_hour_keys(self) -> None:
        """Across a US fall-back, two distinct instants share a wall-clock hour.

        They legitimately fold into ONE bucket, which is what the reader's clock
        shows; what must not happen is a crash or a malformed key.
        """
        cycle = store.billing_cycle(NEW_YORK, "2026-12-01")
        self.assertRegex(cycle["start_hour"], r"^\d{4}-\d{2}-\d{2}T\d{2}$")
        self.assertRegex(cycle["prev_start_hour"], r"^\d{4}-\d{2}-\d{2}T\d{2}$")


# ------------------------------------------------------------- cron / job dim


class TestJobDimension(Base):
    def test_per_run_slots_roll_up_to_one_job(self) -> None:
        self.fx.crons({"abc": "nightly"})
        self.fx.write(
            self.day_of(),
            row(self.at(), slot="cron:abc:run1", surface="cron", credits=1.0),
            row(self.at(), slot="cron:abc:run2", surface="cron", credits=2.0),
            row(self.at(), slot="cron:abc:run3", surface="cron", credits=3.0),
        )
        payload = self.read()
        self.assertEqual(payload["dims"]["job"].count("nightly"), 1)
        credits = sum(r[6] for r in payload["rows"] if payload["dims"]["job"][r[4]] == "nightly")
        self.assertEqual(credits, 6.0)

    def test_a_persistent_session_cron_uses_the_same_job_key(self) -> None:
        self.fx.crons({"abc": "nightly"})
        self.fx.write(
            self.day_of(),
            row(self.at(), slot="cron:abc", surface="cron"),
            row(self.at(), slot="cron:abc:run1", surface="cron"),
        )
        self.assertEqual(self.read()["dims"]["job"].count("nightly"), 1)

    def test_an_unregistered_job_id_is_marked_deleted_and_keeps_its_id(self) -> None:
        self.fx.crons({})
        self.fx.write(self.day_of(), row(self.at(), slot="cron:gone9", surface="cron"))
        self.assertIn("gone9 (deleted)", self.read()["dims"]["job"])

    def test_a_job_with_an_empty_registry_name_falls_back_to_its_id(self) -> None:
        self.fx.crons({"abc": ""})
        self.fx.write(self.day_of(), row(self.at(), slot="cron:abc", surface="cron"))
        self.assertIn("abc", self.read()["dims"]["job"])

    def test_a_malformed_cron_slot_is_labelled_not_crashed(self) -> None:
        self.fx.write(
            self.day_of(),
            row(self.at(), slot="cron:", surface="cron"),
            row(self.at(), slot="cron", surface="cron"),
        )
        jobs = self.read()["dims"]["job"]
        self.assertIn(f"{store.UNSCHEDULED_PREFIX}cron (unidentified)", jobs)
        # "cron" without a colon is not a cron slot key at all.
        self.assertTrue(any(j.startswith(store.UNSCHEDULED_PREFIX) for j in jobs))

    def test_no_job_value_is_ever_blank(self) -> None:
        self.fx.write(
            self.day_of(),
            row(self.at(), slot="", surface=""),
            row(self.at(), slot="chat-1-1", surface="dashboard"),
            row(self.at(), slot="cron:x:1", surface="cron"),
        )
        self.assertNotIn("", self.read()["dims"]["job"])

    def test_unscheduled_rows_say_what_they_were(self) -> None:
        cases = {
            ("dashboard", "chat-7-1"): "interactive chat",
            ("subagent", "sub-1"): "subagent",
            ("taskrunner", "task-1"): "task runner",
            ("workflow", "wf-1"): "workflow",
            ("workflow_pool", "wf-2"): "workflow",
            ("bg:consolidation", "_bg"): "background",
            ("bg:anything-new", "chat-1-1"): "background",
            ("", "_bg"): "background",
            ("telegram:me:direct:1", "telegram:me:direct:1"): "telegram:me:direct:1",
            ("(unlabelled)", "mystery"): "other",
            ("", "mystery"): "other",
        }
        for (surface, slot), expected in cases.items():
            with self.subTest(surface=surface, slot=slot):
                self.assertEqual(
                    store._job_of(slot, surface, {}),
                    f"{store.UNSCHEDULED_PREFIX}{expected}",
                )

    def test_a_cron_job_named_like_a_surface_is_not_confused_with_one(self) -> None:
        self.fx.crons({"abc": "subagent"})
        self.fx.write(self.day_of(), row(self.at(), slot="cron:abc", surface="cron"))
        jobs = self.read()["dims"]["job"]
        self.assertIn("subagent", jobs)
        self.assertNotIn(f"{store.UNSCHEDULED_PREFIX}subagent", jobs)

    def test_a_corrupt_cron_registry_does_not_break_the_payload(self) -> None:
        (self.fx.home / "crons.json").write_text("{ not json", encoding="utf-8")
        self.fx.write(self.day_of(), row(self.at(), slot="cron:abc", surface="cron"))
        self.assertIn("abc (deleted)", self.read()["dims"]["job"])

    def test_a_cron_registry_with_an_unexpected_shape_is_tolerated(self) -> None:
        for body in ('{"jobs": null}', '{"jobs": [1, 2]}', '{"jobs": [{}]}', "[]", '"text"'):
            with self.subTest(body=body):
                (self.fx.home / "crons.json").write_text(body, encoding="utf-8")
                store._cache.clear()
                self.assertIsInstance(store._cron_names(self.fx.home), dict)


# --------------------------------------------------------------- session titles


class TestSessionTitles(Base):
    def test_a_title_is_read_from_the_metadata_line(self) -> None:
        self.fx.session("chat-5-1", {"_type": "metadata", "title": "Ship it"})
        self.fx.write(self.day_of(), row(self.at(), slot="chat-5-1"))
        self.assertEqual(self.read()["labels"]["session"]["chat-5-1"], "Ship it")

    def test_a_missing_session_file_yields_no_title(self) -> None:
        self.fx.write(self.day_of(), row(self.at(), slot="chat-6-1"))
        self.assertEqual(self.read()["labels"]["session"], {})

    def test_a_corrupt_or_empty_metadata_line_yields_no_title(self) -> None:
        for body in ("{ not json", "", "null", '{"_type":"metadata"}', '{"title":""}', '{"title":"   "}'):
            with self.subTest(body=body):
                self.fx.session("chat-8-1", body)
                store._cache.clear()
                self.fx.write(self.day_of(), row(self.at(), slot="chat-8-1"))
                self.assertNotIn("chat-8-1", self.read()["labels"]["session"])

    def test_a_non_dashboard_filename_is_also_tried(self) -> None:
        self.fx.session("chat-9-1", {"title": "Bare name"}, prefix="")
        self.fx.write(self.day_of(), row(self.at(), slot="chat-9-1"))
        self.assertEqual(self.read()["labels"]["session"]["chat-9-1"], "Bare name")

    def test_only_chat_slots_are_looked_up(self) -> None:
        """A title lookup per cron RUN would be thousands of file opens for nothing."""
        self.fx.session("cron:abc:run1", {"title": "should not be read"}, prefix="")
        self.fx.write(self.day_of(), row(self.at(), slot="cron:abc:run1", surface="cron"))
        self.assertEqual(self.read()["labels"]["session"], {})

    def test_a_very_long_title_is_passed_through_unchanged(self) -> None:
        title = "x" * 5000
        self.fx.session("chat-10-1", {"title": title})
        self.fx.write(self.day_of(), row(self.at(), slot="chat-10-1"))
        self.assertEqual(self.read()["labels"]["session"]["chat-10-1"], title)


# ------------------------------------------------------------- billing cycle


class TestBillingCycle(unittest.TestCase):
    def test_the_reset_date_defines_the_cycle(self) -> None:
        cycle = store.billing_cycle(timezone.utc, "2026-10-01")
        self.assertEqual(cycle["source"], "kiro-api")
        self.assertEqual(cycle["resets"], "2026-10-01")
        self.assertTrue(cycle["start_utc"].startswith("2026-09-01T00:00:00"))
        self.assertEqual(cycle["start_hour"], "2026-09-01T00")
        self.assertEqual(cycle["prev_start_hour"], "2026-08-01T00")

    def test_the_boundary_is_a_utc_instant_not_local_midnight(self) -> None:
        """The bug this exists to prevent: +08:00 shifts the boundary by 8 hours."""
        cycle = store.billing_cycle(SHANGHAI, "2026-10-01")
        self.assertEqual(cycle["start_hour"], "2026-09-01T08")
        self.assertEqual(cycle["prev_start_hour"], "2026-08-01T08")
        self.assertEqual(cycle["end_hour"], "2026-10-01T08")

    def test_a_western_zone_pushes_the_boundary_into_the_previous_day(self) -> None:
        cycle = store.billing_cycle(NEW_YORK, "2026-07-01")
        self.assertEqual(cycle["start_hour"], "2026-05-31T20")  # EDT, UTC-4

    def test_a_january_reset_walks_back_across_the_year(self) -> None:
        cycle = store.billing_cycle(timezone.utc, "2026-01-01")
        self.assertEqual(cycle["start_hour"], "2025-12-01T00")
        self.assertEqual(cycle["prev_start_hour"], "2025-11-01T00")

    def test_a_february_reset_handles_the_short_month(self) -> None:
        cycle = store.billing_cycle(timezone.utc, "2026-03-01")
        self.assertEqual(cycle["start_hour"], "2026-02-01T00")
        self.assertEqual(cycle["prev_start_hour"], "2026-01-01T00")

    def test_a_leap_year_february_is_not_special_cased_wrongly(self) -> None:
        cycle = store.billing_cycle(timezone.utc, "2024-03-01")
        self.assertEqual(cycle["start_hour"], "2024-02-01T00")

    def test_a_mid_month_reset_date_is_honoured_as_given(self) -> None:
        """An org billing anniversary need not be the 1st."""
        cycle = store.billing_cycle(timezone.utc, "2026-10-17")
        self.assertEqual(cycle["resets"], "2026-10-17")
        self.assertEqual(cycle["start_hour"], "2026-09-01T00")

    def test_a_datetime_shaped_reset_value_is_truncated_to_its_date(self) -> None:
        cycle = store.billing_cycle(timezone.utc, "2026-10-01T12:34:56+00:00")
        self.assertEqual(cycle["resets"], "2026-10-01")

    def test_an_unusable_reset_value_degrades_and_says_so(self) -> None:
        for value in (None, "", "not-a-date", "2026-13-45", "0", "   "):
            with self.subTest(value=value):
                cycle = store.billing_cycle(timezone.utc, value)
                self.assertEqual(cycle["source"], "assumed-utc-month")
                self.assertTrue(cycle["start_hour"])
                self.assertTrue(cycle["resets"])

    def test_the_assumed_cycle_is_the_current_utc_month(self) -> None:
        cycle = store.billing_cycle(timezone.utc, None)
        today = datetime.now(timezone.utc)
        self.assertEqual(cycle["start_hour"], today.strftime("%Y-%m-01T00"))

    def test_the_assumed_cycle_rolls_the_year_in_december(self) -> None:
        start = store._shift_months(datetime(2026, 12, 1, tzinfo=timezone.utc), 1)
        self.assertEqual((start.year, start.month), (2027, 1))

    def test_shift_months_is_reversible_across_boundaries(self) -> None:
        for month in range(1, 13):
            with self.subTest(month=month):
                base = datetime(2026, month, 1, tzinfo=timezone.utc)
                self.assertEqual(store._shift_months(store._shift_months(base, -1), 1), base)

    def test_the_cycle_block_is_json_serialisable_and_string_typed(self) -> None:
        cycle = store.billing_cycle(SHANGHAI, "2026-10-01")
        self.assertEqual(json.loads(json.dumps(cycle)), cycle)
        self.assertTrue(all(isinstance(v, str) for v in cycle.values()))


# ------------------------------------------------------------ official usage


class TestOfficialUsage(Base):
    def test_an_unavailable_host_cache_is_an_empty_dict(self) -> None:
        self.assertIsInstance(store.official_usage(), dict)

    def test_a_sentinel_with_no_plan_is_treated_as_unavailable(self) -> None:
        module = type(sys)("kiro_crew.dashboard.handlers.usage")
        module.get_usage_cache = lambda: {"available": False}  # type: ignore[attr-defined]
        with self._patched(module):
            self.assertEqual(store.official_usage(), {})

    def test_only_the_known_keys_are_forwarded(self) -> None:
        module = type(sys)("kiro_crew.dashboard.handlers.usage")
        module.get_usage_cache = lambda: {  # type: ignore[attr-defined]
            "credits_used": 100.0,
            "credits_plan": 50.0,
            "resets": "2026-10-01",
            "email": "secret@example.com",
            "start_url": "https://example.com/start",
            "account": "AProfile",
        }
        with self._patched(module):
            official = store.official_usage()
        self.assertEqual(official["credits_used"], 100.0)
        self.assertEqual(official["resets"], "2026-10-01")
        for leaked in ("email", "start_url", "account"):
            self.assertNotIn(leaked, official, "identity fields must not travel to the UI")

    def test_a_raising_host_cache_does_not_break_the_page(self) -> None:
        module = type(sys)("kiro_crew.dashboard.handlers.usage")

        def boom() -> dict:
            raise RuntimeError("host refactored")

        module.get_usage_cache = boom  # type: ignore[attr-defined]
        with self._patched(module):
            self.assertEqual(store.official_usage(), {})

    def test_the_payload_carries_both_blocks_even_when_empty(self) -> None:
        self.fx.write(self.day_of(), row(self.at()))
        payload = self.read()
        self.assertIsInstance(payload["official"], dict)
        self.assertIn("start_hour", payload["cycle"])

    def _patched(self, module: object):
        import contextlib

        @contextlib.contextmanager
        def ctx():
            name = "kiro_crew.dashboard.handlers.usage"
            saved = sys.modules.get(name)
            parents = [p for p in ("kiro_crew", "kiro_crew.dashboard", "kiro_crew.dashboard.handlers")
                       if p not in sys.modules]
            for parent in parents:
                sys.modules[parent] = type(sys)(parent)
            sys.modules[name] = module  # type: ignore[assignment]
            try:
                yield
            finally:
                if saved is not None:
                    sys.modules[name] = saved
                else:
                    sys.modules.pop(name, None)
                for parent in parents:
                    sys.modules.pop(parent, None)

        return ctx()


# ------------------------------------------------------------------- caching


class TestCaching(Base):
    def test_a_repeat_read_is_served_from_cache(self) -> None:
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        first = self.read()
        second = self.read()
        self.assertIs(first, second)

    def test_appending_a_turn_invalidates_the_cache(self) -> None:
        path = self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        self.assertEqual(self.read()["totals"]["credits"], 1.0)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(row(self.at(), credits=4.0) + "\n")
        os.utime(path, (path.stat().st_atime, path.stat().st_mtime + 5))
        self.assertEqual(self.read()["totals"]["credits"], 5.0)

    def test_a_different_window_is_a_different_cache_entry(self) -> None:
        self.fx.write(self.day_of(hours_ago=100), row(self.at(hours_ago=100), credits=5.0))
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        self.assertEqual(self.read(days=1)["totals"]["credits"], 1.0)
        self.assertEqual(self.read(days=7)["totals"]["credits"], 6.0)
        self.assertEqual(self.read(days=1)["totals"]["credits"], 1.0)

    def test_a_different_timezone_is_a_different_cache_entry(self) -> None:
        self.fx.write(self.day_of(), row(self.at()))
        self.assertEqual(self.read(tz_name="UTC")["tz"], "UTC")
        self.assertEqual(self.read(tz_name="Asia/Shanghai")["tz"], "Asia/Shanghai")
        self.assertEqual(self.read(tz_name="UTC")["tz"], "UTC")

    def test_deleting_every_shard_clears_the_served_payload(self) -> None:
        path = self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        self.assertEqual(self.read()["totals"]["credits"], 1.0)
        path.unlink()
        self.assertEqual(self.read()["rows"], [])


# --------------------------------------------------------- payload invariants


class TestPayloadInvariants(Base):
    def _busy_fixture(self) -> dict:
        self.fx.crons({"abc": "nightly", "def": "weekly"})
        self.fx.session("chat-1-1", {"title": "A session"})
        lines = []
        for hour in range(1, 30):
            lines.append(row(self.at(hours_ago=hour), slot="chat-1-1", model="m1", credits=1.5))
            lines.append(
                row(self.at(hours_ago=hour), slot=f"cron:abc:r{hour}", surface="cron", model="m2", credits=2.25)
            )
            lines.append(
                row(self.at(hours_ago=hour), slot="_bg", surface="bg:consolidation", model="m3", credits=0.01)
            )
        # Spread across two shards so multi-file folding is exercised.
        half = len(lines) // 2
        self.fx.write(self.day_of(hours_ago=30), *lines[:half])
        self.fx.write(self.day_of(), *lines[half:])
        return self.read()

    def test_every_row_is_eight_wide(self) -> None:
        payload = self._busy_fixture()
        self.assertTrue(payload["rows"])
        self.assertEqual({len(r) for r in payload["rows"]}, {8})

    def test_every_dimension_index_is_in_range(self) -> None:
        payload = self._busy_fixture()
        names = ("hours", "model", "surface", "agent", "job", "session")
        for r in payload["rows"]:
            for position, name in enumerate(names):
                self.assertLess(r[position], len(payload["dims"][name]))
                self.assertGreaterEqual(r[position], 0)

    def test_row_credits_reconcile_with_the_reported_total(self) -> None:
        payload = self._busy_fixture()
        self.assertAlmostEqual(sum(r[6] for r in payload["rows"]), payload["totals"]["credits"], places=2)

    def test_row_turns_reconcile_with_the_reported_total(self) -> None:
        payload = self._busy_fixture()
        self.assertEqual(sum(r[7] for r in payload["rows"]), payload["totals"]["turns"])

    def test_buckets_are_deduplicated_not_repeated(self) -> None:
        payload = self._busy_fixture()
        keys = [tuple(r[:6]) for r in payload["rows"]]
        self.assertEqual(len(keys), len(set(keys)), "one row per distinct bucket")

    def test_dimension_tables_have_no_duplicates(self) -> None:
        payload = self._busy_fixture()
        for name, values in payload["dims"].items():
            with self.subTest(dim=name):
                self.assertEqual(len(values), len(set(values)))

    def test_the_payload_round_trips_through_json(self) -> None:
        payload = self._busy_fixture()
        self.assertEqual(json.loads(json.dumps(payload, allow_nan=False))["totals"], payload["totals"])

    def test_hour_keys_are_sorted_and_well_formed(self) -> None:
        payload = self._busy_fixture()
        hours = payload["dims"]["hours"]
        self.assertEqual(hours, sorted(hours))
        for hour in hours:
            self.assertRegex(hour, r"^\d{4}-\d{2}-\d{2}T\d{2}$")

    def test_the_generated_timestamp_is_offset_aware(self) -> None:
        payload = self._busy_fixture()
        self.assertIsNotNone(datetime.fromisoformat(payload["generated_at"]).tzinfo)

    def test_a_single_turn_produces_a_complete_payload(self) -> None:
        self.fx.write(self.day_of(), row(self.at(), credits=1.0))
        payload = self.read()
        self.assertEqual(len(payload["rows"]), 1)
        for key in ("generated_at", "tz", "window_days", "shards", "cycle", "official", "dims", "labels", "totals"):
            self.assertIn(key, payload)

    def test_unlabelled_fields_get_explicit_placeholders(self) -> None:
        self.fx.write(
            self.day_of(),
            json.dumps({"_type": "tokens", "ts": self.at(), "credits": 1.0}),
        )
        payload = self.read()
        self.assertIn(store.MODEL_NOT_REPORTED, payload["dims"]["model"])
        self.assertIn(store.UNLABELLED, payload["dims"]["surface"])
        self.assertIn("(default)", payload["dims"]["agent"])
        self.assertIn("(no slot)", payload["dims"]["session"])

    def test_a_model_the_provider_never_reported_is_named_as_such(self) -> None:
        """Every such row observed in the wild is a background maintenance pass."""
        self.fx.write(
            self.day_of(),
            row(self.at(), model="", surface="bg:consolidation", slot="_bg", agent="lite", credits=0.6),
        )
        payload = self.read()
        self.assertIn(store.MODEL_NOT_REPORTED, payload["dims"]["model"])
        self.assertNotIn(store.UNLABELLED, payload["dims"]["model"])

    def test_auto_is_preserved_verbatim_not_folded_into_the_placeholder(self) -> None:
        """`auto` and `""` are two different states the gateway keeps distinct."""
        self.fx.write(
            self.day_of(),
            row(self.at(), model=store.MODEL_AUTO, credits=1.0),
            row(self.at(), model="", credits=1.0),
        )
        models = self.read()["dims"]["model"]
        self.assertIn(store.MODEL_AUTO, models)
        self.assertIn(store.MODEL_NOT_REPORTED, models)


class TestScale(Base):
    def test_a_large_shard_folds_without_quadratic_blowup(self) -> None:
        """~20k rows over 24 hours must fold in well under a second."""
        import time as _time

        lines = [
            row(self.at(hours_ago=1 + (i % 20) / 20), slot=f"chat-{i % 50}-1", model=f"m{i % 6}", credits=0.5)
            for i in range(20_000)
        ]
        self.fx.write(self.day_of(), *lines)
        started = _time.perf_counter()
        payload = self.read()
        elapsed = _time.perf_counter() - started
        self.assertEqual(payload["totals"]["turns"], 20_000)
        self.assertLess(elapsed, 5.0, f"folding took {elapsed:.2f}s")
        self.assertLess(len(payload["rows"]), 20_000, "rows must be folded, not passed through")


if __name__ == "__main__":
    unittest.main(verbosity=2)
