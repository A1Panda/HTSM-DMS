# 批量查重功能 Spec

## Why
用户需要在产品列表页面选择多个产品，快速检查这些产品之间是否存在重复的编码，以便及时发现数据质量问题。

## What Changes
- 在产品列表页面的"批量选择"按钮旁边新增"批量查重"按钮
- 用户选择多个产品后，点击"批量查重"按钮进行查重
- 系统分析选中产品的所有编码，找出重复项
- 在模态框中展示查重结果，包括重复编码及其所在产品

## Impact
- 受影响文件：
  - `client/src/pages/ProductList.js` - 添加批量查重按钮和结果展示
  - `server/src/controllers/codeController.js` - 新增批量查重 API
  - `server/src/routes/codeRoutes.js` - 新增查重路由
- 用户体验：提升数据质量管理效率

## ADDED Requirements

### Requirement: 批量查重功能

#### Scenario: 用户选择产品进行查重
- **GIVEN** 用户在产品列表页面
- **WHEN** 用户点击"批量选择"进入批量模式
- **AND** 用户选择了 2 个或更多产品
- **AND** 用户点击"批量查重"按钮
- **THEN** 系统分析选中产品的所有编码
- **AND** 在模态框中展示重复编码列表
- **AND** 每个重复编码显示其出现的所有产品名称

#### Scenario: 未选择足够产品时点击查重
- **GIVEN** 用户在产品列表页面
- **WHEN** 用户选择了少于 2 个产品
- **AND** 用户点击"批量查重"按钮
- **THEN** 系统提示"请至少选择 2 个产品进行查重"

#### Scenario: 查重结果为空
- **GIVEN** 用户选择了多个产品
- **WHEN** 系统完成查重分析
- **AND** 没有发现重复编码
- **THEN** 系统提示"未发现重复编码"

#### Scenario: 查重 API 实现
- **GIVEN** 后端接收到批量查重请求
- **WHEN** 请求包含产品 ID 数组
- **THEN** 系统查询所有选中产品的编码
- **AND** 使用 Map 数据结构找出重复项
- **AND** 返回重复编码及其所在产品信息

## API Specification

### POST /api/codes/batch-check-duplicate

**Request Body:**
```json
{
  "productIds": ["product1", "product2", "product3"]
}
```

**Response:**
```json
{
  "duplicates": [
    {
      "code": "1001",
      "products": [
        { "id": "product1", "name": "产品A" },
        { "id": "product2", "name": "产品B" }
      ]
    }
  ],
  "totalChecked": 150,
  "duplicateCount": 1
}
```
