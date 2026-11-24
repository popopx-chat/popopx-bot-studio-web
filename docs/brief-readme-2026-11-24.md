
Role & Objective

你是一位精通国际化（i18n）前端架构、现代开发者产品官网设计与零构建高转化静态站点工程的资深全栈工程师。
请在当前 popopx-bot-studio-web 仓库（保留根目录 AGPL-3.0-only LICENSE）中，从零完整设计、编写并自检通过 POPOPX Bot Studio 官方网站与交互式开发者教程门户，适配正式域名 https://popopx.chat，关联主程序仓库 https://github.com/popopx-chat/popopx-bot-studio，并完整支持 与 POPOPX iOS App 完全一致的全量 18 个语种。

1. 全量 18 语种国际化与 SEO 要求（与 POPOPX iOS App 100% 对齐）

• 18 语种支持：完整覆盖 en（基准）、zh-Hans、zh-Hant、ja、bg、cs、de、es、fi、fr、hu、it、nl、pl、ru、th、tr、uk 共 18 个语种，提供地道的母语级界面文案、教程与 FAQ，无机翻或留空。
• 智能切换与 SEO：支持 URL 参数（?lang=...）、localStorage 记忆及浏览器语言自动识别，右上角提供无刷新多语言下拉切换器；围绕域名 https://popopx.chat 配置规范化 Canonical 标签、Open Graph 社交标签、CNAME、sitemap.xml 与 robots.txt。

2. 官网核心内容与交互板块

采用深空暗黑赛博美学（Deep Space Dark + 赛博青 #00F0FF 与翡翠绿 #10B981 点缀）的零构建静态架构（index.html、assets/css/style.css、assets/js/i18n.js、assets/js/app.js）：
1. 顶部导航栏：品牌标识、bot.popopx.chat 徽章、锚点导航、18 语种切换器及 GitHub 仓库跳转按钮（https://github.com/popopx-chat/popopx-bot-studio）。
2. Hero 首屏区：突出「零元数据 · 100% 自托管 · 跨平台一键部署 · 7×24 智能与人工坐席客服 · 零代码规则与插件生态」，提供一键复制安装命令与双行动按钮。
3. 核心生态能力与安全优势矩阵：包含 BotFather 级多 Bot 沙箱工厂、7×24 机器人客服与工单协同、四大扩展插件（auto_reply、msg_router、llm_bridge、webhook_relay）以及私钥与 SQLite 本地主权安全机制。
4. 交互式安装与教程中心（Tab 切换）：提供 Ubuntu 22.04 生产部署（systemd）、macOS 原生部署（launchd）、本地开发调试及三步实战上手指南。
5. 开发者 Open API 与架构图：展示隔离网络拓扑及可复制的 POST /bot<token>/sendMessage 等 API 示例。
6. FAQ 与开源页脚：解答 AGPL-3.0 合规、多坐席客服、迁移与商业服务号区别等问题，附带开源许可与仓库链接。

3. 自动化自检与推送

1. 运行校验脚本断言 assets/js/i18n.js 中 18 个语种字典键名与基准语 en 100% 完全一致，HTML/JS/CSS 无语法错误。
2. 编写中英文 README.md / README.en.md 包含多平台静态托管配置说明。
3. 执行 git add . && git commit -m "feat(web): build 18-locale official website and tutorial portal for bot.popopx.chat" && git push origin main 完成推送并汇报结果。

