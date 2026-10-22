import { state, request } from './shared.js';
const latest = new Map();
let queue = Promise.resolve();

/** Best-effort, bounded feedback for the director; never blocks player controls. */
export function reportUI(type, path, error = '', hint = '') {
  if (!state.session) return;
  const sessionId = state.session.id;
  const message = String(error?.message || error).slice(0, 500);
  const body = { type, path: String(path).slice(0, 300), message, hint: hint.slice(0, 300), clientRevision: state.session.revision };
  const key = JSON.stringify([type, body.path, message]);
  if (latest.get(sessionId) === key) return;
  latest.set(sessionId, key);
  if (latest.size > 100) latest.delete(latest.keys().next().value);
  queue = queue.then(() => request(`/api/sessions/${encodeURIComponent(sessionId)}/diagnostics`, { method: 'POST', body: JSON.stringify(body) }))
    .catch(() => { if (latest.get(sessionId) === key) latest.delete(sessionId); });
}
