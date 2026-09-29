@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动拾页，请保持此窗口打开。
if not exist node_modules (
  echo 首次使用正在安装依赖，需要电脑联网。
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 goto failed
)
if not exist dist\index.html (
  call npm.cmd run build
  if errorlevel 1 goto failed
)
call npm.cmd start
:failed
echo.
echo 窗口已停止。若提示端口占用，可能拾页已经运行，请直接访问手机地址。
pause
