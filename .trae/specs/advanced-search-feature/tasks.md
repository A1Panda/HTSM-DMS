# Tasks
- [x] Task 1: 扩展后端编码查询 API
  - [x] SubTask 1.1: 更新 `server/src/controllers/codeController.js` 的 `getAllCodes` 方法，接收并解析 `codeStart`, `codeEnd`, `startDate`, `endDate`, `keyword` 等参数。
  - [x] SubTask 1.2: 更新 `server/src/models/Code.js`，在 MongoDB 模式下构建复杂的查询对象（使用 `$gte`, `$lte`, `$regex` 等）。
  - [x] SubTask 1.3: 更新 `server/src/models/Code.js`，在文件系统模式下的 `find` 或 `paginate` 方法中添加对应的数组过滤逻辑。

- [x] Task 2: 扩展前端 API 服务
  - [x] SubTask 2.1: 在 `client/src/services/api.js` 中更新 `codeAPI.getAllCodes` 或新增 `searchCodes` 方法，以支持传递高级搜索参数。

- [x] Task 3: 创建前端高级搜索页面与组件
  - [x] SubTask 3.1: 新建 `client/src/pages/AdvancedSearch.js` 页面。
  - [x] SubTask 3.2: 在页面中实现搜索表单（包含产品选择、编码范围、日期范围、关键字输入）。
  - [x] SubTask 3.3: 引入现有的 `CodeList` 组件，展示搜索结果，并处理分页和加载状态。

- [x] Task 4: 实现搜索历史与保存条件功能
  - [x] SubTask 4.1: 在 `AdvancedSearch.js` 中编写逻辑，将每次成功的搜索条件存入 `localStorage` 作为"历史记录"（限制最多保存如 10 条）。
  - [x] SubTask 4.2: 提供"保存当前搜索条件"按钮及弹窗，允许用户命名并保存条件至 `localStorage`。
  - [x] SubTask 4.3: 在页面侧边栏或顶部展示"搜索历史"和"已保存的搜索"，点击可直接应用该条件并触发搜索。

- [x] Task 5: 页面路由与入口配置
  - [x] SubTask 5.1: 在 `client/src/App.js` 中添加 `/search` 路由，指向 `AdvancedSearch` 页面。
  - [x] SubTask 5.2: 在 `client/src/components/AppHeader.js` 的导航菜单中添加"高级搜索"项。

- [x] Task 6: 更新 README 状态
  - [x] SubTask 6.1: 修改 `README.md` 第 256-261 行的内容，将相关功能的复选框标记为已完成（`[x]`）。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 4]
