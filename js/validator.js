// js/validator.js — Pure validation logic extracted for testability in Node.js
// This module re-exports the validateTransaction function and its constants so
// that property-based and unit tests can import them without requiring a DOM.

// Valid category values — must match app.js and index.html (Req 1.2)
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

module.exports = { validateTransaction, VALID_CATEGORIES };
