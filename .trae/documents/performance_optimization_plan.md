# 性能优化方案：服务端分页与功能适配

## 1. 目标
引入 **服务端分页** 机制解决性能问题，同时通过 **新增辅助接口** 修复因分页导致的“查重”和“范围检查”功能失效问题。

## 2. 实施方案

### 2.1 后端改造 (Server)
1.  **修改 `getProductCodes` 接口**：
    - 所在文件：`server/src/controllers/codeController.js`
    - 功能：接收 `page`, `limit`, `q`, `sort` 参数。
    - 实现：返回 `{ codes: [], total: 0, page: 1, totalPages: 1 }`。

2.  **新增 `checkCodeExists` 接口**（修复全局查重）：
    - 路径：`GET /api/codes/check`
    - 参数：`productId`, `code`
    - 功能：快速检查指定编码是否存在于数据库/文件中（返回布尔值），用于扫码时的实时预警。

3.  **新增 `getProductStats` 接口**（修复范围检查）：
    - 路径：`GET /api/products/:id/stats`
    - 功能：在服务端计算“缺失编码”和“超出范围编码”。
    - 返回：`{ hasMissing: bool, missingCodes: [], hasExcess: bool, excessCodes: [] }`。
    - 注意：对于超大数据量，此接口可能较慢，应异步加载。

### 2.2 前端改造 (Client)
1.  **更新 API 服务**：
    - 所在文件：`client/src/services/api.js`
    - 新增 `checkCodeExists` 和 `getProductStats` 方法。
    - 更新 `getProductCodes` 支持分页参数。

2.  **重构 `ProductDetail` 组件**：
    - **分页集成**：实现 `loadCodes` 的分页逻辑，管理 `pagination` 状态。
    - **查重逻辑**：
        - 替换原有的 `codes.some()` 本地检查。
        - 在 `handleScanResult` 中调用 `checkCodeExists` 接口，若存在则报错，否则提交。
    - **范围检查**：
        - 移除本地 `checkCodeRangeStatus` 函数。
        - 使用 `useEffect` 异步调用 `getProductStats`，并将结果存储在 state 中用于展示。

3.  **更新 `CodeList` 组件**：
    - 支持受控分页 (`pagination` prop)。

## 3. 预期效果
- **性能提升**：列表加载速度不再随数据量降低。
- **功能完整**：全局查重和范围统计功能保持可用，且计算压力转移至服务端。
