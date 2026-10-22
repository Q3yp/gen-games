/** Snapshot boot, persistent session selection and reconnect-safe SSE transport. */
import { $, state, savedSession, request, connection, world, number } from './shared.js';
import { render, scheduleRender } from './render.js';
import { renderContext } from './panels.js';
import { disposeCustom } from './custom-view.js';
import { receiveEvents, renderJournal, refreshStatus } from './journal.js';
import { applyPatches } from './patches.js';
function openStream(generation) {
  if (!state.session || generation !== state.generation) return;
  state.stream?.close();
  const id = state.session.id;
  const stream = new EventSource(`/api/sessions/${encodeURIComponent(id)}/events?after=${state.cursor}`);
  state.stream = stream;
  stream.addEventListener('ready', event => {
    if (generation !== state.generation) return;
    try { const payload = JSON.parse(event.data); state.cursor = Math.max(state.cursor, number(payload.cursor)); } catch { /* Change messages carry the authoritative cursor. */ }
    connection('World connected', true); state.connectedAt ||= Date.now(); renderContext();
  });
  stream.addEventListener('change', event => {
    if (generation !== state.generation) return;
    try {
      const payload = JSON.parse(event.data);
      if (payload.sessionId && payload.sessionId !== id) return;
      if (payload.session && payload.session.id === id && payload.session.revision >= state.session.revision) state.session = payload.session;
      else if (payload.patches?.length && (payload.revision === undefined || payload.revision > state.session.revision)) state.session = applyPatches(state.session, payload.patches);
      state.cursor = Math.max(state.cursor, number(payload.cursor));
      receiveEvents(payload.events || (payload.event ? [payload.event] : []));
      scheduleRender();
    } catch (error) { console.warn('Recovering from invalid state stream.', error); reconnect(generation); }
  });
  stream.addEventListener('resync', () => reconnect(generation));
  stream.onerror = () => reconnect(generation);
}
function reconnect(generation) {
  if (generation !== state.generation || state.reconnect) return;
  state.stream?.close(); connection('Reconnecting');
  state.reconnect = setTimeout(async () => {
    state.reconnect = null;
    if (generation !== state.generation || !state.session) return;
    try {
      const { session, cursor } = await request(`/api/sessions/${encodeURIComponent(state.session.id)}`);
      if (generation !== state.generation) return;
      state.session = session; state.cursor = cursor || 0; render(); openStream(generation);
    } catch { reconnect(generation); }
  }, 1500);
}
async function loadSession(id) {
  const generation = ++state.generation;
  state.stream?.close(); clearTimeout(state.reconnect); state.reconnect = null;
  state.pending = false; document.body.classList.remove('is-pending'); connection('Opening world');
  disposeCustom(); state.customDisabled = false; state.boardKey = ''; state.selected = null; state.skill = null;
  state.events = []; state.eventIds = new Set(); state.status = null; state.lastAgentEvent = null;
  const { session, cursor } = await request(`/api/sessions/${encodeURIComponent(id)}`);
  if (generation !== state.generation) return;
  state.session = session; state.cursor = cursor || 0; savedSession.set(id);
  if (!state.sessions.some(item => item.id === id)) state.sessions.unshift(session);
  render(); renderJournal(); openStream(generation); void refreshStatus();
}
async function createSession(gameId, seed) {
  const payload = { gameId }; if (seed !== undefined && seed !== '') payload.seed = Number(seed);
  const result = await request('/api/sessions', { method: 'POST', body: JSON.stringify(payload) });
  state.sessions.unshift(result.session);
  await loadSession(result.session.id);
}

export { openStream, reconnect, loadSession, createSession };
