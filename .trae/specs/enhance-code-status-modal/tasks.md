# Tasks
- [x] Task 1: Refactor modal UI in `ProductDetail.js`
  - [x] SubTask 1.1: Create state variables for modal sorting and selection (e.g., `modalSortOrder`, `modalSelectedCodes`, `modalActionLoading`).
  - [x] SubTask 1.2: Update the `Modal` body to display a list with checkboxes, sorting toggle, and action buttons.
- [x] Task 2: Implement logic for Excess Codes deletion
  - [x] SubTask 2.1: Add single delete action for excess codes. Find the corresponding `code.id` from the `codes` array and call `deleteCode` API.
  - [x] SubTask 2.2: Add batch delete action for excess codes using `Promise.all` with `deleteCode` API applied to `modalSelectedCodes`.
- [x] Task 3: Implement logic for Missing Codes addition
  - [x] SubTask 3.1: Add single add action for missing codes.
  - [x] SubTask 3.2: Add batch add action for missing codes using `Promise.all` with `codeAPI.addCode` API.
- [x] Task 4: Polish Modal UX
  - [x] SubTask 4.1: Refresh the main code list and recalculate missing/excess codes automatically upon successful operations.
  - [x] SubTask 4.2: Add empty state handling and loading states for batch operations.

# Task Dependencies
- Task 2 and Task 3 depend on Task 1
- Task 4 depends on Task 2 and Task 3
