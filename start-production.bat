@echo off
setlocal

echo ===== 配置生产环境变量 =====
set NODE_ENV=production
set PORT=5000
set REACT_APP_API_URL=http://localhost:%PORT%/api

echo ===== 构建前端(React) =====
cd client
if exist node_modules (
  echo 前端依赖已安装，跳过安装
) else (
  echo 正在安装前端依赖...
  npm install
)
npm run build
if errorlevel 1 (
  echo 前端构建失败
  exit /b 1
)

echo ===== 启动后端(Node/Express) =====
cd ..\server
if exist node_modules (
  echo 后端依赖已安装，跳过安装
) else (
  echo 正在安装后端依赖...
  npm install
)

echo 使用端口: %PORT%
echo 前端构建目录将由后端静态服务提供
npm start

endlocal
