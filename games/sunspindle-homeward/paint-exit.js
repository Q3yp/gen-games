// The same arch switches from a sealed gate to the sunbird’s open passage.
import { P, hash, polygon, line, star, glow } from './paint-primitives.js';
import { arch } from './paint-walls.js';

export function exitArch(c, s, t) {
  const x = s.exit?.x || 1030,
    y = s.exit?.y || 245,
    ready = Boolean(s.exitReady);
  polygon(c, [
    [x - 51, y],
    [x + 47, y],
    [x + 95, y + 76],
    [x + 3, y + 76]
  ], '#67678030');
  arch(c, x, y + 6, 100, 122, '#bb7b60');
  arch(c, x - 4, y, 86, 116, '#f4dfb2');
  arch(c, x - 4, y, 66, 103, ready ? '#ffe5a4' : '#586777');
  if (ready) {
    glow(c, x, y - 36, 65, '#fff3bb99');
    for (let i = 0; i < 5; i++) {
      const f = (t * 0.3 + i * 0.23) % 1;
      star(c, x - 24 + hash(i) * 45, y - 20 - f * 70, 2 + f * 2, `rgba(255,249,211,${1-f})`, t + i, 4);
    }
    polygon(c, [
      [x - 25, y + 4],
      [x + 25, y + 4],
      [x + 51, y + 79],
      [x - 50, y + 79]
    ], '#fff0b23a');
  } else {
    for (let i = -2; i <= 2; i++) line(c, [
      [x + i * 12, y - 70],
      [x + i * 12, y]
    ], '#a9a08a', 2);
    line(c, [
      [x - 30, y - 31],
      [x + 30, y - 31]
    ], '#bea57f', 3);
    star(c, x, y - 31, 12, P.gold, Math.PI / 8, 8);
  }
  for (const dx of [-44, 36]) {
    c.fillStyle = '#fff0c8';
    c.fillRect(x + dx - 5, y - 77, 10, 82);
    line(c, [
      [x + dx, y - 68],
      [x + dx, y - 5]
    ], '#b8a17c', 1);
    c.fillStyle = P.coral;
    c.fillRect(x + dx - 9, y - 5, 18, 8);
  }
  line(c, [
    [x - 48, y + 8],
    [x + 46, y + 8]
  ], P.ivory, 4);
  line(c, [
    [x - 53, y + 13],
    [x + 52, y + 13]
  ], '#bd9270', 3);
  star(c, x - 4, y - 107, 9, P.gold, Math.PI / 8, 8);
}
