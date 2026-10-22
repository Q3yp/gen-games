/** Generic map and story renderers; CSS motion runs independently of server actions. */
import { $, $$, escapeHTML, state, world, scene, position, alive, visibleEntities, asset, glyph, number } from './shared.js';
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

export { renderGrid, renderStory };
