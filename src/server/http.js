import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { errorInfo, requireValue as check } from '../core/errors.js';
import { publicEvent } from '../core/patches.js';

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.avif': 'image/avif', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function send(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(body)); }
async function body(request) {
  check(request.headers['content-type']?.startsWith('application/json'), 'CONTENT_TYPE', 'Use Content-Type: application/json.');
  let size = 0, text = '';
  for await (const part of request) { size += part.length; check(size <= 512000, 'BODY_TOO_LARGE', 'Request body exceeds 512 KB.'); text += part; }
  let value;
  try { value = JSON.parse(text); } catch { check(false, 'INVALID_JSON', 'Request body is not valid JSON.'); }
  check(value && typeof value === 'object' && !Array.isArray(value), 'INVALID_REQUEST', 'Request body must be a JSON object.');
  return value;
}
function publicPack(pack) { const { initial, ...metadata } = pack; return metadata; }
function stream(request, response, engine, sessionId, url) {
  engine.session(sessionId);
  const after = Number(request.headers['last-event-id'] || url.searchParams.get('after') || 0);
  check(Number.isInteger(after) && after >= 0 && after <= engine.store.head(sessionId), 'INVALID_CURSOR', 'Reconnect from a current snapshot cursor.');
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const write = (name, data, id) => response.write(`${id === undefined ? '' : `id: ${id}\n`}event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  let cursor = after;
  const replay = engine.store.events(sessionId, after, 1001);
  if (replay.length > 1000) { write('resync', { reason: 'More than 1000 pending events; fetch a new snapshot.' }); response.end(); return; }
  for (const event of replay) {
    write('change', { sessionId, revision: event.revision, patches: event.type === 'state.changed' ? event.data.patches : [], events: event.type === 'state.changed' ? [] : [publicEvent(event)], cursor: event.seq }, event.seq); cursor = event.seq;
  }
  write('ready', { cursor });
  const listener = event => {
    if (event.sessionId !== sessionId || event.cursor <= cursor) return;
    cursor = event.cursor; write('change', { ...event, events: event.events.filter(item => item.type !== 'state.changed').map(publicEvent) }, cursor);
  };
  engine.on('commit', listener);
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15000);
  request.on('close', () => { clearInterval(heartbeat); engine.off('commit', listener); });
}
async function serveFile(response, root, pathname) {
  const base = resolve(root), file = resolve(base, '.' + pathname);
  check(file.startsWith(base + sep) && !pathname.split('/').some(segment => segment.startsWith('.')), 'NOT_FOUND', 'File not found.');
  let actual;
  try { actual = await realpath(file); } catch { check(false, 'NOT_FOUND', 'File not found.'); }
  check(actual.startsWith(base + sep) && (await stat(actual)).isFile(), 'NOT_FOUND', 'File not found.');
  check(mime[extname(actual)], 'NOT_FOUND', 'Unsupported public asset type.');
  response.writeHead(200, { 'Content-Type': mime[extname(actual)], 'Cache-Control': 'no-cache' }); response.end(await readFile(actual));
}
export function createHttpServer(engine, tools, root, options = {}) {
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    try {
      const url = new URL(request.url, 'http://localhost'), path = url.pathname;
      const hostname = new URL(`http://${request.headers.host || 'invalid'}`).hostname;
      if (!options.token) check(['localhost', '127.0.0.1', '[::1]'].includes(hostname), 'HOST_REJECTED', 'Use the localhost address for this local runtime.');
      if (!['GET', 'POST'].includes(request.method)) { send(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET or POST.' } }); return; }
      if (request.method === 'POST') {
        const origin = request.headers.origin;
        check(!origin || new URL(origin).host === request.headers.host, 'ORIGIN_REJECTED', 'Cross-origin mutations are not permitted.');
        if (options.token) check(request.headers.authorization === `Bearer ${options.token}`, 'UNAUTHORIZED', 'Use the configured local API bearer token.');
      }
      if (request.method === 'POST' && path === '/api/tools') { const input = await body(request); send(response, 200, await tools.call(input.tool, input.args)); return; }
      if (path === '/api/games' && request.method === 'GET') { send(response, 200, { games: [...engine.games.values()].map(({ pack }) => publicPack(pack)) }); return; }
      if (path === '/api/sessions') {
        if (request.method === 'POST') { const input = await body(request); send(response, 201, engine.create(input.gameId, input.seed)); }
        else send(response, 200, { sessions: engine.store.sessions().map(({ state, ...session }) => ({ ...session, scene: state.scene, player: state.entities[state.player]?.name })) });
        return;
      }
      const match = path.match(/^\/api\/sessions\/([\w-]+)(?:\/(actions|events|status))?$/);
      if (match) {
        const [, id, action] = match;
        if (action === 'events' && request.method === 'GET') { stream(request, response, engine, id, url); return; }
        if (action === 'actions' && request.method === 'POST') { const input = await body(request); send(response, 200, engine.act({ ...input, sessionId: id }, 'player')); return; }
        const session = engine.session(id);
        if (action === 'status') send(response, 200, { revision: session.revision, cursor: engine.store.head(id), jobs: engine.store.jobs(id).map(({ token, ...job }) => job), consumers: engine.store.consumers(id) });
        else if (!action && request.method === 'GET') send(response, 200, { session, cursor: engine.store.head(id) });
        else check(false, 'NOT_FOUND', 'Route not found.');
        return;
      }
      check(request.method === 'GET' && !path.startsWith('/api/'), 'NOT_FOUND', 'Route not found.');
      if (path.startsWith('/games/')) await serveFile(response, resolve(root, 'games'), decodeURIComponent(path.slice(6)));
      else await serveFile(response, resolve(root, 'public'), path === '/' ? '/index.html' : decodeURIComponent(path));
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const info = errorInfo(error), status = info.code === 'NOT_FOUND' || info.code.endsWith('_NOT_FOUND') ? 404 : info.code === 'STALE_REVISION' ? 409 : 400;
      send(response, status, { ok: false, error: info });
    }
  });
  server.requestTimeout = 35000;
  return server;
}
