# 产品编码管理系统 · Code Wiki

更新时间：2026-05-26

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 技术栈与依赖](#2-技术栈与依赖)
- [3. 目录结构](#3-目录结构)
- [4. 总体架构](#4-总体架构)
- [5. 后端（server）](#5-后端server)
  - [5.1 入口与启动流程](#51-入口与启动流程)
  - [5.2 路由与 API](#52-路由与-api)
  - [5.3 控制器（Controllers）](#53-控制器controllers)
  - [5.4 数据模型（Models）与双存储模式](#54-数据模型models与双存储模式)
  - [5.5 备份与自动任务（Services / Utils）](#55-备份与自动任务services--utils)
  - [5.6 环境变量与配置](#56-环境变量与配置)
- [6. 前端（client）](#6-前端client)
  - [6.1 入口与路由](#61-入口与路由)
  - [6.2 页面（Pages）](#62-页面pages)
  - [6.3 服务层（services/api.js）](#63-服务层servicesapijs)
  - [6.4 关键组件（Components）](#64-关键组件components)
  - [6.5 工具与配置（utils / config）](#65-工具与配置utils--config)
- [7. 数据与文件布局](#7-数据与文件布局)
- [8. 运行与部署](#8-运行与部署)
  - [8.1 本地开发](#81-本地开发)
  - [8.2 生产运行（非 Docker）](#82-生产运行非-docker)
  - [8.3 Docker / Compose 部署](#83-docker--compose-部署)
  - [8.4 测试](#84-测试)
- [9. 常见扩展点](#9-常见扩展点)
- [10. 旧版目录（old）](#10-旧版目录old)

## 1. 项目概览

本仓库是一个“产品—编码”管理的全栈应用：前端负责产品/编码录入、查询、统计与扫码交互；后端提供 REST API、数据存储（MongoDB 或本地文件系统）以及备份/恢复能力。

关键业务能力（对应 README）：

- 产品管理：增删改查、分类筛选、排序与分页
- 编码管理：新增/更新/软删除/恢复/永久删除、重复检测、批量查重
- 统计：总量/活动/质量评分/最近活动流
- 扫码：摄像头扫码、扫码枪快速录入、二维码解码与 OCR（可选）
- 备份与恢复：手动导出/导入、服务器本地备份列表、自动定时备份

## 2. 技术栈与依赖

### 前端（client/package.json）

- React 18 + react-scripts（CRA）
- react-router-dom（路由）
- antd + @ant-design/icons（UI）
- axios（HTTP）
- chart.js + react-chartjs-2（图表）
- html5-qrcode + jsqr（扫码与本地解码）
- xlsx + file-saver（导出 Excel）
- tesseract.js（前端 OCR 能力；也可走后端 OCR 代理）
- cronstrue（Cron 表达式转自然语言，用于备份计划展示）

### 后端（server/package.json）

- Express（HTTP 服务）
- dotenv（环境变量加载）
- cors / helmet / morgan（跨域、安全与日志）
- express-validator（参数校验）
- multer（文件上传，备份导入使用内存存储）
- mongoose（MongoDB 模式下的数据访问）
- node-cron（自动备份定时任务）
- axios / node-fetch / form-data（对外 HTTP 调用：OCR、二维码解码等）
- winston（日志）

## 3. 目录结构

仓库根目录（核心）：

```
产品编码管理系统/
  client/                  # 前端 React 应用
  server/                  # 后端 Express 应用
  data/                    # 文件系统存储模式的数据目录（运行时生成/使用）
  Dockerfile               # 多阶段构建：build 前端 + 打包后端
  docker-compose.yml       # 应用 + MongoDB 一键启动
  start-dev.bat            # Windows 开发一键启动（前后端）
  start-prod.bat           # Windows 生产一键启动（构建前端 + 启动后端）
  deploy.bat               # Windows 部署脚本（git pull + compose up --build）
  README.md
  old/                     # 历史版本（不参与当前主链路）
```

前端核心目录（client/src）：

```
client/src/
  pages/                   # 页面组件（路由入口）
  components/              # 复用组件（列表、表单、扫码、统计等）
  services/api.js          # 后端 API 封装（Axios）
  config/index.js          # 运行时配置（API baseURL、OCR/QR 代理地址、扫码参数）
  utils/                   # 导出、扫码封装等
  App.js                   # 路由表
  index.js                 # React 挂载入口
  setupProxy.js            # 本地开发代理 /api → 后端
```

后端核心目录（server/src）：

```
server/src/
  app.js                   # Express 入口（中间件、路由挂载、OCR/QR 代理、静态托管、自动备份）
  routes/                  # 路由定义
  controllers/             # 业务控制器
  models/                  # 数据模型（Mongo + 文件系统双实现）
  services/                # 服务层（自动备份任务调度）
  utils/                   # 工具（备份/恢复、设置读写）
```

## 4. 总体架构

分层与调用链（主干）：

```
[React Pages/Components]
        ↓
[client/services/api.js (Axios)]
        ↓  HTTP JSON
[Express app.js]
        ↓
[routes/*] → [controllers/*] → [models/*] / [services/*] / [utils/*]
        ↓
MongoDB（可选） or 本地 data/*.json（默认）
```

后端同时提供两个“代理型”接口，支持前端扫码与 OCR 能力兜底：

- `POST /api/qr/decode`：二维码解码代理
- `POST /api/ocr/iflytek`：讯飞 OCR 代理（可选）

## 5. 后端（server）

### 5.1 入口与启动流程

入口文件：`server/src/app.js`

启动流程要点：

- 加载环境变量（dotenv）
- 初始化 Express + 中间件（JSON/body-parser、cors、helmet、morgan 等）
- `connectDB()`：根据 `MONGODB_URI` 决定走 MongoDB 或文件系统模式
  - 未配置 MongoDB 时，确保 `data/` 目录存在
- 挂载业务路由：
  - `/api/products`、`/api/codes`、`/api/stats`、`/api/backup`
- 提供 OCR/QR 代理路由（直接定义在 app.js 内）
- 生产环境下静态托管前端 build（`client/build`）
- 启动自动备份任务 `scheduleAutoBackup()`

### 5.2 路由与 API

路由文件集中在 `server/src/routes/`，并在 `app.js` 中挂载。API 概览如下（均为 JSON 接口，除备份下载/导出）：

#### 产品（/api/products）

- `GET /api/products`：产品列表（分页/筛选/排序）
- `GET /api/products/:id`：产品详情
- `POST /api/products`：创建产品（校验 name）
- `PUT /api/products/:id`：更新产品（校验 name）
- `DELETE /api/products/:id`：删除产品

#### 编码（/api/codes）

- `GET /api/codes`：编码全局查询（分页/范围/日期/关键字/是否含已删除）
- `GET /api/codes/product/:productId`：获取某产品编码列表
- `POST /api/codes/product/:productId`：为产品新增编码（校验 code）
- `PUT /api/codes/product/:productId/:codeId`：更新编码（校验 code）
- `DELETE /api/codes/product/:productId/:codeId`：软删除编码
- `POST /api/codes/product/:productId/:codeId/restore`：恢复编码
- `DELETE /api/codes/product/:productId/:codeId/permanent`：永久删除编码
- `POST /api/codes/batch-check-duplicate`：批量查重（跨产品）

#### 统计（/api/stats）

- `GET /api/stats`：仪表盘概览统计
- `GET /api/stats/activity`：最近 7 天活动
- `GET /api/stats/quality`：数据质量统计（缺失/超出/质量评分）
- `GET /api/stats/recent-activity`：最近活动流

#### 备份（/api/backup）

- `GET /api/backup/export`：导出全量备份文件（下载）
- `POST /api/backup/import`：导入备份文件（multipart/form-data，字段名 file）
- `GET /api/backup/config`：获取自动备份配置
- `POST /api/backup/config`：更新自动备份配置（并重调度）
- `GET /api/backup/list`：列出服务器本地备份文件
- `GET /api/backup/download/:filename`：下载某个本地备份
- `POST /api/backup/restore/:filename`：从某个本地备份恢复
- `DELETE /api/backup/:filename`：删除某个本地备份

#### OCR / QR 代理（在 app.js 内）

- `POST /api/ocr/iflytek`：讯飞 OCR 代理（需要 IFLYTEK_* 环境变量）
- `POST /api/qr/decode`：二维码解码代理

### 5.3 控制器（Controllers）

控制器集中在 `server/src/controllers/`，负责参数解析、校验、编排模型调用与返回。

#### 产品控制器（productController.js）

核心职责：

- 产品列表查询：支持分页、分类筛选、关键字、排序
- 写入校验：产品名称非空；编码范围（codeRanges）重叠检查

关键函数（建议阅读入口）：

- `getAllProducts()`：Mongo 模式下走 count + find + distinct；文件模式下内存过滤/排序/分页
- `createProduct()` / `updateProduct()`：对 `codeRanges` 做合法性与重叠校验

#### 编码控制器（codeController.js）

核心职责：

- 编码全局查询（高级搜索页使用）：范围、日期、关键字、是否包含已删除
- 新增编码：清洗、重复处理（含“回收站恢复”语义）
- 软删/恢复/永删：回收站模型
- 批量查重：跨产品重复码定位

关键函数：

- `getAllCodes()`：组合 query 条件（`codeStart/codeEnd`、`startDate/endDate`、`keyword`、`includeDeleted`）
- `addCode()`：若同码在“已删除”中存在，则执行恢复逻辑（Mongo 与文件模式分别处理）
- `deleteCode()` / `restoreCode()` / `permanentDeleteCode()`：回收站生命周期
- `batchCheckDuplicate()`：用于产品列表的批量查重功能

#### 统计控制器（statsController.js）

核心职责：

- 仪表盘统计：总产品/总编码/今日活动、分类分布等
- 质量统计：根据产品号码段计算缺失/超出/完整度/质量分
- 最近活动：活动流、今日小时分布等

关键函数：

- `getStats()`：Mongo 使用聚合；文件模式手算
- `getQualityStats()`：按产品号码段（`codeRanges` 优先，否则 `codeStart/codeEnd`）对编码做完整度与异常统计
- `getRecentActivity()`：输出活动流与趋势

#### 备份控制器（backupController.js）

核心职责：

- 手动导出/导入（全量）
- 自动备份配置管理（cron、开关、保留份数等）
- 服务器本地备份文件管理（list/download/restore/delete）

关键函数：

- `exportBackup()` / `importBackup()`
- `getConfig()` / `updateConfig()`：更新后会触发 `scheduleAutoBackup()` 重新调度

### 5.4 数据模型（Models）与双存储模式

模型集中在 `server/src/models/`，其设计目标是：对控制器暴露尽量一致的数据访问接口，而底层根据环境自动切换为 MongoDB（Mongoose）或文件系统 JSON。

#### 存储模式切换

- 若设置了 `MONGODB_URI`：启用 MongoDB 模式（Mongoose schema + collection）
- 若未设置 `MONGODB_URI`：启用文件系统模式（读写 `data/*.json`）

#### 文件系统模式的数据文件

位于仓库根目录的 `data/`：

- `data/products.json`：产品列表
- `data/{productId}_codes.json`：每个产品对应的编码列表
- `data/settings.json`：自动备份等设置

#### Code 模型的关键约束

- MongoDB 模式下，编码集合存在 `{ code, productId }` 的唯一索引（同产品内不允许同码）
- 软删除：通常使用字段标记（如 `deleted` / `deletedAt`），并在查询时通过 `includeDeleted` 控制是否返回

### 5.5 备份与自动任务（Services / Utils）

相关模块：

- `server/src/services/backupService.js`
  - `scheduleAutoBackup()`：读取 settings → cron 调度
  - `executeAutoBackup()`：执行一次备份，并按“保留份数”清理历史备份
- `server/src/utils/settingsUtils.js`
  - `getSettings()`：读取 `data/settings.json`（不存在则返回默认值）
  - `updateSettings()`：写入 `data/settings.json`
- `server/src/utils/backupUtils.js`
  - `generateBackupData()`：生成全量备份数据（Mongo/文件模式分别处理）
  - `performRestore()`：执行全量恢复（Mongo/文件模式分别处理）

备份文件目录（自动备份/本地备份管理使用）：

- `server/src/services/backupService.js` 中定义的 `BACKUPS_DIR`

### 5.6 环境变量与配置

后端 `.env`（参考 `server/.env.example`）：

- `PORT`：服务端口（默认 5000）
- `MONGODB_URI`：MongoDB 连接字符串（留空则使用本地文件系统存储）
- `IFLYTEK_OCR_APPID` / `IFLYTEK_OCR_API_KEY` / `IFLYTEK_OCR_API_SECRET`：讯飞 OCR（可选）
- `IFLYTEK_OCR_PATH`：可选，OCR 接口路径（若服务端需要覆盖默认值）

注意：仓库中 `.env.example` 的凭证均为占位符；实际部署需通过环境变量或私有配置注入。

## 6. 前端（client）

### 6.1 入口与路由

入口文件：`client/src/index.js`，挂载 `<App />`。

路由表：`client/src/App.js`

- `/`：仪表盘
- `/products`：产品列表
- `/products/:id`：产品详情（编码管理主界面）
- `/backup`：备份管理
- `/search`：高级搜索

### 6.2 页面（Pages）

页面集中在 `client/src/pages/`：

- `Dashboard.js`
  - 拉取 `stats/activity/quality/recent-activity` 并渲染图表与活动流
- `ProductList.js`
  - 产品分页与筛选排序
  - 批量查重（调用 `POST /api/codes/batch-check-duplicate`）
- `ProductDetail.js`
  - 产品信息 + 编码列表（筛选/排序/分页）
  - 快速录入（扫码枪适配）、扫码弹窗录入、导出、回收站管理等
- `BackupManagement.js`
  - 自动备份配置（Cron 表达式展示与保存）
  - 手动导出/导入
  - 服务器本地备份文件列表/下载/恢复/删除
- `AdvancedSearch.js`
  - 组合条件调用后端全局编码查询
  - 支持批量删除/恢复、搜索历史与收藏（localStorage）
- `NotFound.js`
  - 404 页面

### 6.3 服务层（services/api.js）

`client/src/services/api.js` 统一封装 Axios 调用，导出四个 API 族：

- `productAPI`：产品 CRUD
- `codeAPI`：编码查询/新增/更新/删除/恢复/永久删除/批量查重
- `statsAPI`：统计接口
- `backupAPI`：备份导出/导入、配置、本地备份管理

在开发模式下：

- CRA `proxy` 指向 `http://localhost:5000`
- `setupProxy.js` 进一步支持通过 `REACT_APP_BACKEND_TARGET` 覆盖代理目标

### 6.4 关键组件（Components）

组件集中在 `client/src/components/`：

- `ScannerModal.js`
  - 摄像头扫码：基于 `html5-qrcode`
  - 本地二维码解码：`jsqr`
  - 兜底：调用后端 `POST /api/qr/decode`
  - OCR：可调用前端 `tesseract.js` 或走后端 `POST /api/ocr/iflytek`（取决于页面策略）
- `QuickCodeInput.js`
  - 面向扫码枪的高频录入交互（连续输入、自动提交、错误提示等）
- `CodeList.js`
  - 编码列表展示与批量操作入口（软删/恢复等）
- `RecycleBinModal.js`
  - 回收站管理（查看已删除编码并恢复/永删）
- `QualityPanel.js` / `ActivityStream.js` / `StatCard.js`
  - 仪表盘质量与活动展示
- `ProductForm.js` / `CodeForm.js`
  - 表单输入与校验

### 6.5 工具与配置（utils / config）

配置：`client/src/config/index.js`

- `api.baseURL`：生产环境下前端请求地址（开发模式一般走代理）
- `ocr.proxyUrl`、`qrDecode.proxyUrl`：后端 OCR/QR 代理地址
- 扫码参数（fps、扫码框大小等）

工具：

- `utils/scanner.js`
  - `class Scanner`：对 `Html5QrcodeScanner` 的封装，提供 `init/pause/resume/clear`
- `utils/exportUtils.js`
  - `ExportUtils.exportToExcel()`：底层 Excel 导出
  - `exportCodes` / `exportCodesSmart` / `exportCodesByQuantity`：面向业务的多种导出策略

## 7. 数据与文件布局

默认文件系统存储模式下（未配置 MongoDB）：

- `data/products.json`：产品列表
- `data/{productId}_codes.json`：该产品编码集合
- `data/settings.json`：备份配置等运行时设置

备份文件：

- 自动备份/本地备份文件存放在后端定义的备份目录（`BACKUPS_DIR`），备份管理页面会通过 `/api/backup/list` 等接口读取。

## 8. 运行与部署

### 8.1 本地开发

方式一：Windows 一键启动

- 运行根目录 `start-dev.bat`（会分别启动前后端并自动安装依赖）

方式二：手动启动

```bash
# 后端
cd server
npm install
npm run dev

# 前端
cd ../client
npm install
npm start
```

默认地址：

- 前端：http://localhost:3000
- 后端：http://localhost:5000

### 8.2 生产运行（非 Docker）

```bash
cd client
npm install
npm run build

cd ../server
npm install
npm start
```

Windows 下也可用根目录 `start-prod.bat` 一键完成（必要时会自动 build 前端并生成 `server/.env`）。

### 8.3 Docker / Compose 部署

推荐：docker-compose 一键启动（应用 + MongoDB）：

```bash
docker-compose up -d
```

代码更新后重建：

```bash
docker-compose up -d --build
```

根目录 `deploy.bat` 是上述流程的脚本化封装（包含 `git pull`）。

### 8.4 测试

```bash
# 后端
cd server
npm test

# 前端
cd client
npm test
```

## 9. 常见扩展点

新增后端业务模块（推荐路径）：

1. 在 `server/src/models/` 中定义数据访问（需同时考虑 Mongo 与文件系统模式）
2. 在 `server/src/controllers/` 中实现用例与校验编排
3. 在 `server/src/routes/` 中定义 REST 路由并挂载到 `app.js`
4. 在 `client/src/services/api.js` 增加对应 API 封装
5. 在 `client/src/pages/` 或 `components/` 实现 UI 与交互

新增“仪表盘统计”类需求：

- 后端优先在 `statsController.js` 中实现，Mongo 模式尽量使用聚合以提升性能
- 前端在 `Dashboard.js` 增加请求与图表展示

新增“备份维度/数据迁移”类需求：

- 统一落在 `utils/backupUtils.js` 的 `generateBackupData()` 与 `performRestore()`，确保两种存储模式都能互导

## 10. 旧版目录（old）

`old/` 是历史版本（静态资源 + server.js），不参与当前主链路。

若需要对比迁移逻辑、旧 UI 或旧扫描实现，可将其作为参考，但建议不要与当前版本混用。

