/** Browser client: authoritative HTTP actions + incremental SSE, no executable agent strings. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clone = value => structuredClone(value);
const isObject = value => value !== null && typeof value === 'object';
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const freeze = value => { if (isObject(value) && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
const state = { games: [], sessions: [], session: null, cursor: 0, events: [], eventIds: new Set(), stream: null, reconnect: null, generation: 0, pending: false, selected: null, skill: null, connectedAt: null, status: null, statusAvailable: true, statusBusy: false, boardKey: '', custom: null, customKey: '', customFailureKey: '', customGeneration: 0, customDisabled: false, lastAgentEvent: null, choices: [], customReload: 0, sendAction: null };
let noticeTimer;
let noticeVersion = 0;
const savedSession = { get: () => { try { return localStorage.getItem('gen-games.session'); } catch { return null; } }, set: id => { try { localStorage.setItem('gen-games.session', id); } catch { /* Persistence also lives on the server. */ } } };

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  let body;
  try { body = await response.json(); } catch { throw new Error(`The runtime returned an invalid response (${response.status}).`); }
  if (!response.ok || body.ok === false) {
    const error = new Error(body.error?.message || `Request failed (${response.status}).`);
    error.code = body.error?.code;
    error.hint = body.error?.hint;
    error.status = response.status;
    throw error;
  }
  return body;
}
function notify(message, success = false, persistent = false) {
  const element = $('#notice');
  const version = ++noticeVersion;
  const dismiss = () => {
    if (version !== noticeVersion) return;
    clearTimeout(noticeTimer);
    element.hidden = true;
    element.textContent = '';
    $('#announcer').textContent = '';
  };
  clearTimeout(noticeTimer);
  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle('success', success);
  $('#announcer').textContent = message;
  if (message && persistent) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'notice-dismiss';
    button.textContent = 'Dismiss';
    button.setAttribute('aria-label', 'Dismiss notification');
    button.addEventListener('click', dismiss);
    element.append(button);
  }
  if (message && !persistent) noticeTimer = setTimeout(dismiss, 7500);
  return dismiss;
}
function connection(label, online = false) {
  const element = $('#connection');
  element.className = `connection ${online ? 'online' : 'offline'}`;
  $('span:last-child', element).textContent = label;
}
const world = () => state.session?.state || {};
const hero = () => world().entities?.[world().player];
const scene = () => world().scenes?.[world().scene] || {};
const game = () => state.games.find(item => item.id === state.session?.gameId) || state.games.find(item => item.id === $('#game-select').value);
const position = entity => entity?.components?.position;
const alive = entity => !entity?.components?.stats || entity.components.stats.health > 0;
const visibleEntities = () => Object.values(world().entities || {}).filter(entity => position(entity)?.scene === world().scene || (position(entity) && !position(entity).scene));
const terminal = () => Boolean(world().variables?.outcome || (hero()?.components?.stats && !alive(hero())));
function asset(id) {
  const assetRecord = world().assets?.[id];
  const raw = typeof assetRecord === 'string' ? assetRecord : assetRecord?.src;
  if (!raw) return '';
  try { const url = new URL(raw, location.href); return ['http:', 'https:'].includes(url.protocol) || (url.protocol === 'data:' && /^data:image\/(png|jpeg|gif|webp|avif|svg\+xml)[;,]/i.test(raw)) ? url.href : ''; } catch { return ''; }
}
function glyph(entity, fallback = '◈') { return escapeHTML(entity?.components?.appearance?.glyph || fallback); }
function setText(id, value) { $(id).textContent = value ?? ''; }
function pretty(value) { if (typeof value === 'boolean') return value ? 'yes' : 'no'; if (value == null) return '—'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }
function number(value, fallback = 0) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function statBar(label, value, max, className = '') {
  const percent = Math.min(100, Math.max(0, number(value) / Math.max(1, number(max, number(value))) * 100));
  return `<div class="stat"><div class="stat-label"><span>${escapeHTML(label)}</span><span>${escapeHTML(value ?? 0)} / ${escapeHTML(max ?? value ?? 0)}</span></div><div class="stat-track" role="meter" aria-label="${escapeHTML(label)}" aria-valuenow="${number(value)}" aria-valuemin="0" aria-valuemax="${Math.max(1, number(max, number(value)))}"><div class="stat-fill ${className}" style="width:${percent}%"></div></div></div>`;
}
function checkCondition(rule) {
  if (rule == null) return true;
  if (typeof rule === 'boolean') return rule;
  if (Array.isArray(rule)) return rule.every(checkCondition);
  if (!isObject(rule)) return false;
  if (rule.all) return rule.all.every(checkCondition);
  if (rule.any) return rule.any.some(checkCondition);
  if (rule.not) return !checkCondition(rule.not);
  if (rule.hasItem) return (hero()?.components?.inventory?.items || []).includes(rule.hasItem);
  if (rule.entityAlive) return Boolean(world().entities?.[rule.entityAlive] && alive(world().entities[rule.entityAlive]));
  let value = world();
  if (!Array.isArray(rule.path) || rule.path.some(key => forbidden.has(key))) return false;
  for (const key of rule.path) value = isObject(value) && Object.hasOwn(value, key) ? value[key] : undefined;
  if (Object.hasOwn(rule, 'equals')) return value === rule.equals;
  if (Object.hasOwn(rule, 'notEquals')) return value !== rule.notEquals;
  if (Object.hasOwn(rule, 'gte')) return typeof value === 'number' && value >= rule.gte;
  if (Object.hasOwn(rule, 'lte')) return typeof value === 'number' && value <= rule.lte;
  if (Object.hasOwn(rule, 'gt')) return typeof value === 'number' && value > rule.gt;
  if (Object.hasOwn(rule, 'lt')) return typeof value === 'number' && value < rule.lt;
  if (Object.hasOwn(rule, 'includes')) return (Array.isArray(value) || typeof value === 'string') && value.includes(rule.includes);
  if (Object.hasOwn(rule, 'exists')) return (value !== undefined) === rule.exists;
  return Boolean(value);
}
function fillSelect(select, options, chosen) {
  const key = JSON.stringify(options);
  if (select.dataset.options !== key) {
    select.replaceChildren(...options.map(({ value, label }) => { const option = document.createElement('option'); option.value = value; option.textContent = label; return option; }));
    select.dataset.options = key;
  }
  if (chosen && options.some(option => option.value === chosen)) select.value = chosen;
}

function dispatch(action, args = {}) { return state.sendAction ? state.sendAction(action, args) : Promise.resolve({ ok: false, busy: true }); }

export { $, $$, escapeHTML, clone, isObject, forbidden, freeze, state, savedSession, request, notify, connection, world, hero, scene, game, position, alive, visibleEntities, terminal, asset, glyph, setText, pretty, number, statBar, checkCondition, fillSelect, dispatch };
