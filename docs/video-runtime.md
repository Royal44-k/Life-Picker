# 拾页本机短片运行时

2026-09-29 开发环境安装记录。视频服务仍在开发，本文不代表手机入口已经交付。

- 来源：FFmpeg 官方下载页 https://ffmpeg.org/download.html 列出的 Gyan Windows builds：https://www.gyan.dev/ffmpeg/builds/
- 固定下载：https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip
- 发布者校验：https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip.sha256
- SHA256：`60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba`；本机实际核对一致，下载 114,768,076 字节。
- 本机路径：`.local/ffmpeg/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe`，同目录 `ffprobe.exe`。
- 二进制自报版本 9.0.2，包含 libx264。该构建为 GPLv3；LICENSE 和构建附带文件保留在原目录，运行时不进入拾页源码归档。以后若分发二进制需随版本履行许可与来源要求。
- 可用 `FFMPEG_PATH` / `FFPROBE_PATH` 指向自行安装的可执行文件。Linux 默认从 PATH 寻找，仍需在目标服务器实际安装验证。
- 参考滤镜：https://ffmpeg.org/ffmpeg-filters.html（zoompan、overlay、xfade）。从已确认的 PNG 卡片取照片区域做轻微移动，文字保持不动，输出整页内容和淡入转场。

开发检查：`npm run test:video`；需要本机运行时、开发 5173 和生产 5181 服务。真实输出先后为红/蓝测试画面，ffprobe 校验 720×1280、15 秒；抽帧确认顺序。

临时文件置于 `.local/video-jobs/<端口>/job-<随机ID>`，开发和生产服务分开，启动时清理该服务旧任务。任务完成即删除输入 PNG，输出短期保留；失败、取消删除对应目录。所有 HTTP 访问走带连接码及随机会话标识的接口，`.local` 路径在开发和生产服务器均明确拒绝。
