export function formatCurrencyMXN(value) {
  if (value === null || value === undefined || value === '') {
    return '$0.00';
  }

  const numericValue = Number(String(value).replaceAll(',', '').replaceAll('$', '').trim());

  if (!Number.isFinite(numericValue)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numericValue)
    .replace('MXN', '')
    .trim();
}
