import {
  TAU,
  point,
  ellipse,
  polygon,
  line,
  glow,
  diamond
} from './primitives.js';
export function enemy(ctx, e, t) {
  const c = point(e.x, e.y),
    bob = Math.sin(t * 2 + e.x) * 1.5;
  ctx.save();
  ctx.translate(c.x, c.y);
  ellipse(
    ctx,
    3,
    21,
    e.kind === 'boss' ? 31 : 19,
    e.kind === 'boss' ? 11 : 7,
    '#041a1a99'
  );
  if (e.kind === 'moth') {
    const flutter = Math.sin(t * 7 + e.x) * 0.12;
    glow(ctx, 0, -9, 37, '#b0b7d51c');
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.rotate(flutter);
      polygon(
        ctx,
        [
          [2, -9],
          [20, -29 + bob],
          [30, -13 + bob],
          [22, 3],
          [8, 10],
          [3, 1]
        ],
        '#a5a5b4',
        '#d5d4cb',
        1
      );
      polygon(
        ctx,
        [
          [6, 0],
          [24, 7],
          [19, 21],
          [5, 11]
        ],
        '#676c82',
        '#a7abaf'
      );
      ellipse(ctx, 18, -11 + bob, 5, 7, '#58687a');
      ellipse(ctx, 18, -11 + bob, 2, 3, '#d2c9a1');
      line(
        ctx,
        [
          [3, -13],
          [9, -23],
          [13, -25]
        ],
        '#c6ccb7',
        1
      );
      ctx.restore();
    }
    ellipse(ctx, 0, 0, 5, 16, '#485562');
    ellipse(ctx, 0, -11, 6, 6, '#dde0c0');
  } else if (e.kind === 'sentinel') {
    for (const dx of [-12, 12])
      polygon(
        ctx,
        [
          [dx - 5, 8],
          [dx + 6, 8],
          [dx + 7, 22],
          [dx - 5, 22]
        ],
        '#5c7169',
        '#869281'
      );
    polygon(
      ctx,
      [
        [-15, -20],
        [13, -22],
        [19, 10],
        [-17, 12]
      ],
      '#526b63',
      '#9eaa8b',
      1.5
    );
    polygon(
      ctx,
      [
        [-12, -20],
        [13, -22],
        [5, -30],
        [-7, -29]
      ],
      '#8b9a82'
    );
    polygon(
      ctx,
      [
        [-13, -17],
        [14, -17],
        [13, -4],
        [-13, -3]
      ],
      '#263d39'
    );
    line(
      ctx,
      [
        [-8, -11],
        [-3, -11]
      ],
      '#d4d899',
      2
    );
    line(
      ctx,
      [
        [4, -11],
        [9, -11]
      ],
      '#d4d899',
      2
    );
    for (const dir of [-1, 1])
      polygon(
        ctx,
        [
          [dir * 18, -10],
          [dir * 27, -5],
          [dir * 25, 13],
          [dir * 17, 9]
        ],
        '#657568',
        '#87977e'
      );
    line(
      ctx,
      [
        [0, 0],
        [-4, 5],
        [1, 8],
        [5, 3],
        [0, 0]
      ],
      '#cfcc8b',
      1.5
    );
    ellipse(ctx, -7, -26, 8, 3, '#708556');
  } else if (e.kind === 'boss') {
    glow(ctx, 0, -4, 55, '#ad744223');
    for (const dir of [-1, 1]) {
      line(
        ctx,
        [
          [dir * 8, -23],
          [dir * 19, -36],
          [dir * 25, -55],
          [dir * 34, -58]
        ],
        '#8d8d63',
        6
      );
      line(
        ctx,
        [
          [dir * 19, -36],
          [dir * 34, -34],
          [dir * 42, -44]
        ],
        '#9da079',
        4
      );
      line(
        ctx,
        [
          [dir * 25, -48],
          [dir * 17, -54]
        ],
        '#b0ae80',
        3
      );
      polygon(
        ctx,
        [
          [dir * 15, -5],
          [dir * 32, 8],
          [dir * 37, 26],
          [dir * 24, 18],
          [dir * 16, 10]
        ],
        '#5b6450',
        '#87906d'
      );
      line(
        ctx,
        [
          [dir * 11, 13],
          [dir * 15, 27],
          [dir * 25, 30]
        ],
        '#71795b',
        7
      );
    }
    polygon(
      ctx,
      [
        [-17, -14],
        [-7, -25],
        [11, -25],
        [20, -9],
        [15, 18],
        [0, 26],
        [-17, 15]
      ],
      '#4f6050',
      '#97a278',
      1.5
    );
    polygon(
      ctx,
      [
        [-13, -15],
        [0, -21],
        [13, -15],
        [7, 6],
        [0, 14],
        [-7, 6]
      ],
      '#b4b08a',
      '#d3ca9f'
    );
    polygon(
      ctx,
      [
        [-10, -10],
        [-3, -7],
        [-6, -3]
      ],
      '#294139'
    );
    polygon(
      ctx,
      [
        [10, -10],
        [3, -7],
        [6, -3]
      ],
      '#294139'
    );
    ellipse(ctx, -6, -7, 2, 1.5, '#f2cd7e');
    ellipse(ctx, 6, -7, 2, 1.5, '#f2cd7e');
    line(
      ctx,
      [
        [0, -2],
        [0, 7]
      ],
      '#777d5b',
      2
    );
    for (let i = 0; i < 3; i++)
      ellipse(ctx, -17 + i * 15, 13 + (i % 2) * 6, 8, 5, '#61794b');
  } else {
    // Bramble wolves: four root-like paws, a long muzzle, and a thorned mane.
    line(
      ctx,
      [
        [-16, 0],
        [-27, -9],
        [-30, -20]
      ],
      '#718756',
      6
    );
    for (const [x, y] of [
      [-12, 8],
      [-5, 11],
      [10, 8],
      [17, 5]
    ])
      line(
        ctx,
        [
          [x, y],
          [x - 3, y + 13],
          [x + 2, y + 14]
        ],
        '#758b57',
        4
      );
    ellipse(ctx, -3, 0, 21, 13, '#4b6744');
    ellipse(ctx, -7, -5, 15, 9, '#698452');
    for (let i = 0; i < 5; i++)
      polygon(
        ctx,
        [
          [-20 + i * 7, -7],
          [-22 + i * 7, -21 - (i % 2) * 4],
          [-12 + i * 7, -8]
        ],
        '#8c9b63'
      );
    polygon(
      ctx,
      [
        [9, -9],
        [10, -23],
        [17, -15],
        [25, -23],
        [26, -5],
        [33, 1],
        [22, 7],
        [12, 3]
      ],
      '#75915e',
      '#a3ac76'
    );
    polygon(
      ctx,
      [
        [13, -18],
        [14, -11],
        [17, -14]
      ],
      '#304e39'
    );
    polygon(
      ctx,
      [
        [23, -18],
        [20, -12],
        [24, -10]
      ],
      '#304e39'
    );
    line(
      ctx,
      [
        [20, -5],
        [24, -5]
      ],
      '#f3ca7f',
      2
    );
    ellipse(ctx, 30, 1, 3, 2, '#243f32');
    line(
      ctx,
      [
        [-11, -8],
        [-5, -2],
        [-9, 6]
      ],
      '#9ca46d',
      1.3
    );
  }
  // Health belongs to the creature, rather than a panel; full-health foes are quiet.
  if (e.hp < e.maxHp || e.intent?.length) {
    const w = e.kind === 'boss' ? 49 : 30,
      y = e.kind === 'boss' ? 40 : 31;
    ctx.fillStyle = '#0b211e';
    ctx.fillRect(-w / 2, y, w, 3);
    ctx.fillStyle = e.intent?.length ? '#e7b073' : '#b1b982';
    ctx.fillRect(-w / 2, y, w * Math.max(0, e.hp / e.maxHp), 3);
  }
  if (e.intent?.length) {
    diamond(ctx, 0, e.kind === 'boss' ? -68 : -39, 5, '#f3bf7b');
  }
  ctx.restore();
}
