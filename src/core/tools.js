import { authorEdits } from './authoring.js';
import { atPath, isRecord } from './validate.js';
import { requireValue as check, errorInfo } from './errors.js';
import { manageJob } from './jobs.js';
import { observe, summary, compact } from './context.js';

export class ToolService {
  constructor(engine) { this.engine = engine; }
  async call(tool, args = {}) {
    try { check(typeof tool === 'string' && isRecord(args), 'INVALID_REQUEST', 'Provide a tool name and an arguments object.'); const result = await this.execute(tool, args); return { ok: true, ...result }; }
    catch (error) { const info = errorInfo(error); return { ok: false, text: `${info.code}: ${info.message}${info.hint ? `\nFix: ${info.hint}` : ''}`, error: info }; }
  }
  async execute(tool, args) {
    const engine = this.engine, store = engine.store;
    if (tool === 'discover') {
      const lines = ['gen-games · local game tools', 'session → observe → inspect → act/author → observe. Acknowledge only after processing.', 'Tools: session, discover, observe, inspect, publish, command, act, author, jobs, checkpoint.'];
      if (!args.sessionId) for (const { pack } of engine.games.values()) lines.push(`${pack.id}: ${pack.title} — ${pack.description}`);
      else {
        const session = engine.session(args.sessionId); lines.push(summary(session));
        if (session.runtime) lines.push('Code game: edit source files in games/' + session.gameId + ', then publish with expectedRelease + requestId. Browser owns live simulation; inspect summary/runtime/commands for concise telemetry. command queues a game-defined command and reports pending until acknowledged.');
        for (const [name, action] of engine.game(session.gameId).actions) lines.push(`${name}: ${action.description}\n  ${JSON.stringify(action.input || {})}`);
      }
      return { text: compact(lines.join('\n'), 10000), data: { tools: ['session', 'discover', 'observe', 'inspect', 'publish', 'command', 'act', 'author', 'jobs', 'checkpoint'] } };
    }
    if (tool === 'session') {
      if (args.op === 'create') { const result = engine.create(args.gameId, args.seed); return { text: `CREATED ${summary(result.session)}\nCursor ${result.cursor}.`, data: { sessionId: result.session.id, revision: 0, cursor: result.cursor } }; }
      if (args.op === 'open') { const session = engine.session(args.sessionId); return { text: summary(session), data: { sessionId: session.id, revision: session.revision, cursor: store.head(session.id) } }; }
      check(args.op === 'list' || !args.op, 'INVALID_SESSION_OPERATION', 'Use list, create, or open.');
      const sessions = store.sessions(); return { text: sessions.length ? compact(sessions.map(summary).join('\n\n')) : 'No saved sessions. Use session {op:"create",gameId:"ember-vault"}.', data: { count: sessions.length } };
    }
    if (tool === 'observe') return observe(engine, args);
    if (tool === 'publish') return engine.codeRuntime.publish(args);
    if (tool === 'command') return engine.codeRuntime.command(args);
    const session = engine.session(args.sessionId);
    if (tool === 'inspect') {
      let value;
      const scope = args.scope || 'session';
      if (session.runtime && ['session', 'runtime', 'summary', 'commands'].includes(scope)) value = scope === 'summary' ? session.runtime.summary : scope === 'commands' ? session.runtime.commands : { id: session.id, gameId: session.gameId, revision: session.revision, ...session.runtime };
      else if (scope === 'session') value = { id: session.id, gameId: session.gameId, revision: session.revision, sceneEpoch: session.sceneEpoch, scene: session.state.scene, player: session.state.player, variables: session.state.variables, entityIds: Object.keys(session.state.entities), assets: Object.keys(session.state.assets), skills: Object.keys(session.state.skills) };
      else if (scope === 'event') { check(Number.isInteger(Number(args.id)), 'INVALID_EVENT', 'Event id must be a cursor number.'); const event = store.events(session.id, Number(args.id) - 1, 1)[0]; check(event?.seq === Number(args.id), 'NOT_FOUND', 'Event not found.'); value = event.type === 'state.changed' ? { ...event, data: { fields: event.data.patches.length } } : event; }
      else if (scope === 'path') value = atPath(session.state, args.path);
      else { if (!args.id && scope === 'scene') args = { ...args, id: session.state.scene }; if (!args.id && scope === 'entity') args = { ...args, id: session.state.player }; const plural = { entity: 'entities', scene: 'scenes', asset: 'assets', skill: 'skills' }[scope] || scope; check(['entities', 'scenes', 'assets', 'skills', 'dialogue', 'variables'].includes(plural), 'INVALID_SCOPE', 'Use session, entity, scene, asset, skill, event, dialogue, variables, or path.'); value = session.state[plural]; if (args.id) { check(Object.hasOwn(value || {}, args.id), 'NOT_FOUND', `${scope} ${args.id} does not exist.`); value = value[args.id]; } }
      return { text: `INSPECT r${session.revision} ${scope}${args.id ? ` ${args.id}` : ''}\n${compact(value ?? null, 6000)}`, data: { revision: session.revision, cursor: store.head(session.id) } };
    }
    if (session.runtime && ['act','author'].includes(tool)) check(false, 'BROWSER_OWNS_STATE', 'Code-game simulation is browser owned. Edit source and publish, or queue a game command.');
    if (tool === 'act') return this.mutation(engine.act(args));
    if (tool === 'author') return this.mutation(engine.transact(args, ctx => { authorEdits(ctx, args.operations); return { operations: args.operations.length }; }));
    if (tool === 'jobs') {
      const result = manageJob(engine, args);
      if (result.session) return this.mutation(result);
      const text = result.jobs ? result.jobs.map(job => `${job.id} ${job.status} [${job.mode || 'context'}] ${job.label}`).join('\n') || 'No jobs.' : `JOB ${result.id} ${result.status}${result.mode ? ` [${result.mode}] r${result.revision}` : ''}${result.label ? ` · ${result.label}` : ''}${result.token ? `\nGeneration token: ${result.token}` : ''}`;
      return { text: compact(text), data: result };
    }
    if (tool === 'checkpoint') {
      if (args.op === 'list') return { text: compact(store.checkpoints(session.id)), data: { revision: session.revision } };
      check(typeof args.name === 'string' && /^[\w .-]{1,80}$/.test(args.name), 'INVALID_NAME', 'Checkpoint name must be 1–80 simple characters.');
      if (args.op === 'save') { if (args.expectedRevision !== undefined) engine.revision(session, args.expectedRevision); const checkpoint = structuredClone(session); if (checkpoint.runtime) { Object.assign(checkpoint.runtime, { release: checkpoint.runtime.saveRelease, activeRelease: checkpoint.runtime.saveRelease, entry: checkpoint.runtime.saveEntry, activeEntry: checkpoint.runtime.saveEntry, saveVersion: checkpoint.runtime.activeSaveVersion, commands: [] }); } store.saveCheckpoint(checkpoint, args.name); return { text: `SAVED ${args.name} at r${session.revision}. Includes RNG and world; live jobs are not resumed.`, data: { revision: session.revision } }; }
      check(args.op === 'restore', 'INVALID_CHECKPOINT_OPERATION', 'Use save, list, or restore.');
      return this.mutation(engine.transact(args, ctx => {
        const saved = store.checkpoint(session.id, args.name); check(saved, 'NOT_FOUND', `Checkpoint ${args.name} not found.`);
        check(saved.contentVersion === session.contentVersion, 'CONTENT_VERSION_MISMATCH', 'Checkpoint uses a different game content version.');
        ctx.session.state = structuredClone(saved.state); ctx.session.seed = saved.seed; ctx.session.sceneEpoch++;
        if (ctx.session.runtime) { const epoch = ctx.session.runtime.runEpoch + 1; ctx.session.runtime = structuredClone(saved.runtime); ctx.session.runtime.runEpoch = epoch; ctx.session.runtime.commands = []; }
        for (const job of store.jobs(session.id)) if (job.status === 'running') { job.status = 'canceled'; store.saveJob(job); }
        ctx.emit('checkpoint.restored', `${args.name} restored; event cursor remains monotonic.`);
      }));
    }
    check(false, 'TOOL_NOT_FOUND', `Unknown tool ${tool}.`, 'Use discover.');
  }
  mutation(result) {
    const events = result.events.filter(event => event.type !== 'state.changed' && event.text).map(event => event.text);
    return { text: compact(`OK r${result.session.revision}${result.replayed ? ' [replayed, not executed again]' : ''} · ${events.join(' | ') || 'Applied.'}\nCursor ${result.cursor}.`, 4000), data: { sessionId: result.session.id, revision: result.session.revision, cursor: result.cursor, replayed: !!result.replayed, result: result.result } };
  }
}
