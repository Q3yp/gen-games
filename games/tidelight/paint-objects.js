import { TAU, ellipse, glow, line } from './paint-primitives.js';

export function lantern(c, x, y, t, color = '#ffd27b', carried = false) {
  const pulse = 1 + Math.sin(t * 2.2 + x) * 0.08;
  glow(c, x, y, carried ? 65 : 90, `rgba(255,192,88,${carried ? 0.17 : 0.23})`);
  for (let k = 0; k < 7; k++)
    ellipse(
      c,
      x + Math.sin(k * 5 + x) * 8,
      y + 12 + k * 5,
      14 - k * 1.6,
      1,
      'rgba(255,206,113,' + (0.16 - k * 0.018) + ')'
    );
  c.save();
  c.translate(x, y + Math.sin(t * 2 + x) * 2);
  c.scale(pulse, pulse);
  ellipse(c, 0, 9, 12, 3, '#102d36');
  c.strokeStyle = '#e3ba71';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(0, -12, 4, Math.PI, TAU);
  c.stroke();
  c.fillStyle = '#554d3c';
  c.fillRect(-8, -9, 16, 17);
  c.fillStyle = color;
  c.fillRect(-5, -7, 10, 12);
  c.fillStyle = '#fff2bf';
  c.fillRect(-2, -5, 4, 8);
  line(
    c,
    [
      [-9, -10],
      [0, -14],
      [9, -10]
    ],
    '#e8c388',
    2
  );
  line(
    c,
    [
      [-9, 8],
      [9, 8]
    ],
    '#d8b879',
    2
  );
  c.restore();
}
export function manta(c, o, t) {
  const size = o.size || 1;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.angle || 0);
  c.scale(size, size);
  const flap = Math.sin(t * 2.6 + o.x) * 6,
    hungry = o.mood === 'hungry';
  glow(c, 0, 0, 53, hungry ? 'rgba(242,127,123,.07)' : 'rgba(124,232,213,.09)');
  line(
    c,
    [
      [-13, 0],
      [-30, Math.sin(t * 3) * 5],
      [-50, Math.sin(t * 3 - 1) * 9]
    ],
    '#84c6c1',
    1.4
  );
  const g = c.createLinearGradient(0, -26, 0, 26);
  g.addColorStop(0, 'rgba(91,168,171,.2)');
  g.addColorStop(0.5, 'rgba(150,214,202,.79)');
  g.addColorStop(1, 'rgba(58,133,146,.22)');
  c.fillStyle = g;
  c.strokeStyle = 'rgba(158,224,208,.55)';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(17, 0);
  c.bezierCurveTo(6, -8, 0, -13, -10, -28 - flap);
  c.quadraticCurveTo(-24, -13, -10, 0);
  c.quadraticCurveTo(-24, 13, -10, 28 + flap);
  c.bezierCurveTo(0, 13, 6, 8, 17, 0);
  c.fill();
  c.stroke();
  line(
    c,
    [
      [-12, -17],
      [3, 0],
      [-12, 17]
    ],
    'rgba(195,244,213,.25)',
    1
  );
  ellipse(c, 9, -3, 1.6, 1.6, hungry ? '#ffba99' : '#f3ffd7');
  ellipse(c, 9, 3, 1.6, 1.6, hungry ? '#ffba99' : '#f3ffd7');
  c.restore();
}
export function skiff(c, p, t) {
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.angle || 0);
  for (let k = 0; k < 5; k++) {
    const d = 23 + k * 14 + ((t * 15) % 14),
      a = 0.15 * (1 - k / 5);
    line(
      c,
      [
        [-d, -7 - k * 3],
        [-d - 8, 0],
        [-d, 7 + k * 3]
      ],
      `rgba(152,226,213,${a})`,
      1.2
    );
  }
  ellipse(c, 3, 7, 29, 13, 'rgba(2,15,25,.5)');
  c.beginPath();
  c.moveTo(31, 0);
  c.bezierCurveTo(10, -15, -18, -15, -27, -5);
  c.lineTo(-27, 5);
  c.bezierCurveTo(-18, 15, 10, 15, 31, 0);
  c.fillStyle = '#d5ccad';
  c.fill();
  c.strokeStyle = '#f4e4b9';
  c.lineWidth = 1.5;
  c.stroke();
  c.beginPath();
  c.moveTo(25, 0);
  c.quadraticCurveTo(-2, -9, -23, -6);
  c.lineTo(-23, 6);
  c.quadraticCurveTo(-2, 9, 25, 0);
  c.fillStyle = '#713f44';
  c.fill();
  line(
    c,
    [
      [-15, -8],
      [-15, 8]
    ],
    '#d3b78e',
    3
  );
  line(
    c,
    [
      [6, -8],
      [6, 8]
    ],
    '#d3b78e',
    3
  );
  c.fillStyle = '#263f4b';
  c.beginPath();
  c.moveTo(-9, -4);
  c.lineTo(3, -6);
  c.lineTo(7, 5);
  c.lineTo(-10, 6);
  c.fill();
  ellipse(c, 0, 0, 4, 4, '#e6c99f');
  line(
    c,
    [
      [-3, 2],
      [-11, 22]
    ],
    '#b9ae8c',
    2
  );
  line(
    c,
    [
      [-11, 19],
      [-14, 27]
    ],
    '#dbd2b1',
    4
  );
  c.restore();
  if (p.carrying)
    lantern(
      c,
      p.x + Math.cos(p.angle || 0) * 15,
      p.y + Math.sin(p.angle || 0) * 15 - 5,
      t,
      p.lightColor || '#ffcf69',
      true
    );
}
