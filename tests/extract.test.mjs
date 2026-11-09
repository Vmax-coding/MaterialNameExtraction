import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseName, groupFiles, filterRows, copyTextForRows } from '../src/extract.mjs';

test('截图中的不同尺寸合并为用户需要的完整名称', () => {
 const name = '葡萄牙语-冰块拆脚底螺丝_XYY_TSY';
 const files = ['1x1','9x16','16x9'].map(size => ({name: `${name}-${size}_Screw_261104.mp4`}));
 const {rows} = groupFiles(files);
 assert.equal(rows.length, 1); assert.equal(rows[0].name, name);
 assert.equal(rows[0].language, '葡萄牙语'); assert.equal(rows[0].files.length, 3);
});
test('多种尺寸格式和文件扩展名；不误删描述中的数字和连接符', () => {
 for (const size of ['9X16','1080x1920','9×16','9:16']) {
  assert.equal(parseName(`英语-街头挑战-版本2_ABC_DEF_${size}_Nuts_261104.MP4`).name, '英语-街头挑战-版本2_ABC_DEF');
 }
 assert.equal(parseName('英语-含16x9文字_ABC_DEF-1x1_Screw_1.mp4').name, '英语-含16x9文字_ABC_DEF');
 assert.equal(parseName('英语-挑战_ABC_DEF-9x16.mp4').name, '英语-挑战_ABC_DEF');
});
test('缺失或模糊尺寸安全保留名称并提示', () => {
 assert.deepEqual(parseName('特殊素材.mp4'), {name:'特殊素材', language:'未分类', dimension:'未识别', recognized:false});
 assert.equal(parseName('英语-素材_ABC_DEF.mp4').name, '英语-素材_ABC_DEF');
 assert.equal(parseName('英语-素材-9x16修订.mp4').recognized, false);
});
test('同路径重复导入不重复计数，子文件夹同名合并，跳过其他文件', () => {
 const f = {name:'英语-素材_A_B-1x1.mp4',path:'one/英语-素材_A_B-1x1.mp4'};
 const result = groupFiles([f,f,{...f,path:'two/'+f.name},{name:'readme.txt'}]);
 assert.equal(result.rows.length,1); assert.equal(result.rows[0].files.length,2); assert.equal(result.ignored,1);
});
test('语言筛选、多关键词不区分大小写、待检查筛选及批量复制', () => {
 const {rows} = groupFiles([{name:'英语-冰块_XYY_TSY-1x1.mp4'},{name:'葡萄牙语-冰块_XYY_TSY-9X16.mp4'},{name:'英语-待检查.mp4'}]);
 assert.equal(filterRows(rows,'英语','冰块 xyy').length,1);
 assert.equal(filterRows(rows,'','冰块').length,2);
 assert.equal(filterRows(rows,'','',true).length,1);
 assert.equal(copyTextForRows(rows,[rows[1].key, rows[0].key]), '英语-冰块_XYY_TSY\n葡萄牙语-冰块_XYY_TSY');
});
test('一万个文件仅按名称提取', () => {
 const files = Array.from({length:10000},(_,i)=>({name:`阿拉伯语-素材${Math.floor(i/3)}_A_B-${['1x1','9x16','16x9'][i%3]}_Screw_261104.mp4`}));
 assert.equal(groupFiles(files).rows.length,3334);
});
