// Keep integer cents within the existing DECIMAL(10, 2) storage range.
export const MAX_CENTS = 9999999999;

export function toCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) : 0;
}

export function editCurrency(value, digits, selectionStart, selectionEnd, action, text = '') {
  const selected = selectionEnd > selectionStart;
  const start = digits.slice(0, selectionStart).replace(/\D/g, '').length;
  const end = digits.slice(0, selectionEnd).replace(/\D/g, '').length;
  const raw = digits.replace(/\D/g, '');
  let next;
  if (selected) {
    next = raw.slice(0, start) + (action === 'insert' ? text : '') + raw.slice(end);
  } else if (action === 'insert') {
    // Banking entry always appends cents, independent of the caret position.
    next = String(toCents(value)) + text;
  } else {
    next = String(Math.floor(toCents(value) / 10));
  }
  const cents = Number(next || 0);
  return /^\d*$/.test(next) && cents <= MAX_CENTS ? cents / 100 : value;
}

export function parseCurrencyPaste(text) {
  const input = text.trim();
  // Bare digits follow cents entry; an explicit decimal/currency format is dollars.
  if (/^\d+$/.test(input)) {
    const cents = Number(input);
    return cents <= MAX_CENTS ? cents / 100 : null;
  }
  if (!/^\$?\s*(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(input)) return null;
  const cents = toCents(input.replace(/[$,\s]/g, ''));
  return cents <= MAX_CENTS ? cents / 100 : null;
}
