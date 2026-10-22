import { $, $$, escapeHTML, state, request, world, setText } from './shared.js';
import { renderStatus } from './panels.js';
import { receiveCodeEvents } from './code-game.js';
function receiveEvents(events = []) {
  receiveCodeEvents(events);
  for (const event of events) {
    if (event.seq !== undefined && state.eventIds.has(event.seq)) continue;
    if (event.seq !== undefined) state.eventIds.add(event.seq);
    if (event.type?.startsWith('job.')) { state.lastAgentEvent = event.text || event.type; void refreshStatus(); }
    if (['cue', 'heal', 'attack', 'combat.attack', 'damage'].includes(event.type)) showEffect(event);
    if (event.type === 'state.changed' || !event.text) continue;
    state.events.push(event);
  }
  state.events = state.events.slice(-100);
  if (state.eventIds.size > 2000) state.eventIds = new Set([...state.eventIds].slice(-1000));
  renderJournal();
}
function renderJournal() {
  const list = $('#event-list');
  const nearTop = list.scrollTop < 20;
  const events = state.events.slice(-40).reverse();
  if (!events.length) { list.innerHTML = '<li class="empty-note">Your first move starts the journal.</li>'; setText('#event-count', 'LIVE EVENTS'); return; }
  list.innerHTML = events.map(event => {
    const at = new Date(event.at || Date.now());
    const kind = /combat|attack|damage|defeat/.test(event.type) ? 'combat' : /agent|job\./.test(event.type) ? 'agent' : 'world';
    return `<li data-kind="${kind}"><time datetime="${escapeHTML(at.toISOString())}">${escapeHTML(at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }))}</time><span class="event-dot" aria-hidden="true"></span><span class="event-text">${escapeHTML(event.text)}</span></li>`;
  }).join('');
  if (nearTop) list.scrollTop = 0;
  setText('#event-count', `${state.events.length} RECENT EVENTS`);
}
function showEffect(event) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ring = document.createElement('span');
  ring.className = `effect-ring ${event.type === 'heal' || /heal|restore/.test(event.data?.visual || '') ? 'heal' : ''}`;
  const target = event.data?.target;
  const token = target && $$('.entity-token').find(element => element.dataset.entity === target);
  if (token && !$('#standard-renderer').hidden) {
    const rect = token.getBoundingClientRect(); const stage = $('#play-surface').getBoundingClientRect();
    ring.style.left = `${rect.left - stage.left + rect.width / 2}px`; ring.style.top = `${rect.top - stage.top + rect.height / 2}px`;
  }
  $('#effect-layer').append(ring); setTimeout(() => ring.remove(), 800);
}
async function refreshStatus() {
  if (!state.session || !state.statusAvailable || state.statusBusy) return;
  state.statusBusy = true;
  const id = state.session.id;
  try { const status = await request(`/api/sessions/${encodeURIComponent(id)}/status`); if (state.session?.id === id) { state.status = status; renderStatus(); } }
  catch (error) { if (error.status === 404) state.statusAvailable = false; }
  finally { state.statusBusy = false; }
}

export { receiveEvents, renderJournal, refreshStatus };
