# Tasks

- [x] Task 1: 实现后端批量查重 API
  - [x] SubTask 1.1: 在 codeController.js 中添加 batchCheckDuplicate 方法
  - [x] SubTask 1.2: 在 codeRoutes.js 中添加 POST /batch-check-duplicate 路由
  - [x] SubTask 1.3: 实现重复编码检测逻辑（支持 MongoDB 和文件系统两种存储模式）

- [x] Task 2: 实现前端批量查重功能
  - [x] SubTask 2.1: 在 ProductList.js 中添加"批量查重"按钮（仅在批量模式下显示）
  - [x] SubTask 2.2: 在 api.js 中添加 batchCheckDuplicate API 调用
  - [x] SubTask 2.3: 实现查重结果模态框组件，展示重复编码及其所在产品
  - [x] SubTask 2.4: 处理边界情况（选择少于2个产品时的提示、无重复结果提示）

- [x] Task 3: 功能测试与验证
  - [x] SubTask 3.1: 测试选择多个产品有重复编码的情况
  - [x] SubTask 3.2: 测试选择多个产品无重复编码的情况
  - [x] SubTask 3.3: 测试选择少于2个产品的边界情况

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
