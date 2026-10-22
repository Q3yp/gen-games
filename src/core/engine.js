import { EventEmitter } from 'node:events';
import { randomUUID, createHash } from 'node:crypto';
import { requireValue as check } from './errors.js';
import { validateEnvelope, validateState, validateSchema } from './validate.js';
import { diff } from './patches.js';

const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export class Engine extends EventEmitter {
  constructor(store, games) {
    super(); this.store = store; this.games = games; this.tickErrors = new Map();
    for (const session of store.sessions()) for (const job of store.jobs(session.id)) if (job.status === 'running') {
      store.transaction(() => { job.status = 'interrupted'; store.saveJob(job); store.append(session, { type: 'job.interrupted', text: `${job.label}: server restarted; start a new job.`, data: { jobId: job.id } }); });
    }
  }
  game(id) { const game = this.games.get(id); check(game, 'GAME_NOT_FOUND', `Unknown game ${id}.`, 'Use discover to list available packs.'); return game; }
  session(id) { const session = this.store.session(id); check(session, 'SESSION_NOT_FOUND', `Unknown session ${id}.`, 'GET /api/sessions lists saved sessions.'); return session; }
  revision(session, expected) {
    check(Number.isInteger(expected), 'REVISION_REQUIRED', 'expectedRevision is required.', 'Read observe or inspect, then pass the returned revision.');
    check(session.revision === expected, 'STALE_REVISION', `Expected revision ${expected}; current revision is ${session.revision}. No changes.`, 'Observe new events, inspect affected objects, then retry with a new requestId.', { expected, current: session.revision });
  }
  create(gameId, seed = Date.now() >>> 0) {
    const { pack } = this.game(gameId); check(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff, 'INVALID_SEED', 'seed must be an unsigned 32-bit integer.');
    const now = new Date().toISOString();
    const session = { id: randomUUID(), gameId, contentVersion: pack.version, revision: 0, sceneEpoch: 0, seed: seed || 1, state: structuredClone(pack.initial), status: 'playing', createdAt: now, updatedAt: now };
    let event;
    this.store.transaction(() => { this.store.save(session); event = this.store.append(session, { type: 'session.created', text: `${pack.title} started.`, data: { gameId } }); });
    return { session, cursor: event.seq };
  }
  context(session, pending, actor = 'system') {
    return { state: session.state, session, actor, require: check,
      emit: (type, text, data = {}) => {
        check(typeof type === 'string' && type.length <= 100 && typeof text === 'string', 'INVALID_EVENT', 'Events need type and text strings.');
        check(type !== 'state.changed', 'RESERVED_EVENT', 'state.changed is reserved for runtime synchronization.');
        check(pending.length < 200, 'EVENT_LIMIT', 'One transaction can emit at most 200 events.');
        pending.push({ type, text: text.slice(0, 1000), data });
      },
      random: () => { let x = session.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; session.seed = x >>> 0; return session.seed / 4294967296; }
    };
  }
  transact(input, operation, { requireRevision = true, bump = true, actor = 'agent' } = {}) {
    validateEnvelope(input);
    const fingerprint = createHash('sha256').update(canonical(input)).digest('hex');
    let committed;
    const result = this.store.transaction(() => {
      const old = this.store.request(input.sessionId, input.requestId);
      if (old) { check(old.fingerprint === fingerprint, 'IDEMPOTENCY_CONFLICT', 'This requestId was already used for different arguments.', 'Use a new requestId for a new operation.'); return { ...old.result, replayed: true }; }
      const before = this.session(input.sessionId);
      this.game(before.gameId);
      if (requireRevision || input.expectedRevision !== undefined) this.revision(before, input.expectedRevision);
      const session = structuredClone(before), pending = [], context = this.context(session, pending, actor);
      const value = operation(context);
      check(!value || typeof value.then !== 'function', 'ASYNC_HANDLER', 'Plugin handlers must be synchronous. Use jobs for asynchronous work.');
      validateState(session.state);
      if (bump) session.revision++;
      if (actor === 'player' || session.state.scene !== before.state.scene) session.sceneEpoch++;
      session.updatedAt = new Date().toISOString();
      const patches = diff(before, session);
      if (patches.length) pending.push({ type: 'state.changed', text: `${patches.length} fields changed.`, data: { patches } });
      this.store.save(session);
      const events = pending.map(event => this.store.append(session, event));
      const result = { ok: true, session, events, result: value ?? null, cursor: events.at(-1)?.seq ?? this.store.head(session.id) };
      this.store.remember(session.id, input.requestId, fingerprint, result);
      committed = { sessionId: session.id, revision: session.revision, patches, events, cursor: result.cursor };
      return result;
    });
    if (committed) this.emit('commit', committed);
    return result;
  }
  act(input, actor = 'agent') {
    return this.transact(input, context => {
      const action = this.game(context.session.gameId).actions.get(input.action);
      check(action, 'ACTION_NOT_FOUND', `Unknown action ${input.action}.`, 'Use discover to list actions and their arguments.');
      const args = input.args ?? {}; check(args && typeof args === 'object' && !Array.isArray(args), 'INVALID_ARGUMENT', 'Action args must be an object.');
      validateSchema(args, action.input); return action.run(context, args);
    }, { requireRevision: actor !== 'player', actor });
  }
  tick(deltaMs) {
    if (![...this.games.values()].some(game => game.plugins.some(plugin => typeof plugin.tick === 'function'))) return;
    for (const original of this.store.sessions()) {
      const game = this.games.get(original.gameId); if (!game) continue;
      const hooks = game.plugins.filter(plugin => typeof plugin.tick === 'function'); if (!hooks.length) continue;
      try {
        const session = structuredClone(original), pending = [], context = this.context(session, pending);
        for (const plugin of hooks) plugin.tick(context, deltaMs);
        if (!pending.length && !diff(original, session).length) continue;
        this.transact({ sessionId: session.id, requestId: randomUUID(), expectedRevision: original.revision }, ctx => {
          Object.assign(ctx.session, session); for (const event of pending) ctx.emit(event.type, event.text, event.data);
        }, { actor: 'system' });
      } catch (error) {
        if (this.tickErrors.get(original.id) !== error.message) { this.tickErrors.set(original.id, error.message); console.error(`Tick rejected for ${original.id}: ${error.message}`); }
      }
    }
  }
}
