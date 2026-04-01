# 高级搜索功能 Spec

## Why
目前系统支持基本的编码列表查看，但在面对大量产品和编码数据时，用户难以快速定位特定的编码。通过引入高级搜索功能，支持编码范围、日期范围、多条件组合查询，以及保存历史搜索和条件，能大幅提升用户查找和管理数据的效率。

## What Changes
- 添加前端高级搜索页面 `AdvancedSearch.js`，提供组合搜索表单（产品、编码范围、日期范围、描述关键字等）。
- 更新后端 `/api/codes` 接口（`codeController.js` 的 `getAllCodes` 方法），支持接收并处理 `codeStart`, `codeEnd`, `startDate`, `endDate`, `keyword` 等查询参数。
- 增强 `server/src/models/Code.js` 在文件系统和 MongoDB 模式下的过滤能力，支持复杂的范围查询和模糊匹配。
- 在前端实现搜索历史记录功能（使用 `localStorage` 存储最近的搜索条件）。
- 在前端实现保存搜索条件功能（使用 `localStorage` 存储用户收藏的搜索配置）。
- 在前端导航栏 `AppHeader.js` 和路由 `App.js` 中添加高级搜索的入口和路径。

## Impact
- Affected specs: 查询功能、列表展示、持久化存储配置。
- Affected code: 
  - `client/src/App.js`
  - `client/src/components/AppHeader.js`
  - `client/src/pages/AdvancedSearch.js` (新建)
  - `client/src/services/api.js`
  - `server/src/controllers/codeController.js`
  - `server/src/models/Code.js`

## ADDED Requirements
### Requirement: 高级搜索页面
系统应当提供一个独立的高级搜索页面，允许用户通过多种条件组合查询编码。

#### Scenario: 执行多条件组合搜索
- **WHEN** 用户在高级搜索页面输入编码范围（如100-200）并选择特定产品后点击搜索
- **THEN** 系统展示该产品下编码在 100 到 200 之间的所有结果，并支持分页

#### Scenario: 使用搜索历史记录
- **WHEN** 用户进入高级搜索页面
- **THEN** 页面展示用户最近执行过的搜索条件记录，点击记录可快速回填表单并执行搜索

#### Scenario: 保存搜索条件
- **WHEN** 用户在高级搜索页面配置好一组搜索条件并点击"保存条件"
- **THEN** 该条件组被命名并保存在"已保存的搜索"列表中，以供未来一键调用

## MODIFIED Requirements
### Requirement: 编码查询接口增强
后端获取编码列表的接口应当支持更多的筛选参数，且兼容 MongoDB 和文件系统两种存储模式。
