import ExcelJS from 'exceljs';

export async function workbookBytes(rows: { name: string; note: string }[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('全部素材', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: '素材名称', key: 'name', width: 72 },
    { header: '备注', key: 'note', width: 38 },
  ];
  rows.forEach(row => sheet.addRow([row.name, row.note]));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176854' } };
  sheet.getRow(1).height = 25;
  sheet.autoFilter = { from: 'A1', to: `B${Math.max(1, rows.length + 1)}` };
  return workbook.xlsx.writeBuffer();
}

export async function downloadSheet(rows: { name: string; note: string }[]) {
  const bytes = await workbookBytes(rows);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `素材名称_${new Date().toLocaleDateString('sv-SE')}.xlsx`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
