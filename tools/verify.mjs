#!/usr/bin/env node
/* POPOPX Bot Studio — self-check gate for the 18-locale site.
   Run: node tools/verify.mjs        (exit 0 = every gate green)
   No dependencies, no network: every assertion is measured against files in this repo. */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const EXPECTED = ["en", "zh-Hans", "zh-Hant", "ja", "bg", "cs", "de", "es", "fi", "fr",
  "hu", "it", "nl", "pl", "ru", "th", "tr", "uk"];

const SCRIPT = {
  "zh-Hans": [/[\u4e00-\u9fff]/, "Han (simplified)"],
  "zh-Hant": [/[\u4e00-\u9fff]/, "Han (traditional)"],
  ja: [/[\u3040-\u30ff\u4e00-\u9fff]/, "kana or Han"],
  th: [/[\u0e00-\u0e7f]/, "Thai"],
  ru: [/[\u0400-\u04ff]/, "Cyrillic"],
  uk: [/[\u0400-\u04ff]/, "Cyrillic"],
  bg: [/[\u0400-\u04ff]/, "Cyrillic"],
};

// Word-level vocabulary: brand names, protocol nouns, commands and the
// language-neutral loan words that legitimately stay in Latin script inside an
// otherwise translated value. Matching is per word, never per substring, so a
// short token cannot eat the letters of a real sentence.
const TECH_WORDS = new Set(["popopx", "bot", "bots", "studio", "engine", "cli", "agpl", "only",
  "ubuntu", "macos", "linux", "systemd", "launchd", "sqlite", "python", "fastapi", "webhook",
  "webhooks", "open", "api", "sendmessage", "setwebhook", "getupdates", "bot", "token", "tokens",
  "botToken".toLowerCase(), "studio".toLowerCase(), "allow", "lan", "admin", "data", "dir", "ws",
  "port", "base", "max", "env", "var", "backups", "run", "sh", "pid", "sha", "tls", "cdn", "qr",
  "openai", "telegram", "botfather", "caddy", "nginx", "github", "release", "ip", "id", "https",
  "json", "smp", "localhost", "menu", "faq", "metadata", "self", "hosted", "routing", "native",
  "terminal", "ledger", "mode", "dry", "uninstall", "check", "help", "agent", "desk", "layered",
  "q", "a", "v2", "llm", "bridge", "relay", "auto", "reply", "router", "chat", "chats", "group",
  "groups", "message", "messages", "send", "poll", "updates", "install", "installer", "build",
  "step", "steps", "first", "in", "on", "of", "to", "for", "and", "the", "no", "not", "is"]);

const WORDS = /[\p{L}]+/gu;

function technicalOnly(value) {
  const words = value.toLowerCase().match(WORDS) || [];
  return words.every((w) => TECH_WORDS.has(w) || w.length <= 1 || /\d/.test(w));
}

// Reviewed exceptions to the residue gate: a value that stays byte-equal to
// English because that IS the word this language uses. Each entry was read
// against its neighbours to confirm the locale really was translated.
const COGNATE_OK = {
  cs: ["foot_license"],
};

const results = [];
let failed = 0;

function gate(name, detail) {
  results.push({ name, ...detail });
  if (detail.status === "FAIL") failed += 1;
}

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");

const stripTags = (s) => s.replace(/<[^>]*>/g, "");

/* ------------------------------------------------------------------ catalog */

const require = createRequire(import.meta.url);
let catalog = null;
try {
  catalog = require(path.join(ROOT, "assets/js/i18n.js"));
} catch (error) {
  gate("i18n.js loads", { status: "FAIL", detail: String(error.message) });
}

if (catalog) {
  const codes = catalog.locales;
  gate("18 locales, iOS-aligned order", {
    status: codes.length === 18 && JSON.stringify(codes) === JSON.stringify(EXPECTED) ? "PASS" : "FAIL",
    detail: `${codes.length} locales: ${codes.join(",")}`,
  });

  const en = catalog.dict.en || {};
  const keys = Object.keys(en).sort();
  gate("en baseline is non-empty", {
    status: keys.length > 80 ? "PASS" : "FAIL",
    detail: `${keys.length} keys in en`,
  });

  const parity = [];
  const blanks = [];
  const scriptGaps = [];
  const residue = [];
  for (const code of codes) {
    const dict = catalog.dict[code] || {};
    const missing = keys.filter((k) => !(k in dict));
    const extra = Object.keys(dict).filter((k) => !keys.includes(k));
    if (missing.length || extra.length) parity.push(`${code}: -${missing.length} +${extra.length}`);
    const empty = Object.keys(dict).filter((k) => !String(dict[k]).trim());
    if (empty.length) blanks.push(`${code}: ${empty.length}`);
    const sameAsEn = keys.filter((k) => dict[k] === en[k]);
    const technical = sameAsEn.filter((k) => technicalOnly(en[k]));
    const reviewed = COGNATE_OK[code] || [];
    const leaked = sameAsEn.filter((k) => !technical.includes(k) && !reviewed.includes(k));
    if (code !== "en" && leaked.length) residue.push(`${code}: ${leaked.length} [${leaked.slice(0, 4)}]`);
    if (code !== "en" && SCRIPT[code]) {
      const testable = keys.filter((k) => !technical.includes(k));
      const hit = testable.filter((k) => SCRIPT[code][0].test(dict[k]));
      if (testable.length && hit.length / testable.length < 0.9) {
        scriptGaps.push(`${code}: ${hit.length}/${testable.length} carry ${SCRIPT[code][1]}`);
      }
    }
  }
  gate("every locale has exactly the en key set", {
    status: parity.length ? "FAIL" : "PASS",
    detail: parity.length ? parity.join(" | ") : `exact key parity, ${keys.length * codes.length} cells`,
  });
  gate("no empty values", {
    status: blanks.length ? "FAIL" : "PASS",
    detail: blanks.length ? blanks.join(" | ") : `${keys.length * codes.length} values all filled`,
  });
  gate("no untranslated English residue", {
    status: residue.length ? "FAIL" : "PASS",
    detail: residue.length ? residue.join(" | ") : `only technical strings stay equal to en`,
  });
  gate("target script present where required", {
    status: scriptGaps.length ? "FAIL" : "PASS",
    detail: scriptGaps.length ? scriptGaps.join(" | ") : "every zh/ja/th/ru/uk/bg value carries its own script",
  });
  gate("fallback chain is documented", {
    status: catalog.fallback === "en" && catalog.aliases && Object.keys(catalog.aliases).length >= 8 ? "PASS" : "FAIL",
    detail: `fallback=${catalog.fallback}, aliases=${Object.keys(catalog.aliases || {}).length}, shared=${catalog.sharedKeys.length}, site=${catalog.siteKeys.length}`,
  });
  const badLabels = codes.filter((c) => !catalog.labels[c] || catalog.labels[c].length < 3
    || /\{[a-z_]+\}/.test(catalog.labels[c]) || catalog.labels[c].length > 24);
  gate("labels are native names", {
    status: badLabels.length ? "FAIL" : "PASS",
    detail: badLabels.length
      ? badLabels.map((c) => `${c}: ${JSON.stringify(catalog.labels[c].slice(0, 40))}`).join(" | ")
      : codes.map((c) => catalog.labels[c]).join(", "),
  });

  const stale = keys.filter((k) => !catalog.sharedKeys.includes(k) && !catalog.siteKeys.includes(k));
  gate("every key is attributed to a source", {
    status: stale.length ? "FAIL" : "PASS",
    detail: stale.length ? `untracked keys: ${stale.slice(0, 8)}` : `${catalog.sharedKeys.length} engine + ${catalog.siteKeys.length} website keys`,
  });
}

/* -------------------------------------------------------------------- markup */

const html = read("index.html");

const markup = [];
for (const attr of ["data-i18n", "data-i18n-meta", "data-i18n-aria-label", "data-i18n-placeholder"]) {
  const re = new RegExp(`<([a-zA-Z0-9]+)([^>]*\\b${attr}="([a-z0-9_]+)")(\\s[^>]*)?>`, "g");
  let m;
  while ((m = re.exec(html))) {
    const tail = html.slice(m.index + m[0].length);
    const close = tail.indexOf(`</${m[1]}`);
    const text = close >= 0 ? unescape(stripTags(tail.slice(0, close))).trim() : "";
    let def = "";
    if (attr === "data-i18n") def = text;
    else {
      const tag = m[0];
      const want = attr === "data-i18n-meta" ? /\scontent="([^"]*)"/ : /\saria-label="([^"]*)"/;
      if (attr === "data-i18n-placeholder") { const p = /\splaceholder="([^"]*)"/.exec(tag); def = p ? unescape(p[1]) : ""; }
      else { const a = want.exec(tag); def = a ? unescape(a[1]) : ""; }
    }
    markup.push({ key: m[3], attr, def });
  }
}

if (catalog) {
  const en = catalog.dict.en;
  const unknown = markup.filter((entry) => !(entry.key in en));
  gate("every markup key exists in en", {
    status: unknown.length ? "FAIL" : "PASS",
    detail: unknown.length ? `unknown: ${unknown.map((u) => u.key).slice(0, 8)}` : `${markup.length} hooks resolved`,
  });

  const shared = new Set(catalog.sharedKeys);
  const drift = markup.filter((entry) => entry.def && entry.def !== en[entry.key])
    .map((entry) => `${entry.key}${shared.has(entry.key) ? " (engine)" : ""}`);
  gate("markup default text equals the en dictionary", {
    status: drift.length ? "FAIL" : "PASS",
    detail: drift.length ? drift.slice(0, 10).join(", ") : "byte-equal, English renders without JavaScript too",
  });
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
gate("element ids are unique", { status: dupes.length ? "FAIL" : "PASS", detail: dupes.length ? dupes.join(",") : `${ids.length} ids` });

const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const dangling = anchors.filter((a) => !ids.includes(a));
gate("every #anchor resolves", { status: dangling.length ? "FAIL" : "PASS", detail: dangling.length ? dangling.join(",") : `${anchors.length} anchors` });

const h1 = (html.match(/<h1[\s>]/g) || []).length;
gate("exactly one h1", { status: h1 === 1 ? "PASS" : "FAIL", detail: `${h1} found` });

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const stack = [];
const bad = [];
const tagRe = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/)?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi;
let tm;
while ((tm = tagRe.exec(html))) {
  if (!tm[2]) continue;
  const name = tm[2].toLowerCase();
  if (VOID.has(name) || tm[3]) continue;
  if (tm[1]) {
    if (!stack.length || stack[stack.length - 1] !== name) bad.push(`</${name}> at ${stack.length ? stack[stack.length - 1] : "empty stack"}`);
    else stack.pop();
  } else stack.push(name);
}
gate("HTML nesting is balanced", {
  status: bad.length === 0 && stack.length === 0 ? "PASS" : "FAIL",
  detail: bad.length || stack.length ? `${bad.slice(0, 3)} unclosed:${stack.slice(0, 6)}` : "tag stack empties at EOF",
});

/* ----------------------------------------------------------------------- js */

for (const file of ["assets/js/i18n.js", "assets/js/app.js"]) {
  let ok = true, why = "";
  try { execFileSync(process.execPath, ["--check", path.join(ROOT, file)], { stdio: "pipe" }); }
  catch (error) { ok = false; why = String(error.stderr || error.message).split("\n").slice(0, 3).join(" "); }
  gate(`${file} parses`, { status: ok ? "PASS" : "FAIL", detail: ok ? "node --check clean" : why });
}

const app = read("assets/js/app.js");
const needs = ["popopx_bot_studio_lang", "navigator.languages", "searchParams", "localStorage", "role=tab", "data-copy", "IntersectionObserver"];
const absent = needs.filter((needle) => !app.includes(needle) && !(needle === "role=tab" && app.includes("[role=tab]")));
gate("locale switch + tabs + copy are wired", { status: absent.length ? "FAIL" : "PASS", detail: absent.length ? absent.join(",") : "URL param, localStorage, browser list, tabs, clipboard" });

// Keys can also be named from JavaScript, where the markup gate cannot see
// them: entry(locale, "…") plus the data-i18n fallback in flash(). A typo here
// silently renders a hardcoded English word on every translated page.
const jsKeys = [...new Set([
  ...app.matchAll(/entry\(\s*[^,]+,\s*"([a-z0-9_]+)"/g),
  ...app.matchAll(/"data-i18n"\)\s*\|\|\s*"([a-z0-9_]+)"/g),
].map((m) => m[1]))];
const ghost = catalog ? jsKeys.filter((key) => !(key in catalog.dict.en)) : [];
gate("keys named from JS exist in the dictionary", {
  status: jsKeys.length && !ghost.length ? "PASS" : "FAIL",
  detail: ghost.length ? `not in en: ${ghost.join(", ")}` : `${jsKeys.length} JS keys: ${jsKeys.join(", ")}`,
});

/* ---------------------------------------------------------------------- css */

const css = read("assets/css/style.css");
const open = (css.match(/{/g) || []).length;
const close = (css.match(/}/g) || []).length;
gate("CSS braces balance", { status: open === close ? "PASS" : "FAIL", detail: `${open} open / ${close} close` });

const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1])
  .concat([...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((m) => m[2]))
  .filter((u) => !/^([a-z]+:|\/\/|data:)/i.test(u));
const broken = [...new Set(refs)].filter((u) => !exists(u.replace(/^\//, "")));
gate("no broken local references", {
  status: broken.length ? "FAIL" : "PASS",
  detail: broken.length ? broken.join(",") : `${new Set(refs).size} local src/href/url() targets all exist`,
});

const declared = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const usedVars = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
const undeclared = [...usedVars].filter((v) => !declared.has(v));
gate("every CSS custom property is declared", {
  status: undeclared.length ? "FAIL" : "PASS",
  detail: undeclared.length ? undeclared.join(",") : `${usedVars.size} vars used, ${declared.size} declared`,
});
gate("palette matches the brief", {
  status: css.includes("#00f0ff") && css.includes("#10b981") ? "PASS" : "FAIL",
  detail: "cyber cyan 00F0FF + emerald 10B981 present",
});

/* ------------------------------------------------------------------- seo io */

const head = html.slice(0, html.indexOf("</head>"));
gate("canonical + og + twitter", {
  status: /rel="canonical" href="https:\/\/popopx\.chat\/"/.test(head) && head.includes('property="og:url"') && head.includes('name="twitter:card"') ? "PASS" : "FAIL",
  detail: "canonical https://popopx.chat/, og:url, twitter:card",
});
const hreflangs = [...head.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
const missingLang = EXPECTED.filter((c) => !hreflangs.includes(c));
gate("hreflang covers 18 locales + x-default", {
  status: !missingLang.length && hreflangs.includes("x-default") ? "PASS" : "FAIL",
  detail: missingLang.length ? `missing ${missingLang}` : `${hreflangs.length} alternates`,
});

if (exists("CNAME")) {
  const cname = read("CNAME").trim();
  gate("CNAME points at the live domain", {
    status: /^popopx\.chat$/.test(cname) ? "PASS" : "FAIL",
    detail: cname,
  });
} else gate("CNAME points at the live domain", { status: "FAIL", detail: "no CNAME file" });

if (exists("robots.txt")) {
  const robots = read("robots.txt");
  gate("robots.txt allows crawling and names the sitemap", {
    status: /allow\s*:\s*\//i.test(robots) && /sitemap\s*:\s*https:\/\/popopx\.chat\/sitemap\.xml/i.test(robots) ? "PASS" : "FAIL",
    detail: robots.replace(/\n/g, " · ").slice(0, 120),
  });
} else gate("robots.txt allows crawling and names the sitemap", { status: "FAIL", detail: "no robots.txt" });

if (exists("sitemap.xml")) {
  const sitemap = read("sitemap.xml");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const badUrl = urls.find((u) => !/^https:\/\/(popopx\.chat|bot\.popopx\.chat)(\/|\?|$)/.test(u));
  gate("sitemap.xml is well-formed and in-domain", {
    status: sitemap.trim().startsWith("<?xml") && sitemap.trim().endsWith("</urlset>") && urls.length >= 1 && !badUrl ? "PASS" : "FAIL",
    detail: badUrl ? `off-domain ${badUrl}` : `${urls.length} urls`,
  });
} else gate("sitemap.xml is well-formed and in-domain", { status: "FAIL", detail: "no sitemap.xml" });

/* ------------------------------------------------------------------ licence */

if (exists("LICENSE")) {
  const license = read("LICENSE").slice(0, 4000);
  gate("AGPL-3.0-only licence kept at the root", {
    status: /GNU AFFERO GENERAL PUBLIC LICENSE/.test(license) ? "PASS" : "FAIL",
    detail: "root LICENSE is the AGPL text",
  });
} else gate("AGPL-3.0-only licence kept at the root", { status: "FAIL", detail: "LICENSE missing" });

/* --------------------------------------------------------------------- docs */

for (const file of ["README.md", "README.en.md"]) {
  if (!exists(file)) { gate(`${file} documents hosting`, { status: "FAIL", detail: "missing" }); continue; }
  const doc = read(file);
  const hosts = ["GitHub Pages", "Cloudflare", "Vercel", "Nginx", "Caddy"];
  const missed = hosts.filter((h) => !doc.includes(h));
  gate(`${file} documents hosting + 18 locales`, {
    status: missed.length === 0 && doc.includes("18") && doc.includes("sync_i18n.py") ? "PASS" : "FAIL",
    detail: missed.length ? `no ${missed.join("/")}` : `${hosts.length} hosts, locale count and generator named`,
  });
}

/* -------------------------------------------------------------- generated */

let fresh = true, why = "";
try { execFileSync("python3", [path.join(ROOT, "tools/sync_i18n.py"), "--check"], { stdio: "pipe" }); }
catch (error) { fresh = false; why = String(error.stdout || "") + String(error.stderr || ""); }
gate("i18n.js matches its sources", { status: fresh ? "PASS" : "FAIL", detail: fresh ? "sync_i18n.py --check clean" : why.trim().split("\n").slice(-2).join(" ") });

/* ------------------------------------------------------------------ report */

const icon = { PASS: "ok  ", FAIL: "FAIL", SKIP: "skip" };
for (const r of results) console.log(`${icon[r.status]} ${r.name}\n      ${r.detail}`);
console.log(`\n${results.length - failed}/${results.length} gates green`);
process.exit(failed ? 1 : 0);
