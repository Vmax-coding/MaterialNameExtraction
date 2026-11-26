import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Alert, Button, Empty, Pagination, Space, Tag } from 'antd';
import { CopyOutlined, DownloadOutlined, ReloadOutlined, TableOutlined } from '@ant-design/icons';
import { pasteSheet, readSheetEdits, sheetRows } from './sheet.mjs';

type SourceRow = { key: string; name: string };
type SheetRow = { key: string; name: string; note: string };
const STORE = 'material-sheet-v1';
const SIZE = 100;
function restore(): SheetRow[] {
  try { return readSheetEdits(localStorage.getItem(STORE)); } catch { return []; }
}

export default function MaterialSheet({ rows, copy }: { rows: SourceRow[]; copy: (text: string) => Promise<void> }) {
  const { message, modal } = App.useApp();
  const [edits, setEdits] = useState<SheetRow[]>(restore);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('material-sheet-collapsed-v1') === 'true'; } catch { return false; }
  });
  const [storageError, setStorageError] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const data = useMemo(() => sheetRows(rows, edits) as SheetRow[], [rows, edits]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(data.length / SIZE)));
  const start = (currentPage - 1) * SIZE;
  const visible = data.slice(start, start + SIZE);

  useEffect(() => {
    const keys = new Set(rows.map(row => row.key));
    setEdits(previous => {
      const next = previous.filter(row => keys.has(row.key));
      return next.length === previous.length ? previous : next;
    });
  }, [rows]);
  useEffect(() => {
    try {
      if (edits.length) localStorage.setItem(STORE, JSON.stringify(edits));
      else localStorage.removeItem(STORE);
      setStorageError(false);
    } catch { setStorageError(true); }
  }, [edits]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('material-sheet-collapsed-v1', String(next)); } catch { /* Current state remains usable. */ }
  }
  function change(index: number, field: 'name' | 'note', value: string) {
    const row = { ...data[index], [field]: value };
    setEdits(previous => [...previous.filter(edit => edit.key !== row.key), row]);
  }
  function focus(row: number, column: number) {
    if (row < 0 || row >= data.length || column < 0 || column > 1) return;
    const nextPage = Math.floor(row / SIZE) + 1;
    if (nextPage !== currentPage) setPage(nextPage);
    requestAnimationFrame(() => {
      const cell = gridRef.current?.querySelector<HTMLInputElement>(`input[data-row="${row}"][data-column="${column}"]`);
      cell?.focus(); cell?.select();
    });
  }
  async function exportFile() {
    setExporting(true);
    try {
      const { downloadSheet } = await import('./export-sheet');
      await downloadSheet(data);
      message.success(`已导出全部 ${data.length} 条素材`);
    } catch { message.error('导出失败，请重试'); }
    finally { setExporting(false); }
  }
  return <section className={`sheet-card${collapsed ? ' sheet-collapsed' : ''}`} aria-label="素材 Excel 表格">
    <div className="sheet-toolbar"><div className="sheet-heading"><TableOutlined /><h2>素材表格</h2><Tag>{data.length} 条 · 全部素材</Tag></div><Space wrap>
      <Button disabled={!data.length} icon={<ReloadOutlined />} onClick={() => modal.confirm({ title: '重置素材表格？', content: '恢复为提取的原名称，并清空全部备注。', okText: '重置表格', cancelText: '取消', onOk: () => setEdits([]) })}>重置表格</Button>
      <Button disabled={!data.length} icon={<CopyOutlined />} onClick={() => void copy(data.map(row => row.name).join('\n'))}>复制名称列</Button>
      <Button type="primary" disabled={!data.length} loading={exporting} icon={<DownloadOutlined />} onClick={() => void exportFile()}>导出 Excel</Button>
      <Button type="text" aria-expanded={!collapsed} aria-controls="material-sheet-content" onClick={toggleCollapsed}>{collapsed ? '展开表格' : '收起表格'}</Button>
    </Space></div>
    <div id="material-sheet-content" hidden={collapsed}>
    <p className="sheet-description">自动同步全部去重名称，不受下方筛选影响。可编辑名称和备注，也可粘贴 Excel 单元格；修改仅保存在此表。</p>
    {storageError && <Alert showIcon type="warning" message="表格修改未能保存，关闭页面前请导出 Excel。" />}
    <div className="sheet-grid" ref={gridRef}>
      <table aria-label="全部素材电子表格"><colgroup><col className="sheet-index-col" /><col className="sheet-name-col" /><col /></colgroup><thead><tr><th aria-label="行号" /><th scope="col"><span>A</span> 素材名称</th><th scope="col"><span>B</span> 备注</th></tr></thead><tbody>
        {visible.map((row, offset) => {
          const index = start + offset;
          return <tr key={row.key}><th scope="row">{index + 1}</th>{(['name', 'note'] as const).map((field, column) => <td key={field}>
            <input aria-label={`第${index + 1}行${field === 'name' ? '素材名称' : '备注'}`} data-row={index} data-column={column} value={row[field]} spellCheck={false}
              onChange={event => change(index, field, event.target.value)}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault(); focus(index + (event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey) ? -1 : 1), column);
                } else if (event.key === 'Tab') {
                  const position = index * 2 + column + (event.shiftKey ? -1 : 1);
                  if (position >= 0 && position < data.length * 2) { event.preventDefault(); focus(Math.floor(position / 2), position % 2); }
                }
              }}
              onPaste={event => {
                const text = event.clipboardData.getData('text/plain');
                if (!/[\t\r\n]/.test(text)) return;
                event.preventDefault();
                const result = pasteSheet(data, index, column, text);
                setEdits(result.rows);
                if (result.clipped) message.warning('已粘贴表格范围内的内容，超出当前行数或两列的部分已忽略');
              }}
            />
          </td>)}</tr>;
        })}
      </tbody></table>
      {!data.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择素材文件夹后，名称自动填入此表" />}
    </div>
    <div className="sheet-footer"><span>表格修改自动保存到本机 · Enter 换行 / Tab 换列</span><Pagination size="small" current={currentPage} total={data.length} pageSize={SIZE} showSizeChanger={false} hideOnSinglePage onChange={setPage} showTotal={total => `共 ${total} 行`} /></div>
    </div>
  </section>;
}
