import {
  TAU,
  ellipse,
  polygon,
  line,
  glow,
  diamond,
  label
} from './primitives.js';
// Hand-authored identities that override the standard object silhouettes.

export function mercyCircle(ctx, c, t) {
  const pulse = 0.72 + Math.sin(t * 2.4) * 0.16;
  glow(ctx, c.x, c.y + 5, 47, `rgba(142,222,180,${pulse * 0.3})`);
  ellipse(ctx, c.x, c.y + 5, 27, 22, '#a2dcb31f');
  ctx.save();
  ctx.strokeStyle = '#b9ecc0';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 5, 25, 20, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#83cda8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 5, 19, 14, 0, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const x = c.x + Math.cos(a) * 25;
    const y = c.y + 5 + Math.sin(a) * 20;
    diamond(ctx, x, y, 4, '#e4f3c2');
  }
  line(
    ctx,
    [
      [c.x - 7, c.y + 10],
      [c.x, c.y - 1],
      [c.x + 7, c.y + 10]
    ],
    '#d3ebbc',
    1.5
  );
  line(
    ctx,
    [
      [c.x - 7, c.y + 3],
      [c.x + 7, c.y + 3]
    ],
    '#d3ebbc',
    1.5
  );
  ctx.restore();
  label(ctx, c.x, c.y + 35, 'Mercy circle', '#e1f1c4');
}

export function mercyBell(ctx, c, t) {
  glow(ctx, c.x, c.y - 5, 43, '#dfba682b');
  ellipse(ctx, c.x, c.y + 21, 27, 8, '#0a201d99');
  for (const dx of [-22, 22]) {
    line(
      ctx,
      [
        [c.x + dx, c.y + 22],
        [c.x + dx, c.y - 34]
      ],
      '#6d7656',
      5
    );
    line(
      ctx,
      [
        [c.x + dx - 1, c.y + 20],
        [c.x + dx - 1, c.y - 32]
      ],
      '#a4a779',
      1
    );
  }
  line(
    ctx,
    [
      [c.x - 26, c.y - 33],
      [c.x + 26, c.y - 33]
    ],
    '#a4a779',
    5
  );
  line(
    ctx,
    [
      [c.x, c.y - 32],
      [c.x, c.y - 23]
    ],
    '#d9bd7b',
    2
  );
  ctx.save();
  ctx.translate(c.x, c.y - 22);
  ctx.rotate(Math.sin(t * 1.7) * 0.035);
  ctx.beginPath();
  ctx.moveTo(-16, 26);
  ctx.quadraticCurveTo(-9, 19, -9, 9);
  ctx.quadraticCurveTo(-9, 0, 0, 0);
  ctx.quadraticCurveTo(9, 0, 9, 9);
  ctx.quadraticCurveTo(9, 19, 16, 26);
  ctx.closePath();
  const brass = ctx.createLinearGradient(-16, 0, 16, 0);
  brass.addColorStop(0, '#9b8246');
  brass.addColorStop(0.45, '#f0cf7c');
  brass.addColorStop(1, '#b79850');
  ctx.fillStyle = brass;
  ctx.fill();
  ctx.strokeStyle = '#efd89b';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ellipse(ctx, 0, 26, 16, 4, '#7d6d3e');
  ellipse(ctx, 0, 25, 14, 2, '#cab774');
  line(
    ctx,
    [
      [0, 23],
      [0, 31]
    ],
    '#e7c987',
    2
  );
  ellipse(ctx, 0, 32, 3, 3, '#edc779');
  line(
    ctx,
    [
      [-5, 7],
      [-5, 16]
    ],
    '#fff0b7',
    1.5
  );
  ctx.restore();
}

export function keeper(ctx, c, bob, freed = false) {
  glow(ctx, c.x, c.y - 5, 41, '#c0a9d321');
  ellipse(ctx, c.x, c.y + 22, 20, 7, '#0a201c99');
  polygon(
    ctx,
    [
      [c.x - 8, c.y - 8],
      [c.x + 7, c.y - 8],
      [c.x + 15, c.y + 20],
      [c.x - 14, c.y + 20]
    ],
    '#847890',
    '#b6a7b2'
  );
  polygon(
    ctx,
    [
      [c.x - 10, c.y - 9],
      [c.x - 8, c.y - 23],
      [c.x + 1, c.y - 28],
      [c.x + 10, c.y - 20],
      [c.x + 9, c.y - 6]
    ],
    '#b1a1b3'
  );
  ellipse(ctx, c.x + 1, c.y - 14, 6, 8, '#47524e');
  line(
    ctx,
    [
      [c.x - 1, c.y - 16],
      [c.x + 3, c.y - 16]
    ],
    '#e7d5b0',
    1.5
  );
  line(
    ctx,
    [
      [c.x + 9, c.y + 1],
      [c.x + 20, c.y - 1]
    ],
    '#c5b7b0',
    3
  );
  diamond(ctx, c.x + 20, c.y - 7 + bob, 4, '#d6e7c2');
  for (const dir of freed ? [] : [-1, 1]) {
    line(
      ctx,
      [
        [c.x + dir * 23, c.y + 22],
        [c.x + dir * 16, c.y + 12],
        [c.x + dir * 20, c.y + 3],
        [c.x + dir * 14, c.y - 4]
      ],
      '#526b48',
      3
    );
    polygon(
      ctx,
      [
        [c.x + dir * 19, c.y + 10],
        [c.x + dir * 28, c.y + 5],
        [c.x + dir * 22, c.y + 14]
      ],
      '#879366'
    );
  }
}

export function forge(ctx, c) {
  ellipse(ctx, c.x, c.y + 21, 22, 8, '#112820');
  polygon(
    ctx,
    [
      [c.x - 14, c.y + 3],
      [c.x + 13, c.y + 3],
      [c.x + 16, c.y + 21],
      [c.x - 17, c.y + 21]
    ],
    '#655b43',
    '#938467'
  );
  polygon(
    ctx,
    [
      [c.x - 22, c.y - 10],
      [c.x + 24, c.y - 10],
      [c.x + 14, c.y - 2],
      [c.x + 5, c.y],
      [c.x + 5, c.y + 9],
      [c.x - 11, c.y + 9],
      [c.x - 10, c.y - 1]
    ],
    '#758580',
    '#afbbb0'
  );
  line(
    ctx,
    [
      [c.x - 17, c.y - 12],
      [c.x + 25, c.y - 12]
    ],
    '#d0d3b6',
    2
  );
  line(
    ctx,
    [
      [c.x + 12, c.y + 17],
      [c.x + 24, c.y + 3]
    ],
    '#b8a17c',
    3
  );
  polygon(
    ctx,
    [
      [c.x + 20, c.y - 1],
      [c.x + 29, c.y + 5],
      [c.x + 25, c.y + 11],
      [c.x + 16, c.y + 5]
    ],
    '#96a397'
  );
}
