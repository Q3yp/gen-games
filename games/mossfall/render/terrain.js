import {
  CELL,
  LEFT,
  TOP,
  TAU,
  noise,
  point,
  ellipse,
  polygon,
  diamond,
  line
} from './primitives.js';
export function palette(area) {
  const text = `${area.name || ''} ${area.subtitle || ''}`.toLowerCase();
  const ruins =
    /ruin|abbey|stone|vault|shrine|bell|sanctum|archive|drowned/.test(text);
  const deep = /root|heart|hollow|crown|depth|throne/.test(text);
  return {
    ruins,
    deep,
    ground: deep ? '#172b29' : ruins ? '#223732' : '#263c30',
    grass: deep ? '#315046' : '#3d5940',
    edge: deep ? '#0d2122' : '#142a24',
    tree: deep ? '#24443e' : '#315341',
    leaf: deep ? '#375c4d' : '#496c4a',
    light: deep ? '#588268' : '#688458',
    water: deep ? '#123b43' : '#173f43'
  };
}

export function ground(ctx, x, y, tile, p, t, map) {
  const sx = LEFT + x * CELL,
    sy = TOP + y * CELL;
  const n = noise(x, y);
  ctx.fillStyle = tile === '~' ? p.water : p.ground;
  ctx.fillRect(sx, sy, CELL, CELL);
  if (tile === '~') {
    const g = ctx.createLinearGradient(sx, sy, sx + CELL, sy + CELL);
    g.addColorStop(0, '#294f4d');
    g.addColorStop(1, p.water);
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, CELL, CELL);
    for (let i = 0; i < 4; i++) {
      const yy = sy + 8 + i * 13,
        xx = sx + 8 + noise(x, y, i + 9) * 18;
      const sway = Math.sin(t * 0.7 + y + i) * 4;
      line(
        ctx,
        [
          [xx + sway, yy],
          [xx + 12 + sway, yy - 1],
          [xx + 19 + sway, yy]
        ],
        i % 2 ? '#3b6766' : '#4c7d77',
        1
      );
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      if (map[y + dy]?.[x + dx] && map[y + dy][x + dx] !== '~') {
        const points = dx
          ? [
              [sx + (dx > 0 ? 58 : 2), sy],
              [sx + (dx > 0 ? 58 : 2), sy + 60]
            ]
          : [
              [sx, sy + (dy > 0 ? 58 : 2)],
              [sx + 60, sy + (dy > 0 ? 58 : 2)]
            ];
        line(ctx, points, '#517569', 3);
        line(ctx, points, '#83a28b55', 1);
      }
    }
    if (n > 0.78) {
      ellipse(ctx, sx + 35, sy + 35, 8, 4, '#547756');
      line(
        ctx,
        [
          [sx + 35, sy + 35],
          [sx + 40, sy + 32]
        ],
        p.water,
        2
      );
      ellipse(ctx, sx + 33, sy + 32, 2, 1, '#d6d7a0');
    }
    return;
  }
  // Soft soil patches and individual blades make a tile map without a board grid.
  ellipse(ctx, sx + 26, sy + 31, 26, 22, n > 0.5 ? '#37503a55' : '#152d2638');
  for (let i = 0; i < 8; i++) {
    const gx = sx + 5 + noise(x, y, i + 1) * 50,
      gy = sy + 7 + noise(y, x, i + 35) * 46;
    if (i < 4) {
      line(
        ctx,
        [
          [gx - 2, gy],
          [gx, gy - 4 - noise(x, i) * 3],
          [gx + 1, gy]
        ],
        p.grass,
        1
      );
    } else
      ellipse(
        ctx,
        gx,
        gy,
        1.1 + noise(x, y, i),
        0.7,
        n > 0.5 ? '#7a866050' : '#a8ac7840'
      );
  }
  if (p.ruins && n > 0.58 && tile !== '#') {
    polygon(
      ctx,
      [
        [sx + 8, sy + 11],
        [sx + 29, sy + 8],
        [sx + 32, sy + 21],
        [sx + 11, sy + 24]
      ],
      '#46554a65',
      '#61715a35'
    );
    polygon(
      ctx,
      [
        [sx + 32, sy + 34],
        [sx + 49, sy + 31],
        [sx + 51, sy + 43],
        [sx + 34, sy + 46]
      ],
      '#40534b65'
    );
  }
  if (n > 0.89 && tile !== '#') {
    for (let i = 0; i < 3; i++) {
      const fx = sx + 12 + i * 5,
        fy = sy + 43 - (i % 2) * 5;
      line(
        ctx,
        [
          [fx, fy],
          [fx, fy - 4]
        ],
        '#79966a',
        1
      );
      ellipse(ctx, fx, fy - 4, 1.6, 1.6, p.deep ? '#81a9a0' : '#b2b796');
    }
  }
}

export function tree(ctx, x, y, p, t) {
  const c = point(x, y),
    n = noise(x, y),
    h = 20 + n * 7;
  ellipse(ctx, c.x + 7, c.y + 21, 29, 11, '#06191570');
  // The warm timber and exposed roots are a visual cue that this cell is solid.
  line(
    ctx,
    [
      [c.x - 11, c.y + 24],
      [c.x - 2, c.y + 11],
      [c.x + 6, c.y + 11],
      [c.x + 13, c.y + 25]
    ],
    '#39483a',
    5
  );
  polygon(
    ctx,
    [
      [c.x - 6, c.y + 21],
      [c.x - 4, c.y - h],
      [c.x + 5, c.y - h],
      [c.x + 9, c.y + 19]
    ],
    '#4b5340',
    '#202f29'
  );
  line(
    ctx,
    [
      [c.x + 2, c.y + 18],
      [c.x, c.y - 15]
    ],
    '#74806055',
    2
  );
  const leaves = [
    [-18, -4, 17, 16],
    [18, -6, 18, 17],
    [0, -21, 21, 19],
    [-7, 2, 25, 18],
    [10, -14, 20, 20]
  ];
  for (let i = 0; i < leaves.length; i++) {
    const [dx, dy, rx, ry] = leaves[i];
    ellipse(ctx, c.x + dx, c.y + dy - 3, rx, ry, '#102b25');
    ellipse(
      ctx,
      c.x + dx - 1,
      c.y + dy - 6,
      rx - 1,
      ry - 2,
      i % 2 ? p.leaf : p.tree
    );
    ctx.beginPath();
    ctx.ellipse(
      c.x + dx - 2,
      c.y + dy - 9,
      rx * 0.65,
      ry * 0.61,
      -0.3,
      Math.PI * 1.05,
      Math.PI * 1.8
    );
    ctx.strokeStyle = p.light + '70';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const lx = c.x - 25 + noise(x, y, i + 71) * 49,
      ly = c.y - 26 + noise(x, y, i + 81) * 36;
    line(
      ctx,
      [
        [lx, ly],
        [lx + 3, ly - 1]
      ],
      i % 3 ? p.leaf : p.light,
      1.5
    );
  }
  if (n > 0.82) {
    line(
      ctx,
      [
        [c.x - 21, c.y + 20],
        [c.x - 21, c.y + 15]
      ],
      '#adb49c',
      2
    );
    ellipse(ctx, c.x - 21, c.y + 14, 4.5, 2, '#ad765d');
    ellipse(ctx, c.x - 20, c.y + 13, 1, 0.7, '#e7c9a7');
  }
}

export function ruin(ctx, x, y, p) {
  const c = point(x, y),
    n = noise(x, y);
  ellipse(ctx, c.x + 5, c.y + 23, 29, 10, '#081b1b80');
  polygon(
    ctx,
    [
      [c.x - 25, c.y - 20],
      [c.x + 20, c.y - 23],
      [c.x + 26, c.y + 19],
      [c.x - 23, c.y + 23]
    ],
    '#374b46',
    '#142f2d',
    2
  );
  polygon(
    ctx,
    [
      [c.x - 25, c.y - 20],
      [c.x - 17, c.y - 29],
      [c.x + 24, c.y - 29],
      [c.x + 20, c.y - 23]
    ],
    '#617063'
  );
  polygon(
    ctx,
    [
      [c.x + 20, c.y - 23],
      [c.x + 24, c.y - 29],
      [c.x + 29, c.y + 12],
      [c.x + 26, c.y + 19]
    ],
    '#293f3c'
  );
  line(
    ctx,
    [
      [c.x - 23, c.y - 3],
      [c.x + 21, c.y - 7]
    ],
    '#182e2b',
    2
  );
  line(
    ctx,
    [
      [c.x - 22, c.y + 12],
      [c.x + 24, c.y + 7]
    ],
    '#1b302c',
    2
  );
  line(
    ctx,
    [
      [c.x + 2, c.y - 22],
      [c.x, c.y - 5],
      [c.x - 8, c.y + 10]
    ],
    '#18302e',
    2
  );
  line(
    ctx,
    [
      [c.x - 17, c.y - 24],
      [c.x + 15, c.y - 26]
    ],
    '#9aa07b55',
    1
  );
  ellipse(ctx, c.x - 11, c.y - 24, 13, 4, p.leaf);
  line(
    ctx,
    [
      [c.x - 17, c.y - 22],
      [c.x - 15, c.y - 11],
      [c.x - 19, c.y - 1]
    ],
    '#789265',
    3
  );
  if (n > 0.55) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    diamond(ctx, c.x + 11, c.y + 5, 5, '#a9b18b');
    diamond(ctx, c.x + 11, c.y + 5, 2, '#374b46');
    ctx.restore();
  }
}
