# 任务拆解 (Tasks)

## 阶段一：后端基础架构与手动备份恢复 (Backend - Manual Backup)
1. [ ] **依赖安装**: 在 `server` 目录中运行 `npm install multer node-cron`。
2. [ ] **备份工具函数创建 (`server/src/utils/backupUtils.js`)**: 
   - 编写 `generateBackupData()` 方法，封装从 MongoDB 或文件系统提取全量数据的逻辑，统一返回标准化 JSON 对象。
   - 编写 `performRestore(backupData)` 方法，封装清空现有数据并重新插入的逻辑，包含完整的 ID 兼容性映射处理。
3. [ ] **手动备份控制器 (`server/src/controllers/backupController.js`)**:
   - 实现 `exportBackup`: 调用 `generateBackupData` 并作为文件流响应。
   - 实现 `importBackup`: 使用 `multer` 接收文件，解析 JSON 并调用 `performRestore`。
4. [ ] **路由注册**: 创建 `server/src/routes/backupRoutes.js` 注册 `/export` 和 `/import`，并在 `app.js` 中挂载。

## 阶段二：后端自动备份系统 (Backend - Auto Backup)
1. [ ] **配置管理模块**: 
   - 创建机制读取和保存配置到 `data/settings.json`（支持 `autoBackupEnabled`, `cronExpression`, `retainCount` 等字段）。
2. [ ] **自动备份服务 (`server/src/services/backupService.js`)**:
   - 实现 `createLocalBackup()`: 调用 `generateBackupData`，将 JSON 写入 `data/backups/backup-xxx.json`。
   - 实现 `cleanOldBackups()`: 读取备份目录，按时间排序并删除超出 `retainCount` 限制的旧文件。
   - 实现定时任务的初始化与重载机制（基于 `node-cron`）。
3. [ ] **应用启动集成**: 在 `app.js` 或独立文件中，系统启动时加载配置并启动自动备份定时任务。
4. [ ] **服务器备份管理 API**:
   - 在 `backupController.js` 新增方法：`getConfig`, `updateConfig`, `listLocalBackups`, `downloadLocalBackup`, `restoreLocalBackup`, `deleteLocalBackup`。
   - 在 `backupRoutes.js` 补充相应的路由。

## 阶段三：前端 API 服务集成 (Frontend - API)
1. [ ] **更新 API 配置 (`client/src/services/api.js`)**:
   - 增加 `backupAPI` 对象。
   - 包含所有上述后端接口的调用封装，特别是针对文件下载 (`responseType: 'blob'`) 的特殊处理。

## 阶段四：前端 UI 页面开发 (Frontend - UI)
1. [ ] **创建备份管理页面 (`client/src/pages/BackupManagement.js`)**:
   - **顶栏**: 显示存储模式和当前配置状态。
   - **自动备份设置卡片**: 包含开关 (Switch)、时间选择/输入框、保留份数输入框，以及保存设置按钮。
   - **本地操作卡片**: 包含“下载全量备份”按钮和“上传备份文件恢复” (Upload) 控件。
   - **服务器备份列表**: 使用 `Table` 或 `List` 组件，展示 `data/backups/` 下的文件。每行包含：文件名、大小、创建时间、操作列（下载、恢复、删除）。
2. [ ] **页面路由配置 (`client/src/App.js`)**: 
   - 导入并注册 `/backup` 路由。
3. [ ] **导航菜单更新 (`client/src/components/AppHeader.js`)**:
   - 在顶部菜单栏中添加“数据备份”导航项（使用相应图标如 `SafetyOutlined` 或 `DatabaseOutlined`）。

## 阶段五：测试与优化 (Testing & Refinement)
1. [ ] **跨模式测试**:
   - 在 MongoDB 模式下导出数据，停止服务，切换为本地文件模式，导入数据，验证数据是否完好且关联正确。
   - 反向测试：从本地文件模式导出，导入到 MongoDB，验证 `ObjectId` 转换和外键映射是否正确。
2. [ ] **自动备份测试**:
   - 将 Cron 设为每分钟执行，验证备份文件是否按预期生成，并在超出保留份数时自动清理旧文件。
3. [ ] **错误处理**: 确保上传非法 JSON、断网等情况有友好的前端提示和后端容错机制。
