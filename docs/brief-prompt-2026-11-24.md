# Role & Objective
你是一位精通现代开发者产品官网设计与开发者文档架构的资深工程师。请在当前 `popopx-bot-studio` 仓库中生成一套 **POPOPX Bot Studio 官方网站与开发者交互教程门户（`site/index.html`）**，用于向开发者与社区用户展示其核心功能、安全特性、安装方法及实战教程。

---

## 🛠️ 网站核心内容与设计规范

### 1. 零构建单文件独立部署架构（`site/index.html`）
- 采用零外置构建依赖的现代 HTML5 + CSS3 + 原生 ES6 架构，支持直接部署于 GitHub Pages、Cloudflare Pages、Vercel 或 Nginx/Caddy 静态目录；
- 视觉风格采用 **深空暗黑赛博美学（Deep Space Dark + 赛博青 `#00F0FF` & 翡翠绿 `#10B981` 点缀）**；
- 内置 **中 / 英文实时无刷新切换**，默认自动识别浏览器语言。

### 2. 核心展示板块
1. **Hero 首屏主视觉区**：醒目标题、核心亮点标签（AGPL-3.0、零元数据隔离、多坐席客服、AI 插件）及双行动按钮。
2. **核心特点对比矩阵**：突出私钥与 SQLite 账本 100% 自主掌控、端到端加密、单机物理沙箱隔离及零封号风险。
3. **四大核心生态能力卡片**：BotFather 级可视化工厂、零代码自动回复与指令引擎、7×24 智能与人工坐席客服系统、可扩展插件总线与开放 API。
4. **交互式「一键安装与快速上手」教程区**：提供 Ubuntu 22.04（systemd）、macOS 原生（launchd）与本地开发调试（start_macos.sh）标签页，附带一键复制命令。
5. **三步实战使用教程**：从登录控制台创建 Bot、配置自动欢迎语与路由规则，到获取 `BOT_TOKEN` 调用 HTTP API。
6. **开发者 Open API & 插件扩展示例区**：展示 `curl` 发送消息、设置 Webhook 回调等可复制代码。
7. **FAQ 与开源协议页脚**：解答端口安全、备份恢复及生态协同关系。

---

## 🔒 交付门禁
1. 生成 `site/index.html`（响应式适配桌面端与手机浏览器）；
2. 在 `README.md` 与 `README.en.md` 中补充 `site/index.html` 官网部署说明；
3. 提交 `feat(site): add bilingual product landing page and interactive developer tutorial` 并推送到 `origin/main`，完成后向我汇报板块清单与提交 SHA。

