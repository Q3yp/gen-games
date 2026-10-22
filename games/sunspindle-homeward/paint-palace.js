// Compose the distant palace and near-camera decorative framing.
import { P, TAU, hash, polygon, line, ellipse, arc, star } from './paint-primitives.js';
import { floor } from './paint-floor.js';
import { walls } from './paint-walls.js';
import { palm, vase } from './paint-botany.js';
export {
  exitArch
}
from './paint-exit.js';

export function palace(c, s, t) {
  const g = c.createLinearGradient(0, 0, 0, 800);
  g.addColorStop(0, '#eed3a3');
  g.addColorStop(1, '#d3aa7e');
  c.fillStyle = g;
  c.fillRect(0, 0, 1200, 800);
  polygon(c, [
    [0, 81],
    [196, 81],
    [236, 131],
    [1200, 131],
    [1200, 800],
    [0, 800]
  ], '#dcb68b');
  for (let i = 0; i < 120; i++) {
    const x = hash(i + 9) * 1200,
      y = hash(i + 430) * 800;
    ellipse(c, x, y, hash(i) * 3 + 1, 0.5, '#f9e7bd45');
  }
  floor(c);
  walls(c);
  c.save();
  c.globalAlpha = 0.25;
  polygon(c, [
    [45, 0],
    [80, 0],
    [622, 800],
    [546, 800]
  ], '#fff9da');
  polygon(c, [
    [115, 0],
    [126, 0],
    [901, 800],
    [862, 800]
  ], '#fff9da');
  c.restore();
  c.save();
  c.translate(192, 83);
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16;
    line(c, [
      [Math.cos(a) * 34, Math.sin(a) * 34],
      [Math.cos(a) * 43, Math.sin(a) * 43]
    ], P.darkGold, 1.3);
  }
  ellipse(c, 0, 0, 28, 28, P.gold, P.darkGold, 1);
  ellipse(c, -3, -3, 22, 22, '#f4ce6a');
  arc(c, 0, 0, 15, 0, TAU, P.darkGold, 0.7);
  star(c, 0, 0, 13, P.ivory, 0, 8);
  c.restore();
  vase(c, 44, 630, 19);
  vase(c, 1154, 402, 16);
  vase(c, 41, 287, 13);
  palm(c, 38, 179, 0.94);
  palm(c, 1166, 88, 1.1, -1);
}

export function foreground(c, t) {
  palm(c, 18, 749, 1.15);
  palm(c, 1190, 757, 1.3, -1);
  vase(c, 1148, 754, 22);
  for (let i = 0; i < 9; i++) {
    const x = 220 + i * 81,
      y = 755 + hash(i) * 20;
    polygon(c, [
      [x, y],
      [x + 12, y - 4],
      [x + 17, y + 4],
      [x + 2, y + 8]
    ], i % 2 ? '#d2a77d' : '#ead0a1', '#b98f72', 0.6);
  }
}
