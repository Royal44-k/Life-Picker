# 项目资产分类与保存范围

本目录整理可公开的产品资产；原始源码路径保持不变。完整文件及 SHA-256 位于 [file-manifest.json](file-manifest.json)，版本包清单位于 [versions.json](../../archives/versions.json)。

| 资产类别 | 保存内容 |
| --- | --- |
| 产品知识 | 从最初需求到当前定位的演变、原始规格、完整设计、需求追踪、研究索引 |
| 研发 | 原始实现、提示词、响应 schema、测试、构建和配置示例 |
| 视觉 | 角色 SVG / CSS、模板结构、主题、图标；四张已检查的测试演示 |
| 研究与许可 | 带日期的研究报告、官方链接、固定源码版本、许可原文和改编说明 |
| 版本 | 12 个原标签及原始 ZIP、原校验文件、统一 SHA-256 清单 |
| 验证 | 历代发布 / 实施 / 评审 / 验收，精选脱敏原始结果 |
| 交接 | Windows 启动与 AI 配置脚本、手机 HTML 指南、新设备与旧版恢复说明 |

## 演示图

| 文件 | 内容与来源 |
| --- | --- |
| [home.jpg](screenshots/home.jpg) | 四入口首页；navigation-browser 的隔离测试页面 |
| [xiaoshi.jpg](screenshots/xiaoshi.jpg) | 小拾外观与纪念；pwa-companion 测试截图 |
| [storyboard-history.png](screenshots/storyboard-history.png) | 分镜、选页导出等历史测试画面；studio-browser |
| [sample-card.png](screenshots/sample-card.png) | browser 测试导出的 1080×1440 PNG，包含颜文字 |

这是不同阶段的测试证据，不是最新 UI 所有页面的截图集。图片原样复制，未重新生成或美化，没有包含账号页、登录二维码或私人照片。

## 验证证据

- unit-tests-2026-10-17.txt：本次归档前 242 项测试结果。
- unit-tests-v1.10.txt：原 v1.10 最后门禁记录。
- external-connectors-v1.10.json：原真实连接结果的计数和状态，不含笔记明细、账号、Cookie 或连接码。
- external-assets-v1.10.json：七项公开插画检查结果，保留失败原因。
- publication-audit.md：本次清点、扫描、版本校验和发布检查。

原 artifacts 中的完整故障轨迹、临时脚本、服务日志、截图和 live 调试结果仍留在本机；其中可能含临时连接码、个人来源页面或本机信息，不整目录公开。可重现步骤、正式测试源码和最终结论已保留在仓库。

## 明确留在本机的资料

- .env 真实配置、密码、API Key、登录资料、Cookie 和浏览器持久目录。
- 用户作品、私人随心记、照片、来源运行库、AI 用量账本、临时视频。
- node_modules、FFmpeg 二进制、开发工作树、缓存、当前 dist。
- 当前工作区里不属于拾页的其他独立项目与交付包。
- 完整原始聊天导出、工具调用轨迹与内部推理。

旧源码包中的历史构建与文档原样保留；没有为消除历史措辞而修改原 ZIP。文件清单不包含自身，避免递归摘要，也不把本机私人资料的名称或内容编入公开清单。
