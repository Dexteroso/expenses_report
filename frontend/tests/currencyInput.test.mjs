import test from 'node:test';
import assert from 'node:assert/strict';
import { editCurrency, parseCurrencyPaste, toCents, MAX_CENTS } from '../src/utils/currencyInput.js';
import { formatCurrencyMXN } from '../src/utils/formatters.js';

function press(value, action, text = '') {
  const display = formatCurrencyMXN(value);
  return editCurrency(value, display, display.length, display.length, action, text);
}

test('digits enter from cents and deletion reverses the sequence', () => {
  let value = 0;
  for (const [digit, expected] of [['1', 0.01], ['2', 0.12], ['3', 1.23], ['4', 12.34]]) {
    value = press(value, 'insert', digit);
    assert.equal(value, expected);
  }
  for (const expected of [1.23, 0.12, 0.01, 0, 0]) {
    value = press(value, 'delete');
    assert.equal(value, expected);
  }
});

test('select-all replacement, clearing and existing API decimal values', () => {
  const display = formatCurrencyMXN('1234.56');
  assert.equal(editCurrency(1234.56, display, 0, display.length, 'insert', '7'), 0.07);
  assert.equal(editCurrency(1234.56, display, 0, display.length, 'delete'), 0);
  assert.equal(press(1234.56, 'insert', '7'), 12345.67);
  assert.equal(formatCurrencyMXN(0), '$0.00');
  assert.equal(formatCurrencyMXN(1.2), '$1.20');
});

test('clipboard accepts cents digits and explicit MXN dollar amounts, rejects invalid values', () => {
  for (const [input, expected] of [['1234', 12.34], ['$1,234.56', 1234.56], ['1234.56', 1234.56], ['$12', 12], ['0.01', 0.01]]) {
    assert.equal(parseCurrencyPaste(input), expected);
  }
  for (const input of ['', 'abc', '-5', '1e3', '12.345', '1,23', '1.234,56', '$100,000,000.00']) {
    assert.equal(parseCurrencyPaste(input), null);
  }
});

test('large amounts preserve cents and cannot exceed the database precision', () => {
  assert.equal(parseCurrencyPaste('$99,999,999.99'), MAX_CENTS / 100);
  assert.equal(press(MAX_CENTS / 100, 'insert', '1'), MAX_CENTS / 100);
  assert.equal(toCents(0.29), 29);
  assert.equal(press(0.29, 'insert', '9'), 2.99);
  assert.equal(press(12.34, 'insert', 'x'), 12.34);
});
