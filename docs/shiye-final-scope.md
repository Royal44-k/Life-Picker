# 拾页 v1.5 本机最终版范围核对

2026-10-07，承接 docs/shiye-next-design.md；本机个人使用功能完成整合，外部条件明确单列。不是“上线商业产品 / 公网全天运行”的完成声明。

| 方案能力 | 当前入口与结果 | 验证依据 |
| --- | --- | --- |
| v1 保留、旧稿复制迁移 | 经典 v1 独立旧存储；v1.0～v1.4 标签与源码留档保留 | Git 标签、逐文件源码归档核对；studio-migration |
| 原文保全与智能分镜 | 创作：Markdown 章节、6 / 9 软目标、目录、封面 / 封底、内容守恒与溢出校验 | content/core/story/page-ai 模块；studio-browser |
| 图解、单页编辑与模板 | 12 原创结构、金字塔 / 步骤 / 对比 / 时间线 / 清单、编辑 / 锁定 / 排序 / 拆分 / 合并 / 撤销 | templates-page-ai、template-photo-paint、studio-invalid-edit |
| 照片自主移除、恢复、选页下载 | 创作与随心记共用素材；引用保护、撤销；指定页 PNG、整篇 ZIP 同一画面 | user-feedback-browser、media-lifecycle、真实 PNG 检查 |
| 照片拍摄日确认 | 本机 DateTimeOriginal；多日期自主采用、继续手改；未知明确提示；图片重编码移除原 EXIF | photo-date.test、photo-date-browser；真实 JPEG 和 ZIP 往返 |
| 文案 AI / 分镜 / 单页建议 | DeepSeek 已有配置、可取消、先检查再应用；原文与过期修订受保护 | ai/storyboard/page-ai 模块与浏览器模拟返回 |
| 随心记与原话簿 | 文字 / 图 / 标签 / 检索 / 收藏 / 续记；原话快照、出处、选句到公开副本 | journal/quotes 模块、4 个 quotes 浏览器流程 |
| 小拾形象与成长 | 原创 SVG 纸页精灵；4 款书签外观、5 项纪念；真实保存成长、不惩罚断更、隐藏 / 键盘避让 / 减少动态 | companion 模块、storage、growth/errors 浏览器 |
| 情境提问与回忆引导 | 当前记录给本地问题；先保存再转公开副本 / 同月回忆；明确提問不冒充视觉分析 | companion-growth、companion.test |
| 手选素材和 AI 聊天 | 默认不附带历史；最多选 3 条文字 / 3 张压缩照片；AI 建议另存有来源提示 | chat 模块、companion-browser；未选文字 / 私藏标签不发送 |
| 周月年回忆图文册 | 多日期抽样、锁定 / 排除 / 换组、手选、确认快照；独立改写 / 公开副本 | memory-selection、memory-browser/errors/storage |
| 回忆短片 | 15 / 20 / 30 秒，最多 12 页，720×1280 H.264 / 可选 AAC；本机 FFmpeg、状态 / 取消 / 找回 | video 模块、生命周期浏览器、真实 15s / 30s 渲染核验 |
| 备份恢复与错误容错 | 文字 + 照片 + 引用 / 原话；小拾可选资料向旧包兼容；冲突整体拒绝、恢复新身份 | checked-zip、backup、journal-backup 与存储故障测试 |
| 首页参考与开放素材 | 参考有原链接 / 时间或未知 / 自写分析；手动审核；3 项核验 CC0 PNG 候选 | sources/inspiration 模块与模拟来源浏览器 |
| 来源每日检查 | 电脑运行时北京时间 09:00 检查固定开放资产；手动同任务、去重、真实状态、可关闭 | sources-jobs、collection-browser/races |
| 个人系列与发布回看 | 系列主题 / 默认外观、自己的记录写下一篇；手填发布链接 / 数据 / 心得 | series 模块、storage/browser/assignment |
| AI 用量与预算 | 5 类云端 AI + Ollama 账本；默认月预算 20 元；未知费用保留、对账、导出 | usage-api/store、usage-browser/offline |
| 离线壳与本地使用 | 安全来源已缓存后可记录、排版、换装、原话、备份；AI / 短片需服务 | 生产 Node 服务 PWA 套件；不等同局域网 HTTP 离线保证 |

## 已明确暂停或尚未成立的条件

- 公网 HTTPS、手机不同网络 / 电脑关机后全天使用：用户已暂缓服务器 / 域名准备，本次不注册、不购买、不部署。
- 多用户账户、私有云备份、跨设备同步及多用户隔离：当前本机单用户连接码不是公网账户系统。这一部署范围尚未实施。
- 小红书本人正常登录只读采集、近日爆款和实际互动数：未连接可验证账号环境；不虚构实时榜单、不替代为插画采集。“自动更新”目前仅为固定开放素材检查。
- “首创 / 能保证爆款 / 已有付费价值”：没有这类验证结论。真正区别在个人原话、经历、确认副本、系列与回看形成持续内容积累，仍需真实创作者试用。
- 9 人两周试用、效率降低 50%、复用 / 满意度与月费不超过 100 元：均为待验证目标。AI 用量记录可提供输入，但未产生云端正式运营账单。
- iPhone 13 Safari 真机 HEIC、键盘 / 分享 / 长按与存储压力：Windows Edge 手机视口和离线自动化无法替代；按 guide-v1.5.html 最后六步验收。

## 技术取舍

继续 React / TypeScript / Vite + Canvas + IndexedDB + SVG / CSS + Node / FFmpeg；没有为装扮接入收费数字人平台。照片读取使用 exifr 7.1.3，保留相机日历日，仅选 DateTimeOriginal，禁用 GPS；未来或无效值不作为可采用日期。备份校验只验证有效日历日，不因不同设备当前时间改变既有照片记录。

原始研究与竞品依据保留在既有研究和设计文档，v1.5 没有虚称重新进行全市场调查。新日期能力依据 [exifr 官方仓库](https://github.com/MikeKovarik/exifr)。依赖审计和完整验证实际结果见 release-v1.5.md。
