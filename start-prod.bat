@echo off
setlocal enabledelayedexpansion
:: 设置编码为 UTF-8 以支持中文显示
chcp 65001 >nul

echo ==========================================
echo       HTSM-DMS 生产环境启动脚本
echo ==========================================

:: 0. 环境检查
echo.
echo [0/3] 环境检查...
node -v >nul 2>&1
if !errorlevel! neq 0 (
    echo [错误] 未检测到 Node.js 环境，请先安装 Node.js。
    pause
    exit /b 1
)
echo Node.js 环境正常。

:: 1. 检查并构建前端
echo.
echo [1/3] 正在检查前端构建...
if not exist "client\build\index.html" (
    echo 未发现构建文件，开始构建前端...
    cd client
    echo 正在安装前端依赖...
    call npm install
    echo 正在构建前端项目...
    call npm run build
    if !errorlevel! neq 0 (
        echo [错误] 前端构建失败！
        pause
        exit /b 1
    )
    cd ..
    echo 前端构建完成。
) else (
    echo 发现已有构建文件，跳过构建步骤。
    echo (如果需要重新构建，请手动删除 client\build 目录)
)

:: 2. 检查后端依赖
echo.
echo [2/3] 正在检查后端依赖...
if not exist "server\node_modules" (
    echo 未发现后端依赖，正在安装...
    cd server
    call npm install
    if !errorlevel! neq 0 (
        echo [错误] 后端依赖安装失败！
        pause
        exit /b 1
    )
    cd ..
    echo 后端依赖安装完成。
) else (
    echo 后端依赖已安装。
)

:: 3. 启动服务
echo.
echo [3/3] 正在准备启动服务...
set NODE_ENV=production
set PORT=5000

:: 检查端口占用并尝试清理
netstat -ano | findstr :5000 >nul
if !errorlevel! equ 0 (
    echo [警告] 检测到端口 5000 可能被占用。
    echo 正在尝试自动清理占用端口的进程...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
        if "%%a" neq "0" (
            echo 正在终止进程 PID: %%a
            taskkill /F /PID %%a >nul 2>&1
        )
    )
    echo 端口清理尝试完成。
)

echo.
echo ==========================================
echo 服务即将启动...
echo 请访问: http://localhost:5000
echo (按 Ctrl+C 可停止服务)
echo.
echo 如果服务启动失败或立即退出，请检查下方报错信息。
echo ==========================================
echo.

cd server
:: 检查是否存在 .env 文件，如果不存在则复制示例
if not exist ".env" (
    if exist ".env.example" (
        echo [提示] 未发现 server/.env 配置文件，已从 server/.env.example 复制。
        copy .env.example .env >nul
    )
)

echo 正在执行后端启动命令...
node src/app.js

if !errorlevel! neq 0 (
    echo.
    echo ==========================================
    echo [错误] 服务异常退出！错误代码: !errorlevel!
    echo ==========================================
    echo 可能的解决办法：
    echo 1. 端口 5000 仍被其他程序占用 -> 请手动关闭占用端口的程序
    echo 2. 依赖损坏 -> 请尝试删除 server\node_modules 目录后重新运行
    echo 3. 代码错误 -> 请检查上方具体的报错日志
)

echo.
pause
