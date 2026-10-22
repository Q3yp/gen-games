import { TAU, ellipse, glow, line } from './paint-primitives.js';

// Optional encounter artwork; this module never advances or modifies game state.
export function paintShadows(c, s, time) {
  const t = Number(time || 0);
  for (const shadow of s.shadows || []) {
    if (shadow.phase === 'dispersed') {
      c.save();
      c.globalCompositeOperation = 'screen';
      eel(c, shadow, t);
      c.restore();
      remains(c, shadow, t);
      continue;
    }
    if (shadow.phase === 'charge' && shadow.aim) charge(c, shadow, t);
    eel(c, shadow, t);
    if (shadow.crackFlash > 0) {
      const p = 1 - shadow.crackFlash / 2;
      c.save();
      c.globalAlpha = 1 - p;
      for (let i = 0; i < 18; i++) {
        const a = (i * TAU) / 18;
        line(
          c,
          [
            [shadow.x + Math.cos(a) * 30, shadow.y + Math.sin(a) * 30],
            [
              shadow.x + Math.cos(a) * (45 + p * 140),
              shadow.y + Math.sin(a) * (45 + p * 140)
            ]
          ],
          '#ffe9a0',
          3
        );
      }
      c.restore();
    }
  }
}

function charge(c, o, t) {
  const p = Math.max(0, Math.min(1, o.chargeProgress || 0));
  const aim = o.aim;
  c.save();
  // A fixed target, a narrowing corridor and a closing ring telegraph the dash.
  line(
    c,
    [
      [o.x, o.y],
      [aim.x, aim.y]
    ],
    `rgba(243,177,142,${0.08 + p * 0.12})`,
    30 - p * 18
  );
  c.setLineDash([13, 8]);
  c.lineDashOffset = -t * 30;
  line(
    c,
    [
      [o.x, o.y],
      [aim.x, aim.y]
    ],
    `rgba(255,217,169,${0.55 + p * 0.4})`,
    1.5 + p
  );
  c.setLineDash([]);
  glow(c, aim.x, aim.y, 34, `rgba(255,164,112,${0.15 + p * 0.15})`);
  c.strokeStyle = '#f4dbb3';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(aim.x, aim.y, 10 + (1 - p) * 31, 0, TAU);
  c.stroke();
  for (const side of [-1, 1]) {
    line(
      c,
      [
        [aim.x + side * 5, aim.y],
        [aim.x + side * 14, aim.y]
      ],
      '#fff0cc',
      1.5
    );
    line(
      c,
      [
        [aim.x, aim.y + side * 5],
        [aim.x, aim.y + side * 14]
      ],
      '#fff0cc',
      1.5
    );
  }
  c.restore();
}

function spine(t, x, phase) {
  const strength = phase === 'dash' ? 0.35 : 1;
  return (
    Math.sin(-x * 0.017 + t * (phase === 'stunned' ? 0.6 : 1.5)) * 24 * strength
  );
}

function eel(c, o, t) {
  const phase = o.phase || 'hunt';
  const seals = Math.max(0, Math.min(3, Number(o.seals ?? 3)));
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.angle || 0);
  if (phase === 'recover') c.globalAlpha = 0.8;
  glow(c, -100, 0, 165, 'rgba(2,8,20,.3)');
  const body = c.createLinearGradient(0, -35, 0, 35);
  body.addColorStop(0, '#36515a');
  body.addColorStop(
    0.3,
    seals === 0 ? '#a4d3bd' : seals === 1 ? '#365e60' : '#152734'
  );
  body.addColorStop(0.8, '#07131f');
  body.addColorStop(1, '#213b45');
  c.fillStyle = body;
  c.strokeStyle =
    phase === 'stunned' ? 'rgba(225,218,171,.65)' : 'rgba(99,137,146,.55)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(33, 0);
  c.bezierCurveTo(30, -18, 7, -28, -22, -24);
  for (let j = 1; j <= 32; j++) {
    const x = -22 - j * 8;
    const width = 27 * Math.pow(1 - j / 33, 0.75);
    c.lineTo(x, spine(t, x, phase) - width);
  }
  for (let j = 32; j >= 1; j--) {
    const x = -22 - j * 8;
    const width = 27 * Math.pow(1 - j / 33, 0.75);
    c.lineTo(x, spine(t, x, phase) + width);
  }
  c.bezierCurveTo(-10, 28, 25, 20, 33, 0);
  c.fill();
  c.stroke();
  const ridge = [];
  for (let j = 0; j < 25; j++) {
    const x = -28 - j * 9;
    ridge.push([x, spine(t, x, phase) - 13 * (1 - j / 25)]);
  }
  line(c, ridge, 'rgba(98,134,143,.35)', 1);
  for (let j = 0; j < 3; j++) {
    const x = -43 - j * 57,
      y = spine(t, x, phase);
    if (j < seals) shell(c, x, y, t, phase);
    else {
      line(
        c,
        [
          [x - 9, y - 8],
          [x - 2, y],
          [x - 8, y + 7]
        ],
        'rgba(143,184,177,.4)',
        1.4
      );
    }
  }
  const bright = phase === 'charge' || phase === 'stunned';
  glow(
    c,
    15,
    -6,
    bright ? 29 : 17,
    `rgba(222,239,205,${bright ? 0.32 : 0.14})`
  );
  ellipse(c, 15, -6, 5.3, 4, '#e4eacb');
  ellipse(c, 16, -6, 1.5, 3.2, '#40535a');
  line(
    c,
    [
      [20, 9],
      [7, 11],
      [-5, 9]
    ],
    '#627b7d',
    1
  );
  if (phase === 'dash') {
    for (let j = 0; j < 5; j++) {
      const yy = (j - 2) * 22;
      line(
        c,
        [
          [-300 - j * 8, yy],
          [-190, yy * 0.7]
        ],
        'rgba(176,217,204,.35)',
        1.5
      );
    }
  }
  if (phase === 'stunned') {
    for (let j = 0; j < 7; j++) {
      const a = t * 0.9 + (j * TAU) / 7;
      ellipse(c, Math.cos(a) * 42, Math.sin(a) * 35, 2, 2, '#f1df9f');
    }
  }
  c.restore();
}

function shell(c, x, y, t, phase) {
  if (phase === 'stunned') glow(c, x, y, 27, 'rgba(255,222,148,.24)');
  c.save();
  c.translate(x, y);
  if (phase === 'charge') {
    glow(c, 0, 0, 65, 'rgba(255,221,135,.65)');
    ellipse(c, 0, 0, 12, 25, '#fff1b2');
    for (const side of [-1, 1]) {
      c.save();
      c.translate(side * 25, 0);
      c.rotate(side * 0.5);
      ellipse(c, 0, 0, 10, 24, '#e1dfc5', '#ffffff', 2);
      c.restore();
    }
    c.restore();
    return;
  }
  c.fillStyle = phase === 'charge' ? '#f3e6bc' : '#d0cdb2';
  c.strokeStyle = '#f5eccc';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, -16);
  c.bezierCurveTo(-18, -11, -16, 7, 0, 17);
  c.bezierCurveTo(16, 7, 18, -11, 0, -16);
  c.fill();
  c.stroke();
  for (let j = -1; j <= 1; j++)
    line(
      c,
      [
        [j * 5, -9],
        [j * 7, 0],
        [0, 11]
      ],
      '#858e84',
      0.9
    );
  c.restore();
}

function remains(c, o, t) {
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.angle || 0);
  for (let j = 0; j < 3; j++) {
    const x = -40 - j * 55,
      y = Math.sin(t * 0.35 + j) * 3;
    ellipse(c, x, y, 12, 4, 'rgba(170,194,181,.13)');
    line(
      c,
      [
        [x - 6, y],
        [x, y - 3],
        [x + 6, y]
      ],
      'rgba(218,219,192,.26)',
      1
    );
  }
  c.restore();
}
