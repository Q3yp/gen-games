/** Studio bootstrap and accessible human input bindings. */
import { $, $$, state, savedSession, request, notify, connection, world, hero, scene, game, position, terminal, setText, checkCondition, fillSelect, dispatch } from './shared.js';
import { render } from './render.js';
import { renderSelectors, renderCharacter, renderFocus } from './panels.js';
import { renderGrid } from './scenes.js';
import { renderCustom, disposeCustom } from './custom-view.js';
import { refreshStatus } from './journal.js';
import { reconnect, loadSession, createSession } from './transport.js';
import { attack, actOnEntity } from './actions.js';
import { bindPlayerShell, renderPlayerHUD } from './player-shell.js';
import { isCodeGame, reloadCodeGame } from './code-game.js';
function showNewDialog() { $('#new-form .dialog-error')?.remove(); fillSelect($('#new-game'), state.games.map(item => ({ value: item.id, label: item.title || item.id })), $('#game-select').value || state.session?.gameId); $('#new-dialog').showModal(); }
function bindEvents() {
  $('#new-session').addEventListener('click', showNewDialog);
  bindPlayerShell();
  $('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
  $('#new-form').addEventListener('submit', async event => {
    event.preventDefault(); const button = $('#create-session'); button.disabled = true;
    try { await createSession($('#new-game').value, $('#new-seed').value); $('#new-dialog').close(); $('#new-seed').value = ''; notify('A fresh run is ready. Your previous sessions are still saved.', true); }
    catch (error) { let errorElement = $('#new-form .dialog-error'); if (!errorElement) { errorElement = document.createElement('p'); errorElement.className = 'dialog-error'; errorElement.setAttribute('role', 'alert'); $('#create-session').before(errorElement); } errorElement.textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#game-select').addEventListener('change', async event => {
    const id = event.target.value;
    try {
      const latest = await request('/api/sessions');
      state.sessions = latest.sessions || [];
      const existing = state.sessions.filter(session => session.gameId === id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
      if (existing) await loadSession(existing.id); else await createSession(id);
    }
    catch (error) { notify(error.message); renderSelectors(); }
  });
  $('#session-select').addEventListener('change', event => { if (event.target.value) void loadSession(event.target.value).catch(error => notify(error.message)); });
  $('#say-form').addEventListener('submit', async event => {
    event.preventDefault(); const input = $('#say-input'); const text = input.value.trim(); if (!text || state.pending) return;
    const result = await dispatch('narrative.say', { text }); if (result?.ok !== false && input.value.trim() === text) input.value = '';
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#custom-renderer')) return;
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.move) { const [dx, dy] = button.dataset.move.split(',').map(Number); void dispatch('world.move', { dx, dy }); }
    else if (button.dataset.entity) void actOnEntity(button.dataset.entity);
    else if (button.dataset.attack) void attack(button.dataset.attack);
    else if (button.dataset.interact) void dispatch('world.interact', { target: button.dataset.interact });
    else if (button.dataset.use) void dispatch('inventory.use', { item: button.dataset.use });
    else if (button.dataset.equip) void dispatch('inventory.equip', { item: button.dataset.equip });
    else if (Object.hasOwn(button.dataset, 'skill')) { state.skill = button.dataset.skill || null; renderCharacter(); renderFocus(); renderPlayerHUD(); $('#announcer').textContent = state.skill ? `${world().skills[state.skill]?.name || state.skill} selected. Choose a target.` : 'Basic attack selected.'; }
    else if (button.dataset.choice) void dispatch('narrative.choose', { choice: button.dataset.choice });
    else if (Object.hasOwn(button.dataset, 'x')) {
      const pos = position(hero()); if (!pos) return;
      const dx = Number(button.dataset.x) - pos.x; const dy = Number(button.dataset.y) - pos.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) void dispatch('world.move', { dx, dy });
      else if (dx || dy) notify('Choose an adjacent tile, or use the arrow keys to explore.');
    }
  });
  document.addEventListener('keydown', event => {
    if (isCodeGame() || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || $('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable || event.target.closest('#custom-renderer') || (state.custom?.instance?.ownsInteraction && !state.custom.paused)) return;
    const directions = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const direction = directions[event.key] || directions[event.key.toLowerCase()];
    if (direction && Array.isArray(scene().map)) { event.preventDefault(); if (!terminal()) void dispatch('world.move', { dx: direction[0], dy: direction[1] }); }
    else if (/^[1-9]$/.test(event.key)) { const choice = state.choices[Number(event.key) - 1]; if (choice && checkCondition(choice.requires)) { event.preventDefault(); void dispatch('narrative.choose', { choice: choice.id }); } }
  });
  $('#snapshot-details').addEventListener('toggle', () => { if ($('#snapshot-details').open && state.session) setText('#context-json', JSON.stringify(state.session, null, 2)); });
  $('#copy-context').addEventListener('click', async () => {
    if (!state.session) return;
    try { await navigator.clipboard.writeText(JSON.stringify(state.session, null, 2)); notify('Current session snapshot copied.', true); }
    catch { $('#snapshot-details').open = true; setText('#context-json', JSON.stringify(state.session, null, 2)); notify('Clipboard is unavailable. Expand Inspect state to select and copy the snapshot.'); }
  });
  $('#reload-view').addEventListener('click', () => { if (isCodeGame()) { reloadCodeGame(); return; } state.customReload++; state.customKey = ''; state.customDisabled = false; void renderCustom(); });
  $('#standard-view').addEventListener('click', () => { state.customDisabled = true; disposeCustom(); render(); });
  new ResizeObserver(() => { if (Array.isArray(scene().map) && state.session) renderGrid(); }).observe($('#play-surface'));
  window.addEventListener('online', () => { if (state.session && !state.reconnect) reconnect(state.generation); });
  window.addEventListener('beforeunload', () => { state.stream?.close(); });
  setInterval(() => { if (state.connectedAt) { const elapsed = Math.floor((Date.now() - state.connectedAt) / 1000); setText('#metric-uptime', `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`); } }, 1000);
  setInterval(() => { if (!document.hidden) void refreshStatus(); }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshStatus(); });
}
async function init() {
  bindEvents();
  try {
    const [games, sessions] = await Promise.all([request('/api/games'), request('/api/sessions')]);
    state.games = games.games || []; state.sessions = sessions.sessions || []; renderSelectors();
    if (!state.games.length) { connection('No worlds installed'); $('#standard-renderer').innerHTML = '<div class="stage-empty"><h3>No game packs found</h3><p>Add a game pack to the games directory and restart the runtime.</p></div>'; return; }
    const saved = state.sessions.find(session => session.id === savedSession.get());
    const latest = [...state.sessions].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    if (saved || latest) await loadSession((saved || latest).id); else await createSession(state.games[0].id);
  } catch (error) {
    connection('Runtime unavailable'); notify(`Could not open the world. ${error.message} Check that the local server is running, then reload.`, false, true);
    $('#standard-renderer').innerHTML = '<div class="stage-empty"><h3>The world is offline</h3><p>Your saved runs are safe on the server. Reconnect the runtime and reload this page.</p><button class="button" id="retry-start">Try again</button></div>';
    $('#retry-start').addEventListener('click', () => location.reload());
  }
}
void init();
