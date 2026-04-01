# 高级搜索批量操作与回收站状态 Spec

## Why
目前高级搜索页面只能逐个删除搜索出的编码，且无法搜索出已经被移动到回收站（已软删除）的编码。为了进一步提升用户的管理效率和追踪能力，我们需要在高级搜索页面增加批量操作（如批量删除、批量恢复、全选等）功能，并支持选择是否搜索包含回收站（已删除）的编码，以及在列表中明确标识已删除状态的编码。

## What Changes
- 后端：
  - 更新 `/api/codes` 的 `getAllCodes` 接口（`server/src/controllers/codeController.js`），支持接收 `includeDeleted` 参数。如果包含该参数，则查询时不强制 `query.deleted = false`。
  - 增强 `server/src/models/Code.js` 在 FileSystem 和 MongoDB 模式下对 `includeDeleted` 查询参数的处理。
- 前端：
  - 在 `client/src/pages/AdvancedSearch.js` 中，添加“包含已删除”的复选框 (Checkbox) 作为搜索条件。
  - 在 `AdvancedSearch.js` 中引入批量操作的状态管理（`batchMode`, `selectedCodes`）。
  - 在搜索结果的卡片头部或列表上方，增加“批量选择”、“取消批量”、“删除选中”和“恢复选中”的按钮及逻辑。
  - 修改调用 `CodeList` 的方式，传递 `batchMode`, `selectedCodes`, `onSelect` 属性，并支持展示“已删除”的 Tag 标注以及针对已删除记录的“恢复”按钮。
  - 更新 `CodeList.js` 组件，使其支持显示 `deleted` 状态的徽标或标签，并为已删除项提供“恢复”操作（如果不适合放在原有 CodeList，可以在 AdvancedSearch 中自定义操作列，或者扩展 CodeList 组件支持 `onRestore` 属性）。

## Impact
- Affected specs: 编码高级搜索、列表展示、批量处理逻辑。
- Affected code: 
  - `server/src/controllers/codeController.js`
  - `server/src/models/Code.js`
  - `client/src/pages/AdvancedSearch.js`
  - `client/src/components/CodeList.js`
  - `client/src/services/api.js` (如果需要添加批量操作的 API 封装)

## ADDED Requirements
### Requirement: 批量操作与回收站数据搜索
系统应当允许用户在高级搜索时包含已删除的记录，并允许对搜索结果进行批量删除或批量恢复。

#### Scenario: 搜索并识别已删除编码
- **WHEN** 用户在高级搜索条件中勾选了“包含已删除记录”并点击搜索
- **THEN** 搜索结果列表中将展示符合条件的已删除编码，并且这些编码会带有显眼的“已删除”标签

#### Scenario: 批量删除编码
- **WHEN** 用户点击“批量选择”，勾选多个未删除的编码，然后点击“删除选中”
- **THEN** 系统弹出确认框，确认后这批编码将被批量移动至回收站

#### Scenario: 批量恢复编码
- **WHEN** 用户在包含已删除记录的搜索结果中，批量选择多个已删除的编码并点击“恢复选中”
- **THEN** 系统将这批编码恢复为正常状态

## MODIFIED Requirements
### Requirement: 现有的 CodeList 组件
`CodeList` 组件应当能够处理既有未删除、又有已删除状态的混合列表，并根据 `batchMode` 正确展示多选框。针对已删除的记录，操作列应当展示“恢复”按钮而非“删除”按钮。
