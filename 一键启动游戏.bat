@echo off
chcp 65001 >nul
setlocal
title 离散星海 · 远望号 - 一键启动游戏

echo ==================================================
echo   离散星海 · 远望号 (Discrete Star Sea)
echo   正在启动游戏...
echo ==================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [提示] 未检测到 Node.js 环境，正在直接打开离线单文件版 game.html...
    start "" "%~dp0game.html"
    goto :eof
)

if not exist "%~dp0agent_web_game_starter\package.json" (
    echo [提示] 未找到前端工程目录，正在直接打开离线单文件版 game.html...
    start "" "%~dp0game.html"
    goto :eof
)

cd /d "%~dp0agent_web_game_starter"

if not exist "node_modules" (
    echo [提示] 首次启动，正在安装前端依赖...
    call npm.cmd install
    if errorlevel 1 (
        echo.
        echo [警告] 依赖安装失败，正在尝试打开离线单文件版 game.html...
        start "" "%~dp0game.html"
        pause
        goto :eof
    )
)

echo [提示] 正在启动本地开发服务器并自动打开浏览器 (http://localhost:5173)...
echo [提示] 游玩期间请勿关闭此窗口；按 Ctrl+C 可停止服务器。
echo.

call npm.cmd run dev -- --open
if errorlevel 1 (
    echo.
    echo [提示] 开发服务器未能启动（可能 5173 端口已被占用），正在打开离线单文件版 game.html...
    start "" "%~dp0game.html"
    pause
)
