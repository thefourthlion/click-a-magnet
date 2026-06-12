import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const src = join(root, '.output', `${pkg.name}-${pkg.version}-chrome.zip`);
const dest = join(root, `click-a-magnet-v${pkg.version}.zip`);

if (!existsSync(src)) {
  console.error(`Expected zip not found: ${src}\nRun "wxt zip" first.`);
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`→ ${dest}`);
