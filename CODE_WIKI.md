# 产品编码管理系统 · Code Wiki

> 更新时间：2026-08-02（依据仓库实际代码重新核对生成）

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 技术栈与依赖](#2-技术栈与依赖)
- [3. 目录结构](#3-目录结构)
- [4. 总体架构](#4-总体架构)
- [5. 后端（server）](#5-后端server)
  - [5.1 入口与启动流程](#51-入口与启动流程)
  - [5.2 路由与 API 清单](#52-路由与-api-清单)
  - [5.3 控制器（Controllers）](#53-控制器controllers)
  - [5.4 数据模型（Models）与双存储模式](#54-数据模型models与双存储模式)
  - [5.5 服务层与工具（Services / Utils）](#55-服务层与工具services--utils)
  - [5.6 环境变量与配置](#56-环境变量与配置)
- [6. 前端（client）](#6-前端client)
  - [6.1 入口与路由](#61-入口与路由)
  - [6.2 页面（Pages）](#62-页面pages)
  - [6.3 服务层（services/api.js）](#63-服务层servicesapijs)
  - [6.4 组件（Components）](#64-组件components)
  - [6.5 工具与配置（utils / config）](#65-工具与配置utils--config)
- [7. 数据与文件布局](#7-数据与文件布局)
- [8. 运行与部署](#8-运行与部署)
  - [8.1 本地开发](#81-本地开发)
  - [8.2 生产运行（非 Docker）](#82-生产运行非-docker)
  - [8.3 Docker / Compose 部署](#83-docker--compose-部署)
  - [8.4 Vercel 部署（前端）](#84-vercel-部署前端)
  - [8.5 测试](#85-测试)
- [9. 常见扩展点](#9-常见扩展点)
- [10. 旧版目录（old）](#10-旧版目录old)

---

## 1. 项目概览

本仓库是一个「产品—编码」管理的全栈应用，用于企业产品编码的录入、查询、统计、扫码识别与数据备份。前端负责产品/编码管理界面与扫码交互，后端提供 REST API 与数据存储（MongoDB 或本地文件系统，自动切换）。

核心业务能力：

| 能力 | 说明 |
| --- | --- |
| 产品管理 | 增删改查、搜索、分类筛选、排序与分页；支持多号码段（codeRanges）配置 |
| 编码管理 | 新增/更新/软删除/恢复/永久删除、末尾数字去重、批量查重、批量移动 |
| 统计 | 总量概览、最近 7 天活动、数据质量评分（缺失/超出/完整度）、最近活动流 |
| 扫码 | 摄像头扫码（html5-qrcode）、扫码枪快速录入、本地解码（jsqr/BarcodeDetector）、后端兜底代理 |
| OCR | 前端 tesseract.js 或后端讯飞 OCR 代理（可选） |
| 备份恢复 | 手动导出/导入、自动定时备份、服务器本地备份管理、跨存储模式迁移 |

---

## 2. 技术栈与依赖

### 后端（[server/package.json](server/package.json)）

| 依赖 | 用途 |
| --- | --- |
| express | HTTP 服务框架 |
| mongoose | MongoDB 模式下的数据访问（`MONGODB_URI` 配置时启用） |
| express-validator | 请求参数校验（产品名、编码非空） |
| body-parser | JSON 解析（limit 2MB，支持 OCR base64 图片） |
| cors / helmet / morgan | 跨域、安全响应头、请求日志 |
| multer | 文件上传（备份导入，内存存储，50MB 限制） |
| node-cron | 自动备份定时任务调度 |
| dotenv | 环境变量加载 |
| winston | 日志（依赖声明，当前主要使用 console） |
| axios / node-fetch / form-data | 对外 HTTP 调用（讯飞 OCR、2dcode.biz 二维码解码） |

开发依赖：`jest`（测试）、`nodemon`（开发热重启）。

### 前端（[client/package.json](client/package.json)）

| 依赖 | 用途 |
| --- | --- |
| react / react-dom / react-scripts | React 18 + CRA 构建 |
| react-router-dom | 前端路由 |
| antd + @ant-design/icons | UI 组件库 |
| axios | HTTP 客户端 |
| chart.js + react-chartjs-2 | 仪表盘图表 |
| html5-qrcode / jsqr | 摄像头扫码与本地二维码解码 |
| tesseract.js | 前端 OCR 能力（可选） |
| xlsx + file-saver | Excel 导出 |
| cronstrue | Cron 表达式转自然语言（备份计划展示） |
| http-proxy-middleware | 开发代理（setupProxy.js） |

### 依赖关系总览

```
client (React 18, CRA, antd5)
  │  axios HTTP /api/*
  ▼
server (Express 4)
  ├── routes → controllers → models / services / utils
  ├── 第三方代理: fetch → 讯飞 OCR (api.xf-yun.com)
  ├── 第三方代理: axios+form-data → 2dcode.biz (二维码解码)
  ▼
存储: MongoDB (mongoose) 或 本地 data/*.json（默认）
```

---

## 3. 目录结构

```
产品编码管理系统/
├── client/                        # 前端 React 应用（CRA）
│   ├── public/                    # 静态资源（index.html、manifest、图标）
│   └── src/
│       ├── components/            # 复用组件（列表、表单、扫码、统计等）
│       ├── config/index.js        # 运行时配置（API baseURL、OCR/QR 代理、扫码参数）
│       ├── pages/                 # 页面组件（路由入口）
│       ├── services/api.js        # 后端 API 封装（Axios 实例 + 4 个 API 族）
│       ├── utils/                 # 工具（扫码封装、Excel 导出、编码解析）
│       ├── App.js                 # 路由表 + 整体布局
│       ├── App.css / index.css    # 全局样式
│       ├── index.js               # React 挂载入口
│       └── setupProxy.js          # 开发代理 /api → 后端
│   └── .env.development           # 前端开发环境变量
├── server/                        # 后端 Express 应用
│   ├── src/
│   │   ├── app.js                 # 入口：中间件、路由挂载、OCR/QR 代理、静态托管、自动备份调度
│   │   ├── controllers/           # 业务控制器（product/code/stats/backup）
│   │   ├── models/                # 数据模型（Mongo + 文件系统双实现）
│   │   ├── routes/                # REST 路由定义
│   │   ├── services/              # 服务层（自动备份任务调度）
│   │   └── utils/                 # 工具（备份/恢复、设置读写、编码解析）
│   ├── .env.example               # 环境变量示例
│   └── package.json
├── data/                          # 文件系统存储模式的数据目录（运行时生成，已被 .gitignore 忽略）
├── old/                           # 历史版本（静态资源 + server.js，不参与当前主链路）
├── Dockerfile                     # 多阶段构建：前端 build + 后端运行
├── docker-compose.yml             # 应用 + MongoDB 一键启动
├── vercel.json                    # Vercel SPA 重写配置
├── start-dev.bat                  # Windows 开发一键启动
├── start-prod.bat                 # Windows 生产一键启动
├── deploy.bat                     # Windows 部署脚本（git pull + compose up --build）
└── .trae/                         # 开发计划与规格文档（plan/spec/tasks/checklist）
```

---

## 4. 总体架构

分层与调用链（主干）：

```
[React Pages/Components]
        ↓
[client/services/api.js (Axios, baseURL=/api)]
        ↓  HTTP JSON
[Express app.js]（中间件：cors / helmet / morgan / body-parser 2MB）
        ↓
[routes/*] → [controllers/*] → [models/*]（Mongo 或文件系统） / [services/*] / [utils/*]
        ↓
MongoDB（配置 MONGODB_URI 时） 或  本地 data/*.json（默认）
```

两个「代理型」接口（定义在 `app.js` 内，不经路由文件）：

- `POST /api/ocr/iflytek`：讯飞 OCR 代理（需配置 `IFLYTEK_OCR_*` 环境变量）
- `POST /api/qr/decode`：2dcode.biz 二维码解码代理（支持单图或多图依次尝试）

双存储模式的核心设计：`models/Product.js` 与 `models/Code.js` 在模块加载时根据 `process.env.MONGODB_URI` 是否存在，分别导出 Mongoose 模型或文件系统实现（API 同名），使控制器代码保持统一调用。

---

## 5. 后端（server）

### 5.1 入口与启动流程

入口文件：[app.js](server/src/app.js)

启动流程：

1. 加载环境变量（dotenv）
2. 初始化 Express + 中间件：cors、`body-parser.json({ limit: '2mb' })`、helmet（含 CSP 配置，放宽 script/style，允许 WebSocket）、morgan
3. `connectDB()`（L54-73）：未配置 `MONGODB_URI` 时确保 `data/` 目录存在（文件系统模式）；否则 `mongoose.connect`
4. 挂载业务路由：`/api/products`、`/api/codes`、`/api/stats`、`/api/backup`
5. 定义 OCR/QR 代理路由（L83-267）
6. 生产模式（`NODE_ENV=production`）静态托管 `client/build`，`get('*')` 兜底返回 index.html（SPA）
7. 错误处理中间件（L279-282）
8. `connectDB().then(...)`：启动监听，`server.timeout = 600000`（10 分钟，防大文件导入中断），并调用 `scheduleAutoBackup()` 启动自动备份

### 5.2 路由与 API 清单

#### 产品（[productRoutes.js](server/src/routes/productRoutes.js)，挂载 `/api/products`）

| 方法 | 路径 | 处理函数 | 说明 |
| --- | --- | --- | --- |
| GET | `/` | `getAllProducts` | 产品列表（分页/搜索/分类/排序） |
| GET | `/:id` | `getProductById` | 产品详情 |
| POST | `/` | `createProduct` | 创建（校验 name 非空、codeRanges 合法性） |
| PUT | `/:id` | `updateProduct` | 更新（校验 name 非空、codeRanges 合法性） |
| DELETE | `/:id` | `deleteProduct` | 删除（级联删除该产品全部编码） |

#### 编码（[codeRoutes.js](server/src/routes/codeRoutes.js)，挂载 `/api/codes`）

| 方法 | 路径 | 处理函数 | 说明 |
| --- | --- | --- | --- |
| GET | `/` | `getAllCodes` | 全局编码查询（分页/范围/日期/关键字/是否含已删除） |
| GET | `/product/:productId` | `getProductCodes` | 某产品编码列表（`?deleted=true` 查回收站） |
| POST | `/product/:productId` | `addCode` | 新增编码（校验 code 非空、末尾数字去重） |
| PUT | `/product/:productId/:codeId` | `updateCode` | 更新编码（校验 code 非空、末尾数字冲突） |
| DELETE | `/product/:productId/:codeId` | `deleteCode` | 软删除（deleted=true, deletedAt） |
| POST | `/product/:productId/:codeId/restore` | `restoreCode` | 恢复编码 |
| DELETE | `/product/:productId/:codeId/permanent` | `permanentDeleteCode` | 永久删除 |
| POST | `/move` | `moveCodes` | 批量移动编码到其他产品 |
| POST | `/batch-check-duplicate` | `batchCheckDuplicate` | 批量查重（跨产品，按末尾数字） |

#### 统计（[statsRoutes.js](server/src/routes/statsRoutes.js)，挂载 `/api/stats`）

| 方法 | 路径 | 处理函数 | 说明 |
| --- | --- | --- | --- |
| GET | `/` | `getStats` | 仪表盘概览（总产品/总编码/今日活动/分类分布） |
| GET | `/activity` | `getActivityData` | 最近 7 天活动数据 |
| GET | `/quality` | `getQualityStats` | 数据质量统计（缺失/超出/完整度/质量分） |
| GET | `/recent-activity` | `getRecentActivity` | 最近活动流 + 今日统计 + 小时分布 |

#### 备份（[backupRoutes.js](server/src/routes/backupRoutes.js)，挂载 `/api/backup`）

| 方法 | 路径 | 处理函数 | 说明 |
| --- | --- | --- | --- |
| GET | `/export` | `exportBackup` | 导出全量备份（下载 JSON） |
| POST | `/import` | `importBackup` | 导入备份（multipart，字段 `file`，50MB 限制） |
| GET | `/config` | `getConfig` | 获取自动备份配置 |
| POST | `/config` | `updateConfig` | 更新自动备份配置（校验 cron 并重调度） |
| GET | `/list` | `listLocalBackups` | 列出服务器本地备份文件 |
| GET | `/download/:filename` | `downloadLocalBackup` | 下载某个本地备份 |
| POST | `/restore/:filename` | `restoreLocalBackup` | 从某个本地备份恢复 |
| DELETE | `/:filename` | `deleteLocalBackup` | 删除某个本地备份 |

#### 代理接口（直接在 [app.js](server/src/app.js) 中定义）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/ocr/iflytek` | 讯飞 OCR 代理：接收 `{ imageBase64 }`，HMAC-SHA256 签名后转发 |
| POST | `/api/qr/decode` | 二维码解码代理：接收 `{ imageBase64 }` 或 `{ images: [] }`，多图依次尝试 |

### 5.3 控制器（Controllers）

#### 产品控制器（[productController.js](server/src/controllers/productController.js)）

| 函数 | 行号 | 职责 |
| --- | --- | --- |
| `getAllProducts` | L6-116 | 通过 `Product.countDocuments` 是否存在判断 Mongo/文件模式。Mongo：count + find + sort + skip/limit + distinct；文件：内存过滤/排序/分页 |
| `getProductById` | L119-132 | 按 id 查询产品 |
| `createProduct` | L135-202 | 校验 name 非空、codeRanges（起止合法、区间不重叠）；写入后 201 返回 |
| `updateProduct` | L227-302 | 同 createProduct 的 codeRanges 校验，更新后返回新文档 |
| `deleteProduct` | L205-224 | 先 `Code.deleteMany({productId})` 级联删除编码，再删产品 |

#### 编码控制器（[codeController.js](server/src/controllers/codeController.js)）

| 函数 | 行号 | 职责 |
| --- | --- | --- |
| `getAllCodes` | L7-94 | 组合查询：编码范围（`codeStart/codeEnd`，查询后按末尾数字过滤）、日期（`$or` 匹配 createdAt 或 date）、关键字（code/description 正则）、`includeDeleted` 控制回收站 |
| `getProductCodes` | L97-108 | 按 `?deleted` 返回某产品编码列表 |
| `addCode` | L111-182 | 核心去重逻辑：**按末尾数字判重**。活动编码重复 → 400 报错；回收站中末尾数字相同 → 永久删除旧记录后录入新编码（Mongo 与文件模式分别处理） |
| `updateCode` | L221-298 | 排除自身后按末尾数字查重，再更新 |
| `deleteCode` | L185-218 | 软删除（`deleted: true, deletedAt: new Date()`） |
| `restoreCode` | L301-334 | 恢复（`deleted: false, deletedAt: null`） |
| `permanentDeleteCode` | L337-362 | 物理删除 |
| `moveCodes` | L365-481 | 批量移动编码到目标产品：校验目标产品存在、源/目标不同、目标产品无同码；Mongo 逐条更新 `productId`，文件模式直接操作两个 `_codes.json` 文件 |
| `batchCheckDuplicate` | L484-573 | 跨产品批量查重：收集选中产品编码，按末尾数字分组，出现在 ≥2 个不同产品视为重复 |

#### 统计控制器（[statsController.js](server/src/controllers/statsController.js)）

| 函数 | 行号 | 职责 |
| --- | --- | --- |
| `getStats` | L6-69 | Mongo 用聚合/计数；文件模式内存统计。输出 totalProducts/totalCodes/recentActivity/categoryDistribution |
| `getActivityData` | L72-131 | 最近 7 天按天统计 products/codes 新增数 |
| `getQualityStats` | L134-315 | 按产品号码段（`codeRanges` 优先，否则 `codeStart/codeEnd`）计算缺失数（带 1500ms/500万次迭代保护）、超出数（含前导零/位数格式校验）、完整度与质量评分 |
| `getRecentActivity` | L318-442 | 最近 5 条活动流（产品/编码创建）、今日统计、24 小时分布 |

#### 备份控制器（[backupController.js](server/src/controllers/backupController.js)）

| 函数 | 行号 | 职责 |
| --- | --- | --- |
| `exportBackup` | L11-22 | `generateBackupData()` 后以附件形式下载 |
| `importBackup` | L25-39 | 解析上传的 JSON → `performRestore()` |
| `getConfig` | L43-51 | 读取 `data/settings.json` |
| `updateConfig` | L53-72 | 校验 cron（Quartz `?`/`0/` → node-cron `*`/`*/`）→ 写入 → `scheduleAutoBackup()` 重调度 |
| `listLocalBackups` | L76-100 | 列出 `BACKUPS_DIR` 下备份文件（按时间倒序） |
| `downloadLocalBackup` | L102-116 | 下载指定备份 |
| `restoreLocalBackup` | L118-137 | 读取本地备份文件并执行恢复 |
| `deleteLocalBackup` | L139-154 | 删除指定备份文件 |

### 5.4 数据模型（Models）与双存储模式

#### 切换机制

模块加载时读取 `process.env.MONGODB_URI`：

- 存在 → 导出 Mongoose 模型（含 Schema、索引、静态方法）
- 不存在 → 导出文件系统实现（同名异步方法，读写 `data/*.json`）

控制器通过 `typeof Product.countDocuments === 'function'` 或 `!!process.env.MONGODB_URI` 判断当前模式以走不同分支。

#### Product 模型（[Product.js](server/src/models/Product.js)）

字段：`name`（必填、唯一、trim）、`description`、`category`、`requiredQuantity`、`codeStart`、`codeEnd`、`codeRanges`（`[{start, end}]`）、`createdAt`。

`toJSON` 转换将 `_id` 映射为 `id`（virtuals）。

文件系统实现（L70-189）提供：`find` / `findById` / `create`（自动生成 `{id: Date.now().toString()}` 并创建空编码文件）/ `findByIdAndUpdate` / `findByIdAndDelete`（同时删除编码文件）。

#### Code 模型（[Code.js](server/src/models/Code.js)）

字段：`code`（必填、trim）、`description`、`date`（字符串）、`productId`（Mongo 中为 ObjectId 引用）、`deleted`（默认 false）、`deletedAt`、`createdAt`。

- Mongo 模式：`codeSchema.index({ code: 1, productId: 1 }, { unique: true })` 唯一索引（L73），`paginate` 静态方法（L50-66）
- 文件系统实现（L84-309）提供：`find`（支持 deleted/code 范围/日期/关键字过滤，兼容 Mongo 查询形状）、`create`（末尾数字去重）、`findByIdAndUpdate`、`findByIdAndDelete`、`deleteMany`、`paginate`

> 注意：虽然 Schema 层声明了 `{code, productId}` 唯一索引，但控制器层的重复判定实际是**按末尾数字（`extractNumericValue`）**进行的（如 "文版-123" 与 "文版-456" 若末尾数字相同则视为重复）。文件模式与 `addCode/updateCode` 的判重均以此为准。

#### 核心编码工具（[codeUtils.js](server/src/utils/codeUtils.js)）

| 函数 | 行号 | 说明 |
| --- | --- | --- |
| `extractNumericValue(code)` | L14-18 | 提取末尾数字（"文版-123" → 123；"ABC" → NaN），用于范围/排序/去重 |
| `extractNumericString(code)` | L28-32 | 提取末尾数字字符串（保留前导零），用于位数格式校验 |

### 5.5 服务层与工具（Services / Utils）

#### 自动备份服务（[backupService.js](server/src/services/backupService.js)）

| 函数 | 行号 | 说明 |
| --- | --- | --- |
| `ensureBackupDir` | L15-19 | 确保 `data/backups/` 存在 |
| `cleanOldBackups(retainCount)` | L25-52 | 按修改时间倒序保留 N 份 `autobackup-*.json`，删除更旧的 |
| `executeAutoBackup` | L57-77 | 生成备份数据 → 写入 `autobackup-{timestamp}.json` → 清理旧备份 |
| `scheduleAutoBackup` | L82-110 | 读取 settings，停止旧任务；将 Quartz 表达式（`?`、`0/`）兼容转换为 node-cron 后调度 |

模块导出 `BACKUPS_DIR`（= `data/backups`），供备份控制器使用。

#### 备份数据工具（[backupUtils.js](server/src/utils/backupUtils.js)）

| 函数 | 行号 | 说明 |
| --- | --- | --- |
| `generateBackupData` | L13-60 | 生成 `{version, timestamp, products, codes}` 全量备份。Mongo 模式查全表并转换 id；文件模式聚合 `products.json` + 各 `*_codes.json` |
| `performRestore` | L67-213 | 全量恢复（清空并覆盖）。Mongo：分批 1 万条插入、3 次退避重试、id 映射、**过滤孤立编码**；文件：重建 `products.json` 与各产品编码文件 |

#### 设置读写（[settingsUtils.js](server/src/utils/settingsUtils.js)）

| 函数 | 行号 | 说明 |
| --- | --- | --- |
| `getSettings` | L17-35 | 读取 `data/settings.json`，不存在则写入并返回默认值 |
| `updateSettings` | L40-50 | 合并更新并写回 |

默认设置：`autoBackupEnabled: true`、`cronExpression: '0 2 * * *'`（每天凌晨 2 点）、`retainCount: 7`。

### 5.6 环境变量与配置

参考 [server/.env.example](server/.env.example)：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | 5000 | 服务端口 |
| `MONGODB_URI` | 空 | MongoDB 连接串；留空则使用文件系统存储 |
| `IFLYTEK_OCR_APPID` | - | 讯飞 OCR AppID（可选） |
| `IFLYTEK_OCR_API_KEY` | - | 讯飞 OCR API Key（可选） |
| `IFLYTEK_OCR_API_SECRET` | - | 讯飞 OCR API Secret（可选） |
| `IFLYTEK_OCR_PATH` | `/v1/private/sf8e6aca1` | 讯飞 OCR 接口路径（可选覆盖） |

> 仓库中的 `.env.example` 凭证均为占位符，实际部署需通过环境变量注入。`start-prod.bat` 会在缺失时从 `.env.example` 复制 `.env`。

---

## 6. 前端（client）

### 6.1 入口与路由

入口：[index.js](client/src/index.js) 挂载 `<App />`。

路由表：[App.js](client/src/App.js)（L22-30），整体使用 antd `Layout`（Header + Content + Footer）：

| 路径 | 页面 |
| --- | --- |
| `/` | Dashboard（仪表盘） |
| `/products` | ProductList（产品列表） |
| `/products/:id` | ProductDetail（产品详情/编码管理主界面） |
| `/backup` | BackupManagement（备份管理） |
| `/search` | AdvancedSearch（高级搜索） |
| `/404` | NotFound |
| `*` | 重定向到 `/404` |

### 6.2 页面（Pages）

| 页面 | 文件（行号） | 职责 |
| --- | --- | --- |
| Dashboard | [Dashboard.js](client/src/pages/Dashboard.js) L62-486 | 拉取 stats/activity/quality/recent-activity 四类接口，渲染 StatCard、图表（分类分布、7 天活动、小时分布）、QualityPanel、ActivityStream；60s 自动刷新（`REFRESH_INTERVAL`，L60） |
| ProductList | [ProductList.js](client/src/pages/ProductList.js) L52-903 | 产品卡片分页/搜索/分类筛选/排序；批量选择删除；批量查重弹窗（`batchCheckDuplicate`）；内置 debounce（L40） |
| ProductDetail | [ProductDetail.js](client/src/pages/ProductDetail.js) L53-1495 | 产品信息 + 编码管理主界面：编码列表（筛选/排序/分页）、快速录入（扫码枪）、扫码弹窗录入、编辑/软删/恢复/永删、回收站、Excel 导出（含智能导出、按数量导出）、批量操作 |
| BackupManagement | [BackupManagement.js](client/src/pages/BackupManagement.js) L15-383 | 自动备份配置（cronstrue 本地化预览、开关、保留份数）、手动导出/导入、服务器本地备份列表/下载/恢复/删除 |
| AdvancedSearch | [AdvancedSearch.js](client/src/pages/AdvancedSearch.js) L19-497 | 组合条件全局编码搜索（范围/日期/关键字/含已删除）、批量删除/恢复、搜索历史与收藏（localStorage） |
| NotFound | [NotFound.js](client/src/pages/NotFound.js) L5-20 | 404 页面 |

### 6.3 服务层（[services/api.js](client/src/services/api.js)）

创建 Axios 实例（baseURL 来自 config，timeout 60s），含请求/响应拦截器（当前仅统一错误日志）。

导出 4 个 API 族：

| API 族 | 方法 | 对应后端 |
| --- | --- | --- |
| `productAPI` | getAllProducts / getProductById / createProduct / updateProduct / deleteProduct | `/api/products` |
| `codeAPI` | getAllCodes / getProductCodes / addCode / updateCode / deleteCode / restoreCode / permanentDeleteCode / batchCheckDuplicate / moveCodes | `/api/codes` |
| `statsAPI` | getStats / getActivityData / getQualityStats / getRecentActivity | `/api/stats` |
| `backupAPI` | exportBackup / importBackup / getConfig / updateConfig / listLocalBackups / downloadLocalBackup / restoreLocalBackup / deleteLocalBackup | `/api/backup` |

注意点：

- `getProductCodes` / `getProductById` / `deleteProduct` 对无效 id（undefined）做了防御性短路
- 备份导出/下载使用 `responseType: 'blob'`
- 导入大文件超时放宽至 10 分钟（`timeout: 600000`）

开发模式代理：`package.json` 中 `proxy: "http://localhost:5000"`，[setupProxy.js](client/src/setupProxy.js) 通过 `REACT_APP_BACKEND_TARGET` 可覆盖代理目标（默认 `http://localhost:5000`，保留 `/api` 前缀）。

### 6.4 组件（Components）

| 组件 | 文件 | 职责 |
| --- | --- | --- |
| AppHeader / AppFooter | [AppHeader.js](client/src/components/AppHeader.js) / [AppFooter.js](client/src/components/AppFooter.js) | 全局导航（Logo、菜单链接）与页脚 |
| StatCard | [StatCard.js](client/src/components/StatCard.js) | 仪表盘统计卡片（memo 优化） |
| QualityPanel | [QualityPanel.js](client/src/components/QualityPanel.js) | 数据质量面板（缺失/超出/完整度/质量分） |
| ActivityStream | [ActivityStream.js](client/src/components/ActivityStream.js) | 最近活动流展示 |
| ProductCard | [ProductCard.js](client/src/components/ProductCard.js) | 产品卡片（memo），含编码数量、批量选择状态 |
| ProductForm | [ProductForm.js](client/src/components/ProductForm.js) | 产品表单（含号码段 codeRanges 编辑） |
| CodeForm | [CodeForm.js](client/src/components/CodeForm.js) | 编码新增/编辑表单 |
| CodeList | [CodeList.js](client/src/components/CodeList.js) | 编码列表展示与批量操作入口 |
| QuickCodeInput | [QuickCodeInput.js](client/src/components/QuickCodeInput.js) | 扫码枪快速录入（连续输入、自动提交、错误/重复提示、声音告警） |
| ScannerModal | [ScannerModal.js](client/src/components/ScannerModal.js) | 扫码弹窗（630 行）：摄像头扫码（html5-qrcode）、本地解码（jsqr/BarcodeDetector）、后端 `/api/qr/decode` 兜底、OCR（tesseract.js 或后端 `/api/ocr/iflytek`） |
| RecycleBinModal | [RecycleBinModal.js](client/src/components/RecycleBinModal.js) | 回收站管理（查看已删除编码、恢复/永删） |

### 6.5 工具与配置（utils / config）

#### 配置（[config/index.js](client/src/config/index.js)）

| 配置项 | 说明 |
| --- | --- |
| `api.baseURL` | 生产环境 `/api`（相对路径）；开发环境 `REACT_APP_API_URL` 或 `http://localhost:5000/api` |
| `api.timeout` | 60000ms |
| `ui` | 默认显示编码数、提示框尺寸、每页产品数（12） |
| `scanner` | fps=15、扫码框 350×350、后置摄像头、1280×720、BarcodeDetector 实验特性 |
| `ocr.proxyUrl` / `qrDecode.proxyUrl` | 后端代理地址（生产相对路径，开发可用 `REACT_APP_BACKEND_TARGET` 覆盖） |
| `company` | 公司/系统名称/版本号 |

#### 工具

- [utils/scanner.js](client/src/utils/scanner.js)：`class Scanner` 封装 `Html5QrcodeScanner`，提供 `init(onSuccess, onError)` / `pause` / `resume` / `clear`；默认 `disableFlip: true`（金属铭牌防误判），扫描错误静默
- [utils/exportUtils.js](client/src/utils/exportUtils.js)：`ExportUtils` 提供 `exportToExcel`（底层）、`exportCodes`（单 Sheet）、`exportToExcelMultipleSheets`、`exportCodesSmart`（按创建日期分组多 Sheet）、`exportCodesByQuantity`（按最新 N 条导出）
- [utils/codeUtils.js](client/src/utils/codeUtils.js)：与后端同名的 `extractNumericValue` / `extractNumericString`

---

## 7. 数据与文件布局

默认文件系统存储模式（未配置 MongoDB）下，运行时在仓库根目录 `data/` 生成：

```
data/
├── products.json                 # 产品列表（id/name/description/category/requiredQuantity/codeStart/codeEnd/codeRanges/createdAt）
├── {productId}_codes.json        # 每个产品一个编码文件（code/description/date/deleted/deletedAt/createdAt）
├── settings.json                 # 自动备份配置（autoBackupEnabled/cronExpression/retainCount）
└── backups/                      # 自动备份与本地备份文件（autobackup-*.json）
```

说明：

- 产品 id 由 `Date.now().toString()` 生成
- 编码 id 同样由 `Date.now().toString()` 生成
- `data/` 已被 `.gitignore` 忽略，不属于版本库
- 备份文件命名：`autobackup-{ISO时间(冒号点转-)}.json`
- 软删除通过 `deleted` + `deletedAt` 字段标记，`includeDeleted` / `?deleted=true` 控制查询是否包含

---

## 8. 运行与部署

### 8.1 本地开发

方式一：Windows 一键启动（根目录 [start-dev.bat](start-dev.bat)）——自动检查/安装前后端依赖并分窗口启动。

方式二：手动启动

```bash
# 后端
cd server
npm install
npm run dev        # nodemon 热重启

# 前端（另开终端）
cd ../client
npm install
npm start
```

默认地址：前端 http://localhost:3000 ，后端 http://localhost:5000 。前端通过代理把 `/api` 转发到后端。

### 8.2 生产运行（非 Docker）

```bash
cd client
npm install
npm run build

cd ../server
npm install
npm start
```

或直接运行 [start-prod.bat](start-prod.bat)：自动检查构建产物、清理 5000 端口占用、从 `.env.example` 复制 `.env`，以 `NODE_ENV=production` 启动。生产模式下后端直接托管 `client/build`，访问 http://localhost:5000 即可。

### 8.3 Docker / Compose 部署

[docker-compose.yml](docker-compose.yml) 同时配置了 `image` 与 `build`，支持两种方式：

- 镜像导入（生产推荐）：`docker load -i xxx.tar` → `docker-compose up -d`
- 本地构建（开发）：`docker-compose up -d --build`

[Dockerfile](Dockerfile) 为多阶段构建：`client-build`（node:18-alpine 构建前端）→ `server-build`（安装生产依赖）→ 运行镜像（复制前后端产物，`node server/src/app.js`）。

Compose 服务：`api`（映射 5000，挂载 `./data:/app/data`，`MONGODB_URI=mongodb://mongo:27017/htsm-dms`）+ `mongo:6`（映射 27017，数据卷 `mongo-data`）。

根目录 [deploy.bat](deploy.bat) 封装了 `git pull` + `docker-compose up -d --build`。

### 8.4 Vercel 部署（前端）

[vercel.json](vercel.json) 配置 SPA 重写：所有路径回退到 `index.html`。配套 `.vercel/project.json` 为 Vercel 项目标识。注意：Vercel 部署仅托管前端静态资源，API 需独立部署后端。

### 8.5 测试

```bash
# 后端
cd server
npm test           # jest

# 前端
cd client
npm test           # react-scripts test
```

---

## 9. 常见扩展点

新增后端业务模块（推荐路径）：

1. `server/src/models/` 定义数据访问（需同时实现 Mongo 与文件系统两套，保持方法签名一致）
2. `server/src/controllers/` 实现用例与校验编排（用 `!!process.env.MONGODB_URI` 或 `typeof X.countDocuments === 'function'` 分模式）
3. `server/src/routes/` 定义 REST 路由并挂载到 `app.js`
4. `client/src/services/api.js` 增加对应 API 封装
5. `client/src/pages/` 或 `components/` 实现 UI 与交互

新增仪表盘统计类需求：后端在 `statsController.js` 实现（Mongo 优先聚合），前端在 `Dashboard.js` 加请求与图表。

新增备份/迁移类需求：统一落在 `utils/backupUtils.js` 的 `generateBackupData()` / `performRestore()`，保证两种存储模式互导；文件结构变更需同步更新两者。

新增扫码/识别类需求：前端优先 `ScannerModal.js` 内的本地解码链（jsqr → BarcodeDetector → 后端代理），后端代理在 `app.js` 中扩展。

---

## 10. 旧版目录（old）

`old/` 是历史版本（静态 HTML/CSS/JS + `server.js` + zxing 扫码 + js-yaml 配置），不参与当前主链路。如需对比旧 UI、旧扫码实现或历史配置（`config.yaml`），可作参考，不建议与当前版本混用。
