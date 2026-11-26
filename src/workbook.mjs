import { readSheetEdits, sheetRows } from './sheet.mjs';
export function cellText(cell) {
  if (cell == null) return '';
  if (typeof cell !== 'object') return String(cell);
  return String(cell.v ?? cell.m ?? '');
}
export function readWorkbook(value) {
  try {
    const saved = JSON.parse(value || 'null');
    return saved && Array.isArray(saved.keys) && saved.keys.every(key => typeof key === 'string') && saved.sheet && Array.isArray(saved.sheet.data) ? saved : null;
  } catch { return null; }
}
export function syncWorkbook(rows, saved, legacy = '') {
  const keys = rows.map(row => row.key);
  if (saved && JSON.stringify(keys) === JSON.stringify(saved.keys)) return saved;
  const previous = new Map((saved?.keys || []).map((key, index) => [key, saved.sheet.data[index]]));
  const oldEdits = sheetRows(rows, readSheetEdits(legacy));
  const textCell = value => ({ v: value, m: value, ct: { fa: '@', t: 's' }, ht: 1 });
  const data = rows.map((row, index) => previous.has(row.key)
    ? structuredClone(previous.get(row.key) || [null, null])
    : [textCell(oldEdits[index].name), textCell(oldEdits[index].note)]);
  // Extra manually filled rows follow the automatically synchronized materials.
  if (rows.length && saved) data.push(...structuredClone(saved.sheet.data.slice(saved.keys.length)));
  while (data.length && data.at(-1).every(cell => !cellText(cell))) data.pop();
  return { keys, sheet: {
    id: 'materials', name: '素材名称', status: 1, order: 0,
    row: Math.max(100, data.length + 30, keys.length + 30), column: 2,
    defaultRowHeight: 28, defaultColWidth: 260,
    config: { columnlen: saved?.sheet.config?.columnlen || { 0: 660, 1: 300 } },
    data,
  } };
}
export function workbookRows(sheet, minimum = 0) {
  const data = sheet.data || [];
  let end = data.length;
  while (end > minimum && !(data[end - 1] || []).some(cell => cellText(cell))) end--;
  return Array.from({ length: Math.max(end, minimum) }, (_, i) => ({ name: cellText(data[i]?.[0]), note: cellText(data[i]?.[1]) }));
}
export function selectedText(sheet, ranges) {
  const data = sheet.data || [];
  const used = workbookRows(sheet).length;
  const quote = value => /[\t\n\r"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return (ranges || []).map(range => {
    const lines = [];
    for (let r = range.row[0]; r <= Math.min(range.row[1], used - 1); r++) {
      const cells = [];
      for (let c = range.column[0]; c <= Math.min(range.column[1], 1); c++) cells.push(quote(cellText(data[r]?.[c])));
      lines.push(cells.join('\t'));
    }
    return lines.join('\n');
  }).filter(Boolean).join('\n');
}
