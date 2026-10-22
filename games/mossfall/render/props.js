import {
  TAU,
  point,
  ellipse,
  polygon,
  line,
  glow,
  diamond,
  label
} from './primitives.js';
import { mercyCircle, mercyBell, keeper, forge } from './landmarks.js';
export function exit(ctx, e, t, player) {
  const c = point(e.x, e.y),
    pulse = 0.7 + Math.sin(t * 1.7) * 0.15;
  glow(ctx, c.x, c.y, 48, `rgba(139,200,168,${pulse * 0.19})`);
  ellipse(ctx, c.x, c.y + 20, 24, 8, '#a7c29b20');
  ctx.save();
  ctx.translate(c.x, c.y + 12);
  ctx.beginPath();
  ctx.moveTo(-20, 10);
  ctx.lineTo(-20, -14);
  ctx.quadraticCurveTo(-20, -40, 0, -40);
  ctx.quadraticCurveTo(20, -40, 20, -14);
  ctx.lineTo(20, 10);
  ctx.strokeStyle = '#152d2a';
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.strokeStyle = '#687d66';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.strokeStyle = '#b8c59b';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, -6, 14, 26, 0, 0, TAU);
  ctx.fillStyle = '#83b9a019';
  ctx.fill();
  for (let i = 0; i < 4; i++)
    diamond(ctx, -10 + i * 7, 3 - Math.sin(t + i) * 6, 1.7, '#c7e0b2');
  ctx.restore();
  if (Math.abs(player.x - e.x) + Math.abs(player.y - e.y) < 3)
    label(ctx, c.x, c.y + 34, e.label || 'Passage', '#d1dbc3');
}

export function object(ctx, o, t, world) {
  const c = point(o.x, o.y),
    bob = Math.sin(t * 2 + o.x) * 2;
  if (o.id === 'root-circle') {
    mercyCircle(ctx, c, t);
  } else if (o.id === 'mercy-bell') {
    mercyBell(ctx, c, t);
  } else if (o.kind === 'camp') {
    glow(ctx, c.x, c.y + 2, 70, '#d29c442e');
    ellipse(ctx, c.x, c.y + 18, 23, 9, '#102821');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      ellipse(
        ctx,
        c.x + Math.cos(a) * 17,
        c.y + 12 + Math.sin(a) * 7,
        5,
        3,
        '#73806a'
      );
    }
    line(
      ctx,
      [
        [c.x - 11, c.y + 15],
        [c.x + 11, c.y + 5]
      ],
      '#715c3c',
      5
    );
    line(
      ctx,
      [
        [c.x - 10, c.y + 5],
        [c.x + 11, c.y + 15]
      ],
      '#917247',
      5
    );
    polygon(
      ctx,
      [
        [c.x - 11, c.y + 8],
        [c.x - 6, c.y - 7],
        [c.x - 1, c.y - 2],
        [c.x + 3, c.y - 21 - bob],
        [c.x + 9, c.y - 6],
        [c.x + 11, c.y + 7],
        [c.x + 2, c.y + 13]
      ],
      '#df9d4f'
    );
    polygon(
      ctx,
      [
        [c.x - 5, c.y + 7],
        [c.x, c.y - 5],
        [c.x + 2, c.y + 1],
        [c.x + 5, c.y - 9],
        [c.x + 6, c.y + 9],
        [c.x, c.y + 12]
      ],
      '#ffe2a0'
    );
    for (let i = 0; i < 4; i++) {
      const rise = (t * 14 + i * 13) % 45;
      ellipse(
        ctx,
        c.x + Math.sin(i * 3 + t) * 8,
        c.y - rise,
        1.3,
        1.3,
        `rgba(247,203,126,${1 - rise / 45})`
      );
    }
  } else if (o.kind === 'cache') {
    ellipse(ctx, c.x, c.y + 17, 21, 7, '#0a211b99');
    polygon(
      ctx,
      [
        [c.x - 17, c.y - 2],
        [c.x + 15, c.y - 2],
        [c.x + 15, c.y + 16],
        [c.x - 17, c.y + 16]
      ],
      '#705c3d',
      '#b09a64',
      1
    );
    polygon(
      ctx,
      [
        [c.x - 17, c.y - 2],
        [c.x - 12, c.y - 13],
        [c.x + 11, c.y - 13],
        [c.x + 15, c.y - 2]
      ],
      '#a28b52',
      '#cab47a',
      1
    );
    line(
      ctx,
      [
        [c.x - 9, c.y - 12],
        [c.x - 10, c.y + 15]
      ],
      '#4b5340',
      4
    );
    line(
      ctx,
      [
        [c.x + 8, c.y - 12],
        [c.x + 8, c.y + 15]
      ],
      '#4b5340',
      4
    );
    diamond(ctx, c.x, c.y + 2, 5, '#ead78c');
    glow(ctx, c.x, c.y, 35, '#e0d1931c');
    diamond(ctx, c.x + 17, c.y - 19 + bob, 2, '#e8dc9a');
  } else if (o.id === 'keeper' || o.id === 'neri-home') {
    keeper(ctx, c, bob, o.id === 'neri-home');
  } else if (o.id === 'forge') {
    forge(ctx, c);
  } else if (o.kind === 'seal') {
    glow(ctx, c.x, c.y - 3, 55, '#78c6b938');
    ellipse(ctx, c.x, c.y + 16, 23, 9, '#162d29');
    ellipse(ctx, c.x, c.y + 9, 20, 9, '#647b68');
    ellipse(ctx, c.x, c.y + 7, 16, 6, '#253e37');
    ctx.save();
    ctx.translate(c.x, c.y - 8 + bob);
    ctx.rotate(Math.sin(t * 0.5) * 0.16);
    polygon(
      ctx,
      [
        [0, -20],
        [12, -4],
        [9, 11],
        [0, 18],
        [-11, 7],
        [-10, -8]
      ],
      '#7aa996',
      '#d2e4bb',
      1.5
    );
    polygon(
      ctx,
      [
        [0, -20],
        [0, 18],
        [-11, 7],
        [-10, -8]
      ],
      '#477a70'
    );
    line(
      ctx,
      [
        [0, -13],
        [4, -2],
        [-3, 3],
        [0, 11]
      ],
      '#e4efbc',
      1.5
    );
    ctx.restore();
    for (let i = 0; i < 3; i++)
      diamond(
        ctx,
        c.x + Math.cos(t * 0.5 + (i * TAU) / 3) * 24,
        c.y + Math.sin(t * 0.5 + (i * TAU) / 3) * 9 - 9,
        1.5,
        '#bfe0ba'
      );
  } else if (o.kind === 'gate') {
    glow(ctx, c.x, c.y, 45, '#baaa5d18');
    for (const dx of [-21, 21]) {
      polygon(
        ctx,
        [
          [c.x + dx - 6, c.y + 23],
          [c.x + dx - 6, c.y - 30],
          [c.x + dx + 6, c.y - 34],
          [c.x + dx + 7, c.y + 23]
        ],
        '#596b59',
        '#8d9b72'
      );
      ellipse(ctx, c.x + dx, c.y - 32, 9, 4, '#a7ae7e');
    }
    for (let i = 0; i < 5; i++)
      line(
        ctx,
        [
          [c.x - 17 + i * 8, c.y - 23],
          [c.x - 17 + i * 8, c.y + 20]
        ],
        '#a9a47a',
        2
      );
    line(
      ctx,
      [
        [c.x - 20, c.y - 19],
        [c.x + 20, c.y - 19]
      ],
      '#929d77',
      3
    );
    line(
      ctx,
      [
        [c.x - 21, c.y + 9],
        [c.x + 21, c.y + 9]
      ],
      '#929d77',
      3
    );
    diamond(ctx, c.x, c.y - 5, 7, '#d2b86e');
  } else {
    // Wanderers have cream hoods and carved walking staffs, unlike the player.
    ellipse(ctx, c.x, c.y + 21, 16, 6, '#0c201b99');
    polygon(
      ctx,
      [
        [c.x - 7, c.y - 6],
        [c.x + 8, c.y - 5],
        [c.x + 14, c.y + 19],
        [c.x - 15, c.y + 19]
      ],
      '#938b67',
      '#c7bd8a'
    );
    ellipse(ctx, c.x, c.y - 9, 10, 12, '#c5c29b');
    ellipse(ctx, c.x + 1, c.y - 7, 6, 7, '#394a3d');
    line(
      ctx,
      [
        [c.x + 19, c.y + 22],
        [c.x + 17, c.y - 18],
        [c.x + 23, c.y - 24]
      ],
      '#b7a17a',
      3
    );
    diamond(ctx, c.x, c.y - 31 + bob, 3, '#e7d99f');
  }
  const dist = Math.abs(world.player.x - o.x) + Math.abs(world.player.y - o.y);
  if (dist < 3 && o.id !== 'root-circle')
    label(
      ctx,
      c.x,
      c.y + 34,
      o.id === 'mercy-bell' ? 'Mercy bell' : o.name || o.kind
    );
}
