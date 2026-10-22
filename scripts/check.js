import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
async function walk(dir) {
  let count = 0;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.data'].includes(item.name)) continue;
    const path = resolve(dir, item.name);
    if (item.isDirectory()) count += await walk(path);
    else if (item.name.endsWith('.js')) { const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' }); if (result.status) process.exit(result.status); count++; }
  }
  return count;
}
console.log(`Syntax checked ${await walk(root)} JavaScript modules. No test suite is included.`);
