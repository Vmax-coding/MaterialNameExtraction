import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSheetEdits, sheetRows, pasteSheet } from '../src/sheet.mjs';

test('全部素材自动入表，追加素材保留已有编辑和备注', () => {
 const a = { key:'葡萄牙语-素材_A_B', name:'葡萄牙语-素材_A_B' };
 const b = { key:'英语-素材_A_B', name:'英语-素材_A_B' };
 const edits = [{...a,name:'改名',note:'已投放'}];
 assert.deepEqual(sheetRows([a,b],edits),[{key:a.key,name:'改名',note:'已投放'},{...b,note:''}]);
 assert.equal(a.name,'葡萄牙语-素材_A_B');
});
test('Excel矩形粘贴覆盖当前单元格及后续行，不改变源ID', () => {
 const rows = [0,1,2].map(i=>({key:String(i),name:'name'+i,note:''}));
 const result = pasteSheet(rows,1,0,'名字A\t备注A\r\n名字B\t备注B\r\n');
 assert.deepEqual(result.rows,[rows[0],{key:'1',name:'名字A',note:'备注A'},{key:'2',name:'名字B',note:'备注B'}]);
 assert.equal(result.clipped,false); assert.equal(rows[1].name,'name1');
 assert.equal(pasteSheet(rows,2,1,'仅备注\t超出\n超出行').clipped,true);
 assert.equal(pasteSheet(rows,0,0,'\t').rows[0].name,'');
});
test('恢复本地编辑时忽略损坏或不合法的记录', () => {
 assert.deepEqual(readSheetEdits('{'),[]);
 assert.deepEqual(readSheetEdits('{}'),[]);
 assert.deepEqual(readSheetEdits('[null,{"key":"a","name":1},{"key":"a","name":"名称","note":"备注"}]'),[{key:'a',name:'名称',note:'备注'}]);
});
