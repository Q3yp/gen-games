/** Browser client: authoritative HTTP actions + incremental SSE, no executable agent strings. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clone = value => structuredClone(value);
const isObject = value => value !== null && typeof value === 'object';
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const freeze = value => { if (isObject(value) && !Object.isFrozen(value)) { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };
const state = { games: [], sessions: [], session: null, cursor: 0, events: [], eventIds: new Set(), stream: null, reconnect: null, generation: 0, pending: false, selected: null, skill: null, connectedAt: null, status: null, statusAvailable: true, statusBusy: false, boardKey: '', custom: null, customKey: '', customGeneration: 0, customDisabled: false, lastAgentEvent: null };
let noticeTimer;
let currentChoices = [];
let renderFrame;
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
  clearTimeout(noticeTimer);
  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle('success', success);
  $('#announcer').textContent = message;
  if (message && !persistent) noticeTimer = setTimeout(() => { element.hidden = true; }, 7500);
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
  try { const url = new URL(raw, location.href); return ['http:', 'https:'].includes(url.protocol) || (url.protocol === 'data:' && /^data:image\/(png|jpeg|gif|webp|avif);/i.test(raw)) ? url.href : ''; } catch { return ''; }
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
  if (Object.hasOwn(rule, 'gte')) return value >= rule.gte;
  if (Object.hasOwn(rule, 'lte')) return value <= rule.lte;
  if (Object.hasOwn(rule, 'gt')) return value > rule.gt;
  if (Object.hasOwn(rule, 'lt')) return value < rule.lt;
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
function renderSelectors() {
  const activeGame = state.session?.gameId || $('#game-select').value || state.games[0]?.id;
  const gameOptions = state.games.map(item => ({ value: item.id, label: item.title || item.id }));
  fillSelect($('#game-select'), gameOptions, activeGame);
  fillSelect($('#new-game'), gameOptions, $('#new-game').value || activeGame);
  const sessions = state.sessions.filter(item => item.gameId === activeGame).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  fillSelect($('#session-select'), sessions.length ? sessions.map(item => ({ value: item.id, label: `${item.id.slice(0, 8)} · ${new Date(item.createdAt || item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` })) : [{ value: '', label: 'No saved runs' }], state.session?.id);
  $('#session-select').disabled = !sessions.length;
  $('#new-session').disabled = !state.games.length;
}
function renderCharacter() {
  const entity = hero();
  if (!entity) { $('#player-card').innerHTML = '<p class="empty-note">This world has no player character.</p>'; return; }
  const stats = entity.components?.stats || {};
  const equipped = Object.values(entity.components?.equipment || {}).map(id => world().entities?.[id]?.name || id).filter(Boolean);
  setText('#player-role', entity.kind || 'PLAYER');
  $('#player-card').innerHTML = `<div class="character-identity"><div class="character-portrait" aria-hidden="true">${glyph(entity, '♟')}</div><div><strong>${escapeHTML(entity.name)}</strong><small>${escapeHTML(equipped[0] || 'Ready for the unknown')}</small></div></div>${stats.health !== undefined ? statBar('Health', stats.health, stats.maxHealth) : ''}${stats.mana !== undefined ? statBar('Energy', stats.mana, stats.maxMana, 'mana') : ''}<div class="minor-stats">${stats.attack !== undefined ? `<span><b>${escapeHTML(stats.attack)}</b> ATK</span>` : ''}${stats.defense !== undefined ? `<span><b>${escapeHTML(stats.defense)}</b> DEF</span>` : ''}${stats.experience !== undefined ? `<span><b>${escapeHTML(stats.experience)}</b> XP</span>` : ''}</div>`;
  const items = entity.components?.inventory?.items || [];
  setText('#inventory-count', items.length);
  $('#inventory').innerHTML = items.length ? items.map(item => {
    const entry = typeof item === 'string' ? world().entities?.[item] : item;
    if (!entry) return '';
    const properties = entry.components?.item || {};
    const equipped = Object.values(entity.components?.equipment || {}).includes(entry.id);
    const usable = properties.heal || properties.mana || properties.consumable || properties.effects?.length;
    const equipable = properties.slot || properties.attack || properties.defense;
    const subtitle = [properties.heal ? `+${properties.heal} health` : '', properties.mana ? `+${properties.mana} energy` : '', properties.attack ? `+${properties.attack} attack` : '', properties.defense ? `+${properties.defense} defense` : '', equipped ? 'Equipped' : ''].filter(Boolean).join(' · ') || entry.kind || 'Item';
    return `<div class="item-row"><span class="item-glyph" aria-hidden="true">${glyph(entry, '◇')}</span><span class="item-copy"><strong>${escapeHTML(entry.name)}</strong><small>${escapeHTML(subtitle)}</small></span>${usable ? `<button data-use="${escapeHTML(entry.id)}" aria-label="Use ${escapeHTML(entry.name)}">Use</button>` : equipable && !equipped ? `<button data-equip="${escapeHTML(entry.id)}" aria-label="Equip ${escapeHTML(entry.name)}">Equip</button>` : ''}</div>`;
  }).join('') : '<p class="empty-note">Travel light. Discover items as you explore.</p>';
  const skills = Object.entries(world().skills || {}).map(([id, skill]) => ({ id, ...skill }));
  if (state.skill && !skills.some(skill => skill.id === state.skill)) state.skill = null;
  $('#skills').innerHTML = skills.length ? `<button class="skill-button" data-skill="" aria-pressed="${!state.skill}"><span class="skill-icon" aria-hidden="true">↗</span><span><strong>Basic attack</strong><small>Close-range strike</small></span><span class="skill-cost">0</span></button>${skills.map(skill => `<button class="skill-button" data-skill="${escapeHTML(skill.id)}" aria-pressed="${state.skill === skill.id}"><span class="skill-icon" aria-hidden="true">✧</span><span><strong>${escapeHTML(skill.name || skill.id)}</strong><small>${escapeHTML(skill.description || `${skill.power || 0} power · ${skill.range || 1} range`)}</small></span><span class="skill-cost" title="Energy cost">${escapeHTML(skill.cost || 0)}</span></button>`).join('')}` : '<p class="empty-note">In this world, your words and choices are your abilities.</p>';
}
function renderGrid() {
  const current = scene();
  const map = current.map;
  const rows = map.length;
  const cols = Math.max(...map.map(row => row.length));
  const boardKey = `${state.session.id}:${world().scene}:${JSON.stringify(map)}`;
  const root = $('#standard-renderer');
  if (state.boardKey !== boardKey || !$('.grid-board', root)) {
    state.boardKey = boardKey;
    root.replaceChildren();
    const board = document.createElement('div');
    board.className = 'grid-board';
    board.style.setProperty('--cols', cols);
    board.style.setProperty('--rows', rows);
    board.setAttribute('aria-label', `${current.name || 'World'} map, ${cols} columns and ${rows} rows`);
    const tiles = document.createElement('div');
    tiles.className = 'grid-tiles';
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const tile = document.createElement('button');
      const character = map[y]?.[x] || '#';
      const exit = current.exits?.some(item => item.x === x && item.y === y);
      const solid = character === '#' || current.tiles?.[character]?.solid;
      tile.className = `tile ${solid ? 'wall' : character === '~' ? 'water' : exit ? 'exit' : 'floor'}`;
      tile.dataset.x = x; tile.dataset.y = y;
      tile.tabIndex = -1;
      tile.setAttribute('aria-label', `${solid ? 'Wall' : exit ? 'Exit' : 'Move to tile'} ${x}, ${y}`);
      if (solid) tile.disabled = true;
      tiles.append(tile);
    }
    const entities = document.createElement('div');
    entities.className = 'grid-entities';
    board.append(tiles, entities);
    root.append(board);
  }
  const board = $('.grid-board', root);
  board.style.setProperty('--stage-height', `${$('#play-surface').clientHeight}px`);
  const entityLayer = $('.grid-entities', board);
  const entities = visibleEntities().filter(alive);
  const ids = new Set(entities.map(entity => entity.id));
  for (const element of $$('.entity-token', entityLayer)) if (!ids.has(element.dataset.entity)) element.remove();
  for (const entity of entities) {
    const components = entity.components || {};
    let element = $$('.entity-token', entityLayer).find(item => item.dataset.entity === entity.id);
    if (!element) { element = document.createElement('button'); element.className = 'entity-token'; element.dataset.entity = entity.id; element.innerHTML = '<span class="entity-sprite"></span><span class="entity-health"><i></i></span>'; entityLayer.append(element); }
    const pos = position(entity);
    element.style.left = `${pos.x / cols * 100}%`;
    element.style.top = `${pos.y / rows * 100}%`;
    element.classList.toggle('player', entity.id === world().player);
    element.classList.toggle('hostile', Boolean(components.ai?.hostile));
    element.classList.toggle('selected', state.selected === entity.id);
    element.title = `${entity.name}${components.ai?.hostile ? ' · click to attack' : components.interact || components.item ? ' · click to interact' : ''}`;
    element.setAttribute('aria-label', `${entity.name}, ${components.ai?.hostile ? 'hostile, attack' : entity.id === world().player ? 'your character' : 'inspect or interact'}, at ${pos.x}, ${pos.y}${components.stats ? `, ${components.stats.health} health` : ''}`);
    element.style.setProperty('--entity-color', /^#[a-f\d]{3,8}$/i.test(components.appearance?.color || '') ? components.appearance.color : components.ai?.hostile ? '#eea48d' : '#c4dcb1');
    const sprite = $('.entity-sprite', element);
    const source = asset(components.appearance?.asset);
    const spriteHTML = source ? `<img src="${escapeHTML(source)}" alt="">` : glyph(entity, entity.id === world().player ? '♟' : components.ai?.hostile ? '♜' : '◇');
    if (sprite.innerHTML !== spriteHTML) sprite.innerHTML = spriteHTML;
    const health = $('.entity-health', element);
    health.hidden = !components.stats;
    if (components.stats) {
      const before = number(element.dataset.health, components.stats.health);
      const after = components.stats.health;
      if (before !== after) { const className = before > after ? 'is-hit' : 'is-healed'; element.classList.remove(className); void element.offsetWidth; element.classList.add(className); setTimeout(() => element.classList.remove(className), 700); }
      element.dataset.health = after;
      $('i', health).style.width = `${Math.min(100, Math.max(0, after / Math.max(1, components.stats.maxHealth || after) * 100))}%`;
    }
  }
}
function dialogueMessages() {
  if (Array.isArray(world().conversation)) return world().conversation.filter(message => !message.scene || message.scene === world().scene);
  const dialogue = world().dialogue;
  if (dialogue?.reply && (!dialogue.reply.scene || dialogue.reply.scene === world().scene)) return [dialogue.reply];
  if (Array.isArray(dialogue)) return dialogue;
  if (Array.isArray(dialogue?.history)) return dialogue.history;
  if (Array.isArray(dialogue?.messages)) return dialogue.messages;
  if (dialogue?.text) return [dialogue];
  return [];
}
function renderStory() {
  state.boardKey = '';
  const current = scene();
  const messages = dialogueMessages();
  const last = messages.at(-1);
  const text = typeof last === 'string' ? last : last?.text || current.text || current.description || 'The world is listening. What will you do next?';
  const characters = Object.values(world().entities || {}).filter(entity => entity.id !== world().player && alive(entity) && (!position(entity)?.scene || position(entity).scene === world().scene) && !entity.components?.item).slice(0, 4);
  const background = asset(current.background);
  $('#standard-renderer').innerHTML = `${background ? '<div class="story-background"></div>' : ''}<div class="dialogue-scene"><div class="story-illustration" aria-hidden="true"><div class="story-arch"></div><div class="story-orb"></div>${characters.map(entity => `<button class="story-character" data-entity="${escapeHTML(entity.id)}" title="${escapeHTML(entity.name)}" tabindex="-1">${glyph(entity, '✧')}</button>`).join('')}</div><p class="story-location">${escapeHTML(current.name || 'A NEW CHAPTER')}</p><p class="story-text">${escapeHTML(text)}</p>${last?.speaker ? `<p class="story-speaker">— ${escapeHTML(world().entities?.[last.speaker]?.name || last.speaker)}</p>` : ''}${messages.length > 1 ? `<div class="dialogue-history">${messages.slice(-3, -1).map(item => `<p>${item.speaker ? `<b>${escapeHTML(world().entities?.[item.speaker]?.name || item.speaker)}:</b> ` : ''}${escapeHTML(typeof item === 'string' ? item : item.text)}</p>`).join('')}</div>` : ''}</div>`;
  if (background) $('.story-background', $('#standard-renderer')).style.backgroundImage = `url(${JSON.stringify(background)})`;
}
function renderFocus() {
  let entity = world().entities?.[state.selected];
  if (!entity) { entity = visibleEntities().find(item => item.components?.ai?.hostile && alive(item)) || hero(); state.selected = entity?.id || null; }
  if (!entity) { $('#focus-content').innerHTML = '<p class="empty-note">Select an entity in the scene to inspect it.</p>'; return; }
  const components = entity.components || {};
  $('#focus-content').innerHTML = `<div class="focus-title"><span class="item-glyph" aria-hidden="true">${glyph(entity)}</span><div><strong>${escapeHTML(entity.name)}</strong><small>${escapeHTML(components.ai?.hostile ? 'Hostile' : entity.kind || 'Entity')}</small></div></div>${components.description ? `<p class="focus-description">${escapeHTML(components.description)}</p>` : ''}${components.stats?.health !== undefined ? statBar('Health', components.stats.health, components.stats.maxHealth) : ''}<dl class="context-summary">${position(entity) ? `<dt>Position</dt><dd>${position(entity).x}, ${position(entity).y}</dd>` : ''}${components.stats?.attack !== undefined ? `<dt>Attack</dt><dd>${escapeHTML(components.stats.attack)}</dd>` : ''}<dt>Entity ID</dt><dd class="mono">${escapeHTML(entity.id)}</dd></dl><div class="focus-actions">${components.ai?.hostile && alive(entity) ? `<button data-attack="${escapeHTML(entity.id)}">Attack${state.skill ? ` · ${escapeHTML(world().skills[state.skill]?.name || state.skill)}` : ''}</button>` : ''}${(components.interact || components.item) && entity.id !== world().player ? `<button data-interact="${escapeHTML(entity.id)}">${components.item ? 'Pick up' : 'Interact'}</button>` : ''}</div>`;
}
function renderChoices() {
  currentChoices = (scene().choices || []).filter(choice => checkCondition(choice.when) && !(choice.once && world().variables?.visitedChoices?.[choice.id]));
  $('#choices').innerHTML = currentChoices.map((choice, index) => `<button class="choice-button" data-choice="${escapeHTML(choice.id)}" ${!checkCondition(choice.requires) || terminal() ? 'disabled' : ''}><span class="choice-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHTML(choice.label || choice.text || choice.id)}</span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('');
  const hasMap = Array.isArray(scene().map);
  $('#movement').hidden = !hasMap;
  setText('#control-note', terminal() ? 'This run has reached an ending. Start a new run to explore another path.' : hasMap ? 'WASD or arrow keys to move. Click a hostile to attack. Select an ability first for a skill attack.' : 'Choose a numbered option, or write a line of dialogue. Your choices are saved as you go.');
  $('#say-input').placeholder = hasMap ? 'Say something to the world…' : 'What do you say?';
  $('#say-input').disabled = terminal();
  $('.send-button').disabled = terminal();
  $$('#movement button').forEach(button => { button.disabled = terminal(); });
}
function renderContext() {
  const session = state.session;
  const variables = world().variables || {};
  setText('#metric-revision', session.revision);
  setText('#metric-entities', Object.keys(world().entities || {}).length);
  $('#context-summary').innerHTML = `<dt>Session</dt><dd class="mono" title="${escapeHTML(session.id)}">${escapeHTML(session.id.slice(0, 12))}</dd><dt>Scene</dt><dd>${escapeHTML(world().scene)}</dd><dt>World seed</dt><dd class="mono">${escapeHTML(session.seed)}</dd><dt>Event cursor</dt><dd class="mono">${escapeHTML(state.cursor)}</dd><dt>Status</dt><dd>${escapeHTML(variables.outcome || session.status || 'active')}</dd><dt>Persistence</dt><dd>Server-saved</dd>`;
  $('#world-variables').innerHTML = Object.entries(variables).filter(([, value]) => !isObject(value)).slice(0, 12).map(([key, value]) => `<span class="variable">${escapeHTML(key.replaceAll('_', ' '))}<b>${escapeHTML(pretty(value))}</b></span>`).join('');
  if ($('#snapshot-details').open) setText('#context-json', JSON.stringify(session, null, 2));
  renderStatus();
}
function renderStatus() {
  const running = state.status?.jobs?.filter(job => ['running', 'pending', 'queued', 'started', 'active'].includes(job.status)) || [];
  const consumers = state.status?.consumers || [];
  const queue = consumers.reduce((total, consumer) => total + Math.max(0, number(consumer.delivered) - number(consumer.ack)), 0);
  if (running.length) {
    setText('#agent-status', running[0].label || `${running.length} agent job${running.length === 1 ? '' : 's'} active`);
    setText('#agent-detail', `${running.length} active job${running.length === 1 ? '' : 's'} · ${queue} unacknowledged event${queue === 1 ? '' : 's'}`);
  } else if (world().dialogue?.pending?.scene === world().scene) {
    setText('#agent-status', 'Director response requested');
    setText('#agent-detail', 'Your dialogue is queued. You can keep exploring.');
  } else if (consumers.length) {
    setText('#agent-status', `${consumers.length} context consumer${consumers.length === 1 ? '' : 's'}`);
    setText('#agent-detail', `${queue} delivered event${queue === 1 ? '' : 's'} awaiting acknowledgment`);
  } else {
    setText('#agent-status', state.session ? 'World ready for your agent' : 'Waiting for world');
    setText('#agent-detail', state.lastAgentEvent || 'No active agent jobs reported.');
  }
}
function render() {
  if (!state.session) return;
  const current = scene();
  const pack = game();
  renderSelectors();
  setText('#world-title', pack?.title || state.session.gameId);
  setText('#world-description', pack?.description || 'A persistent world, ready to play and extend.');
  setText('#world-version', `V${pack?.version || '1.0'} · PERSISTENT WORLD`);
  setText('#world-number', String(state.games.findIndex(item => item.id === state.session.gameId) + 1).padStart(2, '0'));
  setText('#scene-title', current.name || world().scene || 'Untitled scene');
  setText('#scene-description', current.description || '');
  setText('#scene-kind', Array.isArray(current.map) ? 'TACTICAL EXPLORATION' : 'INTERACTIVE STORY');
  setText('#scene-badge', `SCENE ${String(Math.max(1, number(state.session.sceneEpoch) + 1)).padStart(2, '0')}`);
  setText('#revision', String(state.session.revision).padStart(3, '0'));
  setText('#stage-hint', Array.isArray(current.map) ? 'Explore the ruins. Choose your next move.' : 'Every choice leaves a trace.');
  renderCharacter();
  if (Array.isArray(current.map) && current.map.length) renderGrid(); else renderStory();
  renderFocus(); renderChoices(); renderContext();
  const oldEnding = $('.game-over-banner', $('#play-surface'));
  if (terminal()) {
    const banner = oldEnding || document.createElement('div');
    banner.className = 'game-over-banner';
    banner.textContent = `${String(world().variables?.outcome || 'Journey ended').replaceAll('_', ' ')} · Your run is saved. Start a new run to play again.`;
    if (!oldEnding) $('#play-surface').append(banner);
  } else oldEnding?.remove();
  void renderCustom();
}
function scheduleRender() { if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = null; render(); }); }
function customFallback(message) {
  const warning = $('#custom-warning');
  warning.hidden = !message;
  $('span', warning).textContent = message;
  if (!state.custom) { $('#custom-renderer').hidden = true; $('#standard-renderer').hidden = false; setText('#render-mode', 'STANDARD VIEW'); }
}
function disposeCustom() {
  state.customGeneration++;
  if (state.custom) { try { state.custom.instance.dispose?.(); } catch { /* A broken custom disposer must not break the runtime. */ } }
  state.custom = null; state.customKey = '';
  $('#custom-renderer').replaceChildren(); $('#custom-renderer').hidden = true; $('#standard-renderer').hidden = false;
  customFallback(''); setText('#render-mode', 'STANDARD VIEW');
}
async function renderCustom() {
  const raw = world().ui || game()?.ui;
  if (!raw || state.customDisabled) { if (state.custom) disposeCustom(); return; }
  const generation = ++state.customGeneration;
  const key = `${state.session.id}:${state.session.revision}:${raw}:${game()?.version || ''}`;
  if (key === state.customKey) return;
  const session = freeze(clone(state.session));
  const candidateRoot = document.createElement('div');
  candidateRoot.className = 'pack-view';
  let instance;
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith('/games/') || !url.pathname.endsWith('.js')) throw new Error('Custom views must be local JavaScript game modules.');
    // Cache-bust on author revisions only; ordinary play retains the same module.
    url.searchParams.set('v', `${game()?.version || '1'}-${world().uiVersion || state.session.sceneEpoch || 0}`);
    const module = await import(url.href);
    if (generation !== state.customGeneration) return;
    if (typeof module.default !== 'function') throw new Error('The module must export a createUI function.');
    const api = Object.freeze({ root: candidateRoot, dispatch, asset, escapeHTML, get snapshot() { return session; } });
    instance = await module.default(api);
    if (!instance || typeof instance.update !== 'function') throw new Error('The custom view must provide update(session).');
    await instance.update(session);
    if (generation !== state.customGeneration) { instance.dispose?.(); return; }
    const previous = state.custom;
    $('#custom-renderer').replaceChildren(candidateRoot);
    $('#custom-renderer').hidden = false; $('#standard-renderer').hidden = true;
    state.custom = { instance, root: candidateRoot }; state.customKey = key;
    customFallback(''); setText('#render-mode', 'PACK VIEW');
    try { previous?.instance.dispose?.(); } catch { /* Keep the newly validated view. */ }
  } catch (error) {
    try { instance?.dispose?.(); } catch { /* Keep the last-good component untouched. */ }
    if (generation !== state.customGeneration) return;
    state.customKey = key;
    customFallback(state.custom ? 'Custom view paused. Showing the last working view; controls remain live.' : 'Custom view unavailable. The standard view is ready to play.');
    console.warn('Custom renderer failed; preserving last-good view.', error);
  }
}
function applyPatches(session, patches) {
  let next = clone(session);
  for (const patch of patches || []) {
    if (!['set', 'delete'].includes(patch.op) || !Array.isArray(patch.path) || patch.path.some(key => typeof key !== 'string' || forbidden.has(key))) throw new Error('Unsafe or invalid state patch.');
    if (patch.path.length === 0) { if (patch.op !== 'set') throw new Error('Cannot delete the session.'); next = clone(patch.value); continue; }
    let parent = next;
    for (const key of patch.path.slice(0, -1)) {
      if (!isObject(parent) || !Object.hasOwn(parent, key)) throw new Error('State patch path does not match this snapshot.');
      parent = parent[key];
    }
    if (!isObject(parent)) throw new Error('Invalid state patch target.');
    const key = patch.path.at(-1);
    if (patch.op === 'delete') { if (Array.isArray(parent)) parent.splice(Number(key), 1); else delete parent[key]; }
    else parent[key] = clone(patch.value);
  }
  return next;
}
function receiveEvents(events = []) {
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
async function dispatch(action, args = {}) {
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
function showNewDialog() { $('#new-form .dialog-error')?.remove(); fillSelect($('#new-game'), state.games.map(item => ({ value: item.id, label: item.title || item.id })), $('#game-select').value || state.session?.gameId); $('#new-dialog').showModal(); }
function bindEvents() {
  $('#new-session').addEventListener('click', showNewDialog);
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
    const existing = state.sessions.filter(session => session.gameId === id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    try { if (existing) await loadSession(existing.id); else await createSession(id); }
    catch (error) { notify(error.message); renderSelectors(); }
  });
  $('#session-select').addEventListener('change', event => { if (event.target.value) void loadSession(event.target.value).catch(error => notify(error.message)); });
  $('#say-form').addEventListener('submit', async event => {
    event.preventDefault(); const input = $('#say-input'); const text = input.value.trim(); if (!text || state.pending) return;
    const result = await dispatch('narrative.say', { text }); if (result?.ok !== false && input.value.trim() === text) input.value = '';
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.move) { const [dx, dy] = button.dataset.move.split(',').map(Number); void dispatch('world.move', { dx, dy }); }
    else if (button.dataset.entity) void actOnEntity(button.dataset.entity);
    else if (button.dataset.attack) void attack(button.dataset.attack);
    else if (button.dataset.interact) void dispatch('world.interact', { target: button.dataset.interact });
    else if (button.dataset.use) void dispatch('inventory.use', { item: button.dataset.use });
    else if (button.dataset.equip) void dispatch('inventory.equip', { item: button.dataset.equip });
    else if (Object.hasOwn(button.dataset, 'skill')) { state.skill = button.dataset.skill || null; renderCharacter(); renderFocus(); $('#announcer').textContent = state.skill ? `${world().skills[state.skill]?.name || state.skill} selected. Choose a target.` : 'Basic attack selected.'; }
    else if (button.dataset.choice) void dispatch('narrative.choose', { choice: button.dataset.choice });
    else if (Object.hasOwn(button.dataset, 'x')) {
      const pos = position(hero()); if (!pos) return;
      const dx = Number(button.dataset.x) - pos.x; const dy = Number(button.dataset.y) - pos.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) void dispatch('world.move', { dx, dy });
      else if (dx || dy) notify('Choose an adjacent tile, or use the arrow keys to explore.');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || $('dialog[open]') || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    const directions = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const direction = directions[event.key] || directions[event.key.toLowerCase()];
    if (direction && Array.isArray(scene().map)) { event.preventDefault(); if (!terminal()) void dispatch('world.move', { dx: direction[0], dy: direction[1] }); }
    else if (/^[1-9]$/.test(event.key)) { const choice = currentChoices[Number(event.key) - 1]; if (choice && checkCondition(choice.requires)) { event.preventDefault(); void dispatch('narrative.choose', { choice: choice.id }); } }
  });
  $('#snapshot-details').addEventListener('toggle', () => { if ($('#snapshot-details').open && state.session) setText('#context-json', JSON.stringify(state.session, null, 2)); });
  $('#copy-context').addEventListener('click', async () => {
    if (!state.session) return;
    try { await navigator.clipboard.writeText(JSON.stringify(state.session, null, 2)); notify('Current session snapshot copied.', true); }
    catch { $('#snapshot-details').open = true; setText('#context-json', JSON.stringify(state.session, null, 2)); notify('Clipboard is unavailable. Expand Inspect state to select and copy the snapshot.'); }
  });
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
