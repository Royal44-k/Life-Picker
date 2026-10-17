# 新设备交接、运行与版本恢复

本说明用于从 GitHub 或归档恢复软件。私人作品、随心记、照片和登录状态需要各自的备份，不包含在仓库内。

## 1. 安装与启动

准备 Node.js 24+ 和 npm。浏览器测试及个人小红书连接需要系统 Microsoft Edge。普通排版不需要 Python、Xcode、AI Key 或数据库服务。

~~~powershell
git clone https://github.com/Royal44-k/Life-Picker.git
cd Life-Picker
npm ci
npm run build
npm start
~~~

Windows 可双击“启动拾页.cmd”，首次会安装依赖并在缺少 dist 时构建。修改代码后应手动重新构建；已有 dist 不会因启动脚本自动重建。保持终端窗口运行，按显示的地址打开。不要把本机旧 IP 当成固定地址。

iPhone 与电脑同 Wi-Fi，用 Safari 输入启动窗口的手机地址。端口默认 5173；同端口不能同时运行开发和生产进程。公网使用继续按用户决定暂缓。

## 2. 可选 AI

Windows 双击“配置AI.cmd”，或复制 .env.example 为 .env 后填写自己的配置。Key 不写入源码、不发送到聊天；手机只填当前服务的八位连接码，重启后重新读取新码。

DeepSeek 按服务商规则收费。Ollama 只支持现有对应入口，需要自行安装与下载模型。文案也可走免费手动提示词路径；未配置 AI 不影响本地记录与规则排版。模型名称、能力和费用按后续使用时重新核验。

## 3. 短片与外部来源

- FFmpeg / ffprobe 需单独准备。配置 FFMPEG_PATH、FFPROBE_PATH 或 PATH，详见 [运行时说明](video-runtime.md)。原电脑上的工具二进制不随仓库上传。
- 运行 npm run setup:xhs 检查系统 Edge，再在“我的 → 来源与审核”打开专用登录窗口。本人正常登录，不迁移 Cookie，不重新启用旧被系统拦截的辅助程序。
- 旧 scripts/setup-xhs.mjs 与相关模块仅为历史资产；当前 setup:xhs 指向 setup-xhs-web.mjs。
- GitHub 免费设计发现无需 Key，但受网络和匿名配额影响。候选需要加入待审核，不能直接套用为模板。
- 所有来源检查只在服务运行时可用。个人每日计划默认关闭，由本人成功手动验证后自行开启。

## 4. 私人数据迁移

1. 在原设备导出每篇作品备份、完整记录备份，以及需要的系列与来源备份。
2. 把备份保存到“文件”或自己的安全存储，再在目标设备导入。
3. 确认照片、文字、原话、回忆和引用正确后，才考虑清理旧设备。
4. 未被作品或完整记录引用的独立素材不一定进入这些备份，需单独保留原图。
5. 服务端来源库、AI 用量账本和浏览器记录属于不同数据，不把源码 ZIP 当作任一种私人备份。

## 5. 恢复历史版本

所有 12 个版本标签及原始包见 [archives](../archives/README.md)。建议在新目录恢复：

~~~powershell
git clone --branch v1.10.0 https://github.com/Royal44-k/Life-Picker.git Life-Picker-v1.10
cd Life-Picker-v1.10
npm ci
npm run build
npm start
~~~

恢复更老版本时使用对应标签，并更换独立端口 / 浏览器环境；旧版数据库不可强制打开新版本同源数据。v1.0 原始 ZIP 包含当时的 dist，其他版本通常需构建。GitHub 自动生成源码包与保留的历史 ZIP 不是同一文件，SHA-256 不应混用。

## 6. 检查命令

~~~powershell
npm test
npm run build
node scripts/verify-asset-archive.mjs
~~~

浏览器测试需要单独运行受控服务，避免使用个人资料。按 README 及对应测试文件设置 TEST_URL；部分检查需要 TEST_SERVER_LOG 读取该测试服务的连接码。先创建本机 artifacts 目录用于截图和日志。例：

~~~powershell
New-Item -ItemType Directory -Force artifacts | Out-Null
$env:PORT='5181'
npm start *> artifacts/test-server.log
~~~

另一个终端：

~~~powershell
$env:TEST_URL='http://localhost:5181'
$env:TEST_SERVER_LOG='artifacts/test-server.log'
npm run test:connectors
npm run test:pwa
~~~

完整端到端与视频测试需要 FFmpeg / ffprobe 及对应环境变量；单元测试包含本机 Edge 测试夹具。不配置真实 Key 也能运行受控测试。live-ai-check、verify-storyboard-live 等明确的 live 脚本会调用已配置模型，不属于常规离线检查。

## 7. 继续开发的入口

先读 [需求追踪](requirements-traceability.md) 和最近验收，再使用新分支开发。不要仅根据旧计划中“待实现”措辞重复开发已经完成的能力。新增外部采集、云同步或公开发布应保持现有数据边界，并以实际结果更新验收记录。
