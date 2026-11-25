# 2026-11-25 产品门户与信息架构升级 · 简报归档

## 来源

本文件归档本轮升级的原始简报（单条中文消息，2026-11-25T08:02:09Z，1,561 字符），以及执行前的四项裁定与实测发现。
简报原文在会话中经历过一次上下文压缩；本归档是从会话记录（session transcript）的第一条 user 消息里重新取回的逐字节原文，
不是复述。压缩摘要里那句「原文不可恢复」是错的，已按实测更正。

简报第 1.2 条把三个生态入口的 URL 全部写成 `https://popopx.chat`（复制粘贴 bug），归档时**原样保留**，
不去修饰成正确地址；实际使用的域名见下方「实测发现」第 1 条。

---

## 简报原文

```
读取项目记忆，执行以下内容：
请在当前 `bot.popopx.chat`（POPOPX Bot Studio）官网仓库中执行产品门户与信息架构升级，将其打造为面向个人用户、团队与开发者的「AI Agent 创建、配置、测试与管理工作台」产品站，同时严格保持与主站 `popopx.chat` 统一的视觉语言、零追踪合规底线与实事求是原则。

### 一、 强制规范与合规底线（红线）
1. **统一品牌与零追踪底线**：
   - 保持与主站 `popopx.chat` 一致的色彩、字体、响应式卡片设计、页脚生态入口与多语言切换机制（纯静态同源导出，零外部 CDN/第三方脚本/追踪像素，不加载兄弟站点的远程静态资源）。
   - 页面底部与顶部导航必须提供返回主站 `https://popopx.chat` 及跳转另外两个生态站（`https://popopx.chat`、`https://popopx.chat`）的明确入口。
2. **源码实测驱动与状态诚实标注**：
   - 升级前先检查 `popopx-bot-studio` 及其关联仓库的真实已公开代码与版本状态（如公开仓库尚处于早期阶段，严禁把路线图能力包装成已发布功能），对每项能力明确区分标注 `已发布`、`内测中` 或 `规划中`。
   - 所有安装命令、环境变量与 Agent Manifest 示例中严禁包含真实私钥或明文凭证。

### 二、 目标导航与页面结构
构建清晰的产品站导航：`概览 (Overview) ｜ 核心能力 (Features) ｜ 使用场景 (Use Cases) ｜ 工具集成 (Integrations) ｜ 文档与快速开始 (Docs) ｜ 安全边界 (Security) ｜ GitHub & 路线图 (Roadmap)`

### 三、 核心板块改造明细
1. **首页 Hero 与核心转化入口**：
   - 主标题：**创建 AI 助手，连接工具，让任务真正跑起来。**（英文：*Build AI Agents. Connect Tools. Get Work Done.*）
   - 副标题：阐明在一个可控工作台中配置角色、模型、提示词与工作流，并通过标准化权限连接外部工具与 POPOPX Chat 入口。
   - 首屏 CTA：按真实发布状态提供「查看文档 / 快速开始」与「打开 GitHub 仓库」按钮。
2. **工作流与能力全景（可视化工作台风格）**：
   - 展示清晰五步闭环：`创建 Agent → 配置模型与规则 → 连接受控工具 → 沙箱测试调试 → 发布并接入 Chat`。
   - 能力卡片覆盖：Agent 定义与版本管理、多模型供应商接入、系统提示词与角色编排、Tool Calling 权限隔离、运行日志与回放监控（标注真实实现状态）。
3. **生态协同图示**：
   - 用简洁架构图讲清 Bot Studio 如何作为大脑层：上游接收 `POPOPX Chat` 发起的任务，下游通过 `Service Suite` 授权调用工具，或调度 `Mac Node` 执行本地算力任务。
4. **安全与权限边界专题**：
   - 明确说明 API Key 隔离存储、最小权限声明（Capability Token 机制）、工具调用审计与随时撤销授权机制。

### 四、 构建与验收门禁
1. 运行静态构建命令，确保所有路由、响应式布局及多语言切换零编译错误、零死链。
2. 运行合规检查脚本（如有 `scan-compliance.mjs` 则直接复用，否则自检无外部资源请求、无硬编码密钥），整理为干净的本地 commit 并汇报修改摘要。
```

## 执行前裁定（2026-11-25，四项均选推荐项）

1. 简报点名的 5 张能力卡**全部保留**，按源码实测挂 `已发布 / 内测中 / 规划中` 徽章，不删也不吹。
2. 新文案走**站点专有键**（`tools/site-strings.json`），引擎共用的 27 键与引擎仓库一律不动。
3. 「文档与快速开始」**保持单页锚点**（`#tutorial` + `#api`），不建多页 `/docs/`。
4. 新建 `tools/scan-compliance.mjs`，并把它的阳性对照与实扫接入 `tools/verify.mjs`。

## 实测发现（决定了页面措辞的部分）

引擎口径取自 `popopx-bot-studio@95a6b94`。

1. **简报的三个 URL 是同一个域名。** 真实门牌：主站 `popopx.chat`、Service Suite `mp.popopx.chat`、
   Mac Node `node.popopx.chat`、本站 `bot.popopx.chat`。兄弟站点只深链到本站根路径，没有任何
   `bot.popopx.chat#锚点` 入链，所以本轮**既有 section id 一律不改**，新增锚点不破坏入链。
2. **简报点名的 5 项里，有 5 处「查无代码」**，全部只能标 `规划中`：
   - Tool Calling / function calling：0 处；`scope="message"`（`studio/app/plugin_manager.py:128`）只是元数据，不参与调度。
   - Capability Token（含 grants/allowlist 等等价词）：0 处。
   - Agent 版本管理与回滚：`bots` 表无版本列（`database.py:64-76`）；`BOT_STATUSES` 是运行态不是发布态（`:28`）；
     只有 `SCHEMA_VERSION=4` 与 `.botbundle` 冷备包（`BUNDLE_VERSION=1`）。
   - 运行日志回放：`message_logs` 与 `GET /api/admin/logs`、`/updates`（内存 ≤500 环形）真实存在，但**无回放/时间旅行**。
   - 审计与随时撤销：仅一行 webhook 变更日志（`main.py:418-425`）；无 admin 审计表、无 revoke/rotate 端点。
3. **反过来，可以老实标 `已发布` 的比简报说得更具体**：规则/路由试运行（`/api/admin/rules/preview`、`/routing/preview`）、
   每 Bot 独立进程 + `cli-data` 0700、OpenAI 兼容 LLM 桥（默认本机 Ollama，`loopback_only` 是默认 false 的可选开关）、
   签名 webhook（`X-Popopx-Signature: sha256=<hmac>`）、SMP 永久地址 + 二维码、Telegram 风格 Open API、
   冷备 AES-GCM+scrypt 加密、15 组离线自检。
4. **简报 §3.3 的三条生态调用边一条都没有代码**：引擎全仓对 `mp.popopx.chat` / `node.popopx.chat` /
   service-suite / mac-node 的唯一命中是一句设计说明（`popopx-bot-studio/docs/设计简报.md:1`）。
   真实出站只有 Studio → 本机 `popopx-cli`（loopback ws 5230–5299）→ `smp1–8.popopx.im`，以及 Studio → loopback Ollama。
   Mac Node 侧的接收端是真的（`POST http://127.0.0.1:18920/api/engine/invoke`，`PopopxMacNode/integrations/CONTRACT.md:14-19`），
   Studio 侧不接。所以生态图用**虚线边表示未实现**，并配 `eco_note` 明写「只导航、不加载；调用链尚未实现」——
   与主站 `Footer.tsx:222` "loads nothing from them" 的口径一致。
5. **引擎 `__version__ = "1.0.0"`（`app/__init__.py:4`），但 `git tag -l` 为空、无 CHANGELOG、无 GitHub Release**，
   因此安装引导继续走 `git clone` + 脚本，`#roadmap` 明写「源码已公开，尚无打 tag 的正式 Release」。
6. 顺手改掉的两处本站既有不实措辞：
   - 首屏自检面板原先打印 `✓ file_mode 0600 studio.key`，但引擎只在文件存在时**检查权限位**（`config.py:196`），
     全仓无创建/使用 `studio.key` 的代码，也没有 SQLCipher。现改为 `✓ bundle AES-GCM · scrypt` + `✓ data_dir 0700 var/studio`。
   - 安全专题明写静态加密边界：账本本身未静态加密，靠 0600 文件位 + 0700 目录 + 仅回环，只有冷备包是 AES-GCM。
   - 附带修一个真 bug：`assets/js/app.js` 里 `location.hash.slice(6)` 把 `#tab-ubuntu` 截成 `buntu`，
     Tab 深链一直是坏的，改为按 `#tab-` 长度取。

## 本轮交付口径

| 项 | 实测值 |
| --- | --- |
| 板块 | 7 个导航锚点：`#home` `#features` `#use-cases` `#integrations` `#tutorial` `#security` `#roadmap`（另有 `#api` `#faq` 沿用） |
| 状态标注 | 34 个能力块带 `data-status`，取值仅 `released` / `beta` / `planned`，与徽章成对；`planned` 用虚线边框 |
| 站点专有键 | `tools/site-strings.json` 203 键（升级前 112，新增 96、清理孤儿 5） |
| 字典规模 | 27 引擎共用 + 203 站点 = 230 键 × 18 语种 |
| 门禁 | `node tools/verify.mjs` 38 条；`tools/scan-compliance.mjs --self-test` 14 脏样全抓到、10 净样全放行 |

## 实机验证（本机 headless Chrome，截图留在 `/tmp` 不入库）

简报的门禁写的是「所有路由、响应式布局及多语言切换零编译错误、零死链」，这一条逼出了下面四处改动，
它们不在原方案里，但都是量出来的问题：

- **表头**：18 语种 × 1440/1280/1180/1024 共 72 例，`head-inner` 溢出 0 例。让位是 `app.js` 的 `fitHead()`
  按实测宽度两级触发的（先收域名门牌与 GitHub 文字，仍溢出才把导航收进汉堡），实际只有 1180 的 `pl`
  与 1024 的 `fi fr hu it pl` 退到汉堡。
- **锚点落点**：`fitHead()` 同时把实测表头高度写进 `--head-h`，`scroll-padding-top` 用它，
  点击导航后目标顶边 = 表头下沿 + 14px（实测 `tabTop 118 / headBottom 104`）。
- **Tab 深链**：`#tab-macos` 打开时 `aria-selected` 落在 `tab-macos`、面板可见（`location.hash.slice(6)` → `slice(5)` 的修复）。
- **整页普查**：1440/1280/1180/900/390/360 六档 × 多语种，横向滚动 0、死锚点 0；
  文本截断只剩两处 `.visually-hidden`（屏幕阅读器专用，本就该溢出隐藏）。
- **生态图**：7 个 SVG 内文字越界 0 处。原先两个 peer 副标 `mp.popopx.chat · peer portal` /
  `node.popopx.chat · peer portal` 分别越过虚线框与 viewBox 边界，改为只写域名（peer 关系由虚线边框、
  `NOT IMPLEMENTED` 标签和图下 `eco_note` 承担）。
- **启动面板**：1081–1340 区间 `.hero-grid` 的 1.15fr/0.85fr 只给面板 377px，最长两行差 38px 与 4px，
  该区间改为 1fr/0.95fr（面板 438–450px），并把 `plugins` 行的对齐 `&nbsp;` 减 2 格、
  `0 outbound telemetry` 缩为 `0 telemetry`；≤560 面板改为可折行，不再在半句处出省略号。

## 明确没做的

多页 `/docs/`、新建 `.github/workflows`、引擎 i18n 改动、任何 push/部署/线上验证。
Nginx/Caddy 的 4 个生产安全头仍是**未实测**项（简报未要求，且线上验证超出本轮范围）。
