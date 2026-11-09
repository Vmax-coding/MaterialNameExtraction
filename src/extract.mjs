export const MEDIA_EXTENSION = /\.(?:mp4|mov|m4v|webm|avi|mkv|mpg|mpeg|wmv|flv|gif|png|jpe?g|webp|bmp|avif)$/i;

export function parseName(filename) {
  const stem = filename.replace(/\.[^.]+$/, '').normalize('NFC').trim();
  const markers = [...stem.matchAll(/[-_]\s*(\d{1,5})\s*[xX×:]\s*(\d{1,5})(?=[_-]|$)/g)];
  const last = markers.at(-1);
  const candidate = last ? stem.slice(0, last.index).trim() : '';
  const recognized = Boolean(candidate);
  const name = recognized ? candidate : stem;
  const prefix = name.match(/^(.+?)[\-－–—_]/)?.[1]?.trim();
  return {
    name,
    language: prefix || '未分类',
    dimension: recognized ? `${last[1]}×${last[2]}` : '未识别',
    recognized,
  };
}

export function groupFiles(files) {
  const groups = new Map();
  const paths = new Set();
  let ignored = 0;
  for (const file of files) {
    const path = file.path || file.name;
    if (paths.has(path)) continue;
    paths.add(path);
    if (!MEDIA_EXTENSION.test(file.name)) { ignored++; continue; }
    const parsed = parseName(file.name);
    if (!parsed.name) { ignored++; continue; }
    let row = groups.get(parsed.name);
    if (!row) {
      row = { ...parsed, key: parsed.name, dimensions: [], files: [] };
      groups.set(parsed.name, row);
    }
    if (!row.dimensions.includes(parsed.dimension)) row.dimensions.push(parsed.dimension);
    row.files.push({ name: file.name, path });
  }
  return { rows: [...groups.values()], ignored };
}

export function filterRows(rows, language, search, onlyUnrecognized = false) {
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(row =>
    (!language || row.language === language) &&
    (!onlyUnrecognized || !row.recognized) &&
    terms.every(term => row.name.toLocaleLowerCase().includes(term))
  );
}

export function copyTextForRows(rows, keys) {
  const selected = new Set(keys);
  return rows.filter(row => selected.has(row.key)).map(row => row.name).join('\n');
}
