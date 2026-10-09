# 拾页外部开放设计接口核查

核查日期：2026-10-09（Asia/Shanghai）。基线：v1.9。方法：按 research 技能阅读第一方文档、作者仓库和许可证，并从本机做限定体积的匿名 GET。只编写本报告；未安装软件、执行远端代码、读取私有账号或凭证、注册应用、购买服务或修改来源清单。

## 1. 结论

**优先接 GitHub 官方 REST API 的公开仓库搜索及 Contents 接口。** 本机已实际取得搜索结果和固定 commit 的 Gaia 源码，可用于发现、核查开源版式规则。源码仍需审阅并转写为拾页 Canvas schema；搜索结果本身不能直接变成可用模板。第二个技术候选是 Wikimedia Commons Action API，用于照片／插画发现，**本机本轮连接超时，尚不能称接通**。Openverse 作为后备，当前也未取得本机成功响应。

当前项目已经有 **7 张 CC0 插画及 Gaia／White 两组本地版式适配**，不是此前报告中的 3 张基线；本报告未重复将它们计为新增。依据：[素材清单](../server/source-manifest.mjs)、[版式来源](../src/studio/open-designs.ts)、[上一轮研究](research-source-expansion-2026-10-09.md)。

| 来源 | 无密钥读取 | 获得什么 | 本轮判断 |
| --- | --- | --- | --- |
| GitHub REST：Search repositories + Contents | 公开资源支持；有匿名配额 | 仓库元数据、LICENSE、CSS／SCSS／Markdown 源文件 | 首选；本机成功，但有间歇超时 |
| Wikimedia Commons Action API | 官方支持匿名身份配额 | 图片及作者、来源页、许可证元数据 | 第二候选；本机未接通；不是版式模板 |
| Openverse /v1/images/ | 官方文档明确匿名和注册用户均可访问 | 跨站媒体索引与原站链接 | 后备；本机超时；需逐项回原站核许可 |
| Open Doodles／Open Peeps 官网下载 | 官网公开文件 | CC0 插画／人物部件 | 保持精选静态清单；未确认官方搜索 API |
| 小红书官方开放能力 | 需相应应用与授权 | 当前公开资料以账号基本资料、电商店铺能力为主 | 未找到公开笔记推荐流／全站搜索的官方通用接口 |

能力依据：[GitHub 搜索](https://docs.github.com/en/rest/search/search#search-repositories)、[Contents](https://docs.github.com/en/rest/repos/contents#get-repository-content)、[Wikimedia 2026 限流](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)、[Openverse API](https://api.openverse.org/v1/)、[Doodles](https://www.opendoodles.com/about)、[Peeps](https://www.openpeeps.com/)。小红书证据见第 6 节。

## 2. 本机受限验证记录

使用已有 D:/NodeJS/node.exe 内置 fetch 和 crypto；匿名、串行、无 Cookie／Authorization。请求 deadline 为 12 秒（部分连接由底层 10 秒超时先结束）；第一组响应上限 2 MiB，第二组 1 MiB。数据只进入内存；没有执行取得的文本，也未保存素材二进制。以下字节数是完整收到的正文长度，不是 HEAD 声明值。

| 请求 | 实际结果 | 验证范围 |
| --- | --- | --- |
| [GitHub 主题仓库搜索，3 项](https://api.github.com/search/repositories?q=marp%20theme%20license%3Amit%20archived%3Afalse&per_page=3) | HTTP 200；JSON 16,102 bytes；total_count=105、incomplete_results=false；限流头 limit=10, remaining=9 | 读到 kaisugi/marp-theme-academic、matsubara0507/marp-themes、dracula/marp；仅第一项进一步人工读源码 |
| [Gaia 固定 commit Contents](https://api.github.com/repos/marp-team/marp-core/contents/themes/gaia.scss?ref=fb41436e1db5b43a9f93d288ed361b2550408a0b) | HTTP 200；JSON 8,247 bytes；解码源码 5,261 bytes；限流头 limit=60, remaining=59 | 已读文本；SHA-256 为 2f53cf1ac6724f7166fb7c822c2cb429af8a3ed4934646f285f6ad5d17b56444 |
| [Academic 根目录](https://api.github.com/repos/kaisugi/marp-theme-academic/contents/) | HTTP 200；JSON 10,207 bytes | 有 LICENSE、themes、demo.md、演示 PNG／PDF；目录存在不证明附件均获根许可覆盖 |
| [Doodles coffee.png](https://opendoodles.s3-us-west-1.amazonaws.com/coffee.png) | HTTP 200；image/png；199,279 bytes；PNG 签名和 IHDR 正确；IHDR 2048 × 1536 | 完整正文 SHA-256 为 793535649593fc81741fd54a4d6d162364463a8d17ad4e9e9258d19fd575ac1c，与现有 manifest 一致；未做完整像素解码或 Canvas 导出 |
| Commons：第 4 节参数，2 项 botanical illustration 搜索 | ConnectTimeoutError | 未获得 HTTP 状态、JSON 或候选素材；不是零结果 |
| [Openverse：botanical、CC0、2 项](https://api.openverse.org/v1/images/?q=botanical&license=cc0&page_size=2) | ConnectTimeoutError | 未获得 JSON；浏览工具读取 API 首页另返回 403，不能据此判定全球停服或必需付费 |
| Gaia 固定 commit 的 LICENSE API、Academic 最新 commit API | 本机连接超时 | Marp 许可改由官方固定 tag 原文核实；Academic 未锁定 commit，仍为候选 |

GitHub 成功能证明该能力在本机可用过，不能证明稳定性或全部请求必成功。本轮没有循环重试。GitHub 返回的 sha 是 Git 对象标识，不能填入项目的文件 sha256 字段；本表 SHA-256 均由收到的原始文件字节计算。

## 3. 第一优先：GitHub 公开版式源码发现

### 精确接口与配额

建议后端限制 owner/repo/path，先用已有审核过的 Marp／reveal 路径验证更新，再将搜索结果放入候选队列。

| 用途 | 端点与输入 | 输出或处理 |
| --- | --- | --- |
| 发现仓库 | GET https://api.github.com/search/repositories；q=marp theme license:mit archived:false，per_page=3 | items、total_count、incomplete_results；license.spdx_id 只作线索 |
| 读取目录／文件 | GET https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={commit} | 小文件的 encoding=base64、content、size、sha；目录是数组 |
| 保留证据 | 同一固定 commit 的主题文件与 LICENSE | 自算 SHA-256，记录 revision、路径、完整许可证、作者与修改说明 |

公开 Contents 不要求 token；一般匿名 REST 配额是每 IP **60 次／小时**，匿名 Search 独立限制为 **10 次／分钟**。运行时遵循 x-ratelimit-*／Retry-After，403／429 停止本轮。代码搜索另有认证要求，本方案不依赖它。[配额](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)、[搜索](https://docs.github.com/en/rest/search/search)、[Contents](https://docs.github.com/en/rest/repos/contents#get-repository-content)

Contents 的 download_url 官方定义为会过期、应每次重新获取；优先对小文本解码 API 的 content，不持久化临时下载地址作唯一来源。使用固定 commit 的 html_url 作为人可读证据。[Contents 行为](https://docs.github.com/en/rest/repos/contents#get-repository-content)

### 可复用内容与准确许可

- **已有 Gaia／White**：Marp 原始 MIT 版权为 Copyright (c) 2018 Marp team；reveal.js 为 Copyright (C) 2011-2026 Hakim El Hattab … and reveal.js contributors。MIT 允许修改与分发，要求在复制件／实质部分保留版权和许可声明。继续保留现有本地 LICENSE 与修改记录；不把 CSS 引用的字体和第三方依赖默认为 MIT。[Marp LICENSE](https://raw.githubusercontent.com/marp-team/marp-core/v4.4.0/LICENSE)、[reveal LICENSE](https://raw.githubusercontent.com/hakimel/reveal.js/6.0.2/LICENSE)
- **新增研究候选 Academic**：作者的 [academic.css](https://github.com/kaisugi/marp-theme-academic/blob/main/themes/academic.css) 包含白底、酒红 #800000 强调、标题栏、封面文字定位、页码及底部脚注规则，属于版式源码。根 [LICENSE](https://github.com/kaisugi/marp-theme-academic/blob/main/LICENSE) 为 MIT，版权 Copyright (c) 2022 Kaito Sugimoto。可考虑转写讲义标题栏与脚注页型；本轮未锁定 commit 或计算该 CSS 的文件哈希，未达到自动 acquire 准入条件。
- Academic CSS 导入 Gaia 且引用 Google Fonts；[demo.md](https://github.com/kaisugi/marp-theme-academic/blob/main/demo.md) 明确要求另从 Irasutoya 下载图片。**候选范围只到 CSS 规则，排除演示截图、PDF、图像和外部字体**。沿用 Gaia 的实质内容时也应保留 Marp 声明；不能依据根 MIT 标签批准附带第三方图像。

**实施建议**：现有 OPEN_DESIGNS 是精选人工适配列表，新增连接器适合发现候选／提示上游变更。审阅后再转成受限 JSON，验证中文长标题、长正文与移动导出。不要运行任意远程 SCSS、Markdown HTML 或仓库构建脚本。搜索 pushed_at 是仓库推送时间，不是模板发布日期；本次三项结果最近推送分别在 2023／2020／2022 年，也不代表最新设计趋势。

## 4. 第二候选：Wikimedia Commons 媒体发现

基础入口为 GET https://commons.wikimedia.org/w/api.php。可把 Search generator 与 imageinfo 合并请求。[Commons 示例](https://commons.wikimedia.org/wiki/Commons:API/MediaWiki)、[Search](https://www.mediawiki.org/wiki/API:Search)、[Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo)

本次未成功的请求参数如下；后续应将 Attribution 也加入 metadata filter：

~~~text
action=query
format=json
formatversion=2
generator=search
gsrsearch=botanical illustration
gsrnamespace=6
gsrlimit=2
prop=imageinfo
iiprop=url|size|mime|sha1|extmetadata
iiurlwidth=640
iiextmetadatafilter=Artist|Credit|LicenseShortName|LicenseUrl|UsageTerms|AttributionRequired|Copyrighted|Restrictions
maxlag=5
~~~

预期 query.pages[].imageinfo[0] 提供原图、文件说明页、尺寸、MIME 与 extmetadata；640 宽度用于缩略图，不代表原图已下载。它返回图片／插画，不含可编辑标题、文本块与图片槽位。[Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo)

许可不能简化为 Commons 都是 CC0。保留 Artist、Credit、Attribution（若有）、LicenseShortName、LicenseUrl、UsageTerms、Restrictions；这些字段可能含 HTML。官方明确多重许可项目的部分许可字段不可靠，必须回看文件页。[CommonsMetadata](https://www.mediawiki.org/wiki/Extension:CommonsMetadata)、[站外复用说明](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)

项目首版可只接受明确 CC0 条目。CC0 不要求版权署名，保留作者／原页仍利于追溯。支持 CC BY 4.0 时，要适当署名、链接许可、说明修改，并设计随导出保留归属的流程。CC BY-SA、多重许可与声明不清的公共领域项目先人工审阅，不按关键词自动批准。[CC0](https://creativecommons.org/publicdomain/zero/1.0/)、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

**2026 限流变化**：官方新规则列出未识别客户端 **10 次／分钟**、带合规 User-Agent 的匿名机器人 **200 次／分钟**；规则仍可能调整。需真实联系 URL／邮箱的识别信息、缓存、串行请求并遵循 429／503 的 Retry-After。建议拾页先按手动单次 2–5 条，远低于配额；这是项目限制而非平台许可。不能引用旧文档的“读取没有硬速度限制”作当前承诺。[2026 配额](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)、[API 礼仪](https://www.mediawiki.org/wiki/API:Etiquette)

本机未取得 Commons 结果，不能提供本轮已核准的新图片或 SHA-256。此项只能显示待连通性验证。

## 5. Openverse 与精选 CC0 插画

### Openverse：后备

官方 [API 文档](https://api.openverse.org/v1/) 明确支持匿名访问。候选请求为 GET /v1/images/?q=botanical&license=cc0&page_size=2；结果可有原站页、原图、作者、许可、归属信息，仍需按单个结果核原站。当前文档以响应头作为配额依据，超额为 429；本轮未取得成功响应头，**不填写未经实测的固定匿名次数**。注册提升配额需要 client_id／secret 和验证邮件，本轮未注册。

该文档通过搜索引擎四天内第一方缓存读取；直接抓取 API 首页为 403，本机搜索超时，证据等级低于 GitHub 成功 GET。indexed_on 只是收录时间，不能当作品发布日期；本轮不把实验性 collection／sort 参数作为稳定接口保证。

Openverse 条款要求自行核实作品许可、遵守托管站条款，并显著说明产品使用 Openverse 且未获其背书；禁止刮取整个目录，保留对高用量／商业用量收费的权利。它是当前可匿名访问的媒体索引，不能承诺永久免费或将所有项目称为可再分发模板。[官方条款第 2–5 节](https://docs.openverse.org/terms_of_service.html)

### Open Doodles／Open Peeps：精选静态素材

两库作者为 Pablo Stanley，官网声明 CC0，提供 SVG／PNG 或人物组合源文件。本轮未在官网确认有版本、查询参数、配额文档的官方搜索 API。继续通过官网精确下载链接维护精选清单；S3／CDN 文件地址不是新模板订阅 API。[Doodles About](https://www.opendoodles.com/about)、[Peeps 官网](https://www.openpeeps.com/)

coffee.png 的完整字节摘要与 manifest 一致，见第 2 节。这证明一个已有静态文件当前可取得，不是新增素材，也不能推断其他 CDN 地址均有效。插画不构成含可编辑文字层级的模板；CC0 未一并保证商标、肖像等其他权利。[CC0](https://creativecommons.org/publicdomain/zero/1.0/)

## 6. 小红书官方能力补核

官方 openaccount 的 [Scope 页面](https://openaccount.xiaohongshu.com/docs/scope)（标记更新于 2026-03-29，本轮依赖上周第一方搜索缓存）仍写首期只开放 basic_info；read_notes 规划中，描述为读取用户发布的笔记。即便后续开放，也不能由名称推导为全站搜索／推荐流。直接页面本轮未能展开，未登录后台验证申请能力。

另一套 [电商开放平台](https://open.xiaohongshu.com/) 明确面向店铺授权与商家自研；[开发说明](https://open.xiaohongshu.com/document/developer/file/33) 和 [API 目录](https://open.xiaohongshu.com/document/api?apiId=22012&apiNavigationId=99&apiParentNavigationId=14&gatewayId=103&gatewayVersionId=1661&id=22) 展示订单、商品、库存、物流、售后等能力。图片工具／素材中心面向商家业务，不能当成公开笔记素材搜索。

严谨结论为：**本轮公开官方文档中未找到可供拾页直接使用的公开笔记列表／全站搜索通用 API**；不对未公开合作能力作不存在断言。第三方 xiaohongshu-mcp 是另一条本地浏览器适配路径，其正常登录与只读实验由主任务验证，不属于官方 API 认证。本报告没有读取实际账号或笔记。

## 7. 建议落地顺序与准入标准

以下为项目实施建议，不是外部平台能力承诺：

1. **先做 GitHub 只读发现连接器**：一次最多 3–5 个仓库，缓存元数据；候选与可用模板分开。先查 Marp／reveal 已核准路径，再审 Academic 固定 commit 的 CSS 与 LICENSE。
2. **区分来源类型**：layout-source 是待转换源码，illustration 是装饰图，inspiration 是只可参考内容。只有本地 Canvas 数据通过适配验收才标可编辑模板；本轮未新增代码字段。
3. **媒体接口随后接通**：Commons 成功返回小样本并核清单项许可后，再限定下载一张图，校验 MIME／签名、大小、实际解码尺寸、SHA-256 与 Canvas 导出。HTML 元数据只按安全文本显示；不把远程图直接当永久导出依赖。
4. **连接状态诚实**：超时、403／429、许可待确认、待转换分别保留，不能统一算作零新增或成功。仓库更新时间与媒体收录日期不代表小红书当前流行趋势。
5. **携带来源许可**：源码保留固定 revision、LICENSE 全文及作者；媒体保留原页、作者、明确许可及修改信息。Canva／Figma 社区项目没有逐项可再分发许可证据，就不能纳入开放模板清单。本轮未从这些社区获取素材。

本次没有新增已批准的模板／素材。实测通过的是 GitHub 公共发现／文件读取能力与一个已有 CC0 文件；Commons、Openverse 及小红书真实内容接入仍分别保留上述限制。

