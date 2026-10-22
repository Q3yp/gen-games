import { AREAS, objectsIn } from './world.js';
import { LEFT, TOP, WIDTH, HEIGHT, noise } from './render/primitives.js';
import { palette, ground, tree, ruin } from './render/terrain.js';
import { exit, object } from './render/props.js';
import { enemy } from './render/enemies.js';
import { player } from './render/player.js';
import {
  updateAnimation,
  background,
  telegraph,
  impacts,
  atmosphere
} from './render/effects.js';

// Layer orchestration only. Drawing and visual-only animation live in render/.
export function paint(ctx, world, time = 0, viewport) {
  const area = AREAS[world.area] || Object.values(AREAS)[0];
  if (!area || !world.player) return;
  const p = palette(area),
    state = world.areas?.[world.area] || {},
    t = Number(time) || 0;
  const map = area.tiles;
  const anim = updateAnimation(ctx, world, state, t);
  const drawnPlayer = { ...world.player, x: anim.x, y: anim.y };
  ctx.save();
  // The DOM owns the title, sidebar, and bottom action strip.
  ctx.beginPath();
  ctx.rect(0, 95, 1100, 565);
  ctx.clip();
  background(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(LEFT, TOP, WIDTH, HEIGHT);
  ctx.clip();
  for (let y = 0; y < map.length; y++)
    for (let x = 0; x < map[y].length; x++)
      ground(ctx, x, y, map[y][x], p, t, map);
  for (const e of area.exits || []) exit(ctx, e, t, world.player);
  for (const e of state.enemies || []) telegraph(ctx, e, t);
  const taken = new Set(state.taken || []),
    actors = [];
  for (let y = 0; y < map.length; y++)
    for (let x = 0; x < map[y].length; x++)
      if (map[y][x] === '#')
        actors.push({
          y,
          x,
          render: () =>
            p.ruins && noise(x, y) > 0.38
              ? ruin(ctx, x, y, p)
              : tree(ctx, x, y, p, t)
        });
  for (const o of objectsIn(world))
    if (!taken.has(o.id) || o.kind === 'npc' || o.kind === 'camp')
      actors.push({ y: o.y, x: o.x, render: () => object(ctx, o, t, world) });
  for (const e of state.enemies || [])
    if (e.hp > 0)
      actors.push({ y: e.y, x: e.x, render: () => enemy(ctx, e, t) });
  actors.push({
    y: anim.y,
    x: anim.x,
    render: () => player(ctx, drawnPlayer, t, world)
  });
  actors.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const actor of actors) actor.render();
  impacts(ctx, anim.sparks, t);
  atmosphere(ctx, t, area, p);
  ctx.restore();
  ctx.restore();
}
