export function toCsv(rows: Record<string, string | number | null | undefined>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

/** True in the hosted preview build, whose sandbox blocks downloads and printing. */
export const SANDBOXED = import.meta.env.VITE_ARTIFACT === '1';

export function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (SANDBOXED) {
    // Sandboxed preview: downloads are blocked, so copy the CSV to the clipboard instead.
    const text = toCsv(rows);
    navigator.clipboard?.writeText(text).then(
      () => import('../context/toasts').then((m) => m.toast('CSV copied to clipboard', `${rows.length} records · paste into a spreadsheet`, 'success')),
      () => import('../context/toasts').then((m) => m.toast('Clipboard unavailable', 'Run the project locally to download CSV files.', 'warning')),
    );
    return;
  }
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
