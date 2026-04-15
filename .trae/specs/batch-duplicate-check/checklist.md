# Checklist

- [x] 后端 API 实现
  - [x] codeController.js 中包含 batchCheckDuplicate 方法
  - [x] codeRoutes.js 中包含 POST /batch-check-duplicate 路由
  - [x] API 支持 MongoDB 存储模式
  - [x] API 支持文件系统存储模式
  - [x] API 返回正确的重复编码数据结构

- [x] 前端功能实现
  - [x] ProductList.js 中显示"批量查重"按钮（批量模式下）
  - [x] 点击按钮时检查至少选择了2个产品
  - [x] api.js 中包含 batchCheckDuplicate 方法
  - [x] 查重结果模态框正确显示重复编码
  - [x] 模态框中显示每个重复编码对应的产品名称
  - [x] 无重复编码时显示友好提示

- [x] 功能验证
  - [x] 选择2个有重复编码的产品，正确显示重复项
  - [x] 选择多个无重复编码的产品，显示"未发现重复编码"
  - [x] 选择1个产品时点击查重，提示"请至少选择2个产品"
