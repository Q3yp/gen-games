import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../core/store.js';
import { loadGames } from '../core/registry.js';
import { Engine } from '../core/engine.js';
import { ToolService } from '../core/tools.js';
import { createHttpServer } from './http.js';
import core from '../plugins/core.js';
import combat from '../plugins/combat.js';
import narrative from '../plugins/narrative.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const host = process.env.GEN_GAMES_HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !process.env.GEN_GAMES_TOKEN) {
  throw new Error('Non-loopback hosting requires GEN_GAMES_TOKEN. This trusted-code runtime is designed for local use.');
}
const games = await loadGames(resolve(root, 'games'), { core, combat, narrative });
const store = new Store(resolve(process.env.GEN_GAMES_DATA || resolve(root, '.data'), 'games.sqlite'));
const engine = new Engine(store, games), tools = new ToolService(engine);
const server = createHttpServer(engine, tools, root, { token: process.env.GEN_GAMES_TOKEN });
const interval = setInterval(() => engine.tick(100), 100);
server.listen(port, host, () => console.log(`gen-games ready: http://${host}:${port}\n${games.size} packs · data ${process.env.GEN_GAMES_DATA || '.data'} · trusted local code`));
let closing = false;
function shutdown() { if (closing) return; closing = true; clearInterval(interval); server.close(() => { store.close(); process.exit(0); }); setTimeout(() => process.exit(0), 1500).unref(); server.closeAllConnections(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
