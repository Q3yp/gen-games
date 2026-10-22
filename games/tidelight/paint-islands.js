import { TAU, noise, ellipse, glow, line, arch } from './paint-primitives.js';

export function island(c, o, t, index) {
  const r = o.r || 65,
    x = o.x,
    y = o.y;
  if (o.awake) awakenedFins(c, x, y, r, t);
  ellipse(c, x + 15, y + 20, r * 1.17, r * 0.75, 'rgba(3,15,27,.47)');
  for (let k = 3; k > 0; k--) {
    c.strokeStyle = `rgba(95,181,174,${0.035 + k * 0.015})`;
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(
      x,
      y + 7,
      r + 15 + k * 10 + Math.sin(t + k) * 2,
      r * 0.66 + 8 + k * 6,
      0,
      0,
      TAU
    );
    c.stroke();
  }
  c.beginPath();
  for (let k = 0; k <= 30; k++) {
    const a = (k / 30) * TAU,
      rr = r * (0.9 + noise(k + index * 37) * 0.12);
    let px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr * 0.67;
    (k ? c.lineTo : c.moveTo).call(c, px, py);
  }
  c.closePath();
  const ground = c.createLinearGradient(x, y - r, x, y + r);
  ground.addColorStop(0, '#476a65');
  ground.addColorStop(0.5, '#314e51');
  ground.addColorStop(1, '#1e373e');
  c.fillStyle = ground;
  c.fill();
  c.strokeStyle = '#6d8a78';
  c.lineWidth = 2;
  c.stroke();
  for (let j = 0; j < 35; j++) {
    const a = noise(j + index * 61) * TAU,
      rr = Math.sqrt(noise(j + 88)) * r * 0.85;
    ellipse(
      c,
      x + Math.cos(a) * rr,
      y + Math.sin(a) * rr * 0.62,
      2 + noise(j) * 5,
      1 + noise(j + 2) * 2,
      ['#55776a', '#27474a', '#6b8068'][j % 3]
    );
  }
  // Flood-worn paving and a descending flight of steps.
  for (let j = 0; j < 5; j++) {
    const yy = y + r * 0.42 + j * 6;
    line(
      c,
      [
        [x - 21 + j * 2, yy],
        [x + 25 - j * 2, yy]
      ],
      j === 0 ? '#a2a58a' : '#627b70',
      4
    );
    line(
      c,
      [
        [x - 21 + j * 2, yy + 2],
        [x + 25 - j * 2, yy + 2]
      ],
      '#1a343c',
      1
    );
  }
  if (o.kind === 'gate') {
    arch(c, x - 12, y + 2, r * 0.91, r * 1.45);
    arch(c, x + 15, y + 5, r * 0.6, r * 1.14, 0.7);
    line(
      c,
      [
        [x - r * 0.65, y - r * 0.7],
        [x - r * 0.8, y - r * 1.3],
        [x - r * 0.76, y - r * 1.5]
      ],
      '#73877b',
      3
    );
  } else if (o.kind === 'sanctuary') {
    ellipse(c, x, y + 1, r * 0.47, r * 0.25, '#7a8b79');
    ellipse(c, x, y - 1, r * 0.36, r * 0.18, '#243d43');
    if (o.bloom) sanctuaryPortal(c, x, y - 8, r, t);
    arch(c, x, y - 8, r * 0.9, r * 1.25);
    glow(c, x, y - 30, r * 0.7, 'rgba(92,219,187,.16)');
    for (let j = 0; j < 3; j++) {
      let xx = x + (j - 1) * 23;
      line(
        c,
        [
          [xx, y - 11],
          [xx, y - 25]
        ],
        '#b6a26f',
        3
      );
      ellipse(c, xx, y - 28, 2, 4, '#ffe2a1');
    }
  } else {
    arch(c, x - r * 0.23, y - 3, r * 0.55, r * 0.95);
    c.fillStyle = '#3e5656';
    c.fillRect(x + r * 0.22, y - r * 0.48, r * 0.21, r * 0.5);
    line(
      c,
      [
        [x + r * 0.22, y - r * 0.48],
        [x + r * 0.43, y - r * 0.48]
      ],
      '#91a18a',
      3
    );
    for (let j = 0; j < 5; j++)
      line(
        c,
        [
          [x + r * 0.28 + j * 2, y - r * 0.45],
          [x + r * 0.28 + j * 2, y - 2]
        ],
        '#233f45',
        0.8
      );
  }
  if (o.bloom) sanctuaryGarden(c, x, y, r, t);
  if (o.id === 'bell') hangingBell(c, x - r * 0.23, y - r * 0.49, r, t);
  if (o.awake) awakenedFace(c, x, y, r, t);
  // Delicate reeds keep the shore visually porous.
  for (let j = 0; j < 14; j++) {
    let a = noise(j + index * 7) * TAU,
      xx = x + Math.cos(a) * r * 0.9,
      yy = y + Math.sin(a) * r * 0.56;
    line(
      c,
      [
        [xx, yy],
        [xx - 3, yy - 7 - noise(j) * 12]
      ],
      '#809886',
      0.8
    );
  }
}

function hangingBell(c, x, y, r, t) {
  c.save();
  c.translate(x, y - r * 0.15);
  c.rotate(Math.sin(t * 2.8) * 0.025);
  line(
    c,
    [
      [0, -r * 0.12],
      [0, 3]
    ],
    '#a59572',
    2
  );
  c.fillStyle = '#8e8766';
  c.strokeStyle = '#c1b18a';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-5, 2);
  c.quadraticCurveTo(-11, 5, -11, 15);
  c.lineTo(-15, 21);
  c.quadraticCurveTo(0, 25, 15, 21);
  c.lineTo(11, 15);
  c.quadraticCurveTo(11, 5, 5, 2);
  c.closePath();
  c.fill();
  c.stroke();
  ellipse(c, 0, 22, 13, 2.5, '#233b40');
  line(
    c,
    [
      [0, 18],
      [0, 27]
    ],
    '#bba87b',
    2
  );
  ellipse(c, 0, 27, 2.7, 2.7, '#d8bc83');
  c.restore();
}

function awakenedFins(c, x, y, r, t) {
  const sway = Math.sin(t * 0.85 + x) * 7;
  for (const side of [-1, 1]) {
    c.save();
    c.translate(x, y + r * 0.24);
    c.scale(side, 1);
    const fin = c.createLinearGradient(r * 0.5, 0, r * 1.6, r * 0.7);
    fin.addColorStop(0, '#426764');
    fin.addColorStop(1, 'rgba(90,165,156,.12)');
    c.fillStyle = fin;
    c.strokeStyle = 'rgba(145,201,175,.48)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(r * 0.65, -r * 0.1);
    c.bezierCurveTo(r, -r * 0.24, r * 1.23, r * 0.05, r * 1.6, r * 0.54 + sway);
    c.quadraticCurveTo(r * 1.12, r * 0.42, r * 0.78, r * 0.53);
    c.closePath();
    c.fill();
    c.stroke();
    line(
      c,
      [
        [r * 0.78, r * 0.08],
        [r * 1.1, r * 0.2],
        [r * 1.46, r * 0.47 + sway]
      ],
      'rgba(192,202,160,.24)',
      1
    );
    c.restore();
  }
}

function awakenedFace(c, x, y, r, t) {
  glow(c, x, y - r * 0.45, r * 0.8, 'rgba(255,204,119,.12)');
  const breathe = 1 + Math.sin(t * 1.3) * 0.05;
  for (const side of [-1, 1]) {
    const xx = x + side * r * 0.34,
      yy = y + r * 0.72;
    glow(c, xx, yy, r * 0.36, 'rgba(255,194,103,.22)');
    ellipse(c, xx, yy, r * 0.16, r * 0.095 * breathe, '#152e37');
    ellipse(c, xx, yy, r * 0.12, r * 0.073 * breathe, '#e3b978');
    ellipse(c, xx, yy, r * 0.042, r * 0.064 * breathe, '#374c48');
    ellipse(c, xx - r * 0.027, yy - r * 0.027, r * 0.023, r * 0.02, '#fff2c5');
    line(
      c,
      [
        [xx - r * 0.16, yy + r * 0.12],
        [xx + r * 0.14, yy + r * 0.12]
      ],
      'rgba(224,197,135,.22)',
      1
    );
  }
}

function sanctuaryPortal(c, x, y, r, t) {
  glow(c, x, y - r * 0.5, r * 1.15, 'rgba(111,244,206,.22)');
  c.save();
  c.beginPath();
  c.moveTo(x - r * 0.31, y);
  c.lineTo(x - r * 0.31, y - r * 0.8);
  c.quadraticCurveTo(x - r * 0.31, y - r * 1.03, x, y - r * 1.13);
  c.quadraticCurveTo(x + r * 0.31, y - r * 1.03, x + r * 0.31, y - r * 0.8);
  c.lineTo(x + r * 0.31, y);
  c.closePath();
  c.clip();
  const water = c.createLinearGradient(x, y - r * 1.15, x, y);
  water.addColorStop(0, '#f5dea0');
  water.addColorStop(0.35, '#6bd8b6');
  water.addColorStop(1, '#287b84');
  c.fillStyle = water;
  c.fillRect(x - r * 0.33, y - r * 1.2, r * 0.66, r * 1.2);
  for (let j = 0; j < 19; j++) {
    const yy = y - ((j * 8 + t * 11) % (r * 1.2));
    const xx = x + Math.sin(j * 1.7 + t) * r * 0.12;
    line(
      c,
      [
        [xx - r * 0.25, yy],
        [xx + r * 0.25, yy - 2]
      ],
      j % 3 === 0 ? 'rgba(255,240,178,.7)' : 'rgba(171,255,224,.45)',
      1.5
    );
  }
  c.restore();
}

function sanctuaryGarden(c, x, y, r, t) {
  for (let j = 0; j < 26; j++) {
    const a = (j / 26) * TAU;
    const xx = x + Math.cos(a) * r * 0.84;
    const yy = y + Math.sin(a) * r * 0.53;
    const tip = yy - 8 - noise(j + 23) * 12;
    line(
      c,
      [
        [xx, yy],
        [xx - 2, tip + 5],
        [xx + 1, tip]
      ],
      '#79aa83',
      1.4
    );
    ellipse(c, xx - 5, tip + 8, 4, 1.8, '#86bb91');
    ellipse(c, xx + 4, tip + 4, 4, 1.8, '#acd0a0');
    const color = j % 3 === 0 ? '#f3d795' : '#bde7cb';
    for (let k = 0; k < 4; k++) {
      const petal = (k * TAU) / 4 + t * 0.04;
      ellipse(
        c,
        xx + Math.cos(petal) * 2.3,
        tip + Math.sin(petal) * 2.3,
        2,
        2,
        color
      );
    }
    ellipse(c, xx, tip, 1.5, 1.5, '#ffe9a4');
  }
  for (let j = 0; j < 5; j++) {
    const yy = y + r * 0.42 + j * 6;
    for (const side of [-1, 1]) {
      const xx = x + side * (24 - j * 2);
      glow(c, xx, yy - 2, 13, 'rgba(255,214,127,.22)');
      ellipse(c, xx, yy - 2, 2, 2.7, '#ffe5a7');
    }
  }
}
