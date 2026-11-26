import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App, Alert, Button, Space, Tag } from 'antd';
import { CopyOutlined, DownloadOutlined, ReloadOutlined, TableOutlined } from '@ant-design/icons';
import { Workbook, type WorkbookInstance } from '@fortune-sheet/react';
import type { Sheet } from '@fortune-sheet/core';
import '@fortune-sheet/react/dist/index.css';
import { readWorkbook, syncWorkbook, workbookRows, selectedText } from './workbook.mjs';

type SourceRow = { key: string; name: string };
type Snapshot = { keys: string[]; sheet: Sheet };
const STORE = 'material-workbook-v2';
function initial(rows: SourceRow[]): Snapshot {
  try { return syncWorkbook(rows, readWorkbook(localStorage.getItem(STORE)), localStorage.getItem('material-sheet-v1') || ''); }
  catch { return syncWorkbook(rows, null); }
}

const TOOLBAR = ['undo', 'redo', '|', 'font-size', 'bold', 'italic', 'font-color', 'background', '|', 'horizontal-align', 'text-wrap'];
const MENU = ['copy', 'paste', '|', 'clear', 'set-row-height', 'set-column-width'];

export default function MaterialSheet({ rows, copy }: { rows: SourceRow[]; copy: (text: string) => Promise<void> }) {
  const { message, modal } = App.useApp();
  const [grid, setGrid] = useState(() => ({ snapshot: initial(rows), revision: 0 }));
  const live = useRef<Snapshot>(grid.snapshot);
  const api = useRef<WorkbookInstance>(null);
  const [exporting, setExporting] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [selectionLabel, setSelectionLabel] = useState('A1');
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('material-sheet-collapsed-v1') === 'true'; } catch { return false; }
  });

  const save = useCallback((snapshot: Snapshot) => {
    snapshot = { ...snapshot, sheet: { ...snapshot.sheet, luckysheet_select_save: undefined } };
    live.current = snapshot;
    try {
      localStorage.setItem(STORE, JSON.stringify(snapshot));
      setStorageError(false);
    } catch { setStorageError(true); }
  }, []);
  useEffect(() => {
    if (JSON.stringify(rows.map(row => row.key)) === JSON.stringify(live.current.keys)) return;
    const next = syncWorkbook(rows, live.current);
    save(next);
    setGrid(previous => ({ snapshot: next, revision: previous.revision + 1 }));
  }, [rows, save]);
  const initialData = useMemo(() => {
    const { data, ...sheet } = grid.snapshot.sheet;
    const celldata = (data || []).flatMap((row, r) => row.flatMap((v, c) => v == null ? [] : [{ r, c, v }]));
    return [{ ...sheet, luckysheet_select_save: [{ row: [0, 0], column: [0, 0] }], celldata }];
  }, [grid.snapshot.sheet]);
  const changed = useCallback((sheets: Sheet[]) => {
    if (sheets[0]) save({ keys: grid.snapshot.keys, sheet: sheets[0] });
  }, [grid.snapshot.keys, save]);

  const hooks = useMemo(() => ({ afterSelectionChange: () => setSelectionLabel(api.current?.getSelectionCoordinates().join(', ') || 'A1') }), []);
  useEffect(() => {
    if (collapsed) return;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      const ranges = api.current?.getSelection();
      if (!ranges?.length || ranges.some(range => [...range.row, ...range.column].some(value => !Number.isFinite(value)))) {
        api.current?.setSelection([{ row: [0, 0], column: [0, 0] }]);
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [collapsed, grid.revision]);
  function toggleCollapsed() {
    const next = !collapsed; setCollapsed(next);
    try { localStorage.setItem('material-sheet-collapsed-v1', String(next)); } catch { /* Keep current state. */ }
    if (!next) requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  async function exportFile() {
    setExporting(true);
    try {
      const { downloadSheet } = await import('./export-sheet');
      await downloadSheet(workbookRows(live.current.sheet, rows.length));
      message.success('已导出表格中的名称和备注');
    } catch { message.error('导出失败，请重试'); }
    finally { setExporting(false); }
  }
  function reset() {
    modal.confirm({ title: '重置素材表格？', content: '恢复为原始提取名称，清空备注和表格格式。', okText: '重置表格', cancelText: '取消', onOk: () => {
      const next = syncWorkbook(rows, null); save(next);
      setGrid(previous => ({ snapshot: next, revision: previous.revision + 1 }));
      try { localStorage.removeItem('material-sheet-v1'); } catch { /* New workbook is still saved. */ }
    } });
  }
  return <section className={`sheet-card${collapsed ? ' sheet-collapsed' : ''}`} aria-label="素材 Excel 表格">
    <div className="sheet-toolbar"><div className="sheet-heading"><TableOutlined /><h2>素材表格</h2><Tag>{rows.length} 条 · 全部素材</Tag></div><Space wrap>
      <Button disabled={!rows.length} icon={<ReloadOutlined />} onClick={reset}>重置表格</Button>
      <Button disabled={!rows.length} icon={<CopyOutlined />} onClick={() => void copy(selectedText(live.current.sheet, api.current?.getSelection()))}>复制选区</Button>
      <Button disabled={!rows.length} icon={<CopyOutlined />} onClick={() => void copy(workbookRows(live.current.sheet, rows.length).map(row => row.name).join('\n'))}>复制名称列</Button>
      <Button type="primary" disabled={!rows.length} loading={exporting} icon={<DownloadOutlined />} onClick={() => void exportFile()}>导出 Excel</Button>
      <Button type="text" aria-expanded={!collapsed} aria-controls="material-sheet-content" onClick={toggleCollapsed}>{collapsed ? '展开表格' : '收起表格'}</Button>
    </Space></div>
    <div id="material-sheet-content" hidden={collapsed}>
      <p className="sheet-description">A 列素材名称，B 列备注。拖动框选 · Shift 连选 · 点击行号或列标整行整列选择 · Ctrl+C / Ctrl+V 复制粘贴 · Delete 批量清空</p>
      {storageError && <Alert showIcon type="warning" message="表格修改未能保存，关闭页面前请导出 Excel。" />}
      <div className="workbook-grid">
        <Workbook key={grid.revision} ref={api} data={initialData} onChange={changed} lang="zh" showSheetTabs={false}
          toolbarItems={TOOLBAR} cellContextMenu={MENU} headerContextMenu={MENU} showFormulaBar
          hooks={hooks} />
      </div>
      <div className="sheet-footer"><span>选区：{selectionLabel}</span><span>双击或直接输入编辑 · 修改自动保存到本机 · 导出名称和备注，不含单元格格式</span></div>
    </div>
  </section>;
}
