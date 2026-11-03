/**
 * A text field for a spreadsheet: quoted when it holds a comma, quote or
 * line break, and never read as a formula. Text that people typed (names,
 * reasons, references) could start with "=", "+", "-" or "@", which a
 * spreadsheet would run, so it gets a leading apostrophe, as spreadsheets
 * do themselves. Amounts are written as plain numbers, not through this.
 */
export function csvText(value: string): string {
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Dollars and cents as a plain number for a spreadsheet: -1100 → "-11.00". */
export function csvMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}
