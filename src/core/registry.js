import { readdir, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { requireValue as check } from './errors.js';
import { validateState } from './validate.js';

export async function loadGames(directory, builtins) {
  const games = new Map();
  for (const folder of await readdir(directory, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    let pack;
    try { pack = JSON.parse(await readFile(resolve(directory, folder.name, 'game.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    check(pack.id === folder.name && /^[a-z0-9-]+$/.test(pack.id), 'INVALID_PACK', `Game id must match folder ${folder.name}.`);
    check(typeof pack.title === 'string' && typeof pack.version === 'string', 'INVALID_PACK', `${pack.id} needs title and version.`);
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
