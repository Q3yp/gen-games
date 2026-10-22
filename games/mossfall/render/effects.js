import {
  CELL,
  LEFT,
  TOP,
  WIDTH,
  HEIGHT,
  TAU,
  noise,
  point,
  ellipse,
  line,
  diamond
} from './primitives.js';
const animation = new WeakMap();

export function updateAnimation(ctx, world, state, t) {
  let anim = animation.get(ctx);
  if (!anim || anim.area !== world.area || t < anim.time) {
    anim = {
      area: world.area,
      x: world.player.x,
      y: world.player.y,
      time: t,
      hp: world.player.hp,
      enemies: new Map(),
      sparks: []
    };
    animation.set(ctx, anim);
  }
  const dt = Math.max(1 / 240, Math.min(0.06, t - anim.time)),
    ease = 1 - Math.exp(-dt * 25);
  anim.x += (world.player.x - anim.x) * ease;
  anim.y += (world.player.y - anim.y) * ease;
  if (Math.hypot(world.player.x - anim.x, world.player.y - anim.y) > 3) {
    anim.x = world.player.x;
    anim.y = world.player.y;
  }
  if (world.player.hp !== anim.hp) {
    anim.sparks.push({
      x: anim.x,
      y: anim.y,
      at: t,
      heal: world.player.hp > anim.hp,
      player: true
    });
    anim.hp = world.player.hp;
  }
  for (const e of state.enemies || []) {
    const last = anim.enemies.get(e.id);
    if (last !== undefined && e.hp < last)
      anim.sparks.push({ x: e.x, y: e.y, at: t, heal: false, player: false });
    anim.enemies.set(e.id, e.hp);
  }
  anim.time = t;
  anim.sparks = anim.sparks.filter((s) => t - s.at < 0.42);
  return anim;
}

export function background(ctx) {
  ctx.fillStyle = '#0c211e';
  ctx.fillRect(0, 95, 1100, 565);
  const ambient = ctx.createLinearGradient(0, 95, 1100, 660);
  ambient.addColorStop(0, '#24413666');
  ambient.addColorStop(0.6, '#0c211e00');
  ambient.addColorStop(1, '#17372c55');
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 95, 1100, 565);
  // A faint botanical silhouette in the reserved margin keeps the scene cohesive.
  for (let i = 0; i < 5; i++) {
    const x = 985 + i * 23,
      y = 400 + (i % 2) * 55;
    line(
      ctx,
      [
        [x, 646],
        [x - 9, y],
        [x - 2, y - 90]
      ],
      '#34513a35',
      2
    );
    for (let j = 0; j < 5; j++) {
      ellipse(ctx, x - 10 - (j % 2) * 8, y + j * 31, 12, 4, '#44634520');
    }
  }
}

export function telegraph(ctx, e, t) {
  if (!e.intent?.length || e.hp <= 0) return;
  const alpha = 0.34 + Math.sin(t * 7) * 0.07;
  for (const v of e.intent) {
    const x = LEFT + v.x * CELL + 3,
      y = TOP + v.y * CELL + 3;
    ctx.fillStyle = `rgba(240,162,60,${alpha})`;
    ctx.fillRect(x, y, 54, 54);
    ctx.strokeStyle = '#f7c06e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, 53, 53);
    // Short inset hatching distinguishes danger from an ordinary movement cursor.
    for (let i = 0; i < 4; i++) {
      line(
        ctx,
        [
          [x + 8 + i * 11, y + 47],
          [x + 14 + i * 11, y + 41]
        ],
        '#ffce8266',
        2
      );
    }
    // Corner braces stay readable even when a creature overlaps the warning.
    for (const [dx, dy, sx, sy] of [
      [0, 0, 1, 1],
      [54, 0, -1, 1],
      [0, 54, 1, -1],
      [54, 54, -1, -1]
    ]) {
      line(
        ctx,
        [
          [x + dx, y + dy + sy * 9],
          [x + dx, y + dy],
          [x + dx + sx * 9, y + dy]
        ],
        '#ffe0a0',
        3
      );
    }
    line(
      ctx,
      [
        [x + 23, y + 22],
        [x + 31, y + 30],
        [x + 23, y + 30],
        [x + 31, y + 22]
      ],
      '#ffd09b88',
      1
    );
  }
}

export function impacts(ctx, sparks, t) {
  for (const spark of sparks) {
    const age = (t - spark.at) / 0.42,
      c = point(spark.x, spark.y),
      color = spark.heal ? '#cbe9a7' : spark.player ? '#ffc39a' : '#fff1bb';
    ctx.save();
    ctx.globalAlpha = (1 - age) * 0.8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * (1 - age);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 12 + age * 30, 12 + age * 24, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU,
        r = 12 + age * 35;
      line(
        ctx,
        [
          [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r],
          [c.x + Math.cos(a) * (r + 5), c.y + Math.sin(a) * (r + 5)]
        ],
        color,
        2
      );
    }
    if (spark.player && !spark.heal) {
      ctx.globalAlpha = (1 - age) * 0.09;
      ctx.fillStyle = '#e99172';
      ctx.fillRect(LEFT, TOP, WIDTH, HEIGHT);
    }
    ctx.restore();
  }
}

export function atmosphere(ctx, t, area, p) {
  // Wind-borne spores are deterministic and intentionally sparse over walkable cells.
  for (let i = 0; i < 29; i++) {
    const x = LEFT + ((noise(i, 17) * WIDTH + t * (1 + (i % 3))) % WIDTH),
      y =
        TOP +
        ((noise(i, 31) * HEIGHT + t * (i % 2 ? -0.7 : 0.5) + HEIGHT) % HEIGHT);
    const a = 0.2 + Math.sin(t * 1.3 + i * 4) * 0.14;
    ellipse(
      ctx,
      x,
      y,
      i % 5 ? 1 : 1.7,
      i % 5 ? 1 : 1.7,
      `rgba(216,225,165,${a})`
    );
  }
  const vignette = ctx.createRadialGradient(
    LEFT + WIDTH * 0.48,
    TOP + HEIGHT * 0.49,
    150,
    LEFT + WIDTH * 0.48,
    TOP + HEIGHT * 0.49,
    550
  );
  vignette.addColorStop(0, '#061b1a00');
  vignette.addColorStop(0.7, '#061b1a0b');
  vignette.addColorStop(1, '#04171790');
  ctx.fillStyle = vignette;
  ctx.fillRect(LEFT, TOP, WIDTH, HEIGHT);
  // Fine edge ornament, not a UI card: a weathered border for the painted map.
  ctx.strokeStyle = '#6b866440';
  ctx.lineWidth = 1;
  ctx.strokeRect(LEFT + 0.5, TOP + 0.5, WIDTH - 1, HEIGHT - 1);
  for (const [x, y, dx, dy] of [
    [LEFT, TOP, 1, 1],
    [LEFT + WIDTH, TOP, -1, 1],
    [LEFT, TOP + HEIGHT, 1, -1],
    [LEFT + WIDTH, TOP + HEIGHT, -1, -1]
  ]) {
    line(
      ctx,
      [
        [x + dx * 23, y],
        [x, y],
        [x, y + dy * 23]
      ],
      '#9fa97b88',
      1
    );
    diamond(ctx, x + dx * 5, y + dy * 5, 2, '#b0b68a88');
  }
}
