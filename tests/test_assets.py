"""Tests for the shipped assets — the icon, the manifest, and the registry index.

These are the files the dashboard loads directly rather than through any code of
ours, so nothing else would catch a defect in them. The icon in particular fails
SILENTLY: a browser renders a malformed SVG as a broken-image placeholder, so a
stray pair of hyphens inside an XML comment costs the app its icon with no error
anywhere.

    python3 -m unittest discover -s tests
"""

from __future__ import annotations

import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / "ui" / "icon.svg"
MANIFEST = ROOT / "app.json"
REGISTRY = ROOT / "app-registry.json"

# The two colours the icon is allowed to use: the neutral grey the other
# third-party app icon uses, and the Kiro accent purple the first-party icons get
# from the theme's accent token.
GREY = "#737A8C"
PURPLE = "#8E48FF"


class TestIcon(unittest.TestCase):
    def setUp(self) -> None:
        self.text = ICON.read_text(encoding="utf-8")

    def test_the_icon_is_well_formed_xml(self) -> None:
        """A malformed SVG renders as a broken-image placeholder, not an error."""
        ET.fromstring(self.text)

    def test_no_double_hyphen_inside_a_comment(self) -> None:
        """Illegal in XML, and the exact defect that once blanked the icon."""
        for comment in re.findall(r"<!--(.*?)-->", self.text, re.DOTALL):
            self.assertNotIn("--", comment, "an XML comment may not contain '--'")

    def test_it_is_an_svg_with_a_square_viewbox(self) -> None:
        root = ET.fromstring(self.text)
        self.assertTrue(root.tag.endswith("svg"))
        box = [float(n) for n in (root.get("viewBox") or "").split()]
        self.assertEqual(len(box), 4, "a viewBox is required for the icon to scale")
        self.assertEqual(box[2], box[3], "the icon must be square")

    def test_it_carries_an_accessible_label(self) -> None:
        root = ET.fromstring(self.text)
        self.assertEqual(root.get("role"), "img")
        self.assertTrue((root.get("aria-label") or "").strip())

    def test_no_colour_that_cannot_survive_an_img_element(self) -> None:
        """`currentColor` and CSS tokens resolve to black inside an <img>."""
        body = re.sub(r"<!--.*?-->", "", self.text, flags=re.DOTALL)
        self.assertNotIn("currentColor", body)
        self.assertNotIn("var(", body)

    def test_it_uses_grey_for_structure_and_purple_for_the_data(self) -> None:
        body = re.sub(r"<!--.*?-->", "", self.text, flags=re.DOTALL)
        used = set(re.findall(r"#[0-9A-Fa-f]{6}", body))
        self.assertEqual(used, {GREY, PURPLE}, f"unexpected palette: {sorted(used)}")
        root = ET.fromstring(self.text)
        bars = [
            el for el in root.iter()
            if el.tag.endswith("path") and (el.get("d") or "").count("M") >= 3
        ]
        self.assertTrue(bars, "expected one path holding the bars")
        self.assertEqual(bars[0].get("stroke"), PURPLE, "the bars carry the accent")

    def test_it_stays_small_enough_to_inline(self) -> None:
        self.assertLess(ICON.stat().st_size, 4096)


class TestManifest(unittest.TestCase):
    def setUp(self) -> None:
        self.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def test_required_fields_are_present(self) -> None:
        for field in ("name", "version", "displayName", "description"):
            self.assertTrue(self.manifest.get(field), f"missing {field}")

    def test_every_declared_path_exists(self) -> None:
        entry = self.manifest.get("ui", {}).get("entry")
        if entry:
            self.assertTrue((ROOT / "ui" / entry).is_file(), f"ui.entry {entry} missing")
        for key in ("iconPath", "iconPathDark"):
            value = self.manifest.get(key)
            if value:
                self.assertTrue((ROOT / value).is_file(), f"{key} {value} missing")
        for shot in self.manifest.get("screenshots", []):
            self.assertTrue((ROOT / shot).is_file(), f"screenshot {shot} missing")

    def test_page_icons_resolve_under_ui(self) -> None:
        for page in self.manifest.get("ui", {}).get("pages", []):
            self.assertTrue(page.get("route"), "ui page missing route")
            self.assertTrue(page.get("label"), "ui page missing label")
            icon = page.get("iconUrl")
            if icon and not icon.startswith(("http", "/")):
                self.assertTrue((ROOT / "ui" / icon).is_file(), f"page icon {icon} missing")

    def test_the_backend_hook_points_at_a_real_function(self) -> None:
        hook = self.manifest.get("backend", {}).get("hooks", {}).get("routes", "")
        self.assertTrue(hook, "the app declares a routes hook")
        module, _, function = hook.partition(":")
        path = ROOT / (module.replace(".", "/") + ".py")
        self.assertTrue(path.is_file(), f"{path} missing")
        self.assertIn(f"def {function}", path.read_text(encoding="utf-8"))

    def test_it_declares_no_permission_it_does_not_need(self) -> None:
        permissions = self.manifest.get("permissions", {})
        for capability in ("storage", "cron", "network", "spawn", "jobs"):
            self.assertFalse(permissions.get(capability), f"{capability} must stay off")

    def test_the_registry_index_matches_the_manifest(self) -> None:
        entries = json.loads(REGISTRY.read_text(encoding="utf-8"))
        self.assertIsInstance(entries, list)
        self.assertTrue(entries)
        for entry in entries:
            for field in ("name", "gitUrl", "branch"):
                self.assertTrue(entry.get(field), f"registry entry missing {field}")
            self.assertEqual(entry["name"], self.manifest["name"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
