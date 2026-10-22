#!/usr/bin/env node
// Offline recovery into a brand-new data directory; never open an existing DB.
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../src/core/store.js';
import { Engine } from '../src/core/engine.js';
import { loadGames } from '../src/core/registry.js';
import { validateJSONState } from '../src/core/validate.js';
import core from '../src/plugins/core.js';
import combat from '../src/plugins/combat.js';
import narrative from '../src/plugins/narrative.js';

const usage = 'Usage: node scripts/import-save.js EXPORT.json NEW_DATA_DIRECTORY [--compatible-release REVIEWED_RELEASE]';
let store;
try {
  const args = process.argv.slice(2);
  if (![2, 4].includes(args.length) || (args.length === 4 && (args[2] !== '--compatible-release' || !/^[a-f0-9]{24}$/.test(args[3])))) throw new Error(usage);
  const [filename, target] = args;
  const raw = await readFile(resolve(filename), 'utf8');
  if (Buffer.byteLength(raw) > 4_000_000) throw new Error('Export exceeds 4 MB.');
  const value = JSON.parse(raw);
  const keys = ['gameId', 'saveVersion', 'sourceRelease', 'capturedAt', 'save'];
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw new Error('Expected exactly gameId, saveVersion, sourceRelease, capturedAt, and save.');
  }
  if (typeof value.gameId !== 'string' || !/^[a-z0-9-]+$/.test(value.gameId)) throw new Error('Invalid gameId.');
  if (!Number.isSafeInteger(value.saveVersion) || value.saveVersion < 1) throw new Error('Invalid saveVersion.');
  if (typeof value.sourceRelease !== 'string' || !/^[a-f0-9]{24}$/.test(value.sourceRelease)) throw new Error('Invalid sourceRelease.');
  if (typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt))) throw new Error('Invalid capturedAt.');
  validateJSONState(value.save);

  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const dataDirectory = resolve(target);
  // Exclusive mkdir is the safety boundary: even an existing empty directory is refused.
  await mkdir(dataDirectory);
  const games = await loadGames(resolve(root, 'games'), { core, combat, narrative }, resolve(dataDirectory, 'releases'));
  const game = games.get(value.gameId);
  if (!game || game.pack.runtime !== 'code') throw new Error('Export requires an installed code-runtime game.');
  if (game.release.saveVersion !== value.saveVersion) throw new Error('saveVersion mismatch; no migrations are supported.');
  if (game.release.release !== value.sourceRelease && args[3] !== game.release.release) {
    throw new Error(`Source release mismatch: export ${value.sourceRelease}, installed ${game.release.release}. Restore the exact source pack first, or explicitly accept a reviewed release with --compatible-release; no compatibility is assumed.`);
  }
  if (game.release.release !== value.sourceRelease) console.error(`Explicit compatibility override: ${value.sourceRelease} -> ${game.release.release}; saveVersion unchanged, save data not migrated.`);
  // Supply the validated state as the new session's initial save, not an update.
  games.set(value.gameId, { ...game, pack: { ...game.pack, initial: value.save } });
  store = new Store(resolve(dataDirectory, 'games.sqlite'));
  const engine = new Engine(store, games);
  const { session } = engine.create(value.gameId);
  const restored = store.session(session.id);
  if (JSON.stringify(restored.state) !== JSON.stringify(value.save)) throw new Error('Recovery verification failed.');
  console.log(JSON.stringify({ sessionId: session.id, gameId: session.gameId, sourceRelease: value.sourceRelease,
    installedRelease: game.release.release, dataDirectory, openPath: `/?session=${session.id}`, capturedAt: value.capturedAt }, null, 2));
} catch (error) {
  console.error(`Import failed: ${error.message}`);
  console.error('No existing data directory or session is overwritten. A newly created directory may remain after failure; use a new path for the next attempt.');
  process.exitCode = 1;
} finally {
  store?.close();
}
