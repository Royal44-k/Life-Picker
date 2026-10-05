# 首批公开素材核验记录

核验时间：2026-10-05。此记录是固定素材清单的实测，不是实时设计热榜或自动发现新作品。

| 清单项 | 官方文件 | 文件大小 | 像素 | SHA256 |
| --- | --- | ---: | --- | --- |
| Open Doodles 阅读 | https://opendoodles.s3-us-west-1.amazonaws.com/reading.png | 226461 B | 2048 × 1536 | 974d22ab4ba05d9b2eaf03b2b3b495320444ad8d2db94319712d78bbc75e274a |
| Open Doodles 绿植 | https://opendoodles.s3-us-west-1.amazonaws.com/plant.png | 334758 B | 2048 × 1536 | 5b2c485e4a3f1ed949c3ac43efa59ba8309d3a43b8c0ce2b09ec0146106b7bdf |
| Open Peeps 76 | https://cdn.prod.website-files.com/5e51c674258ffe10d286d30a/5e535a877371bbe27fa0b695_peep-76.png | 69422 B | 720 × 972 | 44f544563c7fed16d5478f25de5a4d3d0b0e06b6b5a87fa86163f1c07c00a582 |

作者均为 Pablo Stanley。官网原始说明：[Open Doodles About](https://www.opendoodles.com/about)、[Open Peeps](https://www.openpeeps.com/)。两处均明确链接 CC0 1.0；文件链接通过当日实际取得的官网 HTML 核对。

CC0 1.0 法律文本：[原始文本](https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt)。实测 7048 B，SHA256：a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499。

运行证据在本机 artifacts/v13-source-assets-live.json，三项均为 verified。适配器实际获取许可页面、对应列表页、法律文本和 PNG，对文件长度、SHA256、PNG CRC、尺寸、解压长度与每行滤镜进行检查。缓存同时保留原图、许可页与原文快照；当前没有自动通过人工审核。

选择调整：搜索索引仍列有 Peep 27，但实际官网当前页面未找到这一文件链接，因此首批改选官网当前直接列出的 Peep 76。这避免把可下载但缺少当前页面对应关系的文件直接作为自动入库依据。

Tabler Icons v3.48.0 的 plant-2.svg 和完整 MIT LICENSE 也已实际下载核对；为先完成现有 PNG / Canvas 使用链，本批适配器仅接受上表 PNG。SVG 净化 / 栅格化及 MIT 文件随分发保留需单独完成后才加入可用清单。不能据本记录声称 Tabler 已接入模板。

说明：
- 这些是用于搭配原创文字的插画，不是用户亲身经历的照片。
- 校验变化、许可变化、官网对应链接消失、重定向或下载超时均报核验失败，不伪装成“没有新素材”。
- 素材任务现已接入手机状态、手动重试、每日计划与审核预览。实际首轮部分失败 / 手动补齐、原图解码和哈希、隔离库审核通过后访问 / 编辑后撤回均通过；证据 artifacts/v13-source-live-workflow.json。真实来源库三项仍待用户审核。Task 3 现已完成：隔离来源库中的实际官方阅读 PNG 已通过手机尺寸套用、断网重载、1080 像素导出与原始字节 / 出处备份验证；证据 artifacts/v13-material-offline-evidence.json。真实用户来源库仍保持待审核，尚非 iPhone Safari 真机测试。
