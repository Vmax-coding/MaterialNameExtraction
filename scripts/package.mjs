import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('artifacts', { recursive: true });
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const filename = `MaterialNameExtraction-v${version}.zip`;
const output = `../artifacts/${filename}`;
rmSync(`artifacts/${filename}`, { force: true });
execFileSync('python3', ['-c', `import pathlib,zipfile
with zipfile.ZipFile('${output}', 'w', zipfile.ZIP_DEFLATED) as z:
 for p in sorted(pathlib.Path('.').rglob('*')):
  if p.is_file(): z.write(p,p.as_posix())
`], { cwd: 'dist', stdio: 'inherit' });
console.log(`插件安装包：artifacts/${filename}`);
