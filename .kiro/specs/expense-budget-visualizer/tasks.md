# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a single-page expense tracker using HTML, CSS, and Vanilla JavaScript. `index.html` already exists with all IDs and classes defined. The remaining work is creating `css/styles.css` (full visual design) and `js/app.js` (all application logic), then wiring them together into a working application that persists data in LocalStorage and visualizes spending via a Chart.js pie chart.

---

## Tasks

- [x] 1. Scaffold project files
  - [x] 1.1 Create `css/styles.css` and `js/app.js` as empty files
    - Create `css/` directory with an empty `styles.css` file
    - Create `js/` directory with an empty `app.js` file
    - Confirm both files are referenced correctly by the existing `index.html`
    - _Requirements: 9.1_

- [x] 2. Implement CSS styling
  - [x] 2.1 Write base layout and typography styles
    - Style `body`, `.app-container`, and section wrappers (`.balance-section`, `.form-section`, `.transaction-section`, `.chart-section`)
    - Apply consistent spacing, font stack, and color palette
    - _Requirements: 9.1, 7.3_

  - [x] 2.2 Style the balance display
    - Style `#balance-section`, `#balance-heading`, and `#balance-display` (`.balance-amount`)
    - Make the balance number visually prominent
    - _Requirements: 5.1_

  - [x] 2.3 Style the input form
    - Style `.transaction-form`, `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.btn`, `.btn-primary`
    - Style `.field-error` for inline validation messages (hidden by default, visible when error is present)
    - _Requirements: 1.1, 1.4_

  - [x] 2.4 Style the transaction list
    - Style `.transaction-list`, `.empty-state`, individual transaction list items (to be rendered by JS with class `.transaction-item`)
    - Style delete button within each list item
    - Style `.truncation-indicator`
    - Make list scrollable when it overflows
    - _Requirements: 3.1, 3.3, 3.4, 3.6, 4.1_

  - [x] 2.5 Style the pie chart section
    - Style `.chart-section`, `.chart-wrapper`, `#pie-chart`
    - Style `.chart-empty-state` and `.chart-unavailable` text messages
    - Set a fixed height on `.chart-wrapper` so Chart.js renders at the right size
    - _Requirements: 6.4, 6.5_

  - [x] 2.6 Style notification and compatibility overlays
    - Style `.notification-banner` (global error/warning banner, hidden by default)
    - Style `.browser-warning` (full-screen overlay)
    - Style `.loading-indicator` and `.loading-spinner` animation
    - _Requirements: 1.6, 2.5, 8.3, 7.4_

  - [x] 2.7 Implement responsive design (320 px – 1920 px)
    - Add media queries to ensure no horizontal scrolling at any supported viewport width
    - Stack form fields and sections vertically on small screens
    - Ensure pie chart and transaction list resize gracefully
    - Verify all controls remain operable and text readable at 320 px, 768 px, 1024 px, and 1920 px
    - _Requirements: 7.3_

- [x] 3. Implement the Data Store module in `js/app.js`
  - [x] 3.1 Define the STORAGE_KEY constant and the in-memory `transactions` array
    - `const STORAGE_KEY = 'expense_budget_visualizer_transactions';`
    - `let transactions = [];`
    - _Requirements: 2.1, 9.3_

  - [x] 3.2 Implement `loadTransactions()`
    - Read from `localStorage.getItem(STORAGE_KEY)`
    - Parse JSON inside a try-catch; on failure discard and return `[]`
    - Validate that the parsed value is an array; if not, discard and return `[]`
    - Assign result to in-memory `transactions`
    - _Requirements: 2.2, 2.4, 2.5_

  - [x] 3.3 Implement `saveTransactions(transactionsArray)`
    - Serialize array to JSON inside a try-catch around `localStorage.setItem()`
    - Return `true` on success, `false` on failure (quota exceeded / disabled)
    - _Requirements: 2.1, 2.3_

  - [x] 3.4 Implement `addTransaction(transaction)`
    - Check transaction count < 500; return false if limit reached
    - Push to `transactions`, call `saveTransactions()`, return success boolean
    - _Requirements: 1.5, 3.6_

  - [x] 3.5 Implement `deleteTransaction(timestamp)`
    - Find transaction by `timestamp`, splice from `transactions`, call `saveTransactions()`, return success boolean
    - _Requirements: 4.3_

  - [ ]* 3.6 Write property test for serialization round-trip (Property 5)
    - **Property 5: Serialization Round-Trip**
    - Generate random arrays of valid transaction objects; serialize then deserialize via `saveTransactions` / `loadTransactions`; assert deep equality
    - **Validates: Requirements 2.1, 2.2**

- [x] 4. Implement the Validator module in `js/app.js`
  - [x] 4.1 Implement `validateTransaction(itemName, amount, category)`
    - Validate `itemName`: non-empty after trim, ≤ 100 characters
    - Validate `amount`: numeric, range [0.01, 999,999,999.99]
    - Validate `category`: one of `["Food", "Transport", "Fun"]`
    - Return `{ valid: boolean, errors: { itemName?, amount?, category? } }`
    - _Requirements: 1.3, 1.4_

  - [-] 4.2 Write property test for validation correctness (Property 1)
    - **Property 1: Validation Correctness**
    - Generate random (itemName, amount, category) inputs including boundary values and invalid combos; assert `valid: true` iff all constraints satisfied, `valid: false` with per-field errors otherwise
    - **Validates: Requirements 1.3, 1.4**

- [x] 5. Implement the Balance Calculator and Category Aggregator modules in `js/app.js`
  - [x] 5.1 Implement `calculateTotalBalance(transactionsArray)`
    - Sum all `amount` values; return `0` for empty array; exclude non-positive amounts
    - _Requirements: 5.2, 5.5, 5.6_

  - [x] 5.2 Implement `aggregateByCategory(transactionsArray)`
    - Group by `category`, sum amounts per category, exclude amounts ≤ 0
    - Return `{ Food: number, Transport: number, Fun: number }` (defaulting to 0)
    - _Requirements: 6.1, 6.6_

  - [ ]* 5.3 Write property test for balance calculation accuracy (Property 8)
    - **Property 8: Balance Calculation Accuracy**
    - Generate random transaction arrays (including empty); assert `calculateTotalBalance()` equals sum of positive amounts and formatted string matches currency format
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6, 4.5**

  - [ ]* 5.4 Write property test for category aggregation accuracy (Property 9)
    - **Property 9: Category Aggregation Accuracy**
    - Generate random arrays including transactions with zero/negative amounts; assert `aggregateByCategory()` equals per-category sum of positive-only amounts
    - **Validates: Requirements 6.1, 6.2, 6.3, 4.6**

  - [ ]* 5.5 Write property test for zero and negative amount exclusion (Property 11)
    - **Property 11: Zero and Negative Amount Exclusion**
    - Generate arrays containing at least one item with amount ≤ 0; assert aggregation result equals aggregation of the positive-only filtered subarray
    - **Validates: Requirements 6.6**

- [x] 6. Checkpoint — Core logic verified
  - Ensure all non-optional tests pass (if tests were written). Manually verify that `loadTransactions`, `saveTransactions`, `addTransaction`, `deleteTransaction`, `validateTransaction`, `calculateTotalBalance`, and `aggregateByCategory` behave correctly in the browser console.

- [x] 7. Implement the UI Renderer module in `js/app.js`
  - [x] 7.1 Implement `renderTransactionList(transactionsArray)`
    - Clear existing list children (except `#empty-state`)
    - Iterate in reverse timestamp order (most-recent-first)
    - For each transaction, create an `<li class="transaction-item">` containing item name (truncated to 100 chars), formatted amount, category, and a delete `<button>` with `data-timestamp` attribute
    - Show `#empty-state` when array is empty; hide it otherwise
    - Show `#truncation-indicator` when `transactionsArray.length >= 500`
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 4.1_

  - [ ]* 7.2 Write property test for transaction list rendering completeness (Property 3)
    - **Property 3: Transaction List Rendering Completeness**
    - Generate random transaction arrays; call `renderTransactionList()`; assert exactly one row per transaction with correct name (100-char truncation), formatted amount, category, and delete control
    - **Validates: Requirements 3.1, 4.1**

  - [ ]* 7.3 Write property test for most-recent-first ordering (Property 4)
    - **Property 4: Most-Recent-First Ordering**
    - Generate random transaction arrays with distinct timestamps; call `renderTransactionList()`; assert rendered rows appear in descending timestamp order
    - **Validates: Requirements 3.5**

  - [x] 7.4 Implement `renderBalanceDisplay(balance)`
    - Format `balance` as USD string with `$`, thousands separator, and exactly 2 decimal places (e.g., `$1,234.56`)
    - Update `#balance-display` text content
    - _Requirements: 5.2, 5.3_

  - [x] 7.5 Implement `renderPieChart(categoryData)`
    - Check `typeof Chart !== 'undefined'`; if Chart.js failed to load, show `#chart-unavailable` and return
    - If all category totals are zero, hide `#pie-chart` canvas, show `#chart-empty-state`; destroy existing chart instance if present
    - Otherwise hide `#chart-empty-state`, show canvas, create or update Chart.js pie chart with colors `{ Food: '#4A90E2', Transport: '#50E3C2', Fun: '#F5A623' }`, legend at bottom
    - _Requirements: 6.1, 6.4, 6.5, 8.2_

  - [x] 7.6 Implement `showError(message, fieldName = null)`
    - If `fieldName` provided, populate and un-hide the matching `#<fieldName>-error` element; auto-hide after 5 seconds
    - Otherwise populate and un-hide `#notification-banner`; auto-hide after 5 seconds
    - _Requirements: 1.4, 1.6, 2.5_

  - [x] 7.7 Implement `clearInputForm()`
    - Reset `#transaction-form` fields to empty/default
    - Focus `#item-name`
    - Clear any visible field-error spans
    - _Requirements: 1.5_

  - [ ]* 7.8 Write property test for chart segment labels and distinct colors (Property 10)
    - **Property 10: Chart Segment Labels and Distinct Colors**
    - Generate random category data objects with at least one positive total; call `renderPieChart()`; assert chart config labels equal category names and all backgroundColor values are distinct
    - **Validates: Requirements 6.4**

- [x] 8. Implement Event Handlers and app initialization in `js/app.js`
  - [x] 8.1 Implement `handleFormSubmit(event)`
    - `event.preventDefault()`
    - Read `#item-name`, `#amount`, `#category` values
    - Call `validateTransaction()`; call `showError()` for each failing field; focus first failing field; return early if invalid
    - Build transaction object with `timestamp: Date.now()`
    - Call `addTransaction()`; on failure call `showError()` with notification banner message
    - On success: call `clearInputForm()`, `renderTransactionList()`, `renderBalanceDisplay()`, `renderPieChart()`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 3.2, 5.3, 6.2_

  - [x] 8.2 Implement `handleDeleteClick(timestamp)`
    - Show `window.confirm()` prompt; if user cancels, return immediately (no state change)
    - Call `deleteTransaction(timestamp)`; on failure call `showError()` with notification banner
    - On success: call `renderTransactionList()`, `renderBalanceDisplay()`, `renderPieChart()` — all three within 300 ms
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 8.3 Implement `handlePageLoad()`
    - Detect browser compatibility (LocalStorage support + ES6 features); if unsupported, un-hide `#browser-warning`, hide `#app`, return
    - Show `#loading-indicator` if initialization takes > 500 ms (use `setTimeout`)
    - Call `loadTransactions()`; if malformed data was discarded, call `showError()` with warning message
    - Initialize Chart.js instance (or detect load failure)
    - Call `renderTransactionList()`, `renderBalanceDisplay()`, `renderPieChart()`
    - Attach `#transaction-form` submit listener → `handleFormSubmit`
    - Attach delegated click listener on `#transaction-list` → `handleDeleteClick` (read `data-timestamp`)
    - Hide `#loading-indicator`
    - _Requirements: 2.2, 2.4, 2.5, 7.4, 8.1, 8.3_

  - [ ]* 8.4 Write property test for valid transaction addition (Property 2)
    - **Property 2: Valid Transaction Addition**
    - Generate random valid transactions; call `addTransaction()` on each; assert `transactions` length increases by exactly 1 and the new item is retrievable
    - **Validates: Requirements 1.5**



- [x] 9. Wire modules together and add browser-compatibility / error-handling guards
  - [ ] 9.1 Add LocalStorage availability detection utility
    - Wrap a test `localStorage.setItem` / `removeItem` in a try-catch; expose as `isLocalStorageAvailable()`
    - If unavailable, disable `#submit-btn` and delete buttons; show persistent error banner
    - _Requirements: 1.6, 4.7, 8.2_

  - [x] 9.2 Add Chart.js load-failure guard in `renderPieChart`
    - Confirm `typeof Chart !== 'undefined'` before any Chart.js API call
    - Un-hide `#chart-unavailable` and log to console if Chart is not defined
    - _Requirements: 6.4, 8.2_

  - [x] 9.3 Add malformed LocalStorage data guard in `loadTransactions`
    - Confirm the guard discards non-array values and corrupted JSON, initializes to `[]`, and shows the warning notification
    - _Requirements: 2.5_

  - [x] 9.4 Call `handlePageLoad()` at script entry point
    - Add `document.addEventListener('DOMContentLoaded', handlePageLoad)` at the bottom of `app.js` as a defensive initialization pattern
    - Confirm full add/delete/persist flow works end-to-end in the browser
    - _Requirements: 2.2, 9.1_

- [x] 10. Final checkpoint — Full integration verified
  - Open `index.html` in Chrome, Firefox, Edge, and Safari
  - Verify: add transaction → list updates, balance updates, pie chart updates
  - Verify: delete transaction → confirmation prompt, removal, all displays update within 300 ms
  - Verify: reload page → data persists from LocalStorage
  - Verify: responsive layout at 320 px and 1920 px viewport widths
  - Verify: Chart.js CDN blocked → `#chart-unavailable` shown, rest of app functional
  - Verify: LocalStorage cleared → empty state shown correctly
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- `index.html` is already complete — do not modify it unless a bug is found
- All JS goes in `js/app.js`; all CSS goes in `css/styles.css` — no additional files
- Each task references specific requirements for traceability
- Property tests use fast-check and require a minimum of 100 iterations per property
- Unit tests and property tests are complementary — both should be implemented when the `*` tasks are executed
- The design document's Correctness Properties section is the authoritative source for property test definitions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "3.2", "3.3"] },
    { "id": 3, "tasks": ["2.7", "3.4", "3.5", "4.1"] },
    { "id": 4, "tasks": ["3.6", "4.2", "5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3", "5.4", "5.5", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.7"] },
    { "id": 7, "tasks": ["7.8", "8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4", "8.5", "8.6", "9.1", "9.2", "9.3"] },
    { "id": 9, "tasks": ["9.4"] }
  ]
}
```
