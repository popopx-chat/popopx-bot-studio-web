#!/usr/bin/env python3
"""Regenerate assets/js/i18n.js from the two committed string sources.

    python3 tools/sync_i18n.py              # write i18n.js
    python3 tools/sync_i18n.py --check      # fail if i18n.js is stale
    python3 tools/sync_i18n.py --adopt      # merge tools/incoming/*.json into site-strings.json
    python3 tools/sync_i18n.py --snapshot   # refresh the engine copy from ../popopx-bot-studio

Two sources, one artifact:

* ``tools/shared-catalog.json`` — the keys this site shares with the engine catalog
  ``studio/app/i18n.py`` (``_SITE`` / ``_ADMIN``). They are copied byte for byte so the
  website and the admin console can never disagree about what "routing" or "ticket"
  means. When the sibling engine checkout exists it wins and drift is reported.
* ``tools/site-strings.json`` — the website-only keys. Its ``en`` node is derived from the
  markup in ``index.html``, so the English dictionary and the HTML default text stay equal.

``assets/js/i18n.js`` is generated output. Edit the JSON, not the JS.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "tools" / "shared-catalog.json"
STRINGS = ROOT / "tools" / "site-strings.json"
INCOMING = ROOT / "tools" / "incoming"
HTML = ROOT / "index.html"
OUT = ROOT / "assets" / "js" / "i18n.js"

# LOCALE_LABELS feeds the language <select>, so every entry has to be a language
# name. The engine's Thai entry carries a welcome string instead (a paste
# accident in studio/app/i18n.py), which would render as nonsense in the menu,
# so the site corrects it locally and keeps the rest byte-aligned with the
# engine. Remove this once the engine ships the real name.
LABEL_FIXES = {"th": "ไทย"}


def site_labels(labels: dict) -> dict:
    fixed = dict(labels)
    for code, value in LABEL_FIXES.items():
        if code in fixed and fixed[code] != value:
            print(f"sync_i18n: NOTE label {code} is not a language name in the engine "
                  f"({fixed[code][:24]!r}); using {value!r}")
            fixed[code] = value
    return fixed

ENGINE_CANDIDATES = [
    Path(os.environ.get("BOT_STUDIO_ENGINE", "")) if os.environ.get("BOT_STUDIO_ENGINE") else None,
    ROOT.parent / "popopx-bot-studio" / "studio" / "app" / "i18n.py",
]

EXPECTED_LOCALES = [
    "en", "zh-Hans", "zh-Hant", "ja", "ar", "bg", "cs", "de", "es", "fi",
    "fr", "hu", "it", "ko", "nl", "pl", "pt-BR", "ru", "th", "tr", "uk",
]


def fail(message: str) -> "None":
    print(f"sync_i18n: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    if not path.is_file():
        fail(f"missing {path.relative_to(ROOT)}")
    return json.loads(path.read_text(encoding="utf-8"))


def engine_module() -> object | None:
    for candidate in ENGINE_CANDIDATES:
        if candidate and candidate.is_file():
            spec = importlib.util.spec_from_file_location("popopx_engine_i18n", candidate)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
    return None


def html_markup() -> str:
    return HTML.read_text(encoding="utf-8")


def markup_keys() -> list:
    seen = []
    for key in re.findall(r'\bdata-i18n(?:-meta|-aria-label|-label|-placeholder)?="([a-z0-9_]+)"', html_markup()):
        if key not in seen:
            seen.append(key)
    return seen


def adopt_incoming(strings: dict) -> int:
    moved = 0
    if not INCOMING.is_dir():
        return 0
    for path in sorted(INCOMING.glob("*.json")):
        locale = path.stem
        if locale not in strings["locales"]:
            fail(f"{path.name}: {locale} is not one of the {len(strings['locales'])} supported locales")
        payload = json.loads(path.read_text(encoding="utf-8"))
        want = set(strings["keys"])
        got = set(payload)
        if want != got:
            missing = sorted(want - got)
            extra = sorted(got - want)
            print(f"{locale}: missing {len(missing)} {missing[:12]}")
            print(f"{locale}: extra  {len(extra)} {extra[:12]}")
            fail(f"{path.name} does not cover exactly the {len(want)} website keys")
        blank = sorted(k for k, v in payload.items() if not str(v).strip())
        if blank:
            fail(f"{path.name}: empty values for {blank[:10]}")
        strings["strings"][locale] = {k: payload[k] for k in strings["keys"]}
        moved += 1
    return moved


def snapshot_keys(snapshot: dict, locales: list) -> dict:
    """Locale-major view of the committed snapshot: {locale: {key: value}}."""
    out = {locale: {} for locale in locales}
    for key, block in snapshot["keys"].items():
        for locale in locales:
            if locale not in block:
                fail(f"shared key {key} has no {locale} value in the snapshot")
            out[locale][key] = block[locale]
    return out


def build_shared(strings: dict, locales: list) -> dict:
    """Return the engine-owned keys, locale-major, plus labels, aliases and provenance."""
    snapshot = load_json(SHARED)
    engine = engine_module()
    catalog_of = snapshot["catalog"]

    if engine is None:
        return {"origin": "snapshot (no popopx-bot-studio checkout next to this repo)",
                "keys": snapshot_keys(snapshot, locales), "labels": site_labels(snapshot["source"]["labels"]),
                "aliases": snapshot["source"]["aliases"], "rtl": snapshot["source"].get("rtl", []),
                "shared_names": sorted(snapshot["keys"])}

    live = {locale: {} for locale in locales}
    drift = []
    for key, name in catalog_of.items():
        table = engine._SITE if name == "SITE" else engine._ADMIN
        for locale in locales:
            if locale not in table:
                fail(f"engine has no {locale} catalog")
            value = table[locale].get(key)
            if value is None:
                fail(f"engine catalog {name} lacks key {key} for {locale}")
            live[locale][key] = value
            if snapshot["keys"].get(key, {}).get(locale) != value:
                drift.append(f"{key}/{locale}")
    origin = f"live engine {engine.__file__}"
    if drift:
        print(f"sync_i18n: WARNING engine copy drifted for {len(drift)} cell(s): {drift[:8]}")
        print("           run tools/sync_i18n.py --snapshot to adopt the engine wording")
    for tag, value in sorted(engine._TAG_ALIASES.items()):
        if snapshot["source"]["aliases"].get(tag) != value:
            print(f"sync_i18n: WARNING alias {tag} differs from the engine ({value})")
    return {"origin": origin, "keys": live, "labels": site_labels(engine.LOCALE_LABELS),
            "aliases": engine._TAG_ALIASES, "rtl": list(engine.RTL_LOCALES),
            "shared_names": sorted(catalog_of)}


def snapshot_engine(strings: dict, locales: list) -> None:
    engine = engine_module()
    if engine is None:
        fail("--snapshot needs a popopx-bot-studio checkout next to this repository")
    used = set(markup_keys())
    keys = {}
    catalog_of = {}
    for name, table in (("SITE", engine._SITE), ("ADMIN", engine._ADMIN)):
        for key in table["en"]:
            if key in used and key not in catalog_of:
                catalog_of[key] = name
                keys[key] = {locale: table[locale][key] for locale in locales}
    payload = {
        "_comment": ("Byte-exact copy of the keys this website shares with the engine catalog "
                     "studio/app/i18n.py (_SITE/_ADMIN). Refresh with tools/sync_i18n.py --snapshot."),
        "source": {
            "repo": "https://github.com/popopx-chat/popopx-bot-studio",
            "file": "studio/app/i18n.py",
            "sha256": hashlib.sha256(Path(engine.__file__).read_bytes()).hexdigest(),
            "locales": list(engine.LOCALES),
            "labels": site_labels(engine.LOCALE_LABELS),
            "aliases": engine._TAG_ALIASES,
            "rtl": list(engine.RTL_LOCALES),
        },
        "catalog": catalog_of,
        "keys": keys,
    }
    SHARED.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"snapshot: wrote {len(keys)} shared keys x {len(locales)} locales from {engine.__file__}")


def merge(strings: dict, shared: dict, locales: list) -> dict:
    table = {}
    for locale in locales:
        per = dict(shared["keys"][locale])
        website = strings["strings"].get(locale)
        if website is None:
            fail(f"site-strings.json has no {locale} node")
        missing = [k for k in strings["keys"] if k not in website or not str(website[k]).strip()]
        if missing:
            fail(f"{locale}: {len(missing)} website keys missing or empty: {missing[:8]}")
        per.update({k: website[k] for k in strings["keys"]})
        table[locale] = per
    en = table["en"]
    for locale in locales:
        extra = sorted(set(table[locale]) - set(en))
        absent = sorted(set(en) - set(table[locale]))
        if extra or absent:
            fail(f"{locale}: key mismatch (+{len(extra)} / -{len(absent)}) {absent[:6]}")
    return table


def js_string(value: str) -> str:
    encoded = json.dumps(value, ensure_ascii=False)
    return encoded.replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def render(table: dict, shared: dict, strings: dict, locales: list) -> str:
    fingerprint = hashlib.sha256(
        (SHARED.read_bytes() + STRINGS.read_bytes()).decode("utf-8", "replace").encode("utf-8")
    ).hexdigest()[:16]
    lines = []
    lines.append(f"/* POPOPX Bot Studio — {len(locales)}-locale site catalog.")
    lines.append(" *")
    lines.append(f" * Generated by tools/sync_i18n.py from tools/shared-catalog.json + tools/site-strings.json")
    lines.append(f" * (fingerprint {fingerprint}). Edit the JSON sources, not this file.")
    lines.append(" * Shared keys come byte for byte from studio/app/i18n.py in popopx-bot-studio.")
    lines.append(" */")
    lines.append("(function (root) {")
    lines.append('  "use strict";')
    lines.append("")
    lines.append("  var LOCALES = [%s];" % ", ".join(js_string(locale) for locale in locales))
    lines.append("")
    lines.append("  var LABELS = {")
    lines.append(",\n".join("    %s: %s" % (js_string(code), js_string(shared["labels"][code])) for code in locales))
    lines.append("  };")
    lines.append("")
    lines.append("  var ALIASES = {")
    lines.append(",\n".join("    %s: %s" % (js_string(tag), js_string(value)) for tag, value in sorted(shared["aliases"].items())))
    lines.append("  };")
    lines.append("")
    lines.append("  var RTL = [%s];" % ", ".join(js_string(code) for code in shared["rtl"]))
    lines.append("")
    lines.append("  var DICT = {")
    for locale in locales:
        lines.append("    %s: {" % js_string(locale))
        rows = []
        for key in sorted(table[locale]):
            rows.append("      %s: %s" % (js_string(key), js_string(table[locale][key])))
        lines.append(",\n".join(rows))
        lines.append("    },")
    lines.append("  };")
    lines.append("")
    lines.append("  var catalog = {")
    lines.append('    fallback: "en",')
    lines.append("    locales: LOCALES,")
    lines.append("    labels: LABELS,")
    lines.append("    aliases: ALIASES,")
    lines.append("    rtl: RTL,")
    lines.append("    dict: DICT,")
    lines.append("    sharedKeys: %s," % json.dumps(sorted(shared["shared_names"]), ensure_ascii=False))
    lines.append("    siteKeys: %s" % json.dumps(strings["keys"], ensure_ascii=False))
    lines.append("  };")
    lines.append("")
    lines.append("  root.POPOPX_I18N = catalog;")
    lines.append('  if (typeof module !== "undefined" && module.exports) { module.exports = catalog; }')
    lines.append("})(typeof globalThis !== \"undefined\" ? globalThis : this);")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    strings = load_json(STRINGS)
    locales = strings["locales"]
    if locales != EXPECTED_LOCALES:
        fail(f"locale list must be the {len(EXPECTED_LOCALES)} engine-aligned tags, got {locales}")

    if mode == "--snapshot":
        snapshot_engine(strings, locales)
        return 0

    if mode == "--adopt":
        moved = adopt_incoming(strings)
        if moved:
            STRINGS.write_text(json.dumps(strings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"adopt: merged {moved} locale file(s) into site-strings.json")

    shared = build_shared(strings, locales)
    table = merge(strings, shared, locales)
    text = render(table, shared, strings, locales)

    if mode == "--check":
        if not OUT.is_file() or OUT.read_text(encoding="utf-8") != text:
            fail("assets/js/i18n.js is stale; run python3 tools/sync_i18n.py")
        print(f"check: i18n.js is current ({len(table)} locales x {len(table['en'])} keys)")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(locales)} locales x {len(table['en'])} keys "
          f"({len(shared['shared_names'])} shared + {len(strings['keys'])} site) · {len(text)} bytes")
    print(f"engine source: {shared['origin']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
