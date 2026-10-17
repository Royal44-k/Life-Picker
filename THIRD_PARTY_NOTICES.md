# 第三方来源与许可说明

本次项目资产整理没有为拾页原创代码新增根级开源许可证。原有第三方组件、主题和素材按各自许可保存出处；仓库的公开可见状态不替代项目所有者的许可选择。

## 开放主题规则

| 项目 | 使用方式 | 完整许可 |
| --- | --- | --- |
| Marp Core / Gaia，Yuki Hattori / Marp team | 暖纸色板、标题层级与留白规则转写为 Canvas；未打包演示内容、外部字体或整个运行时 | [MIT](public/licenses/marp-core-MIT.txt) |
| reveal.js / White，Hakim El Hattab / contributors | 白底黑字、蓝色强调与标题层级转写为 Canvas；未打包 reveal.js 运行时或字体 | [MIT](public/licenses/reveal-js-MIT.txt) |

固定来源 commit、作者、URL、名称和具体改编说明在 [open-designs.ts](src/studio/open-designs.ts)。这是两组已适配主题；运行时 GitHub 搜索得到的其他项目仍需独立核验与适配。

## 插画清单

[server/source-manifest.mjs](server/source-manifest.mjs) 保存 Pablo Stanley 的 Open Doodles / Open Peeps 精选清单，包含官方来源页、许可页、CC0 文本摘要、PNG 摘要与尺寸。素材按请求在本机下载核验，运行缓存没有随本仓库公开。

2026-10-09 的七项检查中 Peep 76 对应关系未通过；这项失败没有被解释为可以直接使用。使用记录与失败原因见 [素材验收](docs/assets/evidence/external-assets-v1.10.json)。

## 应用依赖与工具

package.json 和 package-lock.json 固定本项目依赖；安装后每个依赖目录中的许可文件仍需保留。本仓库不打包 node_modules、系统 Edge、FFmpeg 或模型权重。FFmpeg 来源与运行配置见 [video-runtime](docs/video-runtime.md)。

演示截图及 sample-card 为本项目隔离测试生成；小拾角色、原创结构与规则代码保存在 src 中。引用链接与外部笔记只作为参考，不包含第三方笔记全文、原图或平台登录资料。
