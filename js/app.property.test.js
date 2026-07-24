// Feature: expense-budget-visualizer, Property 1: Validation Correctness
//
// Validates: Requirements 1.3, 1.4
//
// For ANY combination of (itemName, amount, category):
//   validateTransaction() returns valid: true  <=> ALL constraints satisfied
//   validateTransaction() returns valid: false <=> AT LEAST ONE constraint fails,
//     with an error entry for every failing field.

'use strict';

const fc = require('fast-check');
const { validateTransaction, VALID_CATEGORIES } = require('./validator');

// ---------------------------------------------------------------------------
// Helpers - mirror the exact constraints from the spec/design doc
// ---------------------------------------------------------------------------

function isValidItemName(itemName) {
  if (typeof itemName !== 'string') return false;
  const trimmed = itemName.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

function isValidAmount(amount) {
  const n = Number(amount);
  return isFinite(n) && n >= 0.01 && n <= 999999999.99;
}

function isValidCategory(category) {
  return VALID_CATEGORIES.includes(category);
}

// ---------------------------------------------------------------------------
// Arbitraries - generate a wide range of inputs including boundary values
// and intentionally invalid combinations.
// fc.string() generates Unicode strings by default in fast-check v4.
// ---------------------------------------------------------------------------

const itemNameArb = fc.oneof(
  // Valid: 1 to 100 characters (after trim - use printable ASCII to avoid pure-whitespace collisions)
  fc.string({ minLength: 1, maxLength: 100 }).map(function(s) {
    // Guarantee at least one non-whitespace char so trim is non-empty
    return 'X' + s.slice(0, 99);
  }),
  // Boundary: exactly 100 chars
  fc.constant('A'.repeat(100)),
  // Over-limit: 101+ chars
  fc.string({ minLength: 101, maxLength: 150 }),
  // Empty string
  fc.constant(''),
  // Whitespace-only (trims to empty)
  fc.constant('   '),
  fc.constant('\t\n'),
  // Single visible character (minimum valid)
  fc.constant('A'),
  fc.constant('Z')
);

// fc.float() in fast-check v4 requires 32-bit float boundaries (Math.fround).
// Use fc.double() for full 64-bit precision when generating valid amounts.
const amountArb = fc.oneof(
  // Valid range [0.01, 999,999,999.99] - use double for 64-bit precision
  fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
  // Boundary values
  fc.constant(0.01),
  fc.constant(999999999.99),
  // Just below lower bound
  fc.constant(0.009),
  fc.constant(0),
  fc.constant(-1),
  // Just above upper bound
  fc.constant(1000000000),
  // Special non-finite values
  fc.constant(NaN),
  fc.constant(Infinity),
  fc.constant(-Infinity),
  // Numeric string (valid)
  fc.double({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true })
    .map(function(n) { return String(n); }),
  // Non-numeric string
  fc.constant('abc'),
  fc.constant('')
);

const categoryArb = fc.oneof(
  // Valid enum values
  fc.constantFrom.apply(fc, VALID_CATEGORIES),
  // Invalid: case variations and near-misses
  fc.constant('food'),
  fc.constant('FOOD'),
  fc.constant('transport'),
  fc.constant('fun'),
  fc.constant(''),
  fc.constant(' Food'),
  // Random strings
  fc.string({ minLength: 0, maxLength: 20 })
);

// ---------------------------------------------------------------------------
// Property 1 - Validation Correctness
// ---------------------------------------------------------------------------

describe('Property 1: Validation Correctness', () => {
  // 1a. valid flag matches whether all constraints are satisfied
  test(
    'returns valid:true if and only if all three fields satisfy their constraints',
    function() {
      fc.assert(
        fc.property(itemNameArb, amountArb, categoryArb, function(itemName, amount, category) {
          var result = validateTransaction(itemName, amount, category);
          var allValid =
            isValidItemName(itemName) &&
            isValidAmount(amount) &&
            isValidCategory(category);
          expect(result.valid).toBe(allValid);
        }),
        { numRuns: 500 }
      );
    }
  );

  // 1b. per-field error presence
  test(
    'errors.itemName is present exactly when itemName fails its constraint',
    function() {
      fc.assert(
        fc.property(itemNameArb, amountArb, categoryArb, function(itemName, amount, category) {
          var result = validateTransaction(itemName, amount, category);
          if (!isValidItemName(itemName)) {
            expect(result.errors).toHaveProperty('itemName');
          } else {
            expect(result.errors).not.toHaveProperty('itemName');
          }
        }),
        { numRuns: 500 }
      );
    }
  );

  test(
    'errors.amount is present exactly when amount fails its constraint',
    function() {
      fc.assert(
        fc.property(itemNameArb, amountArb, categoryArb, function(itemName, amount, category) {
          var result = validateTransaction(itemName, amount, category);
          if (!isValidAmount(amount)) {
            expect(result.errors).toHaveProperty('amount');
          } else {
            expect(result.errors).not.toHaveProperty('amount');
          }
        }),
        { numRuns: 500 }
      );
    }
  );

  test(
    'errors.category is present exactly when category fails its constraint',
    function() {
      fc.assert(
        fc.property(itemNameArb, amountArb, categoryArb, function(itemName, amount, category) {
          var result = validateTransaction(itemName, amount, category);
          if (!isValidCategory(category)) {
            expect(result.errors).toHaveProperty('category');
          } else {
            expect(result.errors).not.toHaveProperty('category');
          }
        }),
        { numRuns: 500 }
      );
    }
  );

  // 1c. valid:false implies at least one error key
  test(
    'when valid is false, errors object contains at least one key',
    function() {
      fc.assert(
        fc.property(itemNameArb, amountArb, categoryArb, function(itemName, amount, category) {
          var result = validateTransaction(itemName, amount, category);
          if (!result.valid) {
            expect(Object.keys(result.errors).length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 500 }
      );
    }
  );

  // 1d. valid:true implies errors object is empty
  test(
    'when valid is true, errors object is empty',
    function() {
      fc.assert(
        fc.property(itemNameArb, amountArb, categoryArb, function(itemName, amount, category) {
          var result = validateTransaction(itemName, amount, category);
          if (result.valid) {
            expect(Object.keys(result.errors)).toHaveLength(0);
          }
        }),
        { numRuns: 500 }
      );
    }
  );

  // 1e. Boundary-specific deterministic cases
  test('boundary: itemName of exactly 100 chars is valid', function() {
    var result = validateTransaction('A'.repeat(100), 1.00, 'Food');
    expect(result.errors).not.toHaveProperty('itemName');
  });

  test('boundary: itemName of 101 chars is invalid', function() {
    var result = validateTransaction('A'.repeat(101), 1.00, 'Food');
    expect(result.errors).toHaveProperty('itemName');
  });

  test('boundary: amount of 0.01 is valid', function() {
    var result = validateTransaction('Groceries', 0.01, 'Food');
    expect(result.errors).not.toHaveProperty('amount');
  });

  test('boundary: amount of 999999999.99 is valid', function() {
    var result = validateTransaction('Groceries', 999999999.99, 'Food');
    expect(result.errors).not.toHaveProperty('amount');
  });

  test('boundary: amount of 0.009 is invalid', function() {
    var result = validateTransaction('Groceries', 0.009, 'Food');
    expect(result.errors).toHaveProperty('amount');
  });

  test('boundary: amount of 1000000000 is invalid', function() {
    var result = validateTransaction('Groceries', 1000000000, 'Food');
    expect(result.errors).toHaveProperty('amount');
  });

  test('boundary: whitespace-only itemName is invalid', function() {
    var result = validateTransaction('   ', 5.00, 'Food');
    expect(result.errors).toHaveProperty('itemName');
  });

  test('boundary: single visible char itemName is valid', function() {
    var result = validateTransaction('A', 5.00, 'Food');
    expect(result.errors).not.toHaveProperty('itemName');
  });

  test('all three fields invalid returns valid:false with three errors', function() {
    var result = validateTransaction('', -1, 'InvalidCat');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('itemName');
    expect(result.errors).toHaveProperty('amount');
    expect(result.errors).toHaveProperty('category');
  });

  test('all three fields valid returns valid:true with no errors', function() {
    var result = validateTransaction('Lunch', 12.50, 'Food');
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});
