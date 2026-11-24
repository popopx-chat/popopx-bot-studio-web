# POPOPX Bot Studio — official website and developer tutorial portal

A zero-build static site: `index.html` + `assets/css/style.css` + `assets/js/i18n.js` + `assets/js/app.js`,
with the full 18-language copy. No framework, no bundler, no CDN, no webfont request, no analytics.

- Live domain: <https://popopx.chat> (this repository is that site's document root)
- Engine: <https://github.com/popopx-chat/popopx-bot-studio> (AGPL-3.0-only)
- Endpoint badge in the header: `bot.popopx.chat`
- Licence: the `LICENSE` file at the repository root, AGPL-3.0-only, same as the engine

## Sections

| Anchor | Content |
| --- | --- |
| `#home` | Hero: zero metadata, 100% self-hosted, one-command cross-platform deploy, 24/7 bot plus human agents, no-code rules and plugins; copy-to-clipboard install command, two CTAs and the engine boot checklist |
| `#features` | Capability matrix: BotFather-grade multi-bot sandbox factory, permanent address, no-code rules, routing and tickets, local key sovereignty, plugin bus (`auto_reply` / `msg_router` / `llm_bridge` / `webhook_relay`) |
| `#security` | Comparison matrix: identity key, SQLite ledger, end-to-end encryption, process isolation, ban risk, metadata |
| `#tutorial` | Interactive install and tutorial centre (tabs): Ubuntu 22.04 systemd, macOS launchd, local development, first bot in 3 steps |
| `#api` | Developer Open API and topology diagram: isolated network plus copyable `POST /bot<token>/sendMessage`, `/setWebhook`, `GET /getUpdates` |
| `#faq` | FAQ: AGPL-3.0 compliance, multi-agent support, migration and cold backup, difference to a commercial service account, port safety, popopx-cli download |

## 18 languages

`en` (baseline), `zh-Hans`, `zh-Hant`, `ja`, `bg`, `cs`, `de`, `es`, `fi`, `fr`, `hu`, `it`, `nl`, `pl`,
`ru`, `th`, `tr`, `uk` — the same set as the POPOPX iOS app and `LOCALES` in the engine's `studio/app/i18n.py`.

Detection order: **URL parameter `?lang=…` → `localStorage` → `navigator.languages` → `en`**.
The header dropdown switches without a reload and writes the locale back into the address bar with
`history.replaceState` (`en` is the baseline and carries no parameter).

SEO: one URL with 18 `hreflang` alternates plus `x-default`, `canonical` on `https://popopx.chat/`,
Open Graph and Twitter tags updated per locale, `sitemap.xml` carrying every language as `xhtml:link`,
`CNAME` set to `popopx.chat`.

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
| `tools/shared-catalog.json` | 28 | Keys shared with the engine catalogs `_SITE` / `_ADMIN`, copied byte for byte so the site and the console never diverge in terminology |
| `tools/site-strings.json` | 110 | Website-only strings; its `en` node is derived from the default text inside `index.html` |

```bash
python3 tools/sync_i18n.py            # regenerate assets/js/i18n.js
python3 tools/sync_i18n.py --check    # is the artifact stale? (for CI)
python3 tools/sync_i18n.py --snapshot # refresh the shared snapshot from the sibling engine checkout
node tools/verify.mjs                 # full self-check gate
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
2. The `CNAME` file already contains `popopx.chat`, so Pages binds the custom domain automatically.
3. Turn on **Enforce HTTPS**. The apex `popopx.chat` needs an ALIAS/ANAME record (with Cloudflare a proxied
   CNAME works); point `bot.popopx.chat` at the Studio service itself, not at Pages.

### Cloudflare Pages

Direct Upload or Git integration both work: leave the build command empty and the output directory empty
(the repository root is the site root). Add `popopx.chat` as a domain; the `CNAME` file is ignored here.

### Vercel

Choose **Other** as the framework preset, keep the build command and output directory at their defaults,
and add `popopx.chat` under Domains.

### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name popopx.chat;

  root /srv/popopx-bot-studio-web;
  index index.html;

  # one inline script only: it flags <html class="js"> before the locale renders
  content-security-policy "default-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
  X-Content-Type-Options "nosniff";
  Referrer-Policy "strict-origin-when-cross-origin";
  Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()";

  location ~* ^/assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }
  location / {
    add_header Cache-Control "public, max-age=300, must-revalidate";
    try_files $uri $uri/ =404;
  }
}
```

### Caddy

```caddyfile
popopx.chat {
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
is the absolute `https://popopx.chat/sitemap.xml`.

## What the gate checks

`node tools/verify.mjs` asserts: all 18 locale dictionaries have exactly the `en` key set, no empty values,
no sentence left in English (technical tokens excepted), each locale really uses its own script, every
`data-i18n*` hook in `index.html` exists and its default text is byte-equal to `en`, the HTML tag stack closes,
ids are unique, anchors resolve, `node --check` passes, CSS braces and custom properties resolve,
canonical/hreflang/OG are present, CNAME/robots/sitemap are in shape, the AGPL `LICENSE` is still at the root,
and `i18n.js` has not drifted from its two JSON sources.

## Licence

AGPL-3.0-only. The repository bundles no binaries: `popopx-cli` is fetched at install time for your operating
system and architecture from the official Releases and verified against its SHA-256 checksum.

Chinese documentation: [README.md](README.md). The original briefs are archived under [docs/](docs/).
