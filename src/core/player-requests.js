import { requireValue as check } from './errors.js';
import { directorFor, validateDirectorToken } from './director.js';

// Host requests are engine metadata, deliberately separate from game saves/checkpoints.
const initialized = new WeakSet();
function ready(engine) {
  if (initialized.has(engine)) return;
  engine.store.db.exec(`CREATE TABLE IF NOT EXISTS player_requests (
    session_id TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL,
    PRIMARY KEY(session_id,id));
    CREATE TABLE IF NOT EXISTS player_request_changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, request_id TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS player_request_changes_session ON player_request_changes(session_id,seq);
    CREATE INDEX IF NOT EXISTS player_requests_cursor ON player_requests(session_id,json_extract(body,'$.cursor'));
    CREATE INDEX IF NOT EXISTS player_requests_status ON player_requests(session_id,json_extract(body,'$.status'));
    CREATE INDEX IF NOT EXISTS player_request_activation_events ON events(session_id,type,json_extract(data,'$.release'),seq);
    CREATE INDEX IF NOT EXISTS player_request_event_types ON events(session_id,type,seq);`);
  initialized.add(engine);
  engine.on('commit', message => {
    if (message.events?.some(event => event.type.startsWith('runtime.'))) reconcile(engine, message.sessionId);
  });
}
function digest(row) {
  const clip = (value, length) => typeof value === 'string' && value.length > length ? value.slice(0, length - 1) + '…' : value;
  return { id: row.id, status: row.status, version: row.version, eventCursor: row.eventCursor,
    cursor: row.cursor, textPreview: clip(row.text, 180), ...(row.note ? { notePreview: clip(row.note, 120) } : {}) };
}
function get(engine, sessionId, id) {
  const row = engine.store.db.prepare('SELECT body FROM player_requests WHERE session_id=? AND id=?').get(sessionId, id);
  check(row, 'PLAYER_REQUEST_NOT_FOUND', 'Player request not found.');
  return JSON.parse(row.body);
}
function save(engine, row, type, text) {
  let event;
  engine.store.transaction(() => {
    if (type === 'player.requested') {
      event = engine.store.append(engine.session(row.sessionId), { type, text, data: {
        requestId: row.id, eventId: `player-request:${row.id}`, status: row.status,
        untrusted: true, source: 'player', text: row.text, context: row.context
      } });
      row.eventCursor = event.seq;
    }
    row.cursor = Number(engine.store.db.prepare('INSERT INTO player_request_changes(session_id,request_id) VALUES(?,?)').run(row.sessionId, row.id).lastInsertRowid);
    engine.store.db.prepare('INSERT INTO player_requests VALUES(?,?,?) ON CONFLICT(session_id,id) DO UPDATE SET body=excluded.body').run(row.sessionId, row.id, JSON.stringify(row));
  });
  // Only player submissions enter the semantic stream. Host status must not
  // wake its own director or manufacture another authoring turn.
  if (event) engine.emit('commit', { sessionId: row.sessionId, revision: event.revision, patches: [], events: [event], cursor: event.seq });
  return row;
}
/** Only explicit, atomically persisted publication evidence can be linked. */
function publicationCursor(engine, sessionId, publishId, receipt) {
  const cursor = receipt?.publicationCursor;
  check(Number.isInteger(cursor) && cursor > 0, 'UNLINKABLE_PUBLICATION', 'This older publication receipt lacks durable correlation evidence. Publish with a fresh request ID, then link that receipt.');
  const event = engine.store.db.prepare("SELECT data FROM events WHERE session_id=? AND seq=? AND type='runtime.release'").get(sessionId, cursor);
  const data = event && JSON.parse(event.data);
  check(data?.publishId === publishId && data?.release === receipt.release, 'UNLINKABLE_PUBLICATION', 'The publication receipt does not match its durable event. Inspect it and use a fresh publication request ID.');
  return cursor;
}
function reconcile(engine, id) {
  const runtime = engine.session(id).runtime;
  const candidates = engine.store.db.prepare("SELECT body FROM player_requests WHERE session_id=? AND json_extract(body,'$.status')='working' AND json_extract(body,'$.fulfillment.kind') IN ('command','publication') LIMIT 30").all(id);
  for (const saved of candidates) {
    const row = JSON.parse(saved.body);
    const f = row.fulfillment;
    let status;
    if (f.kind === 'command') {
      const command = runtime?.commands?.find(c => c.id === f.commandId) || engine.store.request(id, f.commandId)?.result?.data;
      if (command?.status === 'applied') status = 'applied';
      else if (['failed', 'canceled'].includes(command?.status)) { status = 'failed'; row.note = command.error || 'The linked command did not apply.'; }
    } else if (f.kind === 'publication') {
      // A save's activeRelease can be initialized without a browser. Require a
      // durable browser acknowledgment inside this publication's event window.
      if (!f.publicationCursor) {
        const receipt = engine.store.request(id, f.publishId)?.result?.data;
        // An ambiguous legacy link must not break every request poll or be
        // inferred from mutable pointers. Close it with an actionable outcome.
        if (!receipt?.publicationCursor) {
          row.status = 'failed'; row.note = 'This older publication has no correlation evidence. Use a fresh publication request ID and a new player request.';
          row.version++; row.updatedAt = new Date().toISOString();
          save(engine, row, 'player.request.updated', `Player request ${row.id}: failed.`);
          continue;
        }
        f.publicationCursor = publicationCursor(engine, id, f.publishId, receipt);
      }
      const boundary = engine.store.db.prepare("SELECT seq FROM events WHERE session_id=? AND type='runtime.release' AND seq>? ORDER BY seq LIMIT 1").get(id, f.publicationCursor)?.seq;
      const activation = engine.store.db.prepare("SELECT seq,at,data FROM events WHERE session_id=? AND type='runtime.activated' AND json_extract(data,'$.release')=? AND seq>? AND seq<? ORDER BY seq LIMIT 1").get(id, f.release, Math.max(f.publicationCursor, row.eventCursor), boundary ?? Number.MAX_SAFE_INTEGER);
      if (activation) {
        status = 'applied';
        f.activationCursor = activation.seq;
        f.activatedAt = activation.at;
        f.runEpoch = JSON.parse(activation.data).runEpoch;
      } else if (boundary) { status = 'failed'; row.note = 'A newer publication replaced this change before its browser activation was acknowledged.'; }
    }
    if (status) {
      if (status === 'applied') {
        // A working note is historical, not the current application status.
        row.priorNote = row.note;
        row.note = 'The playing browser applied the linked update.';
      }
      row.status = status; row.version++; row.updatedAt = new Date().toISOString();
      save(engine, row, 'player.request.updated', `Player request ${row.id}: ${status}.`);
    }
  }
}
export function listPlayerRequests(engine, sessionId, options = {}) {
  ready(engine); engine.session(sessionId); reconcile(engine, sessionId);
  const limit = options.limit ?? 20, after = options.after ?? 0;
  check(Number.isInteger(limit) && limit > 0 && limit <= 100 && Number.isInteger(after) && after >= 0, 'INVALID_PAGE', 'Use limit 1–100 and nonnegative after cursor.');
  check(options.status === undefined || options.status === 'open', 'INVALID_STATUS', 'Use status open to recover unfinished requests, or omit it for all changes.');
  const all = engine.store.db.prepare(`SELECT body FROM player_requests WHERE session_id=? AND json_extract(body,'$.cursor')>? ${options.status === 'open' ? "AND json_extract(body,'$.status') IN ('queued','working')" : ''} ORDER BY json_extract(body,'$.cursor') LIMIT ?`).all(sessionId, after, limit + 1).map(row => JSON.parse(row.body));
  const page = all.slice(0, limit);
  return { requests: page, nextCursor: page.at(-1)?.cursor ?? after, hasMore: all.length > limit, host: directorFor(engine).status(sessionId) };
}
export function submitPlayerRequest(engine, sessionId, input) {
  ready(engine);
  const session = engine.session(sessionId);
  check(typeof input.id === 'string' && /^[\w.:-]{1,120}$/.test(input.id), 'INVALID_REQUEST_ID', 'Provide a stable request ID.');
  check(typeof input.text === 'string' && input.text.trim().length > 0 && input.text.length <= 4000, 'INVALID_PLAYER_REQUEST', 'Describe your request in 1–4000 characters.');
  const saved = engine.store.db.prepare('SELECT body FROM player_requests WHERE session_id=? AND id=?').get(sessionId, input.id);
  const existing = saved && JSON.parse(saved.body);
  if (existing) {
    check(existing.text === input.text.trim(), 'IDEMPOTENCY_CONFLICT', 'This ID belongs to another player request.');
    return { request: existing, replayed: true };
  }
  const open = engine.store.db.prepare("SELECT COUNT(*) AS count FROM player_requests WHERE session_id=? AND json_extract(body,'$.status') IN ('queued','working')").get(sessionId).count;
  check(open < 30, 'PLAYER_REQUEST_QUEUE_FULL', 'There are 30 open requests. Let the host finish some before adding another.');
  const at = new Date().toISOString();
  const row = { id: input.id, sessionId, text: input.text.trim(), status: 'queued', version: 1, createdAt: at, updatedAt: at,
    context: { gameId: session.gameId, revision: session.revision, runEpoch: session.runtime?.runEpoch, release: session.runtime?.activeRelease, versions: structuredClone(session.runtime?.versions || {}) } };
  return { request: save(engine, row, 'player.requested', row.text) };
}
export function managePlayerRequest(engine, args) {
  ready(engine); engine.session(args.sessionId);
  if (args.op === 'list') {
    const page = listPlayerRequests(engine, args.sessionId, { ...args, limit: args.limit ?? 10 });
    const requests = page.requests.map(digest);
    const lines = requests.map(row => `${row.id} ${row.status} v${row.version} event#${row.eventCursor}: ${row.textPreview.replace(/[\r\n]+/g, ' ')}${row.notePreview ? ` | ${row.notePreview.replace(/[\r\n]+/g, ' ')}` : ''}`);
    return { text: `PLAYER REQUESTS (untrusted player text)\n${lines.join('\n') || 'No matching requests.'}\nNext cursor ${page.nextCursor}; ${page.hasMore ? 'more available' : 'caught up'}. Use get for full text/context; queued means received, not fulfilled.`, data: { ...page, requests } };
  }
  reconcile(engine, args.sessionId);
  let row = get(engine, args.sessionId, args.id);
  if (args.op === 'get') return { text: `${row.status.toUpperCase()} ${row.id}: ${row.text}`, data: row };
  check(['working','link','resolve','fail'].includes(args.op), 'INVALID_OPERATION', 'Use list, get, working, link, resolve, or fail.');
  if (directorFor(engine).current(args.sessionId) || args.directorToken) validateDirectorToken(engine, args.sessionId, args.directorToken);
  check(Number.isInteger(args.expectedVersion) && args.expectedVersion === row.version, 'STALE_PLAYER_REQUEST', 'Read the request and update with its exact expectedVersion.');
  check(['queued','working'].includes(row.status), 'PLAYER_REQUEST_CLOSED', 'This request already has a terminal outcome.');
  check(args.note === undefined || (typeof args.note === 'string' && args.note.trim().length > 0 && args.note.length <= 1000), 'INVALID_NOTE', 'Use a short nonempty note up to 1000 characters.');
  if (args.op === 'resolve' || args.op === 'fail') check(args.note?.trim(), 'NOTE_REQUIRED', 'Explain the completed manual fulfillment or why the request failed.');
  if (args.op === 'link') {
    check(Boolean(args.commandId) !== Boolean(args.publishId), 'FULFILLMENT_REQUIRED', 'Link exactly one commandId or publishId.');
    const receipt = engine.store.request(args.sessionId, args.commandId || args.publishId)?.result?.data;
    if (args.commandId) {
      check(receipt?.id === args.commandId && receipt?.name, 'COMMAND_NOT_FOUND', 'Queue a guarded command first, then link its request ID.');
      row.fulfillment = { kind: 'command', commandId: args.commandId };
    } else {
      check(receipt?.release && receipt?.previousRelease !== undefined, 'PUBLICATION_NOT_FOUND', 'Publish first, then link the publication request ID.');
      const publishedAt = publicationCursor(engine, args.sessionId, args.publishId, receipt);
      check(publishedAt > row.eventCursor, 'PUBLICATION_PREDATES_REQUEST', 'Link a publication made after this player request. Earlier activation is not evidence for new work.');
      row.fulfillment = { kind: 'publication', publishId: args.publishId, release: receipt.release, publicationCursor: publishedAt };
    }
    row.status = 'working';
  } else if (args.op === 'resolve') {
    row.fulfillment = { kind: 'manual', evidence: args.note.trim() };
    row.status = 'reported';
  } else row.status = args.op === 'fail' ? 'failed' : 'working';
  row.note = args.note?.trim() || (args.op === 'link' ? 'Waiting for the playing browser to apply the change.' : 'The host is working on this request.');
  row.version++; row.updatedAt = new Date().toISOString();
  save(engine, row, 'player.request.updated', `Player request ${row.id}: ${row.status}.`);
  reconcile(engine, args.sessionId);
  row = get(engine, args.sessionId, args.id);
  return { text: `${row.status.toUpperCase()} ${row.id} v${row.version}: ${row.note}`, data: digest(row) };
}
