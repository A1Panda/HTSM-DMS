# 修复备份 Cron 表达式解析问题规范 (Fix Backup Cron Expression Spec)

## 为什么 (Why)
当前数据备份功能中，用户输入类似 `0 0/1 * * * ?` 的 Quartz 风格 Cron 表达式时，前端能正常解析预览，但后端使用的 `node-cron` 库不支持 `?` 和 `0/1` 这种语法。这导致后端 `cron.validate()` 校验失败，自动备份任务未能实际启动，且后端没有将此错误抛出给前端，导致用户误以为设置成功。

## 做了什么更改 (What Changes)
- **增加表达式预处理**：在后端对接收到的 Cron 表达式进行正则替换，将常见的 Quartz 语法（如 `?` 替换为 `*`，`0/` 替换为 `*/`）转换为 `node-cron` 支持的标准语法。
- **增强后端保存校验**：在保存自动备份配置（`updateConfig`）时，提前验证转换后的 Cron 表达式是否有效。如果无效，则直接返回 HTTP 400 错误。
- **完善前端错误提示**：前端处理后端的 400 错误，并明确提示用户“无效的 Cron 表达式”，避免静默失败。

## 影响范围 (Impact)
- 影响的特性：自动数据备份的配置和调度
- 影响的代码：
  - `server/src/services/backupService.js` (定时任务调度逻辑)
  - `server/src/controllers/backupController.js` (配置保存和接口响应)
  - `client/src/pages/BackupManagement.js` (前端错误提示处理)

## 新增需求 (ADDED Requirements)
### 需求：支持常见 Quartz Cron 语法的预处理与严格校验
系统应该尽可能兼容用户从第三方工具复制的 Quartz 风格 Cron 表达式，对于无法支持的表达式需明确拒绝。

#### 场景：用户输入 `0 0/1 * * * ?`
- **当 (WHEN)** 用户在自动备份配置中输入 `0 0/1 * * * ?` 并点击保存
- **那么 (THEN)** 后端将其预处理为 `0 */1 * * * *`
- **并且 (AND)** `node-cron` 验证通过，成功更新配置并调度备份任务
- **并且 (AND)** 前端提示“自动备份配置已更新”

#### 场景：用户输入彻底无效的表达式
- **当 (WHEN)** 用户输入 `invalid_cron` 并点击保存
- **那么 (THEN)** 后端验证失败，返回 `400 Bad Request` 和错误信息
- **并且 (AND)** 前端捕获该错误并提示用户“更新配置失败：无效的 Cron 表达式”
