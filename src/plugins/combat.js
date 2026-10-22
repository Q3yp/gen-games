import { actor, player, scene, position, sameScene, distance, living, resolveTarget, ensurePlaying, isWalkable, damage } from './effects.js';

function stats(entity) { return entity?.components?.stats || {}; }
function equipmentBonus(ctx, entity, field) {
  return Object.values(entity.components.equipment || {}).reduce((total, id) => total + (ctx.state.entities[id]?.components?.item?.[field] || 0), 0);
}
function strike(ctx, source, target, skill) {
  const attacker = stats(source), defender = stats(target);
  const accuracy = Math.max(0, Math.min(1, skill?.accuracy ?? 1));
  if (accuracy < 1 && ctx.random() > accuracy) {
    ctx.emit('combat', `${source.name}'s ${skill?.name || 'attack'} misses ${target.name}.`, { source: source.id, target: target.id, miss: true });
    return 0;
  }
  const spread = Math.max(0, Math.floor(skill?.variance ?? 2));
  const raw = (attacker.attack || 1) + equipmentBonus(ctx, source, 'attack') + (skill?.power || 0) + (spread ? Math.floor(ctx.random() * (spread + 1)) : 0);
  const defense = (defender.defense || 0) + equipmentBonus(ctx, target, 'defense');
  const dealt = Math.max(1, raw - (skill?.piercing ? 0 : defense));
  ctx.emit('combat', `${source.name} ${skill ? `uses ${skill.name} on` : 'strikes'} ${target.name} for ${dealt}.`, { source: source.id, target: target.id, amount: dealt, skill: skill?.id });
  ctx.emit('cue', '', { visual: skill?.visual || 'slash', target: target.id });
  damage(ctx, target, dealt, source.id);
  if (skill?.drain && living(source)) attacker.health = Math.min(attacker.maxHealth, attacker.health + Math.floor(dealt * skill.drain));
  return dealt;
}
/** One opposing turn per successful tactical player action. Uses bounded BFS. */
export function opponentTurns(ctx) {
  if (!living(player(ctx)) || ctx.state.variables?.outcome) return;
  ctx.state.variables ||= {};
  ctx.state.variables.turn = (ctx.state.variables.turn || 0) + 1;
  const hero = player(ctx);
  const moved = [];
  for (const enemy of Object.values(ctx.state.entities)) {
    const ai = enemy.components?.ai;
    if (!ai?.hostile || !living(enemy) || !sameScene(ctx, enemy) || !position(enemy)) continue;
    if (distance(enemy, hero) > (ai.aggro ?? 7)) continue;
    const range = ai.range ?? 1;
    if (distance(enemy, hero) <= range) {
      strike(ctx, enemy, hero, ai.skill ? ctx.state.skills?.[ai.skill] : undefined);
      if (!living(hero)) return;
      continue;
    }
    if (ai.stationary) continue;
    const origin = position(enemy), goal = position(hero);
    const queue = [{ x: origin.x, y: origin.y, first: null }], seen = new Set([`${origin.x},${origin.y}`]);
    let move;
    for (let index = 0; index < queue.length && index < 600; index++) {
      const point = queue[index];
      if (Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y) <= range) { move = point.first; break; }
      for (const [dx, dy] of [[0,-1],[-1,0],[1,0],[0,1]]) {
        const x = point.x + dx, y = point.y + dy, key = `${x},${y}`;
        if (seen.has(key) || !isWalkable(ctx, x, y, enemy.id)) continue;
        seen.add(key);
        queue.push({ x, y, first: point.first || { x, y } });
      }
    }
    if (move) { Object.assign(origin, move); moved.push({ target: enemy.id, ...move }); }
  }
  if (moved.length) ctx.emit('opponents.moved', `${moved.length} opponent${moved.length === 1 ? '' : 's'} close in.`, { positions: moved });
}
export default {
  id: 'combat', version: '1.0.0', requires: ['core'],
  actions: {
    'combat.attack': {
      description: 'Attack a living hostile target in range; an optional authored skill spends mana. Enemies then take one turn.',
      input: { type: 'object', properties: { target: { type: 'string', description: 'Entity ID in the current scene.' }, skill: { type: 'string', description: 'An available skill ID; omit for a basic attack.' } }, required: ['target'], additionalProperties: false },
      run(ctx, args) {
        ensurePlaying(ctx);
        const source = actor(ctx), target = resolveTarget(ctx, args.target);
        ctx.require(source?.components?.stats, 'INVALID_ACTOR', 'This actor cannot fight.');
        ctx.require(target && target.id !== source.id && target.components?.ai?.hostile && living(target) && sameScene(ctx, target), 'INVALID_TARGET', 'Choose a living opponent in this scene.');
        const skill = args.skill ? ctx.state.skills?.[args.skill] : null;
        ctx.require(!args.skill || skill, 'SKILL_NOT_FOUND', 'That skill does not exist.');
        ctx.require(!skill || skill.enemyOnly !== true, 'SKILL_UNAVAILABLE', 'That skill belongs to an opponent.');
        const known = source.components.skills;
        ctx.require(!skill || !Array.isArray(known) || known.includes(args.skill), 'SKILL_UNAVAILABLE', 'This actor has not learned that skill.');
        ctx.require(distance(source, target) <= (skill?.range ?? 1), 'OUT_OF_RANGE', 'The opponent is out of range.', 'Move closer or choose a ranged skill.');
        const cost = skill?.cost || 0;
        ctx.require((stats(source).mana || 0) >= cost, 'NOT_ENOUGH_MANA', 'Not enough focus for that skill.');
        stats(source).mana = (stats(source).mana || 0) - cost;
        const dealt = strike(ctx, source, target, skill);
        opponentTurns(ctx);
        return { target: target.id, damage: dealt, defeated: !living(target) };
      }
    }
  }
};
