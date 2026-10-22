/** Shared, data-only rules. No eval, expression strings, or game-specific identifiers. */
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const ruleError = (message, code = 'INVALID_RULE') => Object.assign(new Error(message), { code });
export const clone = value => JSON.parse(JSON.stringify(value));
export const player = ctx => ctx.state.entities[ctx.state.player];
export const actor = ctx => ctx.state.entities[ctx.actor] || player(ctx);
export const scene = ctx => ctx.state.scenes[ctx.state.scene];
export const position = entity => entity?.components?.position;
export const sameScene = (ctx, entity) => !position(entity)?.scene || position(entity).scene === ctx.state.scene;
export const distance = (a, b) => {
  const pa = position(a), pb = position(b);
  return pa && pb ? Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) : Infinity;
};
export const living = entity => !entity?.components?.stats || entity.components.stats.health > 0;
export const resolveTarget = (ctx, id) => ctx.state.entities[id === 'player' ? ctx.state.player : id === 'self' ? (ctx.state.entities[ctx.actor]?.id || ctx.state.player) : id];
export function ensurePlaying(ctx) {
  ctx.require(living(player(ctx)) && !ctx.state.variables?.outcome, 'GAME_FINISHED', 'This story has ended.', 'Create another session to start a fresh run.');
}
export function getPath(state, path) {
  if (!Array.isArray(path) || !path.length || path.length > 16 || path.some(key => typeof key !== 'string' || unsafeKeys.has(key))) throw ruleError('Rule paths must be arrays of safe string keys.');
  let value = state;
  for (const key of path) {
    if (value == null || typeof value !== 'object' || !has(value, key)) return undefined;
    value = value[key];
  }
  return value;
}
function putPath(state, path, value) {
  getPath(state, path);
  let parent = state;
  for (const key of path.slice(0, -1)) {
    if (!has(parent, key)) parent[key] = {};
    if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) throw ruleError(`Cannot traverse rule path at ${key}.`);
    parent = parent[key];
  }
  parent[path.at(-1)] = clone(value);
}
/** Conditions support all/any/not, state-path comparisons, and inventory membership. */
export function condition(ctx, rule) {
  if (rule == null) return true;
  if (typeof rule === 'boolean') return rule;
  if (Array.isArray(rule)) return rule.every(item => condition(ctx, item));
  if (rule.all) return rule.all.every(item => condition(ctx, item));
  if (rule.any) return rule.any.some(item => condition(ctx, item));
  if (rule.not) return !condition(ctx, rule.not);
  if (rule.hasItem) return (player(ctx)?.components?.inventory?.items || []).includes(rule.hasItem);
  if (rule.entityAlive) return Boolean(ctx.state.entities[rule.entityAlive] && living(ctx.state.entities[rule.entityAlive]));
  const value = getPath(ctx.state, rule.path);
  if (has(rule, 'equals')) return value === rule.equals;
  if (has(rule, 'notEquals')) return value !== rule.notEquals;
  if (has(rule, 'gte')) return typeof value === 'number' && value >= rule.gte;
  if (has(rule, 'lte')) return typeof value === 'number' && value <= rule.lte;
  if (has(rule, 'gt')) return typeof value === 'number' && value > rule.gt;
  if (has(rule, 'lt')) return typeof value === 'number' && value < rule.lt;
  if (has(rule, 'includes')) return (Array.isArray(value) || typeof value === 'string') && value.includes(rule.includes);
  if (has(rule, 'exists')) return (value !== undefined) === rule.exists;
  return Boolean(value);
}
export function recordDialogue(ctx, text, speaker = 'Narrator') {
  ctx.state.conversation ||= [];
  ctx.state.conversation.push({ text, speaker, scene: ctx.state.scene });
  if (ctx.state.conversation.length > 48) ctx.state.conversation.splice(0, ctx.state.conversation.length - 48);
}
export function visibleChoices(ctx) {
  return (scene(ctx)?.choices || []).filter(choice => condition(ctx, choice.when) && !(choice.once && ctx.state.variables?.visitedChoices?.[choice.id]));
}
export function isWalkable(ctx, x, y, exceptId) {
  const current = scene(ctx);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (current.map) {
    if (y < 0 || y >= current.map.length || x < 0 || x >= current.map[y].length) return false;
    const tile = current.map[y][x];
    if (tile === '#' || current.tiles?.[tile]?.solid) return false;
  } else if (x < 0 || y < 0 || x >= (current.width || 20) || y >= (current.height || 14)) return false;
  return !Object.values(ctx.state.entities).some(entity => entity.id !== exceptId && sameScene(ctx, entity) && position(entity)?.x === x && position(entity)?.y === y && living(entity) && (entity.components?.solid || entity.components?.ai?.hostile || entity.id === ctx.state.player));
}
export function transition(ctx, sceneId, destination) {
  const next = ctx.state.scenes[sceneId];
  ctx.require(next, 'SCENE_NOT_FOUND', `Unknown scene: ${sceneId}.`);
  ctx.state.scene = sceneId;
  const hero = player(ctx);
  if (hero?.components?.position) Object.assign(hero.components.position, { scene: sceneId, ...(destination || next.entry || {}) });
  ctx.emit('scene', next.name, { scene: sceneId });
  if (next.description) ctx.emit('narration', next.description);
}
function number(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw ruleError(`${label} must be a finite number.`);
  return value;
}
export function heal(ctx, entity, amount, resource = 'health') {
  ctx.require(entity?.components?.stats, 'INVALID_TARGET', 'That target has no stats.');
  const stats = entity.components.stats;
  const max = resource === 'mana' ? stats.maxMana : stats.maxHealth;
  const before = stats[resource] || 0;
  stats[resource] = Math.min(max ?? Infinity, before + Math.max(0, number(amount, 'Healing')));
  return stats[resource] - before;
}
export function damage(ctx, entity, amount, source = null, depth = 0) {
  ctx.require(entity?.components?.stats, 'INVALID_TARGET', 'That target has no health.');
  const stats = entity.components.stats;
  const wasAlive = stats.health > 0;
  stats.health = Math.max(0, stats.health - Math.max(0, number(amount, 'Damage')));
  if (!wasAlive || stats.health > 0) return;
  ctx.emit('defeat', `${entity.name} falls.`, { target: entity.id, source });
  if (entity.id === ctx.state.player) {
    ctx.state.variables ||= {};
    ctx.state.variables.outcome = 'defeat';
    ctx.emit('ending', 'Your journey ends here. Start a new session to try another path.', { outcome: 'defeat' });
    return;
  }
  const pos = position(entity);
  for (const [index, drop] of (entity.components.loot || []).entries()) {
    if (ctx.random() > (drop.chance ?? 1)) continue;
    const template = drop.entity || (drop.item && ctx.state.entities[drop.item]);
    if (!template) continue;
    const item = clone(template);
    let id = `${entity.id}-drop-${index}`;
    while (ctx.state.entities[id]) id += '-x';
    item.id = id;
    item.components ||= {};
    if (pos) item.components.position = clone(pos);
    ctx.state.entities[id] = item;
    ctx.emit('loot', `${entity.name} leaves ${item.name}.`, { target: id });
  }
  if (entity.components.reward) {
    const heroStats = player(ctx).components.stats;
    heroStats.experience = (heroStats.experience || 0) + (entity.components.reward.experience || 0);
    ctx.state.variables.gold = (ctx.state.variables.gold || 0) + (entity.components.reward.gold || 0);
  }
  if (entity.components.onDefeat) applyEffects(ctx, entity.components.onDefeat, depth + 1);
}
export function applyEffects(ctx, effects = [], depth = 0) {
  if (depth > 12 || !Array.isArray(effects) || effects.length > 200) throw ruleError('Effect expansion exceeds the supported limit.');
  for (const effect of effects) {
    if (!condition(ctx, effect.when)) continue;
    const op = effect.type || effect.op;
    switch (op) {
      case 'set': putPath(ctx.state, effect.path, effect.value); break;
      case 'increment': putPath(ctx.state, effect.path, number(getPath(ctx.state, effect.path) ?? 0, 'Current value') + number(effect.amount ?? 1, 'Increment')); break;
      case 'heal': {
        const target = resolveTarget(ctx, effect.target || 'player');
        const restored = heal(ctx, target, effect.amount, effect.resource || 'health');
        ctx.emit('heal', `${target.name} recovers ${restored} ${effect.resource || 'health'}.`, { target: target.id, amount: restored });
        break;
      }
      case 'damage': damage(ctx, resolveTarget(ctx, effect.target || 'player'), effect.amount, null, depth); break;
      case 'spawn': {
        const entity = clone(effect.entity);
        ctx.require(entity?.id && !unsafeKeys.has(entity.id) && !has(ctx.state.entities, entity.id), 'ENTITY_EXISTS', 'Spawn requires a new safe entity ID.');
        ctx.state.entities[entity.id] = entity;
        ctx.emit('spawn', `${entity.name} appears.`, { target: entity.id });
        break;
      }
      case 'remove': {
        const target = resolveTarget(ctx, effect.target);
        ctx.require(target && target.id !== ctx.state.player, 'INVALID_TARGET', 'Cannot remove that entity.');
        delete ctx.state.entities[target.id];
        for (const entity of Object.values(ctx.state.entities)) {
          if (entity.components?.inventory?.items) entity.components.inventory.items = entity.components.inventory.items.filter(id => id !== target.id);
          for (const [slot, id] of Object.entries(entity.components?.equipment || {})) if (id === target.id) delete entity.components.equipment[slot];
        }
        break;
      }
      case 'transition': transition(ctx, effect.scene, effect.position); break;
      case 'narrate': recordDialogue(ctx, effect.text || '', effect.speaker); ctx.emit('narration', effect.text || '', { speaker: effect.speaker }); break;
      case 'cue': ctx.emit('cue', '', { visual: effect.visual, target: effect.target, color: effect.color }); break;
      case 'branch': applyEffects(ctx, condition(ctx, effect.condition) ? effect.then : effect.else, depth + 1); break;
      default: throw ruleError(`Unknown effect type: ${op}.`, 'UNKNOWN_EFFECT');
    }
  }
}
export function markChoice(ctx, id) {
  ctx.require(typeof id === 'string' && !unsafeKeys.has(id), 'INVALID_CHOICE', 'Invalid choice identifier.');
  ctx.state.variables ||= {};
  ctx.state.variables.visitedChoices ||= {};
  ctx.state.variables.visitedChoices[id] = (ctx.state.variables.visitedChoices[id] || 0) + 1;
}
