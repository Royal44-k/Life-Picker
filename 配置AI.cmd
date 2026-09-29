@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
echo 在记事本中，把 API Key 填到 DEEPSEEK_API_KEY= 后面。
echo 保存后重启拾页。不要把 .env 文件或 API Key 发给别人。
notepad .env
