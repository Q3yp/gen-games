/** Player mode keeps tools within reach without framing the game as a dashboard. */
import { $, state, hero, world, escapeHTML } from './shared.js';
const parked = [];
function parkTools() {
  for (const [selector, slot] of [['.topbar', '#menu-session'], ['.player-rail', '#menu-player'], ['.focus-panel', '#menu-focus'], ['.event-panel', '#menu-journal']]) {
    const element = $(selector);
    const marker = document.createComment(`Player menu: ${selector}`);
    element.before(marker);
    parked.push({ element, marker, slot });
  }
  moveTools(false);
}
function moveTools(studio) {
  for (const { element, marker, slot } of parked) {
    if (studio) marker.after(element); else $(slot).append(element);
  }
}
function setStudio(studio) {
  $('#player-menu').close();
  document.body.classList.toggle('studio-open', studio);
  $('.workspace').classList.toggle('inspector-hidden', !studio);
  $('#studio-toggle').setAttribute('aria-expanded', String(studio));
  $('#studio-toggle').textContent = studio ? 'Back to game' : 'Studio';
  moveTools(studio);
  if (!studio) $('#play-surface').focus({ preventScroll: true });
}
function bindPlayerShell() {
  parkTools();
  $('#menu-toggle').addEventListener('click', () => $('#player-menu').showModal());
  $('#player-menu').addEventListener('close', () => $('#menu-toggle').focus({ preventScroll: true }));
  $('#studio-toggle').addEventListener('click', () => setStudio(!document.body.classList.contains('studio-open')));
  $('#menu-help').addEventListener('click', () => { $('#player-menu').close(); $('#help-dialog').showModal(); });
  $('#menu-reload').addEventListener('click', () => { $('#reload-view').click(); $('#player-menu').close(); });
  $('#fullscreen-toggle').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('#announcer').textContent = 'Fullscreen is unavailable in this browser. The game still fills this window.'; }
  });
  document.addEventListener('fullscreenchange', () => {
    $('#fullscreen-toggle').setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
    $('#fullscreen-toggle').textContent = document.fullscreenElement ? 'Window' : 'Fullscreen';
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || $('dialog[open]') || event.defaultPrevented) return;
    if (document.body.classList.contains('studio-open')) setStudio(false);
    else $('#player-menu').showModal();
  });
  // Modal input never reaches arbitrary authored document key handlers.
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('keydown', event => event.stopPropagation());
  });
  $('#player-menu').addEventListener('click', event => {
    if (event.target.closest('[data-skill]')) $('#player-menu').close();
  });
}
function renderPlayerHUD() {
  const entity = hero();
  const stats = entity?.components?.stats || {};
  const hud = $('#player-hud');
  hud.hidden = !entity;
  hud.innerHTML = `<strong>${escapeHTML(entity?.name || '')}</strong>${stats.health !== undefined ? `<span class="hud-health">HP ${escapeHTML(stats.health)} / ${escapeHTML(stats.maxHealth ?? stats.health)}</span>` : ''}${stats.mana !== undefined ? `<span>Energy ${escapeHTML(stats.mana)}</span>` : ''}${state.skill ? `<span>${escapeHTML(world().skills?.[state.skill]?.name || state.skill)}</span>` : ''}`;
}
export { bindPlayerShell, renderPlayerHUD };
