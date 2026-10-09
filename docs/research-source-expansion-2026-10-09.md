# 拾页下一阶段来源扩展核查

核查日期：2026-10-09（Asia/Shanghai）。范围：v1.7 之后的研究建议；本报告不改变产品或来源清单。方法：阅读第一方公开文档、固定版本源码、发布附件元数据和公开素材链接；浏览工具无法展开的链接用公开 HTML／HTTP HEAD／GitHub tree API 补核。没有安装或运行采集器、登录账号、请求账号内容、下载可执行文件或素材包。

## 1. 结论与当前基线

- **已核实的项目事实**：现有清单只有 Open Doodles reading、plant 与 Open Peeps peep-76 三张 CC0 PNG；来源任务检查固定清单，个人小红书状态仍为 `not_connected`。[来源清单](../server/source-manifest.mjs)、[来源任务](../server/source-jobs.mjs)、[上一轮核查](v1.3-source-readiness.md)
- **任务上下文**：用户此前已接受“本人账号、正常登录、个人只读实验”，但还没有完成登录。本报告没有把已有授权扩大到发帖、互动、他人账号或云端采集。
- **实施判断**：下一步适合先增加下文 4 张许可与原始链接明确的装饰图，同时制作 2 组由开源主题转写的本地 Canvas 版式。第三方小红书接入可以准备 Windows 本地适配器和正常扫码流程；实际可用性仍须登录后少量人工验收，不应显示“已接通”。
- **不能混同**：小红书工具的软件接口不等于平台官方内容 API；CC0 插画不等于可编辑版式；开源 CSS 主题也不等于已经兼容移动 Canvas 的模板。依据及转换边界见后文。

## 2. 第三方小红书工具：锁定 v2.5.5

### 2.1 可执行文件与启动边界

当日发布页的 Latest 是 **v2.5.5**，发布于 2026-09-22，提交短号 `a5c8f77`，构建时间为 2026-09-22T18:53:53Z。发布附件提供 Windows x64、Linux x64、macOS Apple Silicon 的服务与登录工具；不要据此宣称 Windows ARM64 原生支持。以下是发布附件的真实链接及发布者展示的 SHA-256，本轮没有下载文件重算。[发布页](https://github.com/xpzouying/xiaohongshu-mcp/releases/tag/v2.5.5)、[附件及摘要](https://github.com/xpzouying/xiaohongshu-mcp/releases/expanded_assets/v2.5.5)

| 文件 | 规范下载链接 | 发布页 SHA-256 |
| --- | --- | --- |
| Windows x64 服务，14.9 MB | [xiaohongshu-mcp-windows-amd64.exe](https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5/xiaohongshu-mcp-windows-amd64.exe) | `cb55674f90c1649c875be9c4cde3af193b02fc34ffc860c40c8d711e6ca53e27` |
| Windows x64 登录工具，10.3 MB | [xiaohongshu-login-windows-amd64.exe](https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5/xiaohongshu-login-windows-amd64.exe) | `edc313583d681701095e57688069a263ea06fa83f2e6a82c2d8578f8ba1224cd` |

服务入口定义了 `-headless`（默认 true）、`-port`（默认 `:18060`）、`-token`（空时读取 `AUTH_TOKEN`）。服务把 port 字符串直接交给 HTTP Addr，所以建议显式使用 `-port 127.0.0.1:18060`。登录工具使用可见浏览器；当前入口没有定义旧教程常见的 `-bin` 参数。发布说明说初次运行会下载约 150 MB 浏览器，服务源码也在启动时准备浏览器，不能把 EXE 大小当作完整安装成本。[服务入口](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/main.go)、[监听实现](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/app_server.go)、[登录入口](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/cmd/login/main.go)、[发布说明](https://github.com/xpzouying/xiaohongshu-mcp/releases/tag/v2.5.5)

**文档与源码差异**：发布说明写 Cookies 在 `~/.xiaohongshu/cookies.json`，但固定版本源码的默认文件名是当前目录的 `cookies.json`：先取显式 `COOKIES_PATH`，其次现有当前目录文件，再兼容系统临时目录文件，最后返回当前目录文件名。建议登录与服务共用一个明确的绝对 `COOKIES_PATH`，放在单账号私有目录；不要按发布文案猜路径。[Cookie 源码](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/cookies/cookies.go)、[发布文案](https://github.com/xpzouying/xiaohongshu-mcp/releases/tag/v2.5.5)

Bearer Token 是采集服务的静态访问口令；空口令会关闭鉴权，且它同时保护只读和写入路由，不能充当“只读权限”。上游还允许 CORS `*`。**建议**只由拾页 Node 后端持有该 Token，手机 React 端只访问拾页自己的受控接口。[鉴权与 CORS](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/middleware.go)、[完整路由](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/routes.go)

### 2.2 已有接口契约与最小允许清单

以下“已核实”只表示 v2.5.5 的路由、结构体与处理器存在，**不是本人的账号请求已成功**。REST 成功外层为 `{success:true,data,message?}`，失败外层为 `{error,code,details?}`；详情有两层 data，不应套用列表解析器。[HTTP 类型](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/types.go)、[处理器](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/handlers_api.go)

| 用途 | 上游 REST／MCP 名 | 精确输入与输出要点 | 拾页建议 |
| --- | --- | --- | --- |
| 登录状态 | GET `/api/v1/login/status`／`check_login_status` | `data.is_logged_in:boolean`；可选 `username,user_id` | 允许；身份字段可能缺失，不能以缺昵称判未登录 |
| 推荐流 | GET `/api/v1/feeds/list`／`list_feeds` | `data.feeds[]` 与 `data.count` | 允许一次小样本读取 |
| 搜索 | POST `/api/v1/feeds/search`／`search_feeds` | `{keyword,filters?}`；同列表输出。另有 GET，但 GET 只读取 keyword | 只开放 POST；参数服务器校验 |
| 详情 | POST `/api/v1/feeds/detail`／`get_feed_detail` | `{feed_id,xsec_token,load_all_comments:false}`；`data.feed_id`、`data.data.note`、`data.data.comments` | 允许限定数量；强制 false，不收评论进入来源库 |
| 正常扫码 | GET `/api/v1/login/qrcode`／`get_login_qrcode` | `data:{timeout,is_logged_in,img?}` | 仅用户主动发起的登录流程；不纳入日常采集允许清单 |

路由与方法依据：[routes.go](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/routes.go)。登录／二维码返回依据：[service.go](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/service.go)。搜索、详情请求依据：[types.go](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/types.go)、[handlers_api.go](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/handlers_api.go)。

搜索筛选键和值为：

- `sort_by`：综合／最新／最多点赞／最多评论／最多收藏。
- `note_type`：不限／视频／图文。
- `publish_time`：不限／一天内／一周内／半年内。
- `search_scope`：不限／已看过／未看过／已关注。
- `location`：不限／同城／附近。

这些是网页筛选，源码读取页面 `__INITIAL_STATE__`；不是全站榜单或官方搜索授权。首轮建议空 filters，减少页面动作；筛选值不合法在 Node 层直接拒绝。[固定版本搜索源码](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/xiaohongshu/search.go)

列表项含 `id,xsecToken,modelType,noteCard`；卡片有标题、作者、封面与互动字段。详情 note 还含 `noteId,title,desc,type,time,user,interactInfo,imageList`，视频字段可选。互动计数是字符串；列表没有发布时间字段。建议保存原始计数、精度和 observedAt；空值保持未知。[数据结构](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/xiaohongshu/types.go)

维护者 API 文档明确：推荐流通常只下发 liked 与 likedCount，其余互动量可能为空字符串；详情 `time` 按毫秒解释。详情默认仍有首批评论，所以 `load_all_comments:false` 不能称为“上游完全不读取评论”；拾页应丢弃 comments，而非保存全部原始响应。[API 文档](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/docs/API.md)、[详情实现](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/xiaohongshu/feed_detail.go)

**默认拒绝其余全部入口**，包括发布／视频发布、评论／回复、点赞／取消、收藏／取消、删 Cookies、用户主页、我的主页和所有通知接口，也不把完整 `/mcp` 透传给前端或业务 AI。特别是 `list_notifications` 虽标 ReadOnlyHint，却明确会清除对应分区未读；`get_unread_count` 也因不在本次目的内而排除。业务允许清单应按具体方法、路径和固定参数实现，不能按 HTTP GET 或 ReadOnlyHint 判断。[工具定义](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/mcp_server.go)、[路由](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/routes.go)

### 2.3 正常登录、停机与已知不确定性

二维码实现打开正常 explore 登录页面，读取二维码 img 的 src；未登录时保留浏览器，后台等待 **4 分钟**，成功后保存 Cookies。重新取码会替换尚在等待的旧会话；建议 UI 不自动连续刷新二维码，也不要把 GET 获取二维码视为无会话副作用。二维码本身只短时展示，不写日志／共享候选。[二维码会话](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/service.go)、[页面登录实现](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/xiaohongshu/login.go)

以下为**需补的适配策略**，不是上游保证：

1. 首轮手动触发：正常扫码、检查登录，再做一次列表或一个关键词，至多 3 条详情；这只是项目试验上限，不是平台许可额度。
2. 登录失效 → `needs_login`；明确出现验证码／安全验证 → `challenged`；明确访问限制 → `restricted`；无法判别的解析／超时错误 → `needs_attention`。立即停后续队列，保留人工恢复入口；不自动换账号、代理、指纹，不解验证码，不循环刷新或重试。
3. 上游状态检查依赖 DOM，不能可靠区分所有验证码、页面变更与网络故障；不能把一般 500 错误硬翻译为“未登录”，也不能把解析失败当“零新增”。[状态检查](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/xiaohongshu/login.go)、[错误响应](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/handlers_api.go)
4. **上游实现限制**：详情函数有最多 3 次导航重试和 10 分钟页面超时，还会记录完整详情 URL（可能含 xsec_token）。仅关闭业务层重试不能保证上游没有重试。Node 应在落盘／展示前过滤 sidecar 输出中的令牌，提供请求期限与取消，首次挑战立即终止试验；严格“挑战后零内部重试”仍需针对固定源码审计／修补及真实验收。[详情源码](https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/v2.5.5/xiaohongshu/feed_detail.go)
5. 将 Cookie、AUTH_TOKEN、xsec_token 与原始错误详情留在私有会话层；共享来源只保存规范链接、必要摘要、自写分析和授权状态。浏览笔记的授权不能推导为允许再分发其全文、图片或模板。

### 2.4 官方 openaccount 的可用范围

截至本轮，官方 Scope 页仍只把 `basic_info` 标为已开放；`user_profile/read_notes/write_notes/read_followers` 是规划中，且 read_notes 的说明是读取用户发布的笔记，不是全站发现。[官方 Scope](https://openaccount.xiaohongshu.com/docs/scope)

官方 API 目录列的是授权、Token、基本资料、扫码、撤销等，本轮未找到推荐流／全站关键词搜索接口。应用需创建与审核后取得凭证。因此 OAuth 登录不能成为“官方灵感内容源已接通”的证据；以上第三方 REST 也不能称为小红书官方 API。公开文档不代表对未公开合作能力作不存在断言。[官方 API 参考](https://openaccount.xiaohongshu.com/docs/api-reference)、[快速接入](https://openaccount.xiaohongshu.com/docs/quick-start)

证据等级：API 参考本轮能直接打开；Scope 直接打开失败，结论依赖搜索工具当周缓存的同域第一方页面（页面更新标记 2026-03-29），与官方快速接入索引一致。没有登录管理中心或验证获批权限。

## 3. 公开素材：先增加 4 张，不称为 4 个模板

### 3.1 三个插画库许可复核

| 来源 | 第一方证据与作者 | 本轮判断 |
| --- | --- | --- |
| Open Doodles | 作者 Pablo Stanley；About 明确 CC0，提供 SVG／PNG 及源文件。[About](https://www.opendoodles.com/about)、[资产首页](https://www.opendoodles.com/) | 可修改、商用和再分发这些 CC0 插画；是装饰图／插画组合，不是文字排版模板 |
| Open Peeps | 首页明确 Pablo Stanley、CC0，列出可直接下载的 PNG／SVG 与组合式人物部件。[官网](https://www.openpeeps.com/) | 可纳入精选装饰图清单；人物组合不等于含标题、正文、图片槽位的整页模板 |
| Humaaans | 首页明确 Pablo Stanley、CC0，并演示 onboarding／grid／状态页模板；下载跳至作者 Gumroad。[官网](https://www.humaaans.com/)、[作者下载页](https://pablostanley.gumroad.com/l/humaaans) | 许可明确，但本轮未取得无交互的单项源文件规范链接，也未检查包内文件。保持待人工获取；不把网站预览图或 Blush 其他库直接批量入库 |

CC0 允许复制、修改和分发，包括商用，无需请求许可；不豁免商标、隐私等其他权利，也不允许暗示作者背书。建议仍显示来源作者并保留核查证据，作为产品的可追溯设计。[Creative Commons CC0](https://creativecommons.org/publicdomain/zero/1.0/)

### 3.2 可供下次 acquire 的最小候选清单

这 4 项均不在现有 3 项中；建议追加前仍走原有 acquire 校验与人工审核。作者均为 Pablo Stanley，license 均为 `CC0-1.0`。图名只作资产标识，具体中文标题在视觉检查后确定。原链接来自官网显式 PNG 下载链接，不是猜出的 CDN 路径。[Doodles 下载入口](https://www.opendoodles.com/)、[Peeps 下载入口及许可](https://www.openpeeps.com/)

| 拟用 id／sourceId | 原始文件规范 URL | licensePageUrl | 本轮验证 |
| --- | --- | --- | --- |
| `doodles-coffee`／`open-doodles` | [coffee.png](https://opendoodles.s3-us-west-1.amazonaws.com/coffee.png) | [About](https://www.opendoodles.com/about) | 官网 PNG 链接；浏览工具可打开文件 |
| `doodles-doggie`／`open-doodles` | [Doggie.png](https://opendoodles.s3-us-west-1.amazonaws.com/Doggie.png) | [About](https://www.opendoodles.com/about) | 官网 PNG 链接；大小写应保留；浏览工具可打开 |
| `peeps-77`／`open-peeps` | [peep-77.png](https://cdn.prod.website-files.com/5e51c674258ffe10d286d30a/5e535aa79588e0c5d87f92d8_peep-77.png) | [官网](https://www.openpeeps.com/) | 官网 HTML 提取；HEAD 200、image/png、55,487 bytes |
| `peeps-10`／`open-peeps` | [peep-10.png](https://cdn.prod.website-files.com/5e51c674258ffe10d286d30a/5e5351622b568a551d15f08c_peep-10.png) | [官网](https://www.openpeeps.com/) | 官网 HTML 提取；HEAD 200、image/png、61,584 bytes |

本轮没有读取二进制完整内容，所以 **sha256、真实解码尺寸及 PNG 完整性仍未核实**；HEAD 长度不是内容摘要。不要以空哈希或占位尺寸直接塞入生产清单。建议下载时一次完成文件签名、字节上限、解码尺寸、SHA-256、许可证据快照／摘要和移动 Canvas 导出检查，再填既有 manifest 必填字段。上述文件允许复用的证据来自各官网对应库的 CC0，而不是 CDN 的公开可访问性。

unDraw 与 Storyset 保持排除：unDraw 当前许可限制素材打包再分发、相似服务及自动／非自动整合；Storyset 条款第 6 节禁止原作或衍生作进入分发／转售素材库，并限制转授权与自动代客制作。[unDraw 当前许可](https://undraw.co/license)、[Storyset 当前条款](https://storyset.com/terms)

## 4. 两个真正包含版式／主题源码的补充仓库

这两类可提供文字层级、色板、间距、标题页及内容页规则，价值与插画不同；它们仍是 **Web 幻灯主题**，需要转成拾页 Canvas schema，不能把远程 SCSS 当成即插即用模板。

| 第一方来源与固定修订 | 可复用源码的规范 URL | 许可与署名 | 建议与边界 |
| --- | --- | --- | --- |
| Marp Core `v4.4.0`，`fb41436e1db5b43a9f93d288ed361b2550408a0b`；当日 latest 稳定版仍是 v4.4.0，v5 为 prerelease。[发布页](https://github.com/marp-team/marp-core/releases) | [Gaia SCSS](https://raw.githubusercontent.com/marp-team/marp-core/fb41436e1db5b43a9f93d288ed361b2550408a0b/themes/gaia.scss)、[Default SCSS](https://raw.githubusercontent.com/marp-team/marp-core/fb41436e1db5b43a9f93d288ed361b2550408a0b/themes/default.scss) | MIT；根声明 © 2018 Marp team，主题头作者 Yuki Hattori。分发复制件／实质部分须保留版权与完整许可。[固定版本 LICENSE](https://raw.githubusercontent.com/marp-team/marp-core/v4.4.0/LICENSE) | 优先移植 Gaia 色板与层级，制作“封面＋正文”两种自有数据布局。源码标明原比例 16:9／4:3；Gaia 引用 Bunny 字体和 highlight.js 样式，Default 引用 github-markdown-css。首轮不连带打包这些依赖；改用已核准本地字体并记录改动 |
| reveal.js `6.0.2`，`75dff6f515d2d08df0c32cf2b7328b89425c6f25`；当日 latest。[发布页](https://github.com/hakimel/reveal.js/releases) | [White SCSS](https://raw.githubusercontent.com/hakimel/reveal.js/75dff6f515d2d08df0c32cf2b7328b89425c6f25/css/theme/white.scss)、[Simple SCSS](https://raw.githubusercontent.com/hakimel/reveal.js/75dff6f515d2d08df0c32cf2b7328b89425c6f25/css/theme/simple.scss) | MIT；根声明 © 2011–2026 Hakim El Hattab and reveal.js contributors；Simple 另含 © 2012 Owen Versteeg。复制 Simple 时同时保留该头声明与完整 MIT。[固定版本 LICENSE](https://raw.githubusercontent.com/hakimel/reveal.js/6.0.2/LICENSE) | 优先移植 White 的黑白层级／蓝色强调；同样制作封面＋正文。Simple 引入 Google Fonts，White 引用 Source Sans Pro 本地字体 CSS；不要把根 MIT 自动扩展到字体文件或第三方内容 |

固定修订号与路径由第一方 GitHub tree API核实：[Marp tree](https://api.github.com/repos/marp-team/marp-core/git/trees/v4.4.0?recursive=1)、[reveal tree](https://api.github.com/repos/hakimel/reveal.js/git/trees/6.0.2?recursive=1)。四个固定 commit 的 raw 源码均用普通 HTTP GET 返回 200 并检查正文；浏览工具对部分 raw 文件显示 cache miss，不代表文件不存在。reveal 6 的源码路径是 `css/theme/white.scss`，旧 `css/theme/source/white.scss` 本轮返回 404；不要复用旧路径。[当前主题文档](https://revealjs.com/themes/)

**实现判断**：MIT 允许修改、商用与再分发并要求保留版权／许可；这不要求在每张用户导出 PNG 上盖来源字样。建议随模板包保留完整 LICENSE、作者、源文件路径、固定 revision 与改动记录，应用“来源说明”能查看；模板内容若含第三方照片、字体、Logo，仍单独逐项核许可。首轮只移植已阅读的主题规则，不复制演示内容、整套 JS 运行时或外部依赖。

## 5. 与 React／TypeScript Canvas + Node 的分阶段方案（建议）

1. **资料与素材阶段**：维持公开素材定时作业原入口，只在人工完成逐项下载验证后扩展 4 个 PNG 清单项。候选新增、重复、更新、失败沿用现有行为；许可证据变化进入复核，不自动撤换已审核内容。[当前任务实现](../server/source-jobs.mjs)
2. **可编辑模板阶段**：单独建立 `layout-template` 概念，登记 `sourceRepo,revision,sourceFiles,licenseId,licenseText,author,modifications`。以 Gaia／White 各做一组标题页与内容页，将色板、字号比例、边距、正文槽位转写为 TypeScript 数据；图片槽可选引用 4 张 CC0 图。以 3:4／1:1 的中文长短文本、照片替换、可编辑性和导出结果验收，不能只验预览截图。
3. **小红书准备阶段**：独立 Node adapter → 回环 sidecar；只允许上表四种内容操作，扫码作为用户会话动作。绑定固定 EXE SHA-256、显式 Cookie 路径、静态 Bearer，严格参数 schema、单实例互斥、取消、脱敏日志。先用固定 fixtures 验证字段映射、令牌不泄漏、未知计数、DOM 失败与状态迁移。
4. **已授权的人工实验阶段**：正常登录后执行小样本，将成功证据、失败类型和最后成功时间写入本地私有任务记录；只生成待审引用候选。真实体验通过前，产品状态继续说明尚未连接／待人工处理，不承诺实时、每日新增或平台稳定性。
5. **后续阶段**：再评估定时频率与持久会话；不要直接把公开素材的每日 09:00 作业套到账号采集。电脑离线／关闭时不能运行的现有本地限制仍须如实显示。[本地调度实现](../server/source-jobs.mjs)

本报告核实了“源码具有什么接口、发布者提供什么文件、哪些资产如何许可”；没有核实账号可用性、平台对自动化的许可、挑战检测完备性、二进制行为与源码完全一致、素材最终视觉质量或模板转写效果。这些验收项仍属未来工作。
