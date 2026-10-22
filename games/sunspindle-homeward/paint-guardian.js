import { P, TAU, polygon, line, ellipse, arc, star, glow } from './paint-primitives.js';

function bronze(c, light, dark) {
  const g = c.createLinearGradient(-28, -34, 43, 38);
  g.addColorStop(0, light);
  g.addColorStop(0.47, '#c88c45');
  g.addColorStop(1, dark);
  return g;
}

function limbs(c, phase, t) {
  const stride = phase === 'lunge' ? Math.sin(t * 18) * 7 : 0;
  for (const side of [-1, 1]) {
    const foot = -34 + stride * side;
    line(c, [[-15, side * 20], [foot, side * 29], [foot - 5, side * 38]], P.ink, 13);
    line(c, [[-15, side * 20], [foot, side * 29]], '#ae6a3b', 9);
    ellipse(c, foot, side * 29, 7, 7, '#e7b96c', P.ink, 1.5);
    polygon(c, [[foot - 13, side * 34], [foot + 7, side * 32],
      [foot + 12, side * 42], [foot - 13, side * 43]], '#8f654b', P.ink, 1.5);
    line(c, [[foot - 9, side * 36], [foot + 5, side * 35]], '#f2d294', 1.5);
    line(c, [[-2, side * 17], [12, side * 31], [29, side * 26]], P.ink, 12);
    line(c, [[-2, side * 17], [12, side * 31], [29, side * 26]], '#dca052', 8);
    ellipse(c, 12, side * 31, 6, 6, '#936646', P.ink, 1);
  }
}

function exposedBack(c, hit, t) {
  // The uncovered rear is a distinct material, not another section of armour.
  polygon(c, [[-38, -17], [-14, -23], [-3, -13], [-3, 14],
    [-16, 23], [-38, 15], [-30, 0]], hit ? '#fff8d1' : '#9b3f38', P.ink, 2);
  for (let y = -13; y <= 13; y += 6) {
    line(c, [[-33, y], [-22, y + 3], [-8, y]], hit ? '#fff' : '#ed9b74', 2.4);
  }
  ellipse(c, -23, 0, 12, 15, hit ? '#fff8db' : '#3f4856', '#f2bb6a', 2);
  ellipse(c, -24, -1, 6, 9, hit ? '#fff' : '#ffce83');
  line(c, [[-28, -8], [-21, 7]], '#fff1bd', 1.6);
  for (const side of [-1, 1]) {
    polygon(c, [[-14, side * 15], [-21, side * 27], [-6, side * 24],
      [2, side * 14]], '#b47743', P.ink, 1.3);
    ellipse(c, -10, side * 20, 2, 2, '#ffe0a0');
  }
  if (hit) {
    glow(c, -28, 0, 48, '#ffc56c80');
    star(c, -29, 0, 23, '#fff6c8', t * 2, 7);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.65 + i * 0.44;
      line(c, [[-25 + Math.cos(a) * 28, Math.sin(a) * 25],
        [-25 + Math.cos(a) * 43, Math.sin(a) * 40]], '#fff2b8', 2.5);
    }
  }
}

function shield(c, block) {
  const face = bronze(c, '#fff0b0', '#81593d');
  // This physical half-shell exactly advertises the protected forward hemisphere.
  c.beginPath();
  c.moveTo(1, -44);
  c.bezierCurveTo(29, -45, 47, -25, 48, 0);
  c.bezierCurveTo(47, 26, 29, 45, 1, 44);
  c.lineTo(9, 30);
  c.bezierCurveTo(27, 22, 29, -23, 9, -30);
  c.closePath();
  c.fillStyle = block ? '#d6f5ee' : face;
  c.fill();
  c.strokeStyle = '#493e40';
  c.lineWidth = 2.4;
  c.stroke();
  arc(c, 2, 0, 41, -Math.PI / 2, Math.PI / 2, block ? '#fff' : '#ffe6a0', 3);
  arc(c, 2, 0, 35, -1.35, 1.35, '#925c37', 1.3);
  arc(c, 2, 0, 31, -1.25, 1.25, '#f8d98e', 1);
  for (let i = -3; i <= 3; i++) {
    const a = i * Math.PI / 7;
    const x = 2 + Math.cos(a) * 37, y = Math.sin(a) * 37;
    ellipse(c, x, y, 2.1, 2.1, '#805b42');
    ellipse(c, x - 0.6, y - 0.8, 1, 1, '#fff0ba');
  }
  star(c, 35, 0, 9, '#fbe0a1', 0, 8);
  ellipse(c, 35, 0, 3, 3, '#bc7140', '#77533e', 1);
  if (!block) return;
  const f = Math.min(1, block / 0.3);
  c.save();
  c.globalAlpha = f;
  for (let i = 0; i < 7; i++) {
    const a = -1.2 + i * 0.4, r = 47 + (1 - f) * 24;
    line(c, [[Math.cos(a) * r, Math.sin(a) * r],
      [Math.cos(a) * (r + 9), Math.sin(a) * (r + 9)]], '#ecffff', 2.5);
    line(c, [[Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)],
      [Math.cos(a) * (r + 13) - 6, Math.sin(a) * (r + 13) + 9]], '#598e9d', 1.4);
  }
  c.restore();
}

export function guardian(c, e, t) {
  const wind = e.phase === 'windup', rush = e.phase === 'lunge';
  const recover = e.phase === 'recover', hit = e.flash > 0;
  c.save();
  c.translate(e.x, e.y - 5);
  c.rotate(e.angle || 0);
  c.lineCap = 'round';
  if (rush) {
    for (const y of [-26, -9, 12, 29]) {
      line(c, [[-51, y], [-76 - Math.abs(y) * 0.3, y]], '#bd78524d', 2);
    }
  }
  limbs(c, e.phase, t);
  // A short woven mantle trails away from the shield, leaving its core visible.
  polygon(c, [[-30, -14], [-49, -18], [-59, -9], [-51, -2],
    [-60, 11], [-41, 16], [-30, 11]], '#b8513e', P.ink, 1.3);
  line(c, [[-48, -12], [-52, -7], [-46, 0], [-51, 8]], '#efb47b', 1.7);
  c.translate(wind ? -4 : rush ? 5 : 0, 0);
  exposedBack(c, hit, t);
  ellipse(c, 3, 0, 19, 24, bronze(c, '#e5bb76', '#82583e'), P.ink, 2);
  line(c, [[-3, -19], [8, -15], [12, 0], [8, 15], [-3, 19]], '#ffe2a0', 1.5);
  const head = recover ? 13 : wind ? 0 : 5;
  polygon(c, [[head - 8, -12], [head + 5, -15], [head + 17, -8],
    [head + 19, 8], [head + 5, 15], [head - 8, 12]], '#9b6d43', P.ink, 1.6);
  polygon(c, [[head - 7, -8], [head + 4, -10], [head + 13, -5],
    [head + 13, 5], [head + 4, 10], [head - 7, 8]], '#e7b56b');
  line(c, [[head + 12, -5], [head + 12, 5]], wind || rush ? '#fff2bd' : '#584844', 3);
  line(c, [[head - 9, 0], [head + 4, 0]], '#fff1b0', 2);
  shield(c, e.blockFlash || 0);
  if (wind) {
    for (const side of [-1, 1]) {
      line(c, [[-42, side * 37], [-50, side * 46], [-41, side * 46]], '#a35038', 2);
    }
  }
  c.restore();
}
