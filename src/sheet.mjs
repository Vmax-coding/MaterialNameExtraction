export function readSheetEdits(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && typeof item.key === 'string' && typeof item.name === 'string' && typeof item.note === 'string');
  } catch { return []; }
}

export function sheetRows(rows, edits) {
  const saved = new Map(edits.map(edit => [edit.key, edit]));
  return rows.map(row => ({ key: row.key, name: saved.get(row.key)?.name ?? row.name, note: saved.get(row.key)?.note ?? '' }));
}

// A rectangular paste fills the current cell and cells to its right and below.
export function pasteSheet(rows, startRow, startColumn, text) {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const values = normalized.split('\n').map(line => line.split('\t'));
  const next = rows.map(row => ({ ...row }));
  let changed = 0;
  values.forEach((cells, offset) => {
    const row = next[startRow + offset];
    if (!row) return;
    cells.forEach((value, columnOffset) => {
      const field = ['name', 'note'][startColumn + columnOffset];
      if (field) { row[field] = value; changed++; }
    });
  });
  return { rows: next, changed, clipped: startRow + values.length > rows.length || values.some(cells => cells.length + startColumn > 2) };
}
