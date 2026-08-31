/**
 * Escapes a single CSV field, guarding against two separate risks:
 *
 * 1. CSV structural characters (commas, quotes, newlines) -- wrapped in
 *    quotes with internal quotes doubled, the standard CSV escaping rule.
 * 2. "CSV injection" / formula injection: a field that starts with =, +,
 *    -, @, tab, or CR is interpreted as a formula (or formula-like) by
 *    Excel/Sheets/LibreOffice when the exported file is opened there, and
 *    can be used to run commands (via a legacy DDE formula) or exfiltrate
 *    data (via a formula that fetches a remote URL). Every CSV export in
 *    this app can contain user-supplied text -- contact form messages,
 *    device/probe names, alert titles -- so all of them route through
 *    this one function rather than each export reimplementing (and
 *    potentially forgetting) the guard.
 *
 * Mitigation follows OWASP's guidance: prefix a leading single quote so
 * spreadsheet apps render the value as literal text instead of evaluating
 * it as a formula.
 */
// A bare integer or decimal (optionally signed) is never a formula threat
// and is common in this app's own numeric columns (e.g. a negative
// temperature) -- these must pass through untouched rather than get a
// leading quote that would make a spreadsheet app treat them as text.
const PLAIN_NUMBER_RE = /^[+-]?\d+(\.\d+)?$/;

export function escapeCsvField(value: string | number): string {
  let str = String(value);

  if (/^[=+\-@\t\r]/.test(str) && !PLAIN_NUMBER_RE.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
