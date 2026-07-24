# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, view a running balance, and visualize spending distribution by category through a pie chart. The application uses HTML, CSS, and Vanilla JavaScript with no backend. All data is persisted in the browser's LocalStorage API. The app must work across modern browsers (Chrome, Firefox, Edge, Safari) and maintain a clean, minimal interface with responsive UI.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an Item Name, Amount, and Category.
- **Transaction_List**: The scrollable UI component displaying all stored transactions.
- **Input_Form**: The UI form component used to enter new transactions.
- **Balance_Display**: The UI component at the top of the page that shows the current total balance.
- **Pie_Chart**: The visual chart component that displays spending distribution by category.
- **Category**: One of three predefined spending classifications: Food, Transport, or Fun.
- **LocalStorage**: The browser's built-in client-side storage API used to persist transaction data.
- **Chart_Library**: A third-party JavaScript library (e.g., Chart.js) used to render the Pie_Chart.
- **Validator**: The client-side logic that checks whether all required fields in the Input_Form are filled before submission.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for Item Name (max 100 characters), a numeric field for Amount, and a dropdown selector for Category.
2. THE Input_Form Category dropdown SHALL include exactly three options: Food, Transport, and Fun.
3. WHEN the user submits the Input_Form, THE Validator SHALL check that the Item Name field is not empty, the Amount field contains a numeric value between 0.01 and 999,999,999.99 inclusive, and a Category has been selected.
4. IF the Validator determines that any required field is empty or invalid, THEN THE Input_Form SHALL display an inline error message adjacent to each failing field, without submitting the transaction, and SHALL preserve the current field values.
5. WHEN all fields pass validation, THE App SHALL add the new Transaction to the data store and clear the Input_Form fields within 2 seconds.
6. IF the data store is unavailable when the user submits, THEN THE App SHALL display an error notification and SHALL preserve all entered field values without clearing them.

---

### Requirement 2: LocalStorage Persistence

**User Story:** As a user, I want my transactions to be saved so that my data is not lost when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a new Transaction is added, THE App SHALL serialize the updated transaction list as JSON and write it to LocalStorage under a single fixed key.
2. WHEN the App initializes, THE App SHALL deserialize all existing transactions from LocalStorage under the fixed key and load them into memory before rendering any UI.
3. WHEN a Transaction is deleted, THE App SHALL overwrite the LocalStorage entry under the fixed key with the updated serialized transaction list.
4. IF LocalStorage is empty on initialization, THEN THE App SHALL initialize with an empty transaction list and display no transactions.
5. IF the LocalStorage entry cannot be parsed on initialization, THEN THE App SHALL discard the malformed data, initialize with an empty transaction list, and display a warning notification.

---

### Requirement 3: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction with its Item Name (truncated at 100 characters), Amount (formatted with a currency symbol and exactly 2 decimal places), and Category.
2. WHEN a Transaction is added or deleted, THE Transaction_List SHALL update to reflect the current state of all transactions without requiring a page reload.
3. WHEN the number of transactions exceeds the visible display area, THE Transaction_List SHALL be scrollable to reveal all entries.
4. WHEN the transaction list is empty, THE Transaction_List SHALL display a placeholder message indicating no transactions have been recorded.
5. THE Transaction_List SHALL display transactions in most-recently-added-first order.
6. WHEN the number of stored transactions reaches 500, THE App SHALL display a truncation indicator and SHALL not accept additional transactions until existing ones are deleted.

---

### Requirement 4: Delete Transaction

**User Story:** As a user, I want to delete a transaction from the list so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a visible delete control (e.g., button or icon) for each Transaction entry, always visible without requiring hover.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL display a confirmation prompt before proceeding with deletion.
3. IF the user confirms deletion, THEN THE App SHALL remove that Transaction from the in-memory list and overwrite LocalStorage within 300 milliseconds.
4. IF the user cancels the confirmation prompt, THEN THE App SHALL take no action and the Transaction SHALL remain in the list.
5. WHEN a Transaction is confirmed deleted, THE Balance_Display SHALL update to reflect the new total within 300 milliseconds.
6. WHEN a Transaction is confirmed deleted, THE Pie_Chart SHALL update to reflect the new category distribution within 300 milliseconds.
7. IF LocalStorage is unavailable during deletion, THEN THE App SHALL display an error notification and SHALL not remove the Transaction from the in-memory list.

---

### Requirement 5: Total Balance Display

**User Story:** As a user, I want to see a running total balance at the top of the page so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned at the top of the App's main content area, above the Transaction list.
2. THE Balance_Display SHALL show the sum of all Transaction amounts formatted with a currency symbol, thousands separator, and exactly 2 decimal places.
3. WHEN a Transaction is added, THE Balance_Display SHALL update immediately to reflect the new total without requiring a page reload.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update immediately to reflect the new total without requiring a page reload.
5. IF all transactions are deleted, THEN THE Balance_Display SHALL display a total of zero formatted with a currency symbol, thousands separator, and exactly 2 decimal places (e.g., $0.00).
6. THE Balance_Display SHALL treat all Transaction amounts as expenses (positive values increasing the total) and SHALL display the cumulative sum of all recorded amounts.

---

### Requirement 6: Category Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display one segment per Category that has at least one Transaction with a positive amount, showing each segment proportional (to two decimal places of accuracy) to the total amount spent in that Category.
2. WHEN a Transaction is added, THE Pie_Chart SHALL update automatically to reflect the new category distribution within 1 second.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update automatically to reflect the revised category distribution within 1 second.
4. THE Pie_Chart SHALL render using a Chart_Library (e.g., Chart.js) loaded via a CDN or local file reference, and SHALL render each segment with a distinct color and a label showing the Category name.
5. WHEN all transactions are deleted, THE Pie_Chart SHALL display an empty state with an informative text message indicating no data is available.
6. IF a Transaction has a zero or negative amount, THEN THE App SHALL exclude that Transaction from Pie_Chart calculations.

---

### Requirement 7: Performance and Responsiveness

**User Story:** As a user, I want the app to feel fast and responsive so that interacting with it is not frustrating.

#### Acceptance Criteria

1. WHEN the App loads in a browser on a connection of at least 25 Mbps download speed, THE App SHALL render the full UI within 2 seconds.
2. WHEN a Transaction is added or deleted, THE App SHALL update the Transaction_List, Balance_Display, and Pie_Chart within 100 milliseconds of the user action completing.
3. THE App SHALL remain functional and visually correct (no horizontal scrolling, all controls operable, all data readable) at viewport widths from 320px to 1920px.
4. WHEN the App load time exceeds 2 seconds, THE App SHALL display a loading indicator within 500 milliseconds of the load start.

---

### Requirement 8: Browser Compatibility

**User Story:** As a user, I want the app to work in my preferred modern browser so that I am not forced to use a specific browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the latest stable releases of Chrome, Firefox, Edge, and Safari on desktop operating systems.
2. THE App SHALL use only web platform APIs available in all four target browsers without requiring polyfills for core functionality.
3. IF the App is loaded in a browser that does not meet the compatibility criteria, THEN THE App SHALL display a message informing the user that the browser is not supported.

---

### Requirement 9: Code Structure and File Organization

**User Story:** As a developer, I want the project to follow a clear file structure so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
2. THE App SHALL not use any JavaScript frameworks or backend services.
3. THE App's JavaScript file SHALL use camelCase variable names composed of at least two words, consistent indentation of either 2 or 4 spaces applied throughout the entire file, and inline comments present above or beside each logic block that is not self-explanatory by its naming.
