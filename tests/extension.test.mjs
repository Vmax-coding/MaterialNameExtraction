import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('MV3插件仅从本地加载资源，不请求网站权限或网络连接', () => {
 const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url)));
 assert.equal(manifest.manifest_version, 3);
 assert.equal(manifest.permissions, undefined);
 assert.equal(manifest.host_permissions, undefined);
 assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
 for (const icon of Object.values(manifest.icons)) assert(existsSync(new URL('../public/' + icon, import.meta.url)));
});
test('点击工具栏图标打开插件内部工作台', () => {
 let clicked; const opened = [];
 const chrome = { action: { onClicked: { addListener(callback) { clicked = callback; } } }, tabs: { create(options) { opened.push(options); } }, runtime: { getURL(path) { return 'chrome-extension://test/' + path; } } };
 runInNewContext(readFileSync(new URL('../public/background.js', import.meta.url), 'utf8'), { chrome });
 assert.equal(opened.length, 0);
 clicked();
 assert.equal(opened[0].url, 'chrome-extension://test/index.html');
});
