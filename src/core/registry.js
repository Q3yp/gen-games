import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { requireValue as check } from './errors.js';
import { snapshotRelease } from './code-runtime.js';
import { validateState, validateJSONState } from './validate.js';

export async function loadGames(directory, builtins, releaseDirectory = resolve(directory, '../.data/releases')) {
  const games = new Map();
  for (const folder of await readdir(directory, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    let pack;
    try { pack = JSON.parse(await readFile(resolve(directory, folder.name, 'game.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    check(pack.id === folder.name && /^[a-z0-9-]+$/.test(pack.id), 'INVALID_PACK', `Game id must match folder ${folder.name}.`);
    check(typeof pack.title === 'string' && typeof pack.version === 'string', 'INVALID_PACK', `${pack.id} needs title and version.`);
    if (pack.runtime === 'code') {
      validateJSONState(pack.initial);
      const release = await snapshotRelease(directory, releaseDirectory, pack.id);
      games.set(pack.id, { pack, plugins: [], actions: new Map(), release });
      continue;
    }
    validateState(pack.initial);
    const plugins = [], actions = new Map(), ids = new Set();
    for (const name of pack.plugins || []) {
      let plugin = builtins[name];
      if (!plugin && name.startsWith('./')) {
        const base = resolve(directory, folder.name), file = resolve(base, name);
        check(file.startsWith(base + sep) && file.endsWith('.js'), 'INVALID_PLUGIN_PATH', 'Custom plugins must be .js files within their game pack.');
        plugin = (await import(pathToFileURL(file).href)).default;
      }
      check(plugin && typeof plugin.id === 'string' && typeof plugin.version === 'string', 'INVALID_PLUGIN', `Unknown or invalid plugin ${name}.`);
      check(!ids.has(plugin.id), 'PLUGIN_COLLISION', `Duplicate plugin ${plugin.id}.`);
      for (const requirement of plugin.requires || []) check(ids.has(requirement), 'PLUGIN_DEPENDENCY', `${plugin.id} requires ${requirement} to load first.`);
      ids.add(plugin.id); plugins.push(plugin);
      for (const [key, action] of Object.entries(plugin.actions || {})) {
        check(!actions.has(key), 'ACTION_COLLISION', `Duplicate action ${key}.`);
        check(typeof action.run === 'function' && action.description, 'INVALID_ACTION', `${key} needs run and description.`);
        actions.set(key, action);
      }
    }
    games.set(pack.id, { pack, plugins, actions });
  }
  check(games.size, 'NO_GAMES', `No game packs found under ${directory}.`);
  return games;
}

/** Add a newly authored code pack without touching registered games or live sessions. */
export async function registerCodeGame(engine, gameId) {
  check(typeof gameId === 'string' && /^[a-z0-9-]+$/.test(gameId),
    'INVALID_GAME_ID', 'Use a lowercase game directory ID containing letters, numbers, or hyphens.');
  const existing = engine.games.get(gameId);
  if (existing) return { game: existing, registered: false };
  const host = engine.codeRuntime;
  check(host, 'CODE_RUNTIME_UNAVAILABLE', 'Code runtime must be configured before registering a game.');
  let folder;
  try { folder = await lstat(resolve(host.directory, gameId)); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    check(false, 'GAME_NOT_FOUND', `No source directory games/${gameId}/.`,
      'Author a new code pack with a matching game.json, then call library register.');
  }
  check(folder.isDirectory() && !folder.isSymbolicLink(), 'INVALID_PACK',
    'New code packs must be real directories within games/, not symbolic links.');
  try { await lstat(resolve(host.directory, gameId, 'game.json')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    check(false, 'GAME_SOURCE_NOT_READY', `games/${gameId}/ has no completed game.json.`,
      'Wait for source scaffolding to finish, or finish the retained pack and matching manifest before registering.');
  }
  const release = await snapshotRelease(host.directory, host.output, gameId);
  const pack = release.pack;
  check(typeof pack.title === 'string' && typeof pack.version === 'string',
    'INVALID_PACK', `${gameId} needs title and version.`);
  // Another registration may have completed while source was being snapshotted.
  // Never replace its release or affect any sessions already created from it.
  const concurrent = engine.games.get(gameId);
  if (concurrent) return { game: concurrent, registered: false };
  const game = { pack, plugins: [], actions: new Map(), release };
  engine.games.set(gameId, game);
  return { game, registered: true };
}
