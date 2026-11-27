#!/usr/bin/env node
/* POPOPX Bot Studio — compliance scanner for the shipped artefacts.
   Run: node tools/scan-compliance.mjs            (exit 0 = clean)
        node tools/scan-compliance.mjs --self-test
   No dependencies, no network. This repo has no build step, so the files a
   visitor downloads are the files in the tree: index.html, assets/, robots.txt,
   sitemap.xml, CNAME. docs/ and README are repository text, not shipped bytes,
   so they are out of scope.

   Four claims, each measured against those bytes:
     1. 0 third-party analytics / tracking code
     2. 0 externally hosted resources the browser would load
     3. 0 private keys or plaintext credentials in any example
     4. 0 leaked local development paths
   A fifth rule keeps the main portal's restricted product-category wording out
   (legacy upstream name, VPN/proxy selling terms) with the deployment carve-out
   noted next to BANNED_WORDS.

   A navigation <a href="https://github.com/…"> is not a loaded resource and is
   allowed; what must not exist is anything fetched from another origin. */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const SELF_TEST = ARGS.includes("--self-test");

/* Substrings that would mean a visitor's browser phones home. */
const TRACKING = [
  "googletagmanager", "google-analytics", "gtag(", "dataLayer", "_gaq",
  "fbq(", "facebook.com/tr", "hotjar", "clarity.ms", "plausible.io",
  "useplausible", "umami", "matomo", "piwik", "mixpanel", "amplitude",
  "segment.io", "analytics.js", "posthog", "yandex.ru/metrika", "mc.yandex",
];

/* Origins that would mean an external asset is loaded. */
const REMOTE_ASSET_HOSTS = [
  "fonts.googleapis.com", "fonts.gstatic.com", "use.typekit.net",
  "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "esm.sh",
  "pagecdn.io", "bootstrapcdn.com", "recaptcha.net", "googleapis.com",
  "gravatar.com", "doubleclick.net",
];

/* Attributes/constructs that actually load something. `scope: "tag"` extends the
   window the rule judges to the end of the element, `"call"` to the closing
   parenthesis — the patterns only capture the start of the attribute, so without
   that window neither the `rel` allowlist nor the self-origin exemption below
   could ever see the URL they are meant to judge. */
const RESOURCE_PATTERNS = [
  { re: /<script[^>]+\bsrc\s*=\s*["']?(https?:)?\/\//gi, why: "remote <script src>", scope: "tag" },
  { re: /<link[^>]+\bhref\s*=\s*["']?(https?:)?\/\//gi, why: "remote <link href>", scope: "tag", allowlist: /rel\s*=\s*["']?(canonical|alternate|prefetch|dns-prefetch|preconnect|author|me|publisher)/i },
  { re: /<img[^>]+\bsrc\s*=\s*["']?(https?:)?\/\//gi, why: "remote <img src>", scope: "tag" },
  { re: /<(?:video|audio|source|iframe)[^>]+\bsrc\s*=\s*["']?(https?:)?\/\//gi, why: "remote media/iframe", scope: "tag" },
  { re: /@import\s+(?:url\()?\s*["']?(https?:)?\/\//gi, why: "CSS @import of a remote sheet", scope: "call" },
  { re: /(?<!\bnew\s)url\(\s*["']?(https?:)?\/\//gi, why: "CSS url() pointing off-origin", scope: "call" },
  { re: /\bfetch\(\s*["'](https?:)?\/\//gi, why: "fetch() to an absolute URL", scope: "call" },
  { re: /\bXMLHttpRequest|new Image\(\)\.src\s*=\s*["']https?:/gi, why: "scripted remote request", scope: "call" },
  { re: /<img[^>]+\bsrcSet\s*=\s*["']?(https?:)?\/\//gi, why: "remote srcset", scope: "tag" },
];

const LOCAL_PATH_PATTERNS = [
  /\/Users\/[^\s"'<>]*/,
  /\/home\/[a-z][^\s"'<>]*/,
  /\/private\/var\/folders\//,
  /C:\\Users\\/i,
];

/* Credential shapes. The site teaches people to keep secrets out of a repo, so
   every install command, environment line and API example here must carry a
   variable name or a placeholder, never a value. */
/* Credential shapes. The site teaches people to keep secrets out of a repo, so
   every install command, environment line and API example here must carry a
   variable name or a placeholder, never a value. The keyword is matched inside
   an identifier too, so `STUDIO_ADMIN_TOKEN = "…"` is caught, while
   `STUDIO_ADMIN_TOKEN="$(openssl rand -hex 16)"` is not: no literal value. */
const SECRET_PATTERNS = [
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, why: "PEM private key header" },
  { re: /\bAKIA[0-9A-Z]{16}\b/g, why: "AWS access key id" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, why: "GitHub token" },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, why: "Slack token" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, why: "Google API key" },
  { re: /\bsk-[live|test|proj]-[A-Za-z0-9_-]{16,}\b/g, why: "Stripe/OpenAI-style secret key" },
  { re: /[A-Za-z0-9_]*(?:secret|token|api[_-]?key|password|passwd)[A-Za-z0-9_]*\s*[:=]\s*["'][^"'\s<>]{20,}["']/gi, why: "assigned credential value" },
];

/* Self origin: canonical, og:url and the sitemap legitimately spell this host out.
   The lookahead makes the exemption safe — without it `bot.popopx.chat.example.com`
   would count as ours. */
const SELF_ORIGIN = /\/\/bot\.popopx\.chat(?![\w.-])/i;

/* The four POPOPX portals. A `rel="canonical|alternate|…"` reference is exempt
   only when it points at one of these hosts: `rel` describes a relationship, it
   does not license a declaration about somebody else's site. */
const PORTAL_HOSTS = /\/\/(?:popopx\.chat|bot\.popopx\.chat|mp\.popopx\.chat|node\.popopx\.chat)(?![\w.-])/i;

/* Restricted product-category words, same list the main portal enforces.
   代理 needs a carve-out: this site legitimately writes 反向代理 (the nginx/Caddy
   step of a self-hosted deploy) and launchd 代理 (the macOS unit type), and neither
   is a product-category claim. What must never appear is 代理 sold as a feature. */
const PROXY_ALLOW = /反向代理|反向代理伺服器|[\x27"]?launchd[\x27"]?\s*代理|\bLaunch(?:Agent|Daemon)\b/gi;
const BANNED_WORDS = [
  { word: "SimpleX", re: /simplex/i, note: "legacy upstream project name" },
  { word: "VPN", re: /\bVPN\b/, note: "restricted category term" },
  { word: "专网", re: /专网/, note: "private-network wording" },
  { word: "军工", re: /军工/, note: "military-industrial wording" },
];

const SHIPPED = ["index.html", "robots.txt", "sitemap.xml", "CNAME"];
const SHIPPED_DIRS = ["assets"];
const SCANNABLE = new Set([".html", ".js", ".css", ".json", ".txt", ".xml", ".svg", ".webmanifest"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".DS_Store") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCANNABLE.has(extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

function shippedFiles() {
  const files = SHIPPED.filter(existsSync).map((f) => join(ROOT, f));
  for (const dir of SHIPPED_DIRS) if (existsSync(join(ROOT, dir))) walk(join(ROOT, dir), files);
  return files;
}

/** The text a rule is actually allowed to judge: match start → end of tag/call. */
function windowOf(text, start, scope) {
  if (scope === "call") {
    const close = text.indexOf(")", start);
    return text.slice(start, close === -1 ? Math.min(text.length, start + 200) : close + 1);
  }
  const gt = text.indexOf(">", start);
  return text.slice(start, gt === -1 ? Math.min(text.length, start + 400) : gt + 1);
}

function scanText(text) {
  const hits = [];

  for (const needle of TRACKING) if (text.includes(needle)) hits.push({ kind: "tracking", evidence: needle });
  for (const host of REMOTE_ASSET_HOSTS) if (text.includes(host)) hits.push({ kind: "remote-asset-host", evidence: host });

  for (const { re, why, scope, allowlist } of RESOURCE_PATTERNS) {
    for (const match of text.matchAll(re)) {
      const window = windowOf(text, match.index, scope);
      if (SELF_ORIGIN.test(window)) continue;
      if (allowlist && PORTAL_HOSTS.test(window) && allowlist.test(window)) continue;
      hits.push({ kind: "external-reference", evidence: `${why}: ${window.trim()}` });
    }
  }

  for (const re of LOCAL_PATH_PATTERNS) {
    const match = text.match(re);
    if (match) hits.push({ kind: "local-path-leak", evidence: match[0] });
  }

  for (const { re, why } of SECRET_PATTERNS) {
    const match = text.match(re);
    if (match) hits.push({ kind: "credential", evidence: `${why}: ${String(match[0]).slice(0, 40)}` });
  }

  for (const { word, re } of BANNED_WORDS) {
    const match = text.match(re);
    if (match) hits.push({ kind: "banned-word", evidence: `${word} (${match[0]})` });
  }

  const scrubbed = text.replace(PROXY_ALLOW, "·");
  const proxy = scrubbed.match(/代理|翻墙|科学上网/);
  if (proxy) hits.push({ kind: "banned-word", evidence: `代理 (${proxy[0]})` });

  return hits;
}

/* ------------------------------------------------------------------ */
/* Positive controls: a green 0 must not mean "the rules match nothing". */
/* ------------------------------------------------------------------ */
if (SELF_TEST) {
  const dirty = [
    { name: "tracking", text: '<script>window.dataLayer = window.dataLayer || [];</script>' },
    { name: "remote-script", text: '<script src="https://cdn.jsdelivr.net/npm/x.js"></script>' },
    { name: "remote-font", text: '<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">' },
    { name: "remote-img", text: '<img src="https://gravatar.com/avatar/abc">' },
    { name: "css-url", text: 'body{background:url(https://example.com/a.png)}' },
    { name: "js-fetch", text: 'fetch("https://api.segment.io/v1/track")' },
    { name: "local-path", text: 'const p = "/Users/dev/popopx-bot-studio-web/index.html";' },
    { name: "pem-key", text: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN' },
    { name: "gh-token", text: 'ghp_abcdefghijklmnopqrstuvwxyz123456' },
    { name: "assigned-secret", text: 'STUDIO_ADMIN_TOKEN = "8f3a1c0b9d7e2f5a4c6b81e3d0f9a7c5b3e1d9f7a2"' },
    { name: "banned-proxy", text: '<p>内置代理，一键翻墙</p>' },
    { name: "banned-vpn", text: '<p>最快的 VPN 节点</p>' },
    // The two rules the exemptions could silently break.
    { name: "lookalike-host", text: '<link rel="canonical" href="https://bot.popopx.chat.example.com/">' },
    { name: "lookalike-preload", text: '<link rel="modulepreload" href="https://unpkg.com/thing.js">' },
  ];
  let missed = 0;
  for (const fixture of dirty) {
    const found = scanText(fixture.text);
    if (!found.length) { console.log(`CONTROL FAIL  ${fixture.name}: scanner found nothing`); missed += 1; }
    else console.log(`control ok    ${fixture.name} -> ${found[0].kind}`);
  }
  /* Clean samples, including the shapes this site really ships: a loopback curl
     example, a navigation link to GitHub, a sibling-portal navigation link, and
     the canonical/hreflang block. None of them may trip a rule. */
  const clean = [
    '<link rel="canonical" href="https://bot.popopx.chat/">',
    '<link rel="alternate" hreflang="zh-Hans" href="https://bot.popopx.chat/?lang=zh-Hans">',
    '<a href="https://github.com/popopx-chat/popopx-bot-studio">Source on GitHub</a>',
    '<a href="https://node.popopx.chat" target="_blank" rel="noopener noreferrer">node.popopx.chat</a>',
    '<code>curl -X POST http://127.0.0.1:8090/api/v1/bot$BOT_TOKEN/sendMessage -H "content-type: application/json" -d \'{"chat_ref":"&lt;contact&gt;","text":"Deploy finished."}\'</code>',
    '<pre><code>export STUDIO_ADMIN_TOKEN="$(openssl rand -hex 16)"</code></pre>',
    '<img src="assets/img/mark.svg" alt="POPOPX">',
    'new URL("https://example.com/feature-test")',
    '<p>前面放 Caddy 或 nginx，TLS 与认证交给反向代理负责。</p>',
    '<p>注册 launchd 代理，重启后 Studio 自动回来。</p>',
  ];
  let falsePositives = 0;
  for (const text of clean) {
    const found = scanText(text);
    if (found.length) {
      console.log(`CONTROL FAIL (false positive) ${text.slice(0, 56)} -> ${found[0].kind}: ${found[0].evidence}`);
      falsePositives += 1;
    }
  }
  console.log(`self-test: ${dirty.length - missed}/${dirty.length} dirty fixtures caught, ${clean.length - falsePositives}/${clean.length} clean samples passed through`);
  process.exit(missed + falsePositives > 0 ? 1 : 0);
}

/* ------------------------------------------------------------------ scan */

const files = shippedFiles();
if (!files.length) {
  console.error("scan: no shipped files found — run from the repository root");
  process.exit(1);
}

const findings = [];
function push(kind, file, evidence) {
  findings.push({ kind, file: relative(ROOT, file), evidence: String(evidence).slice(0, 160) });
}
for (const file of files) {
  for (const hit of scanText(readFileSync(file, "utf8"))) push(hit.kind, file, hit.evidence);
}

const byKind = {};
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;

console.log(`scan: ${files.length} shipped files (${files.map((f) => relative(ROOT, f)).sort().join(", ")})`);
for (const f of findings) console.log(`FAIL [${f.kind}] ${f.file} — ${f.evidence}`);
console.log(
  `scan: tracking=${byKind.tracking ?? 0} external-load=${(byKind["remote-asset-host"] ?? 0) + (byKind["external-reference"] ?? 0)} ` +
    `credentials=${byKind.credential ?? 0} local-path=${byKind["local-path-leak"] ?? 0} banned-word=${byKind["banned-word"] ?? 0}`,
);

if (findings.length) {
  console.error("scan: compliance gate FAILED");
  process.exit(1);
}
console.log("scan: 0 external trackers · 0 externally loaded resources · 0 credential values · 0 local paths · 0 banned words");
