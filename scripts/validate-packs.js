import { resolve } from 'node:path';
import { loadGames } from '../src/core/registry.js';
import core from '../src/plugins/core.js';
import combat from '../src/plugins/combat.js';
import narrative from '../src/plugins/narrative.js';
const games = await loadGames(resolve('games'), { core, combat, narrative });
for (const { pack, actions } of games.values()) console.log(pack.runtime === 'code' ? `${pack.id} v${pack.version}: code canvas (${pack.entry})` : `${pack.id} v${pack.version}: ${Object.keys(pack.initial.entities).length} entities, ${Object.keys(pack.initial.scenes).length} scenes, ${actions.size} actions loaded.`);
console.log('Pack structure and plugin registration are valid. Gameplay is verified by running it.');
