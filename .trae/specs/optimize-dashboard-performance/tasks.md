# Tasks

- [x] Task 1: 优化后端 `getStats` 接口
  - [x] SubTask 1.1: 区分 MongoDB 和 FileSystem 模式，在 MongoDB 模式下使用 `countDocuments()` 统计总数，使用日期条件查询今日活动数。
  - [x] SubTask 1.2: 添加 `categoryDistribution` 的计算（MongoDB 下使用 `$group` 聚合，FileSystem 模式下在内存中统计）。

- [x] Task 2: 优化后端 `getActivityData` 接口
  - [x] SubTask 2.1: 在 MongoDB 模式下使用聚合管道 (`aggregate`) 或精确的日期范围查询 (`$gte`, `$lt`) 获取最近7天的活动数据，避免 `find()` 全表扫描。
  - [x] SubTask 2.2: 兼容处理 FileSystem 模式下的过滤逻辑。

- [x] Task 3: 优化后端 `getRecentActivity` 接口
  - [x] SubTask 3.1: 在 MongoDB 模式下，使用 `.sort({ createdAt: -1 }).limit(X)` 分别获取最新产品和编码，避免在内存中全量排序。
  - [x] SubTask 3.2: 针对当日统计，使用时间区间查询。

- [x] Task 4: 优化后端 `getQualityStats` 接口
  - [x] SubTask 4.1: 修改逻辑，不再使用全局的 `Code.find()`。
  - [x] SubTask 4.2: 改为遍历每个包含编码范围的 Product 时，仅获取该 Product 的对应编码（`Code.find({ productId: product.id })`），从而降低单次内存占用峰值。

- [x] Task 5: 优化前端 `Dashboard.js`
  - [x] SubTask 5.1: 移除 `fetchProducts` 函数和对 `productAPI.getAllProducts()` 的调用。
  - [x] SubTask 5.2: 移除无用的 `products` 状态。
  - [x] SubTask 5.3: 更新产品分类分布饼图的数据源，使其直接读取 `getStats` 接口返回的 `categoryDistribution` 字段。
