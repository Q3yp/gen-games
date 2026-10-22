// Sandstone floor, cobalt tile border, worn sun mosaic, and ink texture.
import { P, TAU, hash, polygon, line, ellipse, star } from './paint-primitives.js';

function border(c) {
  c.fillStyle = '#ba795e';
  c.fillRect(74, 150, 1052, 578);
  c.fillStyle = '#edd6a5';
  c.fillRect(83, 151, 1034, 565);
  c.strokeStyle = P.ink;
  c.lineWidth = 1;
  c.strokeRect(83.5, 151.5, 1033, 564);
  c.fillStyle = P.cobalt;
  c.fillRect(90, 158, 1020, 10);
  c.fillRect(90, 700, 1020, 10);
  c.fillRect(90, 158, 10, 552);
  c.fillRect(1100, 158, 10, 552);
  for (let x = 106; x < 1100; x += 27) {
    polygon(c, [
      [x, 161],
      [x + 5, 165],
      [x, 169],
      [x - 5, 165]
    ], P.ivory);
    polygon(c, [
      [x, 698],
      [x + 5, 704],
      [x, 709],
      [x - 5, 704]
    ], P.ivory);
  }
  for (let y = 180; y < 700; y += 27) {
    polygon(c, [
      [91, y],
      [95, y + 5],
      [99, y],
      [95, y - 5]
    ], P.ivory);
    polygon(c, [
      [1101, y],
      [1105, y + 5],
      [1109, y],
      [1105, y - 5]
    ], P.ivory);
  }
}

function medallion(c, x, y, r) {
  c.save();
  c.translate(x, y);
  c.scale(1, 0.73);
  ellipse(c, 0, 0, r, r, null, '#b2785a35', 2);
  ellipse(c, 0, 0, r * 0.89, r * 0.89, null, '#b2785a35', 1);
  for (let i = 0; i < 24; i++) {
    const a = i * TAU / 24;
    polygon(c, [
      [Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6],
      [Math.cos(a + 0.07) * r * 0.83, Math.sin(a + 0.07) * r * 0.83],
      [Math.cos(a - 0.07) * r * 0.83, Math.sin(a - 0.07) * r * 0.83]
    ], '#be795d27');
  }
  star(c, 0, 0, r * 0.58, '#be795d25', 0, 12);
  ellipse(c, 0, 0, r * 0.27, r * 0.27, null, '#b2785a35', 2);
  c.restore();
}

export function floor(c) {
  border(c);
  const g = c.createLinearGradient(90, 170, 1080, 710);
  g.addColorStop(0, '#fff0c9');
  g.addColorStop(0.6, '#eddbb3');
  g.addColorStop(1, '#dbc79f');
  c.fillStyle = g;
  c.fillRect(101, 170, 998, 529);
  c.save();
  c.beginPath();
  c.rect(101, 170, 998, 529);
  c.clip();
  for (let y = 170; y < 710; y += 59) {
    for (let x = 70; x < 1110; x += 79) {
      const n = Math.round(x + y);
      c.fillStyle = `rgba(139,106,91,${hash(n)*0.035})`;
      c.fillRect(x, y, 79, 59);
      line(c, [
        [x, y],
        [x + 79, y]
      ], '#b89d791f', 1);
      line(c, [
        [x, y],
        [x, y + 59]
      ], '#b89d791f', 1);
    }
  }
  for (let q = 0; q < 4; q++) {
    const x = [134, 980, 134, 980][q],
      y = [204, 204, 604, 604][q];
    c.save();
    c.globalAlpha = 0.56;
    c.fillStyle = P.blue;
    c.fillRect(x, y, 84, 62);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        const a = x + 14 + i * 28,
          b = y + 10 + j * 21;
        star(c, a, b, 8, '#dfdab5', Math.PI / 4, 4);
      }
    c.restore();
  }
  medallion(c, 604, 434, 180);
  for (let i = 0; i < 240; i++) {
    const x = 100 + hash(i + 2) * 1000,
      y = 175 + hash(i + 493) * 520;
    line(c, [
      [x, y],
      [x + 2 + hash(i + 76) * 5, y + hash(i + 99) * 2]
    ], '#ac856320', 0.7);
  }
  for (const [x, y, a] of [
      [180, 352, 0.6],
      [744, 657, 1.4],
      [1063, 433, 2.4],
      [416, 193, 0.3]
    ]) {
    line(c, [
      [x, y],
      [x + 20 * a, y + 6],
      [x + 27 * a, y + 17],
      [x + 44 * a, y + 20]
    ], '#b29c7955', 1);
    line(c, [
      [x + 20 * a, y + 6],
      [x + 18 * a, y - 9]
    ], '#b29c7944', 0.7);
  }
  c.restore();
}
