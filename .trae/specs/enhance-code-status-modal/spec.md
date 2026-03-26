# Enhance Code Status Modal Spec

## Why
目前产品详情页能够展示缺失和超出的编码，但仅仅是静态列表展示。用户需要直接在这些弹窗中对编码进行批量操作（如批量删除超出范围的编码、批量添加缺失的编码），以及对展示的编码进行排序，以提高操作效率。

## What Changes
- 将简单的静态列表升级为支持选择和操作的组件（如带有复选框的列表或表格）。
- 增加排序功能（按编码大小升序/降序排列）。
- 针对“超出范围编码”：
  - 支持单条和批量删除操作。
  - 需要能够通过编码字符串匹配到对应的编码 ID 进行删除操作。
- 针对“缺失编码”：
  - 支持单条和批量添加操作。
- 增加全选/取消全选功能。

## Impact
- Affected specs: 编码弹窗展示（`codesModalVisible` 相关的 UI 和逻辑）。
- Affected code: `client/src/pages/ProductDetail.js`

## ADDED Requirements
### Requirement: 缺失/超出编码的排序功能
The system SHALL provide sorting options (Ascending/Descending) for codes inside the missing/excess codes modal.

#### Scenario: Success case
- **WHEN** user clicks on "缺失 x 个编码" or "超出 x 个编码" tag.
- **THEN** the modal displays the list, and user can toggle sort order to see codes ordered accordingly.

### Requirement: 缺失编码批量添加
The system SHALL allow users to select multiple missing codes and add them to the product in a batch.

#### Scenario: Success case
- **WHEN** user selects missing codes and clicks "批量添加".
- **THEN** the system adds these codes to the product and refreshes the data.

### Requirement: 超出编码批量删除
The system SHALL allow users to select multiple excess codes and delete them in a batch.

#### Scenario: Success case
- **WHEN** user selects excess codes and clicks "批量删除".
- **THEN** the system deletes these codes and refreshes the data.
