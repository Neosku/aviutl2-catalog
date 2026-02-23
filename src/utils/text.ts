const pad2 = (n: number | string): string => String(n).padStart(2, '0');

export function normalize(input: unknown): string {
  if (!input) return '';
  let s = String(input).trim().toLowerCase();
  s = s.replace(/[！-～]/g, (ch: string): string => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/　/g, ' ');
  s = s.replace(/[ァ-ヶ]/g, (ch: string): string => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  return s;
}

export function formatDate(ts: unknown): string {
  if (ts == null) return '';
  const dateInput = ts instanceof Date || typeof ts === 'string' || typeof ts === 'number' ? ts : Number.NaN;
  const d = new Date(dateInput);
  if (isNaN(+d)) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
