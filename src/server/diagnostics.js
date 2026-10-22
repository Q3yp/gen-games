import { requireValue as check } from '../core/errors.js';

/** Browser diagnostics are advisory events, never authoritative world edits. */
export function reportDiagnostic(engine, sessionId, input) {
  check(['ui.failed', 'ui.recovered'].includes(input.type), 'INVALID_DIAGNOSTIC', 'Use ui.failed or ui.recovered.');
  check(typeof input.path === 'string' && input.path.length <= 300, 'INVALID_DIAGNOSTIC', 'Provide a UI module path of at most 300 characters.');
  const data = {
    source: 'browser', untrusted: true, path: input.path,
    message: String(input.message || '').replace(/[\r\n]+/g, ' ').slice(0, 500),
    hint: String(input.hint || '').replace(/[\r\n]+/g, ' ').slice(0, 300),
    clientRevision: Number.isInteger(input.clientRevision) ? input.clientRevision : null
  };
  let event;
  engine.store.transaction(() => {
    const session = engine.session(sessionId), previous = engine.store.lastDiagnostic(sessionId);
    if (previous?.type === input.type && previous.data.path === data.path && previous.data.message === data.message) return;
    const text = input.type === 'ui.failed'
      ? `View ${data.path} failed: ${data.message}. Fix: ${data.hint}`
      : `View ${data.path} recovered; custom controls are active.`;
    event = engine.store.append(session, { type: input.type, text, data });
  });
  if (event) engine.emit('commit', { sessionId, revision: event.revision, patches: [], events: [event], cursor: event.seq });
  return { ok: true, deduplicated: !event, cursor: event?.seq ?? engine.store.head(sessionId) };
}
