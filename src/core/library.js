import { requireValue as check } from './errors.js';
import { isRecord, validateJSONState } from './validate.js';
import { compact } from './context.js';
import { directorFor } from './director.js';

const sections = ['brief', 'decisions', 'unresolved', 'references'];
const workspaceId = id => `ws-${id}`;
function boundedProgress(value) {
  if (value == null) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length <= 1600 ? value : `${text.slice(0, 1570)}… [inspect summary for more]`;
}
function resolveSession(engine, args) {
  const id = args.workspaceId?.startsWith('ws-') ? args.workspaceId.slice(3) : args.sessionId;
  check(id && (!args.workspaceId || args.workspaceId === workspaceId(id)), 'WORKSPACE_NOT_FOUND', 'Provide a workspaceId or sessionId from library list.');
  check(!args.sessionId || args.sessionId === id, 'WORKSPACE_MISMATCH', 'Workspace and session IDs must identify the same campaign.');
  return engine.session(id);
}
function contextFor(engine, session) {
  return engine.store.workspace(session.id) || {
    id: workspaceId(session.id), sessionId: session.id, version: 0,
    title: `${engine.games.get(session.gameId)?.pack.title || session.gameId} · ${session.id.slice(0, 8)}`,
    progress: '', brief: '', decisions: [], unresolved: [], references: [],
    sectionVersions: {}, updatedAt: session.createdAt, basedOn: null
  };
}
function entry(engine, session) {
  const workspace = contextFor(engine, session), runtime = session.runtime;
  return {
    gameId: session.gameId, gameTitle: engine.games.get(session.gameId)?.pack.title || session.gameId,
    sessionId: session.id, workspaceId: workspace.id, title: workspace.title,
    progress: workspace.progress, gameProgress: boundedProgress(session.runtime?.summary?.progress), status: session.status, createdAt: session.createdAt,
    lastPlayedAt: runtime?.savedAt || session.updatedAt, workspaceVersion: workspace.version,
    workspaceUpdatedAt: workspace.updatedAt,
    available: engine.games.has(session.gameId), revision: session.revision,
    runEpoch: runtime?.runEpoch ?? null, checkpointSeq: runtime?.checkpointSeq ?? null,
    savedAt: runtime?.savedAt ?? null, url: `/?session=${encodeURIComponent(session.id)}`
  };
}
function freshness(engine, session) {
  const runtime = session.runtime;
  return { revision: session.revision, cursor: engine.store.head(session.id),
    activeRelease: runtime?.activeRelease ?? null, desiredRelease: runtime?.release ?? null,
    saveRelease: runtime?.saveRelease ?? null, runEpoch: runtime?.runEpoch ?? null,
    checkpointSeq: runtime?.checkpointSeq ?? null, savedAt: runtime?.savedAt ?? null,
    projectionAt: runtime?.projection?.observedAt ?? null, versions: runtime?.versions || {} };
}
export function openWorkspace(engine, args) {
  const session = resolveSession(engine, args), workspace = contextFor(engine, session);
  const scope = args.scope || 'all';
  check(['all', 'metadata', ...sections].includes(scope), 'INVALID_SCOPE', 'Use all, metadata, brief, decisions, unresolved, or references.');
  check(args.afterVersion === undefined || Number.isInteger(args.afterVersion) && args.afterVersion >= 0 && args.afterVersion <= workspace.version,
    'STALE_WORKSPACE_CURSOR', 'afterVersion must be a previously observed workspace version, not a future version.');
  const selected = scope === 'all' ? sections : sections.includes(scope) ? [scope] : [];
  const context = Object.fromEntries(selected.filter(key => args.afterVersion === undefined || (workspace.sectionVersions[key] || 0) > args.afterVersion).map(key => [key, workspace[key]]));
  const data = { ...entry(engine, session), version: workspace.version, updatedAt: workspace.updatedAt,
    basedOn: workspace.basedOn, stateKeys: Object.keys(session.state), context, freshness: freshness(engine, session),
    source: { gameId: session.gameId, editablePath: `games/${session.gameId}/`,
      sharing: 'All campaigns of this gameId share editable source. Publish targets only the specified session; other sessions retain immutable releases. Editable files may differ from pinned active/save releases. Use a distinct gameId/directory for independent source.',
      activeEntry: session.runtime?.activeEntry ?? null, saveEntry: session.runtime?.saveEntry ?? null },
    director: directorFor(engine).status(session.id),
    api: { contractVersion: 1, discover: { tool: 'discover', args: { sessionId: session.id } },
      capabilities: { tool: 'inspect', args: { sessionId: session.id, scope: 'capabilities' } },
      save: { tool: 'inspect', args: { sessionId: session.id, scope: 'save' } },
      delta: { tool: 'observe', args: { sessionId: session.id, after: engine.store.head(session.id) } } }
  };
  return { text: `WORKSPACE ${workspace.id} v${workspace.version} · ${workspace.title}\nSession ${session.id} · game ${session.gameId}\n${compact({ progress: workspace.progress, freshness: data.freshness, source: data.source, director: data.director, api: data.api, context }, 6500)}`, data };
}
export async function manageWorkspace(engine, args) {
  if (!args.op || args.op === 'read') return openWorkspace(engine, args);
  const session = resolveSession(engine, args);
  if (args.op === 'attach') {
    engine.game(session.gameId);
    const opened = openWorkspace(engine, args);
    const connection = await directorFor(engine).call({ sessionId: session.id, op: 'attach', consumer: args.consumer, leaseMs: args.leaseMs });
    opened.data.director = directorFor(engine).status(session.id);
    return { text: `${opened.text}\n${connection.text}\nConnection ${JSON.stringify(connection.data)}`, data: { ...opened.data, connection: connection.data } };
  }
  check(args.op === 'update', 'INVALID_WORKSPACE_OPERATION', 'Use read, update, or attach.');
  openWorkspace(engine, args); // Validate read/delta options before any durable update.
  check(isRecord(args.patch) && Object.keys(args.patch).length > 0 && Object.keys(args.patch).every(key => ['title', 'progress', ...sections].includes(key)),
    'INVALID_WORKSPACE_PATCH', 'Patch only title, progress, brief, decisions, unresolved, references. Each supplied section replaces that section; omitted sections are preserved.');
  validateJSONState(args.patch);
  for (const [key, value] of Object.entries(args.patch)) {
    if (['title', 'progress', 'brief'].includes(key)) check(typeof value === 'string' && value.length <= (key === 'title' ? 120 : key === 'progress' ? 500 : 6000) && (key !== 'title' || value.trim()), 'INVALID_WORKSPACE_VALUE', `${key} must be a bounded string (title 120, progress 500, brief 6000 characters).`);
    else check(Array.isArray(value) && value.length <= 40 && Buffer.byteLength(JSON.stringify(value)) <= 8000, 'WORKSPACE_TOO_LARGE', `${key} must be an array of at most 40 entries and 8 KB. Store references, not transcripts or assets.`);
  }
  engine.store.transaction(() => {
    const current = contextFor(engine, session);
    check(Number.isInteger(args.expectedVersion), 'WORKSPACE_VERSION_REQUIRED', 'Read workspace and pass expectedVersion.');
    check(args.expectedVersion === current.version, 'STALE_WORKSPACE', `Expected workspace v${args.expectedVersion}; current v${current.version}. Read and merge before retrying.`);
    const live = directorFor(engine).current(session.id);
    check(!live || args.token === live.token, 'DIRECTOR_BUSY', 'A director owns this campaign. Provide its connection token or wait for it to detach before updating handoff context.');
    const next = { ...current, ...args.patch, version: current.version + 1, updatedAt: new Date().toISOString(), basedOn: freshness(engine, session), sectionVersions: { ...current.sectionVersions } };
    for (const key of Object.keys(args.patch)) next.sectionVersions[key] = next.version;
    check(Buffer.byteLength(JSON.stringify(next)) <= 30000, 'WORKSPACE_TOO_LARGE', 'Keep handoff context below 30 KB.');
    engine.store.saveWorkspace(next);
  });
  return openWorkspace(engine, args);
}
export function manageLibrary(engine, args) {
  if (args.op === 'open') return openWorkspace(engine, args);
  if (args.op === 'create') {
    if (args.title !== undefined) check(typeof args.title === 'string' && args.title.trim() && args.title.length <= 120, 'INVALID_TITLE', 'Title must contain 1–120 characters.');
    const result = engine.create(args.gameId, args.seed);
    const workspace = contextFor(engine, result.session);
    if (args.title) workspace.title = args.title;
    engine.store.saveWorkspace(workspace);
    return openWorkspace(engine, { sessionId: result.session.id });
  }
  check(!args.op || args.op === 'list', 'INVALID_LIBRARY_OPERATION', 'Use list, create, or open.');
  const limit = args.limit ?? 30, offset = args.offset ?? 0;
  check(Number.isInteger(limit) && limit >= 1 && limit <= 100 && Number.isInteger(offset) && offset >= 0, 'INVALID_PAGE', 'Use limit 1–100 and nonnegative offset.');
  const all = engine.store.sessions().filter(s => !args.gameId || s.gameId === args.gameId).map(s => entry(engine, s)).sort((a,b) => String(b.lastPlayedAt).localeCompare(String(a.lastPlayedAt)) || a.sessionId.localeCompare(b.sessionId));
  const entries = all.slice(offset, offset + limit);
  const data = { entries, total: all.length, nextOffset: offset + entries.length < all.length ? offset + entries.length : null,
    games: [...engine.games.values()].map(({ pack }) => ({ gameId: pack.id, title: pack.title, description: pack.description, runtime: pack.runtime || 'structured' })) };
  return { text: entries.map(e => `${e.title}\n  ${e.workspaceId} · ${e.gameId} · last played ${e.lastPlayedAt}\n  ${e.progress || 'No handoff progress note yet.'}`).join('\n') || 'No saved campaigns. Use library create with a gameId.', data };
}
