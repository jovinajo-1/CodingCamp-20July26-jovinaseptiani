// js/app.js — Expense & Budget Visualizer application logic

// =============================================================================
// BROWSER COMPATIBILITY UTILITIES
// Low-level feature detection helpers called before any app logic runs.
// Keeping these at the top of the file ensures they are available to every
// module below without forward-reference issues.
// =============================================================================

// -----------------------------------------------------------------------------
// isLocalStorageAvailable()
// Tests whether LocalStorage can be read from and written to in the current
// browser session. Some browsers disable LocalStorage in private/incognito
// mode or when the user has blocked site data; others throw on quota exceeded.
// Returns true if a test write/remove round-trip succeeds, false otherwise.
// Requirements: 1.6, 4.7, 8.2
// -----------------------------------------------------------------------------
function isLocalStorageAvailable() {
  const testKey = '__ls_availability_test__';
  try {
    // Attempt a write then immediate removal — no-op for real storage content
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    // Any error (SecurityError, QuotaExceededError, …) means unavailable
    return false;
  }
}

// =============================================================================
// DATA STORE MODULE
// Maintains in-memory transaction state and synchronizes with LocalStorage.
// The in-memory `transactions` array is the single source of truth; every
// mutation (add / delete) immediately persists to LocalStorage.
// =============================================================================

// Fixed key used for all LocalStorage reads and writes (Req 2.1, 9.3)
const STORAGE_KEY = 'expense_budget_visualizer_transactions';

// In-memory array — populated by loadTransactions() on app init (Req 2.1)
let transactions = [];

// -----------------------------------------------------------------------------
// loadTransactions()
// Reads the stored JSON string from LocalStorage, validates it, and assigns
// the result to the in-memory `transactions` array.
// Returns the loaded array (or [] on any error / missing key).
// When malformed data is discarded, calls showError() with a warning notification.
// Requirements: 2.2, 2.4, 2.5
// -----------------------------------------------------------------------------
function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);

  // Key not present — initialize with an empty list (Req 2.4)
  if (raw === null) {
    transactions = [];
    return transactions;
  }

  let parsed;
  try {
    // Attempt to deserialize the stored JSON string
    parsed = JSON.parse(raw);
  } catch (e) {
    // Malformed JSON — discard, reset, warn the user, and log for debugging (Req 2.5)
    console.warn('loadTransactions: failed to parse LocalStorage data. Resetting.', e);
    transactions = [];
    showError('Saved data was corrupted and has been reset.');
    return transactions;
  }

  // Valid JSON but not an array — discard, reset, and warn the user (Req 2.5)
  if (!Array.isArray(parsed)) {
    console.warn('loadTransactions: stored value is not an array. Resetting.');
    transactions = [];
    showError('Saved data was corrupted and has been reset.');
    return transactions;
  }

  transactions = parsed;
  return transactions;
}

// -----------------------------------------------------------------------------
// saveTransactions(transactionsArray)
// Serializes the given array to JSON and writes it to LocalStorage.
// Returns true on success, false if the write fails (quota exceeded, disabled).
// Requirements: 2.1, 2.3
// -----------------------------------------------------------------------------
function saveTransactions(transactionsArray) {
  try {
    // Overwrite the single fixed key with the latest serialized state
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactionsArray));
    return true;
  } catch (e) {
    // Write failed — quota exceeded or LocalStorage disabled (Req 2.1, 2.3)
    console.error('saveTransactions: could not write to LocalStorage.', e);
    return false;
  }
}

// -----------------------------------------------------------------------------
// addTransaction(transaction)
// Appends a new transaction object to the in-memory array and persists it.
// Enforces a hard limit of 500 transactions (Req 3.6).
// Returns true if the transaction was saved successfully, false otherwise.
// Requirements: 1.5, 3.6
// -----------------------------------------------------------------------------
function addTransaction(transaction) {
  // Refuse new entries once the 500-item limit has been reached (Req 3.6)
  if (transactions.length >= 500) {
    return false;
  }

  // Append to in-memory array then persist immediately
  transactions.push(transaction);
  const saved = saveTransactions(transactions);

  // If the save failed, roll back the in-memory push to keep state consistent
  if (!saved) {
    transactions.pop();
  }

  return saved;
}

// -----------------------------------------------------------------------------
// deleteTransaction(timestamp)
// Removes the transaction identified by its unique timestamp from the
// in-memory array and overwrites LocalStorage with the updated list.
// Returns true on success, false if the timestamp is not found.
// Requirements: 4.3
// -----------------------------------------------------------------------------
function deleteTransaction(timestamp) {
  // Locate the transaction by its unique timestamp (primary key)
  const index = transactions.findIndex((t) => t.timestamp === timestamp);

  // Timestamp not found — nothing to delete
  if (index === -1) {
    return false;
  }

  // Remove the single matching entry from the in-memory array
  transactions.splice(index, 1);

  // Persist the updated list; return the save result
  return saveTransactions(transactions);
}

// =============================================================================
// VALIDATOR MODULE
// Validates user input before a transaction is created.
// =============================================================================

// Valid category values — must match the dropdown options in index.html (Req 1.2)
const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

// -----------------------------------------------------------------------------
// validateTransaction(itemName, amount, category)
// Validates the three fields of the transaction input form.
// Returns { valid: boolean, errors: { itemName?, amount?, category? } }
// where each error key is only present when that field fails validation.
// Requirements: 1.3, 1.4
// -----------------------------------------------------------------------------
function validateTransaction(itemName, amount, category) {
  const errors = {};

  // ── itemName validation ──────────────────────────────────────────────────
  // Trim whitespace before checking emptiness and length (Req 1.3)
  const trimmedName = typeof itemName === 'string' ? itemName.trim() : '';
  if (trimmedName.length === 0 || trimmedName.length > 100) {
    errors.itemName = 'Item name is required and must be 100 characters or less.';
  }

  // ── amount validation ────────────────────────────────────────────────────
  // Coerce to number to handle string inputs from form fields (Req 1.3)
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || numericAmount < 0.01 || numericAmount > 999999999.99) {
    errors.amount = 'Amount must be between $0.01 and $999,999,999.99.';
  }

  // ── category validation ──────────────────────────────────────────────────
  // Must be one of the three allowed category strings (Req 1.2, 1.3)
  if (!VALID_CATEGORIES.includes(category)) {
    errors.category = 'Please select a category.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// =============================================================================
// BALANCE CALCULATOR MODULE
// Computes the cumulative total of all recorded transaction amounts.
// Only positive amounts are included; zero and negative values are excluded.
// =============================================================================

// -----------------------------------------------------------------------------
// calculateTotalBalance(transactionsArray)
// Sums all positive transaction amounts in the provided array.
// Returns 0 for an empty array or when no positive amounts exist.
// Requirements: 5.2, 5.5, 5.6
// -----------------------------------------------------------------------------
function calculateTotalBalance(transactionsArray) {
  // Return 0 immediately for an empty array (Req 5.5)
  if (!Array.isArray(transactionsArray) || transactionsArray.length === 0) {
    return 0;
  }

  // Accumulate only positive amounts; exclude zero and negative values (Req 5.6)
  return transactionsArray.reduce((total, transaction) => {
    const amount = Number(transaction.amount);
    // Only add amounts that are strictly greater than zero
    if (amount > 0) {
      return total + amount;
    }
    return total;
  }, 0);
}

// =============================================================================
// CATEGORY AGGREGATOR MODULE
// Groups transaction amounts by category and computes per-category totals.
// Used to populate the pie chart with accurate spending distribution data.
// =============================================================================

// -----------------------------------------------------------------------------
// aggregateByCategory(transactionsArray)
// Returns an object with a key for each valid category and its summed total.
// Excludes any transaction with an amount <= 0 (Req 6.6).
// Defaults to 0 for categories that have no matching transactions.
// Requirements: 6.1, 6.6
// -----------------------------------------------------------------------------
function aggregateByCategory(transactionsArray) {
  // Initialize result with all valid categories defaulting to 0
  const categoryTotals = {
    Food: 0,
    Transport: 0,
    Fun: 0,
  };

  // Return the default zeroed object for empty or invalid input
  if (!Array.isArray(transactionsArray) || transactionsArray.length === 0) {
    return categoryTotals;
  }

  // Iterate each transaction and accumulate positive amounts by category
  transactionsArray.forEach((transaction) => {
    const amount = Number(transaction.amount);
    const category = transaction.category;

    // Skip non-positive amounts (Req 6.6) and unrecognised categories
    if (amount > 0 && Object.prototype.hasOwnProperty.call(categoryTotals, category)) {
      categoryTotals[category] += amount;
    }
  });

  return categoryTotals;
}

// =============================================================================
// UI RENDERER MODULE
// Updates the DOM to reflect the current state of the data store.
// All functions in this module are pure side-effects — they read from the DOM
// and write back to it, but do not modify the in-memory data store.
// =============================================================================

// Tracks the active Chart.js pie chart instance so it can be updated in-place
// rather than destroyed and recreated on every render call. (Req 6.4, 8.2)
let pieChartInstance = null;

// Category-to-colour mapping — kept in one place for easy theming (Req 6.4)
const CATEGORY_COLORS = {
  Food: '#4A90E2',
  Transport: '#50E3C2',
  Fun: '#F5A623',
};

// -----------------------------------------------------------------------------
// renderTransactionList(transactionsArray)
// Rebuilds the transaction <ul> to match the current data store state.
// The static #empty-state <li> is preserved in the DOM; only dynamically added
// .transaction-item elements are cleared and re-created on each render.
// Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 4.1
// -----------------------------------------------------------------------------
function renderTransactionList(transactionsArray) {
  const list = document.getElementById('transaction-list');
  const emptyState = document.getElementById('empty-state');
  const truncationIndicator = document.getElementById('truncation-indicator');

  // Remove only dynamically-created transaction items, leave #empty-state intact
  const existingItems = list.querySelectorAll('.transaction-item');
  existingItems.forEach((item) => item.remove());

  // Toggle empty-state visibility based on whether the array has entries (Req 3.4)
  if (transactionsArray.length === 0) {
    emptyState.removeAttribute('hidden');
  } else {
    emptyState.setAttribute('hidden', '');
  }

  // Show truncation indicator when the hard limit of 500 has been reached (Req 3.6)
  if (transactionsArray.length >= 500) {
    truncationIndicator.removeAttribute('hidden');
  } else {
    truncationIndicator.setAttribute('hidden', '');
  }

  // Render transactions in reverse timestamp order — most recent first (Req 3.5)
  const sorted = transactionsArray.slice().sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((transaction) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';

    // Truncate item name to 100 characters as a display-only safeguard (Req 3.1)
    const displayName = String(transaction.itemName).slice(0, 100);

    // Format amount as USD with 2 decimal places and thousands separator (Req 3.1)
    const displayAmount = '$' + Number(transaction.amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Build inner HTML for the list item — name, amount, category, delete button
    li.innerHTML = `
      <span class="transaction-item-name">${escapeHtml(displayName)}</span>
      <span class="transaction-item-amount">${displayAmount}</span>
      <span class="transaction-item-category" data-category="${escapeHtml(String(transaction.category))}">${escapeHtml(String(transaction.category))}</span>
      <button
        class="btn transaction-item-delete"
        data-timestamp="${transaction.timestamp}"
        aria-label="Delete transaction: ${escapeHtml(displayName)}"
      >Delete</button>
    `;

    // Disable the delete button immediately if LocalStorage is not available (Req 4.7)
    if (!isLocalStorageAvailable()) {
      const deleteBtn = li.querySelector('.transaction-item-delete');
      if (deleteBtn) {
        deleteBtn.disabled = true;
      }
    }

    list.appendChild(li);
  });
}

// -----------------------------------------------------------------------------
// escapeHtml(str)
// Escapes HTML special characters to prevent XSS when inserting user-provided
// text via innerHTML. Used internally by renderTransactionList.
// -----------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// -----------------------------------------------------------------------------
// renderBalanceDisplay(balance)
// Formats the given numeric balance as a USD currency string and writes it to
// the #balance-display element.
// Requirements: 5.2, 5.3
// -----------------------------------------------------------------------------
function renderBalanceDisplay(balance) {
  const balanceEl = document.getElementById('balance-display');

  // Format with $ prefix, thousands separator, and exactly 2 decimal places
  const formatted = '$' + Number(balance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  balanceEl.textContent = formatted;
}

// -----------------------------------------------------------------------------
// renderPieChart(categoryData)
// Creates or updates the Chart.js pie chart using the supplied category totals.
// Handles three states:
//   1. Chart.js not loaded  → show #chart-unavailable fallback
//   2. All totals are zero  → hide canvas, show #chart-empty-state
//   3. At least one total > 0 → create or update the pie chart instance
// Requirements: 6.1, 6.4, 6.5, 8.2
// -----------------------------------------------------------------------------
function renderPieChart(categoryData) {
  const canvas = document.getElementById('pie-chart');
  const emptyStateEl = document.getElementById('chart-empty-state');
  const unavailableEl = document.getElementById('chart-unavailable');

  // Guard: Chart.js must be available as a global (Req 8.2)
  if (typeof Chart === 'undefined') {
    unavailableEl.removeAttribute('hidden');
    canvas.setAttribute('hidden', '');
    emptyStateEl.setAttribute('hidden', '');
    console.error('renderPieChart: Chart.js is not loaded.');
    return;
  }

  // Hide the unavailable banner if Chart.js is present
  unavailableEl.setAttribute('hidden', '');

  // Determine whether any category has a positive total
  const labels = Object.keys(categoryData);
  const dataValues = labels.map((label) => categoryData[label]);
  const hasData = dataValues.some((v) => v > 0);

  if (!hasData) {
    // No data — destroy any existing chart instance and show the empty state
    if (pieChartInstance !== null) {
      pieChartInstance.destroy();
      pieChartInstance = null;
    }
    canvas.setAttribute('hidden', '');
    emptyStateEl.removeAttribute('hidden');
    return;
  }

  // Data exists — show canvas, hide empty state
  emptyStateEl.setAttribute('hidden', '');
  canvas.removeAttribute('hidden');

  const backgroundColors = labels.map((label) => CATEGORY_COLORS[label] || '#CCCCCC');

  // Reuse existing chart instance if available (update data in-place) (Req 6.4)
  if (pieChartInstance !== null) {
    pieChartInstance.data.labels = labels;
    pieChartInstance.data.datasets[0].data = dataValues;
    pieChartInstance.data.datasets[0].backgroundColor = backgroundColors;
    pieChartInstance.update();
  } else {
    // Create a fresh Chart.js pie chart instance
    pieChartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: dataValues,
            backgroundColor: backgroundColors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }
}

// -----------------------------------------------------------------------------
// showError(message, fieldName = null)
// Displays an error message either inline (next to a specific form field) or
// in the global notification banner. Both auto-dismiss after 5 000 ms.
// Requirements: 1.4, 1.6, 2.5
// -----------------------------------------------------------------------------
function showError(message, fieldName = null) {
  if (fieldName !== null) {
    // Field-level error — target the element with id "<fieldName>-error"
    const errorEl = document.getElementById(`${fieldName}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.removeAttribute('hidden');

      // Auto-hide after 5 seconds (Req 1.4)
      setTimeout(() => {
        errorEl.setAttribute('hidden', '');
        errorEl.textContent = '';
      }, 5000);
    }
  } else {
    // Global notification banner for non-field errors (Req 1.6, 2.5)
    const banner = document.getElementById('notification-banner');
    banner.textContent = message;
    banner.removeAttribute('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      banner.setAttribute('hidden', '');
      banner.textContent = '';
    }, 5000);
  }
}

// -----------------------------------------------------------------------------
// clearInputForm()
// Resets all fields of the transaction input form to their default/empty state,
// clears any visible field-error spans, and returns focus to #item-name.
// Requirements: 1.5
// -----------------------------------------------------------------------------
function clearInputForm() {
  const form = document.getElementById('transaction-form');

  // Use the native form reset to clear all fields and restore select defaults
  form.reset();

  // Hide and empty any field-error spans that may still be visible
  const errorSpans = form.querySelectorAll('.field-error');
  errorSpans.forEach((span) => {
    span.setAttribute('hidden', '');
    span.textContent = '';
  });

  // Return focus to the first input so the user can immediately add another
  const itemNameInput = document.getElementById('item-name');
  if (itemNameInput) {
    itemNameInput.focus();
  }
}

// =============================================================================
// EVENT HANDLER MODULE
// Responds to user interactions: form submission, transaction deletion, and
// application initialization on DOMContentLoaded.
// =============================================================================

// -----------------------------------------------------------------------------
// handleFormSubmit(event)
// Handles the #transaction-form submit event. Validates all fields, shows
// inline errors on failure, or adds the transaction and refreshes the UI on
// success.
// Requirements: 1.3, 1.4, 1.5, 1.6, 3.2, 5.3, 6.2
// -----------------------------------------------------------------------------
function handleFormSubmit(event) {
  // Prevent the browser from performing its native form submission / page reload
  event.preventDefault();

  // Runtime guard: re-check LocalStorage availability in case it was disabled
  // after page load (e.g. quota exceeded mid-session) (Req 1.6, 4.7)
  if (!isLocalStorageAvailable()) {
    disableStorageControls();
    return;
  }

  // Read the current values from each form field
  const itemNameInput = document.getElementById('item-name');
  const amountInput   = document.getElementById('amount');
  const categoryInput = document.getElementById('category');

  const itemName = itemNameInput.value;
  const amount   = amountInput.value;
  const category = categoryInput.value;

  // Validate the three fields
  const validation = validateTransaction(itemName, amount, category);

  if (!validation.valid) {
    // Track the first failing field so we can focus it (Req 1.4)
    let firstInvalidField = null;

    if (validation.errors.itemName) {
      showError(validation.errors.itemName, 'item-name');
      firstInvalidField = firstInvalidField || itemNameInput;
    }

    if (validation.errors.amount) {
      showError(validation.errors.amount, 'amount');
      firstInvalidField = firstInvalidField || amountInput;
    }

    if (validation.errors.category) {
      showError(validation.errors.category, 'category');
      firstInvalidField = firstInvalidField || categoryInput;
    }

    // Move focus to the first field that failed so the user can correct it
    if (firstInvalidField) {
      firstInvalidField.focus();
    }

    // Return early — do not create a transaction (Req 1.4)
    return;
  }

  // Build the transaction object; timestamp is the unique primary key (Req 3.2)
  const transaction = {
    itemName: itemName.trim(),
    amount:   Number(amount),
    category: category,
    timestamp: Date.now(),
  };

  // Attempt to persist the new transaction to the data store
  const added = addTransaction(transaction);

  if (!added) {
    // Storage failure or 500-item limit reached — notify user but keep form values (Req 1.6)
    showError('Unable to save transaction. Your browser storage may be full or the 500-transaction limit has been reached.');
    return;
  }

  // Success — reset the form and refresh all UI components (Req 1.5, 3.2, 5.3, 6.2)
  clearInputForm();
  renderTransactionList(transactions);
  renderBalanceDisplay(calculateTotalBalance(transactions));
  renderPieChart(aggregateByCategory(transactions));
}

// -----------------------------------------------------------------------------
// handleDeleteClick(timestamp)
// Handles the user requesting deletion of the transaction identified by the
// given timestamp. Shows a confirmation prompt, then removes the transaction
// and refreshes the UI — all within 300 ms as required (Req 4.3, 4.5, 4.6).
// Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
// -----------------------------------------------------------------------------
function handleDeleteClick(timestamp) {
  // Prompt for confirmation before making any state change (Req 4.2)
  const confirmed = window.confirm('Are you sure you want to delete this transaction?');

  // User cancelled — do nothing, leave state intact (Req 4.4)
  if (!confirmed) {
    return;
  }

  // Runtime guard: if LocalStorage is unavailable, show error and abort deletion
  // so the in-memory list is NOT modified (Req 4.7)
  if (!isLocalStorageAvailable()) {
    disableStorageControls();
    return;
  }

  // Attempt to remove the transaction from the data store
  const deleted = deleteTransaction(timestamp);

  if (!deleted) {
    // Deletion failed (timestamp not found or storage write error) — notify user
    showError('Unable to delete transaction. Please try again.');
    return;
  }

  // Refresh all three UI components synchronously — well within 300 ms (Req 4.3, 4.5, 4.6)
  renderTransactionList(transactions);
  renderBalanceDisplay(calculateTotalBalance(transactions));
  renderPieChart(aggregateByCategory(transactions));
}

// -----------------------------------------------------------------------------
// disableStorageControls()
// Disables the #submit-btn and all delete buttons in the transaction list, and
// shows a persistent (non-auto-dismissing) error banner explaining that browser
// storage is unavailable. Called when isLocalStorageAvailable() returns false.
// Requirements: 1.6, 4.7, 8.2
// -----------------------------------------------------------------------------
function disableStorageControls() {
  // Disable the submit button so no new transactions can be attempted
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
  }

  // Disable every delete button currently rendered in the transaction list
  const deleteButtons = document.querySelectorAll('#transaction-list .transaction-item-delete');
  deleteButtons.forEach((btn) => {
    btn.disabled = true;
  });

  // Show a persistent error banner (no setTimeout — stays visible until reload)
  const banner = document.getElementById('notification-banner');
  banner.textContent = 'Unable to save data. Your browser storage may be full or disabled.';
  banner.removeAttribute('hidden');

  // Log to console for debugging purposes
  console.error('disableStorageControls: LocalStorage is unavailable. Add and delete functionality disabled.');
}

// -----------------------------------------------------------------------------
// handlePageLoad()
// Entry point called on DOMContentLoaded. Performs browser compatibility checks,
// loads persisted data, initializes the UI, and wires up all event listeners.
// Requirements: 2.2, 2.4, 2.5, 7.4, 8.1, 8.3
// -----------------------------------------------------------------------------
function handlePageLoad() {
  // ── Browser compatibility detection ────────────────────────────────────────
  // Check for ES6 feature support first (Req 8.3). LocalStorage availability
  // is checked separately below so we can show the right error for each case.
  let es6Compatible = true;

  // Test ES6 features (arrow functions, const, let, template literals)
  // This try-catch would only fire in truly ancient engines, but is defensive
  try {
    /* eslint-disable no-new-func */
    new Function('"use strict"; const _a = 1; let _b = 2; const _c = () => _a + _b; `${_c()}`;')();
    /* eslint-enable no-new-func */
  } catch (e) {
    es6Compatible = false;
  }

  if (!es6Compatible) {
    // Browser too old to run the app at all — show full-screen overlay (Req 8.3)
    const browserWarning = document.getElementById('browser-warning');
    const appEl = document.getElementById('app');

    browserWarning.removeAttribute('hidden');
    appEl.setAttribute('hidden', '');
    return;
  }

  // ── LocalStorage availability check ──────────────────────────────────────
  // Separate from the ES6 check: the app can still render read-only even when
  // storage is unavailable, but add/delete must be disabled (Req 1.6, 4.7, 8.2)
  const storageAvailable = isLocalStorageAvailable();

  // ── Loading indicator ────────────────────────────────────────────────────
  // Arm a 500 ms timer — if initialization is still running when it fires,
  // reveal the loading indicator (Req 7.4)
  const loadingIndicator = document.getElementById('loading-indicator');
  const loadingTimer = setTimeout(() => {
    loadingIndicator.removeAttribute('hidden');
  }, 500);

  // ── Data initialization ──────────────────────────────────────────────────
  // Only attempt LocalStorage reads when storage is confirmed available.
  // If unavailable, skip the load and start with an empty in-memory list.
  // loadTransactions() handles malformed-data detection internally and will
  // call showError() with a warning notification when data is discarded (Req 2.5).
  if (storageAvailable) {
    loadTransactions();
  }

  // ── Render initial UI state ──────────────────────────────────────────────
  renderTransactionList(transactions);
  renderBalanceDisplay(calculateTotalBalance(transactions));
  renderPieChart(aggregateByCategory(transactions));

  // ── Disable storage controls when LocalStorage is unavailable ────────────
  // Must be called after renderTransactionList so delete buttons exist in DOM
  if (!storageAvailable) {
    disableStorageControls();
  }

  // ── Attach event listeners ───────────────────────────────────────────────
  // Form submit → handleFormSubmit (Req 8.1)
  const form = document.getElementById('transaction-form');
  form.addEventListener('submit', handleFormSubmit);

  // Delegated click on #transaction-list → handleDeleteClick (Req 4.1, 4.2)
  // Using event delegation so listeners survive re-renders of the list items
  const transactionList = document.getElementById('transaction-list');
  transactionList.addEventListener('click', function(event) {
    // Walk up the DOM to find the element carrying the data-timestamp attribute
    const deleteButton = event.target.closest('[data-timestamp]');
    if (deleteButton) {
      // Parse the timestamp back to a number (data attributes are always strings)
      const timestamp = Number(deleteButton.dataset.timestamp);
      handleDeleteClick(timestamp);
    }
  });

  // ── Initialization complete — hide loading indicator ─────────────────────
  clearTimeout(loadingTimer);
  loadingIndicator.setAttribute('hidden', '');
}

// =============================================================================
// APP ENTRY POINT
// Wire handlePageLoad to the DOMContentLoaded event so it fires once the full
// HTML document has been parsed and all static DOM elements are available.
// Requirements: 2.2, 9.1
// =============================================================================
document.addEventListener('DOMContentLoaded', handlePageLoad);
