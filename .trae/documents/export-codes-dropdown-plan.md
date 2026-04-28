# 导出编码功能增强计划

## 1. 摘要 (Summary)
将当前的产品详情页“导出编码”按钮替换为下拉菜单按钮，提供两种高级导出选项：
1. **按日期时间智能导出**：将编码按日期自动分组，导出到同一个Excel文件的不同Sheet页中。
2. **按日期排序导出指定数量**：弹窗输入指定数量，系统将优先导出最新录入（按创建时间降序）的编码。

## 2. 现状分析 (Current State Analysis)
目前系统在 `client/src/pages/ProductDetail.js` 中使用一个简单的 `Button` 来触发导出，它调用 `client/src/utils/exportUtils.js` 中的 `exportCodes` 方法。该方法直接将所有关联该产品的编码导出到一个单独的Excel工作表（Sheet）中。

## 3. 提议的变更 (Proposed Changes)

### 3.1 修改 `client/src/utils/exportUtils.js`
- **新增 `exportToExcelMultipleSheets` 方法**：基于 `xlsx` 库实现多Sheet页的Excel导出功能。
- **新增 `exportCodesSmart(codes, productName)` 方法**：
  - 遍历传入的 `codes`，按 `date` 字段进行分组（无日期的归为“未分类”）。
  - 将每组数据映射为 Sheet 数据（Sheet名为对应的日期）。
  - 调用 `exportToExcelMultipleSheets` 进行导出。
- **新增 `exportCodesByQuantity(codes, productName, quantity)` 方法**：
  - 将传入的 `codes` 按 `createdAt` 字段进行降序排序（最新录入的排前面）。
  - 截取前 `quantity` 个编码。
  - 调用原有的 `exportCodes` 方法进行单Sheet导出。

### 3.2 修改 `client/src/pages/ProductDetail.js`
- **引入依赖**：从 `antd` 引入 `Dropdown`, `Menu`, `InputNumber`，从 `@ant-design/icons` 引入 `DownOutlined`。
- **增加状态**：
  - `isExportModalVisible` (boolean)：控制“指定数量导出”弹窗的显示与隐藏。
  - `exportQuantity` (number)：存储用户输入的需要导出的编码数量（默认值为全量或常用的比如50）。
- **新增处理函数**：
  - `handleSmartExport`：调用 `ExportUtils.exportCodesSmart` 并在成功/失败后显示 `message` 提示。
  - `showQuantityExportModal`：打开数量输入弹窗。
  - `handleQuantityExportConfirm`：调用 `ExportUtils.exportCodesByQuantity` 并关闭弹窗。
- **UI 组件更新**：
  - 将原有的“导出编码” `<Button>` 包装在 `<Dropdown>` 中，添加包含上述两个选项的 `menu`。
  - 在组件底部添加一个 `<Modal>`，用于输入指定的导出数量。弹窗中包含一个 `InputNumber` 组件，其最大值限制为当前总编码数量。

## 4. 假设与决策 (Assumptions & Decisions)
- **智能导出分组**：使用 `code.date` 作为Sheet名称。由于Excel的Sheet名称长度限制为31个字符，代码中会截取前31位以确保不会报错。
- **导出数量上限**：用户在弹窗中输入的数量不能超过当前存在的总编码数。
- **数量导出排序**：根据用户的确认，数量导出始终优先导出“最新录入”的编码。

## 5. 验证步骤 (Verification steps)
1. 刷新页面进入产品详情。
2. 点击“导出编码”下拉箭头，应该看到两个新选项。
3. 点击“按日期时间智能导出 (分Sheet页)”，下载的Excel应包含按日期命名的多个工作表。
4. 点击“按日期排序导出指定数量”，弹出数量输入框，输入例如 `10`，确认后导出的Excel应只包含最近录入的10个编码。
