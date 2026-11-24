# POPOPX Bot Studio 官方网站与开发者教程门户

零构建静态站点：`index.html` + `assets/css/style.css` + `assets/js/i18n.js` + `assets/js/app.js`，
一整套 18 语种文案，无框架、无打包器、无 CDN、无 Web 字体请求、无统计脚本。

- 门户域名：<https://bot.popopx.chat>（本仓库即该域名的站点根目录）；顶级域 `popopx.chat` 归主站，本站不再声明它
- 引擎仓库：<https://github.com/popopx-chat/popopx-bot-studio>（AGPL-3.0-only）
- 顶部域名门牌：`bot.popopx.chat`
- 许可证：本仓库根目录的 `LICENSE`（AGPL-3.0-only），与引擎一致

## 板块

| 锚点 | 内容 |
| --- | --- |
| `#home` | Hero 首屏：零元数据 / 100% 自托管 / 跨平台一键部署 / 7×24 机器人与人工坐席 / 零代码规则与插件生态，一键复制安装命令 + 双行动按钮 + 引擎启动自检面板 |
| `#features` | 核心生态能力矩阵：BotFather 级多 Bot 沙箱工厂、永久联系地址、零代码规则、路由与工单、私钥本地主权、插件总线（`auto_reply` / `msg_router` / `llm_bridge` / `webhook_relay`） |
| `#security` | 安全优势对比表：私钥、SQLite 账本、端到端加密、进程隔离、封号风险、元数据 |
| `#tutorial` | 交互式安装与教程中心（Tab 切换）：Ubuntu 22.04 systemd、macOS launchd、本地开发调试、三步实战上手 |
| `#api` | 开发者 Open API 与架构图：隔离网络拓扑 + `POST /bot<token>/sendMessage`、`/setWebhook`、`GET /getUpdates` 可复制示例 |
| `#faq` | FAQ：AGPL-3.0 合规、多坐席客服、迁移与冷备、与商业服务号的区别、端口安全、popopx-cli 下载 |

## 18 语种

`en`（基准）、`zh-Hans`、`zh-Hant`、`ja`、`bg`、`cs`、`de`、`es`、`fi`、`fr`、`hu`、`it`、`nl`、`pl`、
`ru`、`th`、`tr`、`uk` —— 与 POPOPX iOS App 及引擎 `studio/app/i18n.py` 的 `LOCALES` 逐一对齐。

检测优先级：**URL 参数 `?lang=…` → `localStorage` → `navigator.languages` → `en`**，
右上角下拉切换无刷新，切换后用 `history.replaceState` 把语种写回地址栏（`en` 为基准，不带参数）。

SEO：单一 URL + 18 条 `hreflang` 备用链接 + `x-default`，`canonical` 指向 `https://bot.popopx.chat/`，
Open Graph / Twitter 标签随语种更新，`sitemap.xml` 内联全部语种的 `xhtml:link`，`CNAME` 为 `bot.popopx.chat`。

## 本地预览

```bash
git clone https://github.com/popopx-chat/popopx-bot-studio-web.git
cd popopx-bot-studio-web
python3 -m http.server 8080 --bind 127.0.0.1
open http://127.0.0.1:8080/?lang=zh-Hans
```

## 文案从哪来（改文案前先读这段）

一个页面的全部文案来自两处，`assets/js/i18n.js` 是**生成物，不要手改**：

| 来源 | 键数 | 说明 |
| --- | --- | --- |
| `tools/shared-catalog.json` | 27 | 与引擎 `_SITE` / `_ADMIN` 共用的键，逐字节拷贝，保证官网与控制台用词一致 |
| `tools/site-strings.json` | 112 | 官网专有文案；其中 `en` 节点由 `index.html` 的标签内文本派生 |

```bash
python3 tools/sync_i18n.py            # 重新生成 assets/js/i18n.js
python3 tools/sync_i18n.py --check    # 生成物是否过期（CI 用）
python3 tools/sync_i18n.py --snapshot # 引擎仓库就在旁边时，刷新共用键快照
node tools/verify.mjs                 # 全量自检门禁
```

英文是唯一的事实来源：`index.html` 里标签内写死的默认文本必须与 `en` 字典逐字节相等，
`verify.mjs` 会断言这一点——所以改英文要在 HTML 与 `site-strings.json` 两边同时改，或跑一次
`tools/sync_i18n.py` 让脚本告诉你哪里漂了。这样无 JS 环境（爬虫、`curl`）拿到的仍是完整英文页。

新增语种键的投递目录 `tools/incoming/*.json` 已被 `.gitignore` 忽略，用
`python3 tools/sync_i18n.py --adopt` 一次性并入 `site-strings.json`。

## 静态托管配置

站点没有构建步骤：把仓库内容当作 web 根目录即可，`index.html` 在根、`CNAME`/`robots.txt`/`sitemap.xml` 同级。

### GitHub Pages

1. 仓库 Settings → Pages → Source 选 **Deploy from a branch**，分支 `main`、目录 `/ (root)`。
2. 根目录的 `CNAME` 已写 `bot.popopx.chat`，Pages 会自动绑定该自定义域名。
3. 启用 **Enforce HTTPS**。子域名 `bot.popopx.chat` 只需一条指向 Pages 的 CNAME（不必 ALIAS/ANAME）；
   顶级域 `popopx.chat` 留给主站，本站既不绑定也不声明。Studio 控制台只听 127.0.0.1，摆在哪个域名由部署者自己定。

### Cloudflare Pages

Direct Upload 或 Git 集成都可以：构建命令留空、输出目录留空（仓库根即站点根）。
域名加 `bot.popopx.chat`；`CNAME` 文件对 Cloudflare 无意义，可忽略。

### Vercel

Framework preset 选 **Other**，Build Command 与 Output Directory 都留默认/留空即可直接发布静态根目录；
Domains 加 `bot.popopx.chat`。

### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name bot.popopx.chat;

  root /srv/popopx-bot-studio-web;
  index index.html;

  # nginx 的 add_header 不向下继承：location 内只要自己写了 add_header，server 级的就全部失效，
  # 因此安全头必须在每个 location 里各自声明。本站只有一个内联脚本（给 <html> 打 .js 标记，防闪烁）。

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

Nginx/Caddy 部署时，别忘了把 `CNAME`、`robots.txt`、`sitemap.xml`、`LICENSE` 一并上传：
`robots.txt` 里的 `Sitemap:` 行写的是绝对地址 `https://bot.popopx.chat/sitemap.xml`。

## 自检门禁

`node tools/verify.mjs` 覆盖：18 语种键名与 `en` 100% 一致（多键/漏键都算失败）、无空值、
无“整句留着英文”的未翻译残留（技术专名白名单除外）、目标语种确实使用自己的文字、
`index.html` 的每个 `data-i18n*` 键都存在且其默认文本与 `en` 逐字节相等、HTML 标签栈闭合、
`id` 唯一、锚点可达、`node --check` 通过、CSS 括号与自定义属性闭合、canonical/hreflang/OG、
CNAME/robots/sitemap、AGPL `LICENSE` 仍在根目录、以及 `i18n.js` 与两份 JSON 源不漂移。

## 许可

AGPL-3.0-only。引擎不打包任何二进制，`popopx-cli` 由安装脚本在运行时按操作系统与架构从官方
Releases 下载并校验 SHA-256。

英文文档见 [README.en.md](README.en.md)。需求原文归档在 [docs/](docs/)。
