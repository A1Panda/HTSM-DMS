# 任务列表 (Tasks)

- [x] Task 1: 增强后端 Cron 表达式验证和预处理
  - [x] SubTask 1.1: 修改 `server/src/services/backupService.js`，在 `scheduleAutoBackup` 方法中添加对 `0/` 替换为 `*/` 的预处理逻辑。
  - [x] SubTask 1.2: 修改 `server/src/controllers/backupController.js` 中的 `updateConfig` 方法，在保存前使用 `node-cron` 校验预处理后的表达式。如果无效，返回 400 错误及提示信息。

- [x] Task 2: 完善前端错误提示
  - [x] SubTask 2.1: 修改 `client/src/pages/BackupManagement.js`，在 `handleSaveConfig` 中捕获后端返回的具体错误信息（如 `error.response.data.error`），并使用 `message.error` 显示给用户，而不是统一的“更新配置失败”。
