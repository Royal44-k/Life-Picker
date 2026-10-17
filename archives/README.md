# 拾页历史版本档案

这里原样保存从 v1.0.0 到 v1.10.0 的 12 个版本包，包含 v1.1.1 修复版。包文件逐一与本机原校验文件核对；没有重打包、覆盖或改写历史内容。Git 标签保留原提交。

[机器可读版本清单](versions.json) · [统一 SHA-256](SHA256SUMS) · [恢复说明](../docs/handoff.md)

| 标签 / 日期 | 阶段 | 提交 | 原始源码包 |
| --- | --- | --- | --- |
| v1.0.0 / 2026-09-29 | 首版 Markdown / AI 文案 / 批量转图 | [c277333](https://github.com/Royal44-k/Life-Picker/commit/c277333cf32fea2664b1c33d43edcff7a11a8e04) | [shiye-v1.0.0-20260929.zip](versions/shiye-v1.0.0-20260929.zip) |
| v1.1.0 / 2026-09-29 | 多页作品、照片与分镜 | [1e48961](https://github.com/Royal44-k/Life-Picker/commit/1e48961c889cd9942017b1c43c4b18da22951d6c) | [shiye-v1.1.0-source.zip](versions/shiye-v1.1.0-source.zip) |
| v1.1.1 / 2026-09-29 | 照片移除 / 撤销、任意页下载 | [8fb9e32](https://github.com/Royal44-k/Life-Picker/commit/8fb9e32f2b474895c401fb0ab89ca719ba64456d) | [shiye-v1.1.1-source.zip](versions/shiye-v1.1.1-source.zip) |
| v1.2.0 / 2026-09-29 | 随心记、小拾、回忆与短片 | [38fd1a4](https://github.com/Royal44-k/Life-Picker/commit/38fd1a426cb1345c51e15c6ab5e2d073e9a89e83) | [shiye-v1.2.0-source.zip](versions/shiye-v1.2.0-source.zip) |
| v1.3.0 / 2026-10-05 | 来源、系列、发布回看与 AI 预算 | [8b4158c](https://github.com/Royal44-k/Life-Picker/commit/8b4158cf38eab2a509f01def72566f1f3a9a0341) | [shiye-v1.3.0-source.zip](versions/shiye-v1.3.0-source.zip) |
| v1.4.0 / 2026-10-07 | 原话簿 | [01a1d5a](https://github.com/Royal44-k/Life-Picker/commit/01a1d5a55846ff1d035c1c87db73413d1e12c62c) | [shiye-v1.4.0-source.zip](versions/shiye-v1.4.0-source.zip) |
| v1.5.0 / 2026-10-07 | 小拾成长、照片日期与基础整合 | [2e23e9b](https://github.com/Royal44-k/Life-Picker/commit/2e23e9b88bcfddc35135ab641f1c50a3516221ae) | [shiye-v1.5.0-source.zip](versions/shiye-v1.5.0-source.zip) |
| v1.6.0 / 2026-10-09 | 可靠编辑与历史恢复 | [0213bbb](https://github.com/Royal44-k/Life-Picker/commit/0213bbbed8d9b1d436357ac4fee6b45611e841f0) | [shiye-v1.6.0-source.zip](versions/shiye-v1.6.0-source.zip) |
| v1.7.0 / 2026-10-09 | 智能排版与拆册 | [29305af](https://github.com/Royal44-k/Life-Picker/commit/29305af82cd6145502add633e182fd1ba8a435be) | [shiye-v1.7.0-source.zip](versions/shiye-v1.7.0-source.zip) |
| v1.8.0 / 2026-10-09 | 开放主题与视觉建议 | [ddb772d](https://github.com/Royal44-k/Life-Picker/commit/ddb772dcc89bec9705a07f16a441dd44ae13baa8) | [shiye-v1.8.0-source.zip](versions/shiye-v1.8.0-source.zip) |
| v1.9.0 / 2026-10-09 | 创作引导与回忆串联 | [3147c19](https://github.com/Royal44-k/Life-Picker/commit/3147c19f4a66fd3f458583d6ee473bbdfacb0b4a) | [shiye-v1.9.0-source.zip](versions/shiye-v1.9.0-source.zip) |
| v1.10.0 / 2026-10-09 | 真实外部来源连接 | [8b4dcf6](https://github.com/Royal44-k/Life-Picker/commit/8b4dcf647128a53f9aa71ac5c4abcbcbba8d429e) | [shiye-v1.10.0-source.zip](versions/shiye-v1.10.0-source.zip) |

版本日期来自标签所指提交日期；最初需求和试用发生时间见 [项目演变](../docs/project-history.md)。v1.0.0 包含当时的构建目录，其他源码包通常需要 npm ci / npm run build。GitHub 自动生成的 tag 下载包与这里保留的原始包字节不同，应使用各自正确的摘要。

旧版文档可能包含过期状态、旧计数或本机地址，按历史记录阅读；当前使用请从根 README 开始。不同版本不能强行共用已升级的浏览器数据库。私人记录和密钥不包含在这些包里。

可以在仓库根目录执行 node scripts/verify-asset-archive.mjs 检查所有已列资产。
