# POPOPX Bot Studio — product portal and developer tutorial site

A zero-build static site: `index.html` + `assets/css/style.css` + `assets/js/i18n.js` + `assets/js/app.js`,
with the full 18-language copy. No framework, no bundler, no CDN, no webfont request, no analytics.

- Portal domain: <https://bot.popopx.chat> (this repository is that host's document root); the apex `popopx.chat` belongs to the main site and is no longer claimed here
- Engine: <https://github.com/popopx-chat/popopx-bot-studio> (AGPL-3.0-only)
- Header domain badge: `bot.popopx.chat`
- Ecosystem entries: a header eco-bar and a footer eco list, three links each — the main site <https://popopx.chat>,
  Service Suite <https://mp.popopx.chat>, Mac Node <https://node.popopx.chat>. All carry
  `target="_blank" rel="noopener noreferrer"`: the page **links to** the sibling portals and **loads nothing** from them
- Licence: the `LICENSE` file at the repository root, AGPL-3.0-only, same as the engine

## Sections

| Anchor | Content |
| --- | --- |
| `#home` | Overview: agent-workbench hero — zero metadata, 100% self-hosted, one-command cross-platform deploy, 24/7 bot plus human agents, no-code rules and plugin tags; copy-to-clipboard install command, two CTAs, the engine boot checklist and the spec strip |
| `#features` | Core capabilities: status legend, the five-step loop (create → configure → connect tools → sandbox test → ship into Chat), five headline capability cards, plus the BotFather-grade multi-bot sandbox factory, permanent address, no-code rules, routing and tickets, local key sovereignty, plugin bus (`auto_reply` / `msg_router` / `llm_bridge` / `webhook_relay`) |
| `#use-cases` | Use cases: ticket desk, on-call alert relay, same-machine script automation, an address that never changes — all four backed by code |
| `#integrations` | Tool integration: OpenAI-compatible model endpoint, signed webhook in and out, Telegram-shaped Open API, plugin bus, model-driven tool calling (planned); `#ecosystem` topology figure plus the four-portal navigation |
| `#tutorial` | Docs and quick start (tabs): Ubuntu 22.04 systemd, macOS launchd, local development, first bot in 3 steps |
| `#api` | Developer Open API and topology diagram: isolated network plus copyable `POST /bot<token>/sendMessage`, `/setWebhook`, `GET /getUpdates` |
| `#security` | Security boundaries: comparison matrix (identity key, SQLite ledger, E2EE, process isolation, ban risk, metadata) plus four panels on key storage, capability tokens, call audit and revocation |
| `#faq` | FAQ: AGPL-3.0 compliance, multi-agent support, migration and cold backup, difference to a commercial service account, port safety, popopx-cli download |
| `#roadmap` | GitHub and roadmap: the gap list measured from the engine source (no dates promised) plus repository and issue entry points |

## Status badges are the only source of truth

Every capability block in the page carries a `data-status`, and only three values are allowed. The badge must be there too:

| Badge | Criterion |
| --- | --- |
| `released` | Everything the heading promises is implemented and reachable |
| `beta` | The main part works, but the other half of the heading has no code yet |
| `planned` | Zero code; it appears in the roadmap and the copy says outright that it is not implemented |

Tool Calling, capability tokens, agent versioning and rollback, run-log replay, and the ecosystem call chain
(Chat → Studio → Service Suite / Mac Node) have no code in the engine repository today, so all of them are
`planned`; `#roadmap` is that list. Re-measure the source before editing any capability copy.

## 18 languages

`en` (baseline), `zh-Hans`, `zh-Hant`, `ja`, `bg`, `cs`, `de`, `es`, `fi`, `fr`, `hu`, `it`, `nl`, `pl`,
`ru`, `th`, `tr`, `uk` — the same set as the POPOPX iOS app and `LOCALES` in the engine's `studio/app/i18n.py`.

Detection order: **URL parameter `?lang=…` → `localStorage` → `navigator.languages` → `en`**.
The header dropdown switches without a reload and writes the locale back into the address bar with
`history.replaceState` (`en` is the baseline and carries no parameter).
After a switch the header yields in two measured steps (`fitHead()` in `app.js`): first the domain chip and the
GitHub caption, and only if the row still overflows does the hamburger take the seven nav items. The same function
publishes the measured header height as `--head-h`, so `scroll-padding-top` keeps anchor targets below the header.
Measured across 18 locales at 1440/1280/1180/1024 — 72 cases, 0 overflow; only `pl` at 1180 and `fi fr hu it pl`
at 1024 fall back to the hamburger.

SEO: one URL with 18 `hreflang` alternates plus `x-default`, `canonical` on `https://bot.popopx.chat/`,
Open Graph and Twitter tags updated per locale, `sitemap.xml` carrying every language as `xhtml:link`,
`CNAME` set to `bot.popopx.chat`.

## Preview locally

```bash
git clone https://github.com/popopx-chat/popopx-bot-studio-web.git
cd popopx-bot-studio-web
python3 -m http.server 8080 --bind 127.0.0.1
open http://127.0.0.1:8080/?lang=de
```

## Where the copy comes from (read before editing text)

`assets/js/i18n.js` is **generated — do not hand-edit it**. Two sources feed it:

| Source | Keys | Role |
| --- | --- | --- |
| `tools/shared-catalog.json` | 27 | Keys shared with the engine catalogs `_SITE` / `_ADMIN`, copied byte for byte so the site and the console never diverge in terminology |
| `tools/site-strings.json` | 203 | Website-only strings; its `en` node is derived from the default text inside `index.html` |

```bash
python3 tools/sync_i18n.py            # regenerate assets/js/i18n.js
python3 tools/sync_i18n.py --check    # is the artifact stale? (for CI)
python3 tools/sync_i18n.py --snapshot # refresh the shared snapshot from the sibling engine checkout
node tools/verify.mjs                 # full self-check gate
node tools/scan-compliance.mjs        # compliance scan (verify.mjs calls it too)
```

English is the single source of truth: the text hard-coded in `index.html` must stay byte-equal to the `en`
dictionary, and `verify.mjs` asserts it. So an English edit touches both the markup and `site-strings.json`;
crawlers, `curl` and visitors without JavaScript still get a complete English page.

Translations dropped into `tools/incoming/*.json` (git-ignored) are merged once with
`python3 tools/sync_i18n.py --adopt`.

## Static hosting recipes

There is no build step: serve the repository root. `index.html` sits at the top, next to
`CNAME`, `robots.txt` and `sitemap.xml`.

### GitHub Pages

1. Repository Settings → Pages → Source: **Deploy from a branch**, branch `main`, directory `/ (root)`.
2. The `CNAME` file already contains `bot.popopx.chat`, so Pages binds the custom domain automatically.
3. Turn on **Enforce HTTPS**. `bot.popopx.chat` needs a single CNAME to Pages (no ALIAS/ANAME); the apex
   `popopx.chat` stays with the main site and is neither bound nor claimed here. The Studio console listens on
   loopback only, so the hostname in front of it is the operator's own decision.

### Cloudflare Pages

Direct Upload or Git integration both work: leave the build command empty and the output directory empty
(the repository root is the site root). Add `bot.popopx.chat` as a domain; the `CNAME` file is ignored here.

### Vercel

Choose **Other** as the framework preset, keep the build command and output directory at their defaults,
and add `bot.popopx.chat` under Domains.

### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name bot.popopx.chat;

  root /srv/popopx-bot-studio-web;
  index index.html;

  # nginx does not inherit add_header downward: a location that sets any add_header of its own drops every
  # server-level one, so the security headers are declared inside each location. One inline script only.

  location ~* ^/assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header Content-Security-Policy "default-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
    try_files $uri =404;
  }
  location / {
    add_header Cache-Control "public, max-age=300, must-revalidate" always;
    add_header Content-Security-Policy "default-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
    try_files $uri $uri/ =404;
  }
}
```

### Caddy

```caddyfile
bot.popopx.chat {
  root * /srv/popopx-bot-studio-web
  encode gzip zstd
  file_server
  header /assets/* Cache-Control "public, max-age=31536000, immutable"
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
```

Upload `CNAME`, `robots.txt`, `sitemap.xml` and `LICENSE` with the site: the `Sitemap:` line in `robots.txt`
is the absolute `https://bot.popopx.chat/sitemap.xml`.

## What the gate checks

`node tools/verify.mjs` asserts: all 18 locale dictionaries have exactly the `en` key set, no empty values,
no sentence left in English (technical tokens excepted), each locale really uses its own script, every
`data-i18n*` hook in `index.html` exists and its default text is byte-equal to `en`, the HTML tag stack closes,
ids are unique, anchors resolve, `node --check` passes, CSS braces and custom properties resolve,
canonical/hreflang/OG are present, CNAME/robots/sitemap are in shape, the AGPL `LICENSE` is still at the root,
and `i18n.js` has not drifted from its two JSON sources.

The information-architecture and compliance layer asserts four more things: the nav covers exactly the seven
section anchors, every capability block carries a `data-status` with a matching badge style, absolute links only
point at the four `popopx.chat` subdomains or `github.com`, and each sibling-portal link is `target="_blank"` with
`rel="noopener noreferrer"` — three in the header, three in the footer. It then runs `tools/scan-compliance.mjs`.

`tools/scan-compliance.mjs` scans only the bytes a visitor actually downloads (`index.html`, `assets/`,
`robots.txt`, `sitemap.xml`, `CNAME`): zero third-party analytics tokens, zero externally loadable resources
(`<script src>` / `<link href>` / `<img src>` / CSS `url()` / `fetch()`), zero private-key or plaintext credential
shapes (PEM headers, `AKIA…`, `ghp_`, `xox…`, `AIza…`, `sk-*`, `TOKEN = "<40+ chars>"`), zero leaked local paths and
zero restricted category words. `--self-test` feeds a set of fixtures that *must* be caught and a set that *must*
pass (the loopback `curl` example, the GitHub navigation link, the Chinese wording for a reverse proxy and the
launchd agent) through the same rules — so a green "0" cannot mean "the rule matched nothing".

## Licence

AGPL-3.0-only. The repository bundles no binaries: `popopx-cli` is fetched at install time for your operating
system and architecture from the official Releases and verified against its SHA-256 checksum.

Chinese documentation: [README.md](README.md). The original briefs are archived under [docs/](docs/).
