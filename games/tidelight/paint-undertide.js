import { ellipse, glow, line, noise, TAU } from './paint-primitives.js';

// The sanctuary opens into a submerged ossuary, not another surface sea.
export function paintUndertide(c, s, t) {
  c.save();
  const water = c.createLinearGradient(0, 0, 0, 1000);
  water.addColorStop(0, '#020d24');
  water.addColorStop(0.45, '#092c46');
  water.addColorStop(1, '#031522');
  c.fillStyle = water;
  c.fillRect(-1600, -1000, 4800, 3000);
  glow(c, 800, 360, 550, 'rgba(39,112,145,.20)');
  // A distant sleeping presence, immense but not a combat target.
  glow(c, 1120, 240, 145, 'rgba(161,131,57,.10)');
  c.fillStyle = '#152d35';
  c.beginPath();
  c.moveTo(1015, 240);
  c.bezierCurveTo(1070, 184, 1175, 193, 1235, 240);
  c.bezierCurveTo(1175, 278, 1070, 282, 1015, 240);
  c.fill();
  ellipse(c, 1124, 238, 31, 36, '#726e43');
  ellipse(c, 1124, 239, 8, 31, '#071d29');
  ellipse(c, 1113, 224, 3, 5, '#a69962');
  // Rib pairs diminish toward a vanishing point like cathedral vaults.
  for (let j = 5; j >= 0; j--) {
    const width = 690 - j * 91,
      base = 980 - j * 112;
    const top = 35 + j * 42;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.moveTo(800 + side * width, base);
      c.bezierCurveTo(
        800 + side * (width + 80),
        base - 280,
        800 + side * width * 0.7,
        top + 75,
        800 + side * 40,
        top
      );
      c.bezierCurveTo(
        800 + side * width * 0.62,
        top + 115,
        800 + side * (width + 20),
        base - 255,
        800 + side * (width - 29),
        base
      );
      c.closePath();
      c.fillStyle = `rgba(119,154,152,${0.18 + (5 - j) * 0.055})`;
      c.fill();
      c.strokeStyle = `rgba(183,209,184,${0.12 + (5 - j) * 0.04})`;
      c.lineWidth = 1.6;
      c.stroke();
    }
  }
  // Broken shafts scatter through unseen cracks overhead.
  c.globalCompositeOperation = 'screen';
  for (let j = 0; j < 4; j++) {
    const x = 270 + j * 350 + Math.sin(t * 0.08 + j) * 15;
    const shaft = c.createLinearGradient(x, 0, x + 200, 920);
    shaft.addColorStop(0, 'rgba(91,189,206,.10)');
    shaft.addColorStop(1, 'rgba(32,102,143,0)');
    c.fillStyle = shaft;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + 22, 0);
    c.lineTo(x + 290, 960);
    c.lineTo(x + 80, 960);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  // Seafloor sediment and luminous branching gardens leave the center readable.
  for (let j = 0; j < 80; j++) {
    const x = noise(j + 50) * 1600,
      y = 640 + noise(j + 90) * 360;
    ellipse(c, x, y, 8 + noise(j) * 25, 2, 'rgba(99,155,160,.08)');
  }
  for (let j = 0; j < 28; j++) {
    const x = j < 14 ? noise(j + 3) * 240 : 1360 + noise(j + 3) * 240;
    const y = 340 + noise(j + 20) * 660,
      h = 22 + noise(j + 5) * 68;
    const color = j % 3 ? '#3d9d9f' : '#b1a986';
    glow(
      c,
      x,
      y - h * 0.5,
      55,
      j % 3 ? 'rgba(36,177,179,.10)' : 'rgba(204,159,118,.08)'
    );
    for (let b = -2; b <= 2; b++) {
      const sway = Math.sin(t * 0.7 + j + b) * 3,
        xx = x + b * h * 0.22 + sway,
        yy = y - h * (1 - Math.abs(b) * 0.15);
      line(
        c,
        [
          [x, y],
          [x + b * 4, y - h * 0.35],
          [xx, yy]
        ],
        color,
        2.2
      );
      line(
        c,
        [
          [xx, yy + 12],
          [xx - 8, yy + 2]
        ],
        color,
        1.2
      );
      ellipse(c, xx, yy, 2, 3, '#a2e7d4');
    }
  }
  for (let j = 0; j < 110; j++) {
    const x = noise(j + 333) * 1600 + Math.sin(t * 0.2 + j) * 9;
    const y =
      (((noise(j + 666) * 1100 - t * (3 + noise(j) * 7)) % 1100) + 1100) % 1100;
    ellipse(c, x, y, 0.7 + noise(j) * 1.5, 0.8, 'rgba(133,209,218,.30)');
  }
  c.restore();
}

export function paintDivingBubble(c, p, t) {
  c.save();
  c.translate(p.x, p.y);
  const r = 49 + Math.sin(t * 1.7) * 1.3;
  glow(c, 0, 0, 64, 'rgba(106,220,218,.055)');
  c.strokeStyle = 'rgba(161,232,229,.35)';
  c.lineWidth = 1.3;
  c.beginPath();
  c.ellipse(0, -4, r, r * 0.8, 0, 0, TAU);
  c.stroke();
  c.strokeStyle = 'rgba(208,252,244,.62)';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(0, -4, r - 3, r * 0.8 - 3, 0, 3.65, 4.5);
  c.stroke();
  for (let j = 0; j < 4; j++) {
    const rise = (t * 19 + j * 17) % 80;
    c.strokeStyle = `rgba(150,228,232,${0.3 * (1 - rise / 80)})`;
    c.beginPath();
    c.arc(12 + Math.sin(t + j) * 5, -36 - rise, 2 + j * 0.6, 0, TAU);
    c.stroke();
  }
  c.restore();
}
