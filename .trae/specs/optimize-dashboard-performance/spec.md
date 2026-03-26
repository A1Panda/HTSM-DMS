# Optimize Dashboard Performance Spec

## Why
目前仪表盘（Dashboard）在计算统计数据时，后端会将所有的产品和编码数据（`Product.find()` 和 `Code.find()`）一次性加载到内存中进行过滤和计算；同时前端也会请求所有的产品数据来计算分类占比。当数据量增大时，这会导致严重的性能问题、高内存占用以及页面加载缓慢。

## What Changes
- **后端统计接口重构**：
  - 优化 `getStats`：在 MongoDB 模式下使用 `countDocuments` 替代 `find()`，并通过数据库聚合（`aggregate`）直接计算产品分类分布（Category Distribution）和今日活动数。
  - 优化 `getActivityData` 和 `getRecentActivity`：使用数据库层面的日期查询、排序（`sort`）和限制（`limit`），避免将所有数据加载到内存中进行倒序和截取。
  - 优化 `getQualityStats`：将全局获取所有编码（`Code.find()`）改为按产品逐个获取并处理，减少单次内存峰值。
  - 兼容处理：确保在 File System 模式下也能使用优化的数组/文件读取逻辑。
- **前端 Dashboard 重构**：
  - 移除对 `productAPI.getAllProducts()` 的全量请求。
  - 修改产品分类分布图表（Pie Chart）的数据源，直接使用 `getStats` 接口返回的聚合结果。
  - 移除无用的 `products` 状态，精简初始化的 `Promise.allSettled`。

## Impact
- Affected specs: 仪表盘数据加载性能、系统整体内存占用。
- Affected code:
  - `server/src/controllers/statsController.js`
  - `client/src/pages/Dashboard.js`

## ADDED Requirements
### Requirement: Category Distribution API
The system SHALL provide product category distribution data directly within the `/api/stats` endpoint.
#### Scenario: Success case
- **WHEN** frontend calls `/api/stats`
- **THEN** it returns `totalProducts`, `totalCodes`, `recentActivity`, and `categoryDistribution` (e.g., `[{ category: 'A', count: 10 }]`).

## MODIFIED Requirements
### Requirement: Dashboard Data Fetching
The frontend dashboard SHALL NOT fetch all products to render the category pie chart. It SHALL rely entirely on the backend aggregated statistics.
