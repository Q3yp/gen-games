/** Human actions are serialized; uncertain requests are resynced, never replayed blindly. */
import { $, $$, isObject, state, request, notify, world, alive, number, dispatch } from './shared.js';
import { receiveEvents } from './journal.js';
import { render } from './render.js';
import { renderFocus } from './panels.js';
import { reconnect } from './transport.js';
async function sendAction(action, args = {}) {
  if (!state.session) throw new Error('Open a session first.');
  if (state.pending) return { ok: false, busy: true };
  if (typeof action !== 'string' || !/^[\w.-]+$/.test(action) || !isObject(args)) throw new Error('Actions require a name and an argument object.');
  const id = state.session.id;
  const generation = state.generation;
  state.pending = true; document.body.classList.add('is-pending');
  try {
    const result = await request(`/api/sessions/${encodeURIComponent(id)}/actions`, { method: 'POST', body: JSON.stringify({ action, args, requestId: crypto.randomUUID(), actor: 'player' }) });
    if (generation !== state.generation) return result;
    if (result.session && result.session.revision >= state.session.revision) state.session = result.session;
    state.cursor = Math.max(state.cursor, number(result.cursor)); receiveEvents(result.events); render();
    return result;
  } catch (error) {
    if (generation !== state.generation) return { ok: false, error };
    notify(`${error.message}${error.hint ? ` ${error.hint}` : ''}`);
    // Do not blindly replay a potentially accepted action after a network failure.
    if (!error.status || error.status === 409) {
      try { const latest = await request(`/api/sessions/${encodeURIComponent(id)}`); if (generation === state.generation) { state.session = latest.session; state.cursor = latest.cursor || state.cursor; render(); } } catch { reconnect(generation); }
    }
    return { ok: false, error };
  } finally { if (generation === state.generation) { state.pending = false; document.body.classList.remove('is-pending'); } }
}
async function actOnEntity(id) {
  const entity = world().entities?.[id];
  if (!entity) return;
  state.selected = id; renderFocus();
  $$('.entity-token').forEach(element => element.classList.toggle('selected', element.dataset.entity === id));
  if (entity.components?.ai?.hostile && alive(entity)) await attack(id);
  else if ((entity.components?.interact || entity.components?.item) && id !== world().player) await dispatch('world.interact', { target: id });
}
const attack = id => dispatch('combat.attack', { target: id, ...(state.skill ? { skill: state.skill } : {}) });

state.sendAction = sendAction;
export { sendAction, attack, actOnEntity };
