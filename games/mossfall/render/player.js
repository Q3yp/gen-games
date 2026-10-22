import { point, ellipse, polygon, line, glow, diamond } from './primitives.js';
export function player(ctx, p, t, world) {
  const c = point(p.x, p.y),
    bob = Math.sin(t * 2.5) * 0.7;
  glow(ctx, c.x + 15, c.y - 4, 78, '#e4b46125');
  ellipse(ctx, c.x, c.y + 22, 19, 7, '#081c1ca6');
  ctx.strokeStyle = '#bed7bb77';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 20, 21, 8, 0, 0.1, Math.PI * 1.75);
  ctx.stroke();
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  line(
    ctx,
    [
      [-6, 13],
      [-7, 23]
    ],
    '#a4aa8b',
    4
  );
  line(
    ctx,
    [
      [6, 13],
      [7, 23]
    ],
    '#a4aa8b',
    4
  );
  polygon(
    ctx,
    [
      [-8, -9],
      [8, -8],
      [18, 18],
      [5, 23],
      [-15, 18]
    ],
    '#3c8c81',
    '#91b8a1',
    1.2
  );
  polygon(
    ctx,
    [
      [-8, -9],
      [-3, 1],
      [-2, 19],
      [-15, 18]
    ],
    '#27655f'
  );
  line(
    ctx,
    [
      [2, -3],
      [8, 18]
    ],
    '#97b6a0',
    1
  );
  polygon(
    ctx,
    [
      [-11, -12],
      [-8, -22],
      [1, -27],
      [10, -20],
      [12, -9],
      [3, -4],
      [-5, -5]
    ],
    '#6ba08c',
    '#bdd0ac',
    1
  );
  ellipse(ctx, 2, -14, 6.5, 7, '#153c37');
  line(
    ctx,
    [
      [0, -16],
      [3, -16]
    ],
    '#eed8a2',
    1.7
  );
  polygon(
    ctx,
    [
      [-9, -8],
      [5, -4],
      [10, 0],
      [-2, 0]
    ],
    '#b7b78b'
  );
  line(
    ctx,
    [
      [8, 1],
      [18, 3],
      [20, -4]
    ],
    '#a6bda0',
    3
  );
  line(
    ctx,
    [
      [21, -8],
      [21, -4]
    ],
    '#e1c080',
    1.5
  );
  ctx.strokeStyle = '#c7ab75';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(21, -7, 4, Math.PI, 0);
  ctx.stroke();
  polygon(
    ctx,
    [
      [16, -6],
      [25, -6],
      [26, 5],
      [21, 8],
      [16, 4]
    ],
    '#f7d996',
    '#d6b66f'
  );
  line(
    ctx,
    [
      [18, -5],
      [18, 4]
    ],
    '#9b814c',
    1
  );
  line(
    ctx,
    [
      [24, -5],
      [24, 4]
    ],
    '#9b814c',
    1
  );
  ellipse(ctx, 21, 0, 2, 4, '#fff5cf');
  // The off-hand weapon visibly tracks the equipped loadout. Keep the lantern
  // on the other side so both the tool and the traveler's outline read clearly.
  ctx.save();
  ctx.translate(-18, 4);
  ctx.rotate(-0.12);
  if (p.weapon === 'spear') {
    line(
      ctx,
      [
        [0, 24],
        [0, -36]
      ],
      '#705d3f',
      4
    );
    line(
      ctx,
      [
        [-0.8, 23],
        [-0.8, -36]
      ],
      '#d4bc82',
      1.4
    );
    polygon(
      ctx,
      [
        [0, -54],
        [-6, -41],
        [-4, -34],
        [0, -29],
        [5, -36],
        [6, -41]
      ],
      '#c9d9bd',
      '#edf0c9',
      1
    );
    polygon(
      ctx,
      [
        [0, -54],
        [0, -29],
        [-4, -34],
        [-6, -41]
      ],
      '#749a90'
    );
    line(
      ctx,
      [
        [-3, -30],
        [3, -30]
      ],
      '#e6bf73',
      3
    );
    line(
      ctx,
      [
        [-3, -27],
        [3, -27]
      ],
      '#92754a',
      2
    );
  } else if (p.weapon === 'axe') {
    line(
      ctx,
      [
        [0, 19],
        [0, -29]
      ],
      '#806541',
      5
    );
    line(
      ctx,
      [
        [-1, 17],
        [-1, -28]
      ],
      '#c8ab6d',
      1.5
    );
    polygon(
      ctx,
      [
        [-2, -30],
        [-9, -31],
        [-18, -35],
        [-21, -26],
        [-18, -14],
        [-9, -17],
        [-3, -21],
        [6, -19],
        [7, -28]
      ],
      '#c9a759',
      '#f1d394',
      1.3
    );
    polygon(
      ctx,
      [
        [-18, -35],
        [-21, -26],
        [-18, -14],
        [-15, -17],
        [-17, -26],
        [-15, -32]
      ],
      '#f4dda3'
    );
    line(
      ctx,
      [
        [-10, -29],
        [-14, -24],
        [-10, -20]
      ],
      '#8e733e',
      1.5
    );
    diamond(ctx, 0, -25, 3, '#f0d493');
  } else {
    polygon(
      ctx,
      [
        [0, -30],
        [-4, -22],
        [-3, -5],
        [3, -5],
        [4, -22]
      ],
      '#c4d4c5',
      '#f1edca',
      1
    );
    polygon(
      ctx,
      [
        [0, -30],
        [0, -5],
        [-3, -5],
        [-4, -22]
      ],
      '#7c9d96'
    );
    line(
      ctx,
      [
        [-7, -3],
        [7, -3]
      ],
      '#e5c681',
      3
    );
    line(
      ctx,
      [
        [0, -1],
        [0, 10]
      ],
      '#6d6546',
      4
    );
    diamond(ctx, 0, 13, 3, '#d9bd7c');
  }
  ctx.restore();
  line(
    ctx,
    [
      [-9, 0],
      [-14, 5],
      [-18, 4]
    ],
    '#aac2a3',
    4
  );
  ellipse(ctx, -18, 4, 2.5, 3, '#d1cda7');
  ctx.restore();
}
