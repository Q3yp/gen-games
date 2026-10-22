import { actor, player, scene, position, sameScene, distance, living, ensurePlaying, condition, isWalkable, transition, applyEffects, heal } from './effects.js';
import { opponentTurns } from './combat.js';
const targetInput = { type: 'object', properties: { target: { type: 'string' } }, required: ['target'], additionalProperties: false };
const itemInput = { type: 'object', properties: { item: { type: 'string', description: 'An entity ID in the player inventory.' } }, required: ['item'], additionalProperties: false };
function carried(ctx, id) {
  const hero = actor(ctx), item = ctx.state.entities[id];
  ctx.require(hero?.components?.inventory?.items?.includes(id) && item?.components?.item, 'ITEM_NOT_CARRIED', 'That item is not in your inventory.');
  return { hero, item, data: item.components.item };
}
export default {
  id: 'core', version: '1.0.0',
  actions: {
    'world.move': {
      description: 'Move one orthogonal tile. Walls and living opponents block movement; opponents act afterward.',
      input: { type: 'object', properties: { dx: { type: 'integer', minimum: -1, maximum: 1 }, dy: { type: 'integer', minimum: -1, maximum: 1 } }, required: ['dx', 'dy'], additionalProperties: false },
      run(ctx, { dx, dy }) {
        ensurePlaying(ctx);
        ctx.require(Number.isInteger(dx) && Number.isInteger(dy) && Math.abs(dx) + Math.abs(dy) === 1, 'INVALID_MOVE', 'Move one tile north, south, east, or west.');
        const hero = actor(ctx), pos = position(hero);
        ctx.require(pos, 'NO_POSITION', 'This actor cannot move on a map.');
        const x = pos.x + dx, y = pos.y + dy;
        ctx.require(isWalkable(ctx, x, y, hero.id), 'BLOCKED', 'The way is blocked.', 'Attack an adjacent opponent or try another direction.');
        Object.assign(pos, { x, y });
        const tile = scene(ctx).map?.[y]?.[x];
        const tileData = scene(ctx).tiles?.[tile];
        if (tileData?.effects) applyEffects(ctx, tileData.effects);
        const exit = (scene(ctx).exits || []).find(entry => entry.x === x && entry.y === y);
        if (exit && condition(ctx, exit.when)) transition(ctx, exit.scene, exit.position);
        else if (exit?.lockedText) ctx.emit('narration', exit.lockedText);
        ctx.emit('player.moved', `${hero.name} moves to ${pos.x}, ${pos.y}.`, { target: hero.id, x: pos.x, y: pos.y, scene: ctx.state.scene });
        opponentTurns(ctx);
        return { position: { ...pos }, scene: ctx.state.scene };
      }
    },
    'world.wait': {
      description: 'Wait one tactical turn, letting nearby opponents approach.', input: { type: 'object', properties: {}, additionalProperties: false },
      run(ctx) { ensurePlaying(ctx); ctx.emit('narration', 'You pause and listen.'); opponentTurns(ctx); return { turn: ctx.state.variables.turn }; }
    },
    'world.interact': {
      description: 'Interact with a nearby entity or pick up an item. Interactions may require authored conditions.', input: targetInput,
      run(ctx, { target: id }) {
        ensurePlaying(ctx);
        const hero = actor(ctx), target = ctx.state.entities[id];
        ctx.require(target && sameScene(ctx, target), 'TARGET_NOT_FOUND', 'That object is not in this scene.');
        ctx.require(position(target) && distance(hero, target) <= (target.components?.interact?.range ?? 1), 'OUT_OF_RANGE', 'Move next to that object first.');
        ctx.require(!target.components?.ai?.hostile || !living(target), 'HOSTILE_TARGET', 'That opponent is not interested in conversation.');
        if (target.components?.item) {
          hero.components.inventory ||= { items: [] };
          ctx.require(!hero.components.inventory.items.includes(id), 'ALREADY_CARRIED', 'You already carry that item.');
          const data = target.components.item;
          delete target.components.position;
          if (!data.consumeOnPickup) hero.components.inventory.items.push(id);
          ctx.emit('inventory', `You take ${target.name}.`, { target: id, operation: 'pick-up' });
          applyEffects(ctx, data.onPickup || []);
          if (data.consumeOnPickup) delete ctx.state.entities[id];
        } else {
          const interact = target.components?.interact;
          ctx.require(interact, 'NOT_INTERACTIVE', 'There is nothing to do with that object.');
          ctx.require(!interact.once || !interact.used, 'ALREADY_USED', interact.usedText || 'You have already used this.');
          ctx.require(condition(ctx, interact.when), 'REQUIREMENT_NOT_MET', interact.lockedText || 'You cannot use that yet.');
          if (interact.text) ctx.emit('narration', interact.text, { speaker: target.name });
          applyEffects(ctx, interact.effects || []);
          if (interact.scene) transition(ctx, interact.scene, interact.position);
          if (interact.once) interact.used = true;
          ctx.require(!interact.action, 'UNSUPPORTED_INTERACTION', 'Use effects or scene on authored interactions; nested action dispatch is not supported.');
        }
        opponentTurns(ctx);
        return { target: id };
      }
    },
    'inventory.use': {
      description: 'Use a carried consumable, restoring health/focus or applying its authored effects.', input: itemInput,
      run(ctx, { item: id }) {
        ensurePlaying(ctx);
        const { hero, item, data } = carried(ctx, id);
        ctx.require(data.heal || data.mana || data.effects?.length, 'NOT_USABLE', 'This item cannot be consumed.', 'Equipment should be equipped; keys work through their matching interactions.');
        if (data.heal) heal(ctx, hero, data.heal);
        if (data.mana) heal(ctx, hero, data.mana, 'mana');
        applyEffects(ctx, data.effects || []);
        ctx.emit('inventory', `You use ${item.name}.`, { target: id, operation: 'use' });
        ctx.emit('cue', '', { visual: data.visual || 'heal', target: hero.id });
        if (data.consumable !== false) {
          hero.components.inventory.items = hero.components.inventory.items.filter(value => value !== id);
          for (const [slot, equipped] of Object.entries(hero.components.equipment || {})) if (equipped === id) delete hero.components.equipment[slot];
          delete ctx.state.entities[id];
        }
        opponentTurns(ctx);
        return { item: id, consumed: data.consumable !== false };
      }
    },
    'inventory.equip': {
      description: 'Equip a carried weapon or armor in its authored slot. Its stat bonuses apply immediately.', input: itemInput,
      run(ctx, { item: id }) {
        ensurePlaying(ctx);
        const { hero, item, data } = carried(ctx, id);
        const slot = data.slot || data.equipSlot || (data.attack ? 'weapon' : data.defense ? 'armor' : null);
        ctx.require(slot && !['__proto__', 'constructor', 'prototype'].includes(slot), 'NOT_EQUIPMENT', 'This item cannot be equipped.');
        hero.components.equipment ||= {};
        ctx.require(hero.components.equipment[slot] !== id, 'ALREADY_EQUIPPED', 'That item is already equipped.');
        hero.components.equipment[slot] = id;
        ctx.emit('inventory', `You equip ${item.name}.`, { target: id, operation: 'equip', slot });
        opponentTurns(ctx);
        return { item: id, slot };
      }
    }
  }
};
