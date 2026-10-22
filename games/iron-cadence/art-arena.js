import { path, line, ellipse, glow, gradient } from './art-primitives.js';

// Coordinates intentionally match paint.js's 1100 × 650 world. Scene scales for other canvases.
export function drawArena(c, time = 0, { width = 1100, height = 650 } = {}) {
  c.save();
  c.scale(width / 1100, height / 650);
  c.fillStyle = gradient(c, 0, 0, 0, 650, [
    [0, '#060d1c'],
    [0.5, '#233d4a'],
    [0.7, '#50616a'],
    [1, '#06101c']
  ]);
  c.fillRect(0, 0, 1100, 650);
  // Moon behind torn clouds and a distant flooded city.
  glow(c, 694, 161, 175, '#8cc6d92c');
  ellipse(c, 694, 161, 42, 42, '#b8d5d2');
  ellipse(c, 708, 148, 39, 37, '#263e4c');
  for (let i = 0; i < 12; i++) {
    const x = i * 105 - 90 + Math.sin(time * 0.035 + i) * 13,
      y = 176 + (i % 4) * 19;
    ellipse(c, x, y, 145, 14 + (i % 3) * 8, '#0a1b2b66');
  }
  for (let i = 0; i < 21; i++) {
    const x = i * 61 - 30,
      y = 289 + Math.sin(i * 5.7) * 32;
    path(
      c,
      [
        [x, 429],
        [x, y],
        [x + 17, y],
        [x + 24, y - 28],
        [x + 31, y],
        [x + 46, y],
        [x + 46, 429]
      ],
      '#142b3a'
    );
    if (i % 3 === 0)
      line(
        c,
        [
          [x + 24, y + 22],
          [x + 24, y + 30]
        ],
        '#cdb08555',
        2
      );
  }
  c.fillStyle = gradient(c, 0, 320, 0, 442, [
    [0, '#6c9a9d00'],
    [1, '#789b9b70']
  ]);
  c.fillRect(0, 320, 1100, 122);
  // Gothic stone arcade. Deep silhouettes frame the combat lane without obscuring it.
  for (let i = 0; i < 5; i++) {
    const x = -90 + i * 285;
    c.fillStyle = '#101c29';
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + 285, 0);
    c.lineTo(x + 285, 430);
    c.lineTo(x + 250, 430);
    c.lineTo(x + 250, 206);
    c.bezierCurveTo(x + 250, 153, x + 205, 112, x + 143, 81);
    c.bezierCurveTo(x + 80, 112, x + 35, 153, x + 35, 206);
    c.lineTo(x + 35, 430);
    c.lineTo(x, 430);
    c.closePath();
    c.fill();
    c.strokeStyle = '#74969a35';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x + 33, 421);
    c.lineTo(x + 33, 206);
    c.bezierCurveTo(x + 33, 150, x + 80, 110, x + 143, 78);
    c.bezierCurveTo(x + 205, 110, x + 252, 150, x + 252, 206);
    c.lineTo(x + 252, 421);
    c.stroke();
    c.fillStyle = gradient(c, x, 0, x + 35, 0, [
      [0, '#0b1623'],
      [0.55, '#283b46'],
      [1, '#172632']
    ]);
    c.fillRect(x, 180, 35, 255);
    for (let j = 0; j < 7; j++)
      line(
        c,
        [
          [x, 209 + j * 33],
          [x + 35, 209 + j * 33]
        ],
        '#05121b99',
        2
      );
    path(
      c,
      [
        [x - 9, 415],
        [x + 43, 415],
        [x + 48, 435],
        [x - 14, 435]
      ],
      '#0b1825',
      '#51667155'
    );
  }
  // A torn pennant anchors each side in its own color story.
  for (const [x, color] of [
    [125, '#24575b'],
    [976, '#6b4135']
  ]) {
    line(
      c,
      [
        [x - 20, 172],
        [x + 27, 172]
      ],
      '#8a7a5a',
      3
    );
    path(
      c,
      [
        [x - 17, 174],
        [x + 22, 174],
        [x + 20, 272],
        [x + 6, 264],
        [x - 7, 290],
        [x - 17, 274]
      ],
      color,
      '#c0ac762b'
    );
    line(
      c,
      [
        [x + 2, 188],
        [x + 2, 238],
        [x - 7, 227],
        [x + 2, 207],
        [x + 11, 227],
        [x + 2, 238]
      ],
      '#e1c99355',
      2
    );
  }
  // Shallow water over fractured flagstones; horizon is above the fighters' feet.
  c.fillStyle = gradient(c, 0, 430, 0, 650, [
    [0, '#263d48'],
    [0.18, '#192d3b'],
    [1, '#080e19']
  ]);
  c.fillRect(0, 430, 1100, 220);
  for (let i = 0; i < 13; i++)
    line(
      c,
      [
        [550 + (i - 6) * 75, 431],
        [550 + (i - 6) * 250, 650]
      ],
      '#8ca7ac16'
    );
  for (const y of [439, 454, 479, 519, 582])
    line(
      c,
      [
        [0, y],
        [1100, y]
      ],
      '#97b9bd20'
    );
  for (let i = 0; i < 48; i++) {
    const x = (i * 137.13) % 1100,
      y = 434 + ((i * 19.41) % 169),
      w = 8 + ((i * 13) % 60);
    line(
      c,
      [
        [x, y],
        [x + w, y + Math.sin(i) * 1.8]
      ],
      i % 4 === 0 ? '#a5c3c129' : '#06152288'
    );
  }
  // Moon shimmer is deliberately broken rather than a solid spotlight.
  for (let i = 0; i < 22; i++) {
    const y = 434 + i * 6,
      x = 694 + Math.sin(i * 9 + time * 0.6) * (10 + i),
      w = 5 + i * 1.8;
    line(
      c,
      [
        [x - w, y],
        [x + w, y]
      ],
      `rgba(159,202,201,${0.12 - i * 0.004})`,
      1.5
    );
  }
  for (const x of [91, 1009]) drawBrazier(c, x, 414, time);
  for (let i = 0; i < 4; i++)
    ellipse(
      c,
      450 + Math.sin(time * 0.09 + i) * 160,
      405 + i * 13,
      650,
      10,
      '#adc5c108'
    );
  // Quiet rain stays behind the combatants and their telegraphs.
  c.lineWidth = 0.7;
  c.strokeStyle = '#bee3ed22';
  c.beginPath();
  for (let i = 0; i < 105; i++) {
    const x = ((i * 79.37 + time * 24) % 1160) - 30,
      y = (i * 53.71 + time * 265) % 470;
    c.moveTo(x, y);
    c.lineTo(x - 5, y + 14);
  }
  c.stroke();
  const vignette = c.createRadialGradient(550, 355, 230, 550, 355, 660);
  vignette.addColorStop(0, '#01071200');
  vignette.addColorStop(1, '#010712b8');
  c.fillStyle = vignette;
  c.fillRect(0, 0, 1100, 650);
  c.restore();
}
function drawBrazier(c, x, y, time) {
  glow(c, x, y - 60, 94, '#eb7e282c');
  glow(c, x, y - 54, 37, '#ffbe4b45');
  path(
    c,
    [
      [x - 7, y],
      [x - 4, y - 48],
      [x + 4, y - 48],
      [x + 7, y]
    ],
    '#101a24',
    '#79705a66'
  );
  path(
    c,
    [
      [x - 19, y - 57],
      [x + 19, y - 57],
      [x + 10, y - 45],
      [x - 10, y - 45]
    ],
    '#101824',
    '#9c866055',
    2
  );
  const flicker = Math.sin(time * 9 + x) * 3;
  path(
    c,
    [
      [x - 11, y - 57],
      [x - 13, y - 69],
      [x - 4, y - 80],
      [x - 2, y - 91 - flicker],
      [x + 7, y - 74],
      [x + 12, y - 66],
      [x + 8, y - 57]
    ],
    '#e88a3c'
  );
  path(
    c,
    [
      [x - 5, y - 57],
      [x - 7, y - 67],
      [x + 1, y - 80 + flicker],
      [x + 6, y - 64],
      [x + 4, y - 57]
    ],
    '#ffe5a3'
  );
  for (let i = 0; i < 9; i++) {
    const k = (time * 0.5 + i * 0.17) % 1;
    ellipse(
      c,
      x + Math.sin(i * 8 + k * 6) * 10,
      y - 70 - k * 45,
      1,
      1,
      '#ffc97988'
    );
  }
  for (let i = 0; i < 10; i++)
    line(
      c,
      [
        [x - 12 - i, 443 + i * 8],
        [x + 12 + i, 443 + i * 8]
      ],
      `rgba(238,156,83,${0.16 - i * 0.012})`,
      2
    );
}
