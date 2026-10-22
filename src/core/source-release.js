import { createHash, randomUUID } from 'node:crypto';
import {
  readdir,
  readFile,
  mkdir,
  writeFile,
  rename,
  rm
} from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { requireValue as check } from './errors.js';
import { validateJSONState } from './validate.js';

/** Immutable whole-pack snapshots preserve relative ESM imports across live releases. */
export async function snapshotRelease(directory, output, gameId) {
  const base = resolve(directory, gameId);
  const files = [];

  async function walk(dir) {
    const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const item of entries) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const path = resolve(dir, item.name);
      check(
        !item.isSymbolicLink(),
        'INVALID_RELEASE',
        'Release files cannot be symbolic links.'
      );
      if (item.isDirectory()) {
        await walk(path);
      } else if (item.isFile()) {
        files.push([
          relative(base, path).split(sep).join('/'),
          await readFile(path)
        ]);
      }
    }
  }

  await walk(base);
  check(
    files.reduce((n, [, data]) => n + data.length, 0) <= 30_000_000,
    'RELEASE_TOO_LARGE',
    'Keep a local code release below 30 MB.'
  );

  const pack = JSON.parse(
    files.find(([name]) => name === 'game.json')?.[1].toString() || '{}'
  );
  check(
    pack.id === gameId && pack.runtime === 'code',
    'INVALID_PACK',
    'Publish requires a matching code-game manifest.'
  );
  const entry = String(pack.entry || './main.js').replace(/^\.\//, '');
  check(
    !entry.startsWith('/') &&
      !entry.split('/').includes('..') &&
      entry.endsWith('.js') &&
      files.some(([name]) => name === entry),
    'INVALID_ENTRY',
    'entry must identify a JavaScript module inside this pack.'
  );
  check(
    Number.isInteger(pack.saveVersion) && pack.saveVersion >= 1,
    'INVALID_SAVE_VERSION',
    'Code packs need a positive integer saveVersion.'
  );
  validateJSONState(pack.initial);

  const hash = createHash('sha256');
  for (const [name, data] of files) {
    hash.update(name).update('\0').update(data).update('\0');
  }
  const release = hash.digest('hex').slice(0, 24);
  const destination = resolve(output, gameId, release);
  const temporary = `${destination}.${randomUUID()}`;
  await mkdir(temporary, { recursive: true });

  for (const [name, data] of files) {
    const target = resolve(temporary, name);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, data);
  }
  try {
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
  }

  return {
    release,
    entry: `/releases/${gameId}/${release}/${entry}`,
    saveVersion: pack.saveVersion,
    pack
  };
}
