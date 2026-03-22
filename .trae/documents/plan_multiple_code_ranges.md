# 多号码段适配实施计划

## 1. 概述 (Summary)
目前产品添加编码仅支持单一的“编码起始值”和“编码结束值”。为了满足业务中出现的非连续号码段（如：100-200, 500-600）需求，计划将系统升级为支持配置和验证多个号码段。

## 2. 现状分析 (Current State Analysis)
- **数据模型**：`Product` 模型目前只包含 `codeStart` 和 `codeEnd` 两个字符串字段。
- **前端表单**：`ProductForm` 提供固定的两个输入框用于输入单个号码段，并自动计算 `requiredQuantity`（需求数量）。
- **逻辑校验**：在 `statsController.js`（后端）、`ProductDetail.js` 和 `ProductList.js`（前端）中，缺失编码和超出范围编码的计算均基于单一的 `codeStart` 和 `codeEnd` 区间。

## 3. 计划修改 (Proposed Changes)

### 3.1 数据模型与后端 API
- **`server/src/models/Product.js`**：
  - 在 Mongoose schema 中新增 `codeRanges: [{ start: String, end: String }]` 字段。
  - 在文件系统模式 (File System) 的 `create` 和 `findByIdAndUpdate` 方法中加入对 `codeRanges` 的支持。
- **`server/src/controllers/productController.js`**：
  - 在 `createProduct` 和 `updateProduct` 接口中，接收前端传来的 `codeRanges` 数组并存入数据库。

### 3.2 统计与校验逻辑
- **`server/src/controllers/statsController.js`** (`getQualityStats`)：
  - 重构数据质量统计逻辑，使其支持遍历 `codeRanges` 数组。
  - 为保证向后兼容，如果产品没有 `codeRanges` 数据，则回退使用原有的 `codeStart` 和 `codeEnd` 作为唯一区间。
  - 在判断“超出范围”时，只要编码落入任意一个配置的区间且格式正确，即视为有效。

### 3.3 前端组件与页面
- **`client/src/components/ProductForm.js`**：
  - 使用 Ant Design 的 `Form.List` 替换原有的两个固定输入框，允许用户动态添加/删除多组“起始值”和“结束值”。
  - 更新 `initialValues` 处理逻辑，编辑旧数据时将 `codeStart`/`codeEnd` 转换为 `codeRanges` 格式。
  - 更新 `handleRangeChange` 函数，遍历所有号码段累加计算总的 `requiredQuantity`。
- **`client/src/pages/ProductDetail.js` & `client/src/pages/ProductList.js`**：
  - 重构 `checkCodeRangeStatus` 函数，使其支持遍历 `codeRanges` 来计算 `missingCodes`（缺失编码）和 `excessCodes`（超出范围编码）。
  - 更新 UI 显示：将“编码范围”渲染为多个区间的组合展示（例如：`100-200, 500-600`）。
- **`client/src/components/ProductCard.js`**：
  - 同样更新产品卡片上的“编码范围”展示，支持渲染多个区间。

## 4. 假设与决策 (Assumptions & Decisions)
- **向后兼容性**：不强制迁移数据库中已有的旧数据。代码逻辑会同时兼容旧的 `codeStart`/`codeEnd` 字段和新的 `codeRanges` 字段。
- **交互方式**：采用动态表单项（添加/删除号码段）的方式，而不是单行文本解析，以降低用户输入格式错误的风险。
- **前置补零**：编码宽度（用于补零对比）将由每个独立区间的 `start` 或 `end` 的最大字符串长度决定。

## 5. 验证步骤 (Verification Steps)
1. 在前端页面创建一个新产品，添加两个不连续的号码段（例如：`100-105` 和 `200-205`）。
2. 验证表单的“需求数量”是否自动正确累加（应为 12）。
3. 录入编码：录入几个在区间内的编码和几个在区间外的编码。
4. 进入产品详情页，验证“缺失编码”和“超出范围编码”的计算是否准确。
5. 编辑该产品，确认之前保存的多组号码段能够正确回显。