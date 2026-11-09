import { useMemo, useRef, useState } from 'react';
import { App as AntApp, Alert, Button, Checkbox, Empty, Input, Modal, Select, Space, Table, Tag, Tooltip } from 'antd';
import { CheckOutlined, CopyOutlined, FileOutlined, FolderOpenOutlined, PlusOutlined, SearchOutlined, ClearOutlined, SafetyCertificateOutlined, AppstoreOutlined } from '@ant-design/icons';
import { groupFiles, filterRows, copyTextForRows } from './extract.mjs';

type FileMeta = { name: string; path: string };
type Row = { key: string; name: string; language: string; dimensions: string[]; recognized: boolean; files: FileMeta[] };
const STORE = 'material-names-v1';
function restore(): FileMeta[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(value) ? value.filter(f => f && typeof f.name === 'string' && typeof f.path === 'string') : [];
  } catch { return []; }
}
async function clipboard(text: string) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const input = document.createElement('textarea');
    input.value = text; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.append(input); input.select();
    try { if (!document.execCommand('copy')) throw new Error('copy failed'); }
    finally { input.remove(); }
  }
}

export default function App() {
  const { message } = AntApp.useApp();
  const folderRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileMeta[]>(restore);
  const [language, setLanguage] = useState('');
  const [search, setSearch] = useState('');
  const [onlyUnrecognized, setOnlyUnrecognized] = useState(false);
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [append, setAppend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [copied, setCopied] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const { rows, ignored } = useMemo(() => groupFiles(files) as { rows: Row[]; ignored: number }, [files]);
  const counts = useMemo(() => {
    const values = new Map<string, number>();
    rows.forEach(row => values.set(row.language, (values.get(row.language) || 0) + 1));
    return [...values.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'));
  }, [rows]);
  const filtered = useMemo(() => filterRows(rows, language, search, onlyUnrecognized) as Row[], [rows, language, search, onlyUnrecognized]);
  const mediaCount = rows.reduce((n, row) => n + row.files.length, 0);
  const uncertain = rows.filter(row => !row.recognized).length;
  const visibleSelected = filtered.filter(row => selected.includes(row.key)).length;
  const [detail, setDetail] = useState<Row | null>(null);

  function persist(next: FileMeta[]) {
    setFiles(next);
    try {
      if (next.length) localStorage.setItem(STORE, JSON.stringify(next)); else localStorage.removeItem(STORE);
      setStorageError(false);
    } catch { setStorageError(true); }
  }
  async function importFiles(list: FileList | null) {
    if (!list?.length) return;
    const entries = Array.from(list);
    setBusy(true);
    try {
      const incoming: FileMeta[] = [];
      for (let i = 0; i < entries.length; i++) {
        incoming.push({ name: entries[i].name, path: entries[i].webkitRelativePath || entries[i].name });
        if (i && i % 2000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      const combined = new Map<string, FileMeta>();
      (append ? [...files, ...incoming] : incoming).forEach(file => combined.set(file.path, file));
      const next = [...combined.values()];
      persist(next); setSelected([]); setLanguage(''); setSearch(''); setOnlyUnrecognized(false); setPage(1);
      const result = groupFiles(incoming);
      message.success(`已读取 ${incoming.length} 个文件，提取 ${result.rows.length} 个素材名称${result.ignored ? `，忽略 ${result.ignored} 个非素材文件` : ''}`);
    } catch { message.error('读取失败，请重新选择文件夹'); }
    finally { setBusy(false); }
  }
  async function copy(text: string, key = '') {
    if (!text) return;
    try { await clipboard(text); setCopied(key); message.success(key ? '名称已复制' : `已复制 ${text.split('\n').length} 个名称`); }
    catch { message.error('无法访问剪贴板，请选中名称后按 Ctrl+C 复制'); }
  }
  const resetPage = () => setPage(1);
  const chooseLanguage = (value: string) => { setLanguage(value); resetPage(); };
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><CopyOutlined /></span><div>素材名称提取器<small>MATERIAL NAMES</small></div></div>
      <div className="workspace-label">素材工作台</div>
      <div className="sidebar-title"><span>按语言查看</span><span>{counts.length} 种语言</span></div>
      <nav aria-label="语言筛选">
        <button className={!language ? 'language active' : 'language'} onClick={() => chooseLanguage('')}><span><AppstoreOutlined /> 全部素材</span><b>{rows.length}</b></button>
        {counts.map(([name, count]) => <button key={name} className={language === name ? 'language active' : 'language'} onClick={() => chooseLanguage(name)}><span><span className="language-dot" />{name}</span><b>{count}</b></button>)}
      </nav>
      <div className="local-note"><SafetyCertificateOutlined /><strong>素材只在本地处理</strong><p>仅读取文件名称，不读取视频内容，不上传素材。</p><small>下次打开保留名称列表；原文件不会被修改。</small></div>
      <div className="version">本地工具 <span>v1.0.0</span></div>
    </aside>
    <main>
      <header><div><div className="eyebrow">CREATIVE WORKSPACE</div><h1>好素材，名称一键就绪。</h1><p>合并不同尺寸，按语言整理，随选随复制。</p></div><Tag className="offline-tag"><span className="status-dot" /> 本地运行 · 无需上传</Tag></header>
      <section className="import-card">
        <div className="folder-art"><FolderOpenOutlined /></div>
        <div className="import-copy"><h2>选择你的素材文件夹</h2><p>自动包含子文件夹，提取尺寸前的完整名称并去重。</p><div className="sample">葡萄牙语-冰块拆脚底螺丝_XYY_TSY<span>-16x9_Screw_261104.mp4</span></div></div>
        <div className="import-actions"><Space><Button type="primary" size="large" icon={<FolderOpenOutlined />} loading={busy} onClick={() => folderRef.current?.click()}>选择文件夹</Button><Tooltip title="也可以一次选择多个素材文件"><Button size="large" icon={<PlusOutlined />} disabled={busy} onClick={() => filesRef.current?.click()}>选择文件</Button></Tooltip></Space><Checkbox checked={append} disabled={busy} onChange={event => setAppend(event.target.checked)}>追加到现有列表</Checkbox></div>
        <input ref={folderRef} type="file" multiple {...{ webkitdirectory: '', directory: '' }} hidden onChange={event => { void importFiles(event.target.files); event.target.value = ''; }} aria-label="选择素材文件夹" />
        <input ref={filesRef} type="file" multiple accept=".mp4,.mov,.m4v,.webm,.avi,.mkv,.mpg,.mpeg,.wmv,.flv,.gif,.png,.jpg,.jpeg,.webp,.bmp,.avif" hidden onChange={event => { void importFiles(event.target.files); event.target.value = ''; }} aria-label="选择素材文件" />
      </section>
      {storageError && <Alert className="notice" showIcon type="warning" message="名称列表未能保存在本机，关闭页面后需要重新选择文件夹。当前仍可正常复制。" />}
      <section className="stats" aria-label="素材统计">
        <div><span>读取素材文件</span><strong>{mediaCount.toLocaleString()}<small>个</small></strong></div>
        <div><span>去重后的名称</span><strong className="green">{rows.length.toLocaleString()}<small>条</small></strong></div>
        <div><span>合并重复名称</span><strong>{(mediaCount - rows.length).toLocaleString()}<small>条</small></strong></div>
        <div><span>覆盖语言</span><strong>{counts.length}<small>种</small></strong></div>
      </section>
      <section className="results-card">
        <div className="results-title"><div><h2>{language || '全部素材'}<Tag>{filtered.length} 条名称</Tag></h2><p>复制内容保留语言和人员缩写，每个名称占一行。</p></div><Button icon={<ClearOutlined />} disabled={!files.length || busy} onClick={() => Modal.confirm({ title: '清空名称列表？', content: '只清除本机保存的名称记录，不会删除或修改素材文件。', okText: '清空列表', cancelText: '取消', onOk: () => { persist([]); setSelected([]); setLanguage(''); setPage(1); } })}>清空列表</Button></div>
        <div className="filters"><Input className="search" size="large" prefix={<SearchOutlined />} placeholder="搜索素材名称、关键词或人员缩写" aria-label="搜索素材" allowClear value={search} onChange={event => { setSearch(event.target.value); resetPage(); }} /><Select size="large" aria-label="语言" value={language} onChange={chooseLanguage} options={[{ value: '', label: '全部语言' }, ...counts.map(([name, count]) => ({ value: name, label: `${name} (${count})` }))]} /><Checkbox checked={onlyUnrecognized} onChange={event => { setOnlyUnrecognized(event.target.checked); resetPage(); }}>仅待检查{uncertain ? ` (${uncertain})` : ''}</Checkbox></div>
        <div className="selection-bar"><Space wrap><span>已选 <b>{selected.length}</b> 条</span>{selected.length > visibleSelected && <span className="muted">含筛选外 {selected.length - visibleSelected} 条</span>}<Button type="link" size="small" disabled={!filtered.length} onClick={() => setSelected([...new Set([...selected, ...filtered.map(row => row.key)])])}>选择全部筛选结果</Button><Button type="link" size="small" disabled={!selected.length} onClick={() => setSelected([])}>取消选择</Button></Space><Space><Button disabled={!filtered.length} icon={<CopyOutlined />} onClick={() => void copy(filtered.map(row => row.name).join('\n'))}>复制筛选结果</Button><Button type="primary" disabled={!selected.length} icon={<CopyOutlined />} onClick={() => void copy(copyTextForRows(rows, selected))}>复制已选 ({selected.length})</Button></Space></div>
        <Table<Row> rowKey="key" dataSource={filtered} loading={busy} rowSelection={{ selectedRowKeys: selected, preserveSelectedRowKeys: true, onChange: setSelected }} pagination={{ current: page, pageSize, total: filtered.length, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: total => `共 ${total} 条`, onChange: (next, size) => { setPage(size !== pageSize ? 1 : next); setPageSize(size); } }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={rows.length ? '没有找到匹配的素材，试试其他关键词或语言' : '选择文件夹，开始整理素材名称'} /> }} scroll={{ x: 780 }} columns={[
          { title: '素材名称', dataIndex: 'name', render: (name: string, row: Row) => <div className="name-cell"><span className="file-icon"><FileOutlined /></span><div><span className="material-name">{name}</span>{!row.recognized && <div className="check-note">未识别尺寸，保留原名称，请检查</div>}</div></div> },
          { title: '语言', dataIndex: 'language', width: 115, render: (value: string) => <Tag className="language-tag">{value}</Tag> },
          { title: '已合并尺寸', dataIndex: 'dimensions', width: 200, render: (values: string[]) => <Space size={[0, 4]} wrap>{values.map(value => <Tag key={value} color={value === '未识别' ? 'orange' : undefined}>{value}</Tag>)}</Space> },
          { title: '源文件', width: 90, render: (_, row) => <Button type="link" size="small" onClick={() => setDetail(row)}>{row.files.length} 个</Button> },
          { title: '操作', width: 110, fixed: 'right', render: (_, row) => <Button icon={copied === row.key ? <CheckOutlined /> : <CopyOutlined />} onClick={() => void copy(row.name, row.key)}>{copied === row.key ? '已复制' : '复制'}</Button> },
        ]} />
        <footer><span>支持 1x1 / 9x16 / 16x9 / 像素尺寸，兼容大写 X 和 ×。</span><span>{ignored ? `已忽略 ${ignored} 个非素材文件` : '名称按首次导入顺序排列'}</span></footer>
      </section>
      <div className="bottom-note">选择文件夹只读取名称。取消勾选「追加到现有列表」可替换列表；文件变化后请重新选择。</div>
    </main>
    <Modal title="源文件与提取结果" open={Boolean(detail)} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>} width={780}><p className="detail-name">{detail?.name}</p><div className="source-list">{detail?.files.map(file => <div key={file.path}>{file.path}</div>)}</div></Modal>
  </div>;
}
