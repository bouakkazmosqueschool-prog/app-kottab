function escapeCsvCell(value: string | number): string {
  const s = String(value);
  if (/["\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** يبني نصاً بصيغة CSV مع BOM لضمان عرض العربية بشكل صحيح في Excel */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return '\uFEFF' + lines.join('\r\n');
}
