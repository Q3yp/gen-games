/** Reusable character, inventory, action and inspector panels. */
import { $, $$, escapeHTML, isObject, state, world, hero, scene, game, position, alive, visibleEntities, terminal, glyph, setText, pretty, number, statBar, checkCondition, fillSelect } from './shared.js';
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
  $('#player-card').classList.remove('loading-block');
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
  const learned = entity.components?.skills;
  const skills = Object.entries(world().skills || {}).map(([id, skill]) => ({ id, ...skill })).filter(skill => !skill.enemyOnly && (!Array.isArray(learned) || learned.includes(skill.id)));
  if (state.skill && !skills.some(skill => skill.id === state.skill)) state.skill = null;
  $('#skills').innerHTML = skills.length ? `<button class="skill-button" data-skill="" aria-pressed="${!state.skill}"><span class="skill-icon" aria-hidden="true">↗</span><span><strong>Basic attack</strong><small>Close-range strike</small></span><span class="skill-cost">0</span></button>${skills.map(skill => `<button class="skill-button" data-skill="${escapeHTML(skill.id)}" aria-pressed="${state.skill === skill.id}"><span class="skill-icon" aria-hidden="true">✧</span><span><strong>${escapeHTML(skill.name || skill.id)}</strong><small>${escapeHTML(skill.description || `${skill.power || 0} power · ${skill.range || 1} range`)}</small></span><span class="skill-cost" title="Energy cost">${escapeHTML(skill.cost || 0)}</span></button>`).join('')}` : '<p class="empty-note">In this world, your words and choices are your abilities.</p>';
}
function renderFocus() {
  let entity = world().entities?.[state.selected];
  if (!entity) { entity = visibleEntities().find(item => item.components?.ai?.hostile && alive(item)) || hero(); state.selected = entity?.id || null; }
  if (!entity) { $('#focus-content').innerHTML = '<p class="empty-note">Select an entity in the scene to inspect it.</p>'; return; }
  const components = entity.components || {};
  $('#focus-content').innerHTML = `<div class="focus-title"><span class="item-glyph" aria-hidden="true">${glyph(entity)}</span><div><strong>${escapeHTML(entity.name)}</strong><small>${escapeHTML(components.ai?.hostile ? 'Hostile' : entity.kind || 'Entity')}</small></div></div>${components.description ? `<p class="focus-description">${escapeHTML(components.description)}</p>` : ''}${components.stats?.health !== undefined ? statBar('Health', components.stats.health, components.stats.maxHealth) : ''}<dl class="context-summary">${position(entity) ? `<dt>Position</dt><dd>${position(entity).x}, ${position(entity).y}</dd>` : ''}${components.stats?.attack !== undefined ? `<dt>Attack</dt><dd>${escapeHTML(components.stats.attack)}</dd>` : ''}<dt>Entity ID</dt><dd class="mono">${escapeHTML(entity.id)}</dd></dl><div class="focus-actions">${components.ai?.hostile && alive(entity) ? `<button data-attack="${escapeHTML(entity.id)}">Attack${state.skill ? ` · ${escapeHTML(world().skills[state.skill]?.name || state.skill)}` : ''}</button>` : ''}${(components.interact || components.item) && entity.id !== world().player ? `<button data-interact="${escapeHTML(entity.id)}">${components.item ? 'Pick up' : 'Interact'}</button>` : ''}</div>`;
}
function renderChoices() {
  state.choices = (scene().choices || []).filter(choice => checkCondition(choice.when) && !(choice.once && world().variables?.visitedChoices?.[choice.id]));
  $('#choices').innerHTML = state.choices.map((choice, index) => `<button class="choice-button" data-choice="${escapeHTML(choice.id)}" ${!checkCondition(choice.requires) || terminal() ? 'disabled' : ''}><span class="choice-number">${String(index + 1).padStart(2, '0')}</span><span>${escapeHTML(choice.label || choice.text || choice.id)}</span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('');
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
    setText('#agent-detail', `${running.length} active job${running.length === 1 ? '' : 's'} · ${queue} cursor lag`);
  } else if (world().dialogue?.pending?.scene === world().scene) {
    setText('#agent-status', 'Director response requested');
    setText('#agent-detail', 'Your dialogue is queued. You can keep exploring.');
  } else if (consumers.length) {
    setText('#agent-status', `${consumers.length} context consumer${consumers.length === 1 ? '' : 's'}`);
    setText('#agent-detail', `${queue} cursor lag awaiting acknowledgment`);
  } else {
    setText('#agent-status', state.session ? 'World ready for your agent' : 'Waiting for world');
    setText('#agent-detail', state.lastAgentEvent || 'No active agent jobs reported.');
  }
}

export { renderSelectors, renderCharacter, renderFocus, renderChoices, renderContext, renderStatus };
