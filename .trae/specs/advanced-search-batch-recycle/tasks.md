# Tasks
- [x] Task 1: 扩展后端支持搜索已删除数据
  - [x] SubTask 1.1: 更新 `server/src/controllers/codeController.js`，使 `getAllCodes` 接口接收并处理 `includeDeleted` 参数。
  - [x] SubTask 1.2: 更新 `server/src/models/Code.js`，在文件系统模式下的 `find` 和 `paginate` 方法中，正确处理当 `query.includeDeleted` 为真时不过滤 `deleted` 状态。

- [x] Task 2: 改造前端 `CodeList` 组件
  - [x] SubTask 2.1: 在 `client/src/components/CodeList.js` 中增加 `onRestore` props。
  - [x] SubTask 2.2: 在 `renderItem` 中判断 `code.deleted`，如果为 `true`，显示“已删除” Tag，并且将操作按钮改为“恢复”按钮；如果为 `false`，则保留原有的“删除”按钮。

- [x] Task 3: 更新高级搜索页面表单
  - [x] SubTask 3.1: 在 `AdvancedSearch.js` 的搜索表单中增加一个 `Checkbox` 控件“包含已删除记录”。
  - [x] SubTask 3.2: 确保将 `includeDeleted` 状态存入 `localStorage` (历史记录与保存条件) 并能在恢复条件时回显。

- [x] Task 4: 在高级搜索页面实现批量操作
  - [x] SubTask 4.1: 在 `AdvancedSearch.js` 中引入 `batchMode`, `selectedCodes` 状态。
  - [x] SubTask 4.2: 增加“批量选择”、“全选”、“删除选中”、“恢复选中”、“取消批量”等按钮 UI 和交互逻辑。
  - [x] SubTask 4.3: 编写批量删除 (`confirmBatchDeleteCodes`) 和批量恢复 (`handleBatchRestoreCodes`) 的处理函数（可参考 `ProductDetail.js` 中的类似实现）。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2] and [Task 3]
