const hasValue = (value) => (
  value !== undefined &&
  value !== null &&
  !(typeof value === 'string' && value.trim() === '')
);

const isIntegerValue = (value) => (
  hasValue(value) &&
  typeof value !== 'boolean' &&
  Number.isInteger(Number(value))
);

const isPositiveNumberValue = (value) => {
  if (!hasValue(value) || typeof value === 'boolean') {
    return false;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
};

const isNonNegativeNumberValue = (value) => {
  if (!hasValue(value) || typeof value === 'boolean') {
    return false;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0;
};

const isValidMonthValue = (value) => {
  if (!isIntegerValue(value)) {
    return false;
  }

  const month = Number(value);
  return month >= 1 && month <= 12;
};

const isValidDateValue = (value) => {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return false;
  }

  const [year, month, day] = trimmedValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const truncateText = (value, maxLength) => {
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    return value;
  }

  return Array.from(value).slice(0, maxLength).join('');
};

const sanitizeTextValue = (value, { maxLength } = {}) => {
  if (value === undefined || value === null) {
    return '';
  }

  const sanitizedValue = String(value)
    .replace(CONTROL_CHARACTER_PATTERN, '')
    .trim();

  return truncateText(sanitizedValue, maxLength);
};

const sanitizeOptionalTextValue = (value, options) => {
  if (value === undefined || value === null) {
    return value;
  }

  return sanitizeTextValue(value, options);
};

module.exports = {
  hasValue,
  isIntegerValue,
  isPositiveNumberValue,
  isNonNegativeNumberValue,
  isValidMonthValue,
  isValidDateValue,
  sanitizeTextValue,
  sanitizeOptionalTextValue,
};
