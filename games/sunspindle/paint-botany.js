// Decorative plants stay outside the playable court.
import { P, hash, polygon, line, ellipse } from './paint-primitives.js';

export function palm(c, x, y, size, flip = 1) {
  c.save();
  c.translate(x, y);
  c.scale(size * flip, size);
  line(c, [
    [8, 80],
    [3, 46],
    [0, 0]
  ], '#8b775e', 8);
  line(c, [
    [5, 80],
    [0, 44],
    [-2, 0]
  ], '#bba17a', 3);
  for (let j = 0; j < 9; j++) {
    const a = -Math.PI + j * 0.39,
      len = 60 + hash(j) * 35,
      dx = Math.cos(a) * len,
      dy = Math.sin(a) * len * 0.7;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(dx * 0.55, dy - 23, dx, dy + 13);
    c.quadraticCurveTo(dx * 0.48, dy - 3, 0, 0);
    c.fillStyle = j % 2 ? '#54796d' : '#6c927a';
    c.fill();
    line(c, [
      [0, 0],
      [dx * 0.55, dy - 10],
      [dx, dy + 13]
    ], '#344d59', 0.8);
    for (let k = 2; k < 9; k++) {
      const f = k / 10;
      line(c, [
        [dx * f, dy * f - 10],
        [dx * f + 10 * Math.sin(a), dy * f + 12]
      ], '#a3b08b', 0.6);
    }
  }
  c.restore();
}

export function vase(c, x, y, r) {
  ellipse(c, x + 12, y + 8, r * 1.3, r * 0.45, '#81748a44');
  polygon(c, [
    [x - r, y - r * 1.5],
    [x + r, y - r * 1.5],
    [x + r * 0.75, y],
    [x - r * 0.75, y]
  ], P.clay, P.ink, 0.8);
  ellipse(c, x, y - r * 1.5, r, r * 0.3, P.coral, P.ink, 0.8);
  line(c, [
    [x - r * 0.85, y - r],
    [x + r * 0.85, y - r]
  ], P.ivory, 2);
  for (let i = 0; i < 6; i++) {
    const a = i * 1.13;
    line(c, [
      [x, y - r * 1.5],
      [x + Math.cos(a) * r, y - r * (2.3 + hash(i))]
    ], '#5d7669', 2);
    ellipse(c, x + Math.cos(a) * r, y - r * (2.3 + hash(i)), 4, 7, '#789077');
  }
}
