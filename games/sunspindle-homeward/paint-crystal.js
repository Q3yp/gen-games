// The hittable prism, its captive bird, and the persistent broken shards.
import { P, TAU, polygon, line, ellipse, arc, shadow, star, glow, bird } from './paint-primitives.js';

export function crystal(c, p, s, t) {
  if (p.hp <= 0) {
    ellipse(c, p.x, p.y + 5, 34, 12, '#6a82931e');
    for (let i = 0; i < 7; i++) {
      const a = i * 2.399,
        x = p.x + Math.cos(a) * (20 + i * 2),
        y = p.y + Math.sin(a) * 13;
      polygon(c, [
        [x - 4, y],
        [x, y - 7],
        [x + 5, y + 1]
      ], i % 2 ? '#80b1b2' : '#b2c4b8', P.ink, 0.5);
    }
    return;
  }
  shadow(c, p.x, p.y, 25, 67, 0.18);
  ellipse(c, p.x, p.y + 13, 45, 16, null, '#6d7b9840', 1.5);
  ellipse(c, p.x, p.y + 13, 35, 12, null, '#6d7b9825', 1);
  c.save();
  c.translate(p.x, p.y + Math.sin(t * 2) * 2);
  glow(c, 0, -6, 70, '#eefce45a');
  // Fine chains and a brass crown frame the actual, hittable crystal body.
  line(c, [
    [-25, -45],
    [-13, -76],
    [13, -76],
    [25, -45]
  ], '#b98e4e', 1.2);
  arc(c, 0, -69, 12, Math.PI, TAU, P.darkGold, 2);
  star(c, 0, -85, 7, P.gold, Math.PI / 4, 4);
  const pts = [
    [0, -48],
    [27, -24],
    [31, 10],
    [0, 38],
    [-30, 10],
    [-26, -24]
  ];
  polygon(c, pts, p.flash > 0 ? '#fff' : '#81bbbd', P.ink, 1.6);
  polygon(c, [
    [0, -48],
    [27, -24],
    [8, -15]
  ], '#e4efe0');
  polygon(c, [
    [-26, -24],
    [0, -48],
    [8, -15],
    [-12, 16],
    [-30, 10]
  ], '#93c8c1');
  polygon(c, [
    [27, -24],
    [31, 10],
    [0, 38],
    [8, -15]
  ], '#6087a8');
  polygon(c, [
    [-30, 10],
    [-12, 16],
    [0, 38]
  ], '#bdc7c5');
  polygon(c, [
    [-12, 16],
    [8, -15],
    [0, 38]
  ], '#b0d9c4');
  c.save();
  c.globalAlpha = 0.9;
  bird(c, -1, -5, t, 0.88, '#ffe183');
  c.restore();
  line(c, [
    [-21, -22],
    [-9, -35]
  ], '#fffbe3', 2);
  line(c, [
    [-26, -9],
    [-25, -17]
  ], '#fffbe3', 1.5);
  line(c, [
    [13, -19],
    [24, -24]
  ], '#fffbe3', 1);
  line(c, [
    [0, -47],
    [8, -15],
    [-12, 16],
    [0, 37]
  ], '#e6f3e4', 0.8);
  if (p.hp < (p.maxHp || 2)) {
    line(c, [
      [0, -29],
      [5, -14],
      [-4, -5],
      [7, 6],
      [0, 24]
    ], P.ivory, 2.4);
    line(c, [
      [7, 6],
      [20, 2]
    ], P.ivory, 1.7);
  }
  star(c, -19, -29, 6, '#fff9d9', t * 0.3, 4);
  c.restore();
}
