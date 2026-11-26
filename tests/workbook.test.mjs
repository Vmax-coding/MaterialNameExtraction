import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readWorkbook,syncWorkbook,workbookRows,selectedText} from '../src/workbook.mjs';
import {fortuneCsp} from '../scripts/fortune-csp.mjs';
import {readFileSync} from 'node:fs';

test('旧版名称和备注迁移，新素材同步保留编辑',()=>{
 const rows=[{key:'a',name:'葡萄牙语-a'},{key:'b',name:'英语-b'}];
 const old=JSON.stringify([{key:'a',name:'改名',note:'待投放'}]);
 const first=syncWorkbook(rows,null,old);
 assert.deepEqual(workbookRows(first.sheet,2),[{name:'改名',note:'待投放'},{name:'英语-b',note:''}]);
 first.sheet.data[0][0].bg='#ff0000';
 const next=syncWorkbook([...rows,{key:'c',name:'阿拉伯语-c'}],first);
 assert.equal(next.sheet.data[0][0].bg,'#ff0000');
 assert.equal(workbookRows(next.sheet,3)[2].name,'阿拉伯语-c');
 assert.equal(syncWorkbook(rows,first),first);
 assert.equal(workbookRows(syncWorkbook([],next).sheet).length,0);
});
test('选区复制按矩形输出TSV，包括空格、中文和备注',()=>{
 const s={data:[[{v:'a'},{v:'备注'}],[{v:'b'},null],[{v:'c'},{v:'多\n行'}]]};
 assert.equal(selectedText(s,[{row:[0,1],column:[0,1]}]),'a\t备注\nb\t');
 assert.equal(selectedText(s,[{row:[0,99],column:[0,0]}]),'a\nb\nc');
 assert.equal(selectedText(s,[{row:[2,2],column:[1,1]}]),'"多\n行"');
 assert.equal(readWorkbook('bad'),null);
 assert.equal(readWorkbook('{"keys":[],"sheet":{}}'),null);
});
test('扩展构建去掉FortuneSheet插入行时的动态代码执行',()=>{
 const source=readFileSync(new URL('../node_modules/@fortune-sheet/core/dist/index.esm.js',import.meta.url),'utf8');
 const output=fortuneCsp().transform(source,'/node_modules/@fortune-sheet/core/dist/index.esm.js').code;
 assert(!output.includes('new Function('));
 assert(output.includes('d.splice(index, 0, ...arr.map(item => JSON.parse(item)))'));
});
