export function formatNumber(
  value: number | null | undefined,
  digits: number,
  fallback = '—',
): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(digits)
    : fallback
}

/**
 * Format a number rounding to at most `maxDigits` decimals, trimming trailing
 * zeros (e.g. 0.30170 → "0.302", 0.5 → "0.5", 5 → "5").
 */
export function formatNumberMax(
  value: number | null | undefined,
  maxDigits: number,
  fallback = '—',
): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(Number(value.toFixed(maxDigits)))
    : fallback
}

export function formatDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions,
  locale = 'es-PE',
): string {
  if (!iso) return '—'
  // Date-only strings (YYYY-MM-DD) parse as UTC midnight → shift a day back at UTC-5.
  // Append local midnight so they render on the intended calendar day.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, opts).format(d)
}
