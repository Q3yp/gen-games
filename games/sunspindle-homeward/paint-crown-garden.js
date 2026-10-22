// The moon orchard is an actual open destination, not scenery behind another gate.
import { polygon, line, ellipse, glow, arc, hash, TAU } from './paint-primitives.js';

function mix(a, b, f) {
  const n = h => parseInt(h, 16), channel = i => Math.round(n(a.slice(i, i + 2)) * (1 - f) + n(b.slice(i, i + 2)) * f);
  return `rgb(${channel(1)},${channel(3)},${channel(5)})`;
}
function flower(c, x, y, size, bloom, t) {
  const open = 0.45 + bloom * 0.55, r = size * open;
  line(c, [[x, y + size * 1.7], [x, y]], '#639b85', 1.5);
  ellipse(c, x - size * 0.6, y + size, size * 0.7, size * 0.26, '#78aa92');
  for (let j = 0; j < 5; j++) {
    const a = j * TAU / 5 + Math.sin(t * 0.5 + x) * 0.07;
    ellipse(c, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.5, r * 0.6, r * 0.43, mix('#b1e4d7', '#ffeab1', bloom));
  }
  ellipse(c, x, y, size * 0.22, size * 0.18, '#fff8d7');
}
function branches(c, bloom) {
  c.save(); c.beginPath(); c.rect(0, 0, 1200, 800); c.rect(90, 170, 1020, 530); c.clip('evenodd');
  c.lineCap = 'round';
  for (const side of [-1, 1]) {
    c.save(); if (side === 1) { c.translate(1200, 0); c.scale(-1, 1); }
    const path = [[34, 791], [28, 602], [46, 402], [39, 247], [93, 135], [250, 61], [457, 25]];
    line(c, path, '#203d44', 58); line(c, path, mix('#355f5d', '#577b5c', bloom), 39);
    line(c, [[22, 724], [45, 437], [29, 255], [99, 148], [258, 73], [460, 27]], '#88afa16e', 5);
    line(c, [[76, 168], [160, 114], [329, 114], [475, 69], [570, 86]], '#365e59', 21);
    line(c, [[167, 111], [188, 50], [273, 0]], '#466f64', 14);
    line(c, [[305, 114], [358, 148], [419, 146]], '#4a7768', 9);
    for (let i = 0; i < 29; i++) {
      const x = 110 + hash(i + 31) * 452, y = 18 + hash(i + 73) * 109;
      c.save(); c.translate(x, y); c.rotate(hash(i + 6) * 2 - 1);
      polygon(c, [[-19, 0], [-8, -9], [13, -6], [25, 0], [10, 9], [-9, 8]], mix(i % 3 ? '#426e64' : '#609587', '#83a67a', bloom));
      line(c, [[-13, 0], [18, 0]], '#b0c3a035', 1); c.restore();
      if (i % 5 === 0) { glow(c, x, y + 12, 16, '#d9e8b32a'); ellipse(c, x, y + 12, 5, 7, mix('#cce4b4', '#f9d68c', bloom)); }
    }
    c.restore();
  }
  c.restore();
}
function spring(c, s, t) {
  const used = Boolean(s.gardenSpringUsed), x = 300, y = 550;
  ellipse(c, x, y + 6, 28, 10, '#4a777925');
  ellipse(c, x, y + 2, 22, 10, '#c0c9b0', '#74968b', 2);
  ellipse(c, x, y, 18, 7, used ? '#7d9a92' : '#668e84');
  for (const side of [-1, 1]) {
    const fx = x + side * 9, fy = y - (used ? 1 : 16) + Math.sin(t * 2 + side) * (used ? 0 : 2);
    line(c, [[x + side * 6, y + 1], [fx, fy]], used ? '#809980' : '#c7d6a2', 2);
    if (!used) { glow(c, fx, fy, 22, '#ffe99b6e'); flower(c, fx, fy, 8, 1, t); ellipse(c, fx, fy, 2.3, 2.3, '#fff8c7'); }
    else polygon(c, [[fx - 4, fy], [fx - 2, fy + 4], [fx + 5, fy + 3]], '#879c79');
  }
}
function nest(c, s, t, bloom) {
  const x = 1040, y = 650;
  glow(c, x, y - 4, 86, s.exitReady || s.gardenArrived ? '#ffedb332' : '#cce8d31b');
  // A shallow woven landing, not a wall or uncollidable column.
  ellipse(c, x, y + 9, 55, 21, '#5b7d792b');
  for (let j = 0; j < 3; j++) ellipse(c, x, y + 4 - j * 3, 43 - j * 4, 19 - j * 2, j ? null : '#758c75', '#b8b48a', 2);
  ellipse(c, x, y - 2, 34, 12, '#5a7c72');
  for (let j = 0; j < 11; j++) {
    const a = j * TAU / 11;
    line(c, [[x + Math.cos(a) * 42, y + Math.sin(a) * 17], [x + Math.cos(a + 0.7) * 36, y + Math.sin(a + 0.7) * 15]], j % 2 ? '#dfd2a0' : '#91a17e', 2);
  }
  for (const side of [-1, 1]) flower(c, x + side * 58, y + 5, 10, bloom, t);
}
export function crownGarden(c, s, t) {
  const bloom = Math.max(0, Math.min(1, s.gardenBloom ?? (s.gardenArrived ? 1 : 0)));
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, 800);
  sky.addColorStop(0, mix('#152c43', '#786e86', bloom)); sky.addColorStop(1, mix('#427e8a', '#d3ba9b', bloom));
  c.fillStyle = sky; c.fillRect(0, 0, 1200, 800);
  glow(c, 701, 51, 145, mix('#779b92', '#e6bd92', bloom));
  ellipse(c, 701, 46, 36, 36, mix('#d3e6d9', '#ffe8b8', bloom));
  ellipse(c, 692, 37, 7, 6, mix('#b8d1c8', '#f2d49f', bloom));
  for (let i = 0; i < 16; i++) {
    ellipse(c, i * 93 - 25, 770 + hash(i + 71) * 20, 98, 39, mix('#91b8b3', '#ddd0b2', bloom));
    ellipse(c, i * 95 - 15, 135 + hash(i + 44) * 14, 81, 23, mix('#4b7c80', '#b1b797', bloom));
  }
  polygon(c, [[74, 150], [1119, 150], [1155, 727], [1099, 753], [108, 753], [45, 727]], '#375d62');
  polygon(c, [[78, 154], [1122, 154], [1122, 716], [78, 716]], mix('#a3bfb4', '#d0cba6', bloom));
  line(c, [[83, 726], [1117, 726]], '#91aaa0', 9); line(c, [[99, 741], [1101, 741]], '#b7c6b2', 5);
  // Quiet radial mosaics are flush with the floor; all paths remain open.
  c.save(); c.globalAlpha = 0.28;
  for (const r of [137, 149, 235, 246]) ellipse(c, 600, 433, r, r * 0.85, null, '#e4e2c8', r === 149 ? 4 : 2);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    line(c, [[600 + Math.cos(a) * 151, 433 + Math.sin(a) * 128], [600 + Math.cos(a) * 234, 433 + Math.sin(a) * 199]], '#708f82', 1);
  }
  for (const y of [187, 681]) line(c, [[100, y], [1100, y]], '#e1e3c9', 3);
  c.restore();
  // Water and flowers are beyond the traversable terrace, never false cover.
  for (const x of [62, 1138]) {
    ellipse(c, x, 458, 13, 220, mix('#316e79', '#759a82', bloom));
    for (let j = 0; j < 8; j++) arc(c, x, 279 + j * 51, 7, 0.1, 2.8, '#c3e1c951', 1);
  }
  branches(c, bloom);
  for (let i = 0; i < 36; i++) {
    const x = 110 + i * 28, bottom = i % 2 === 0;
    flower(c, x, bottom ? 744 + hash(i) * 26 : 140 + hash(i + 3) * 12, 5 + hash(i + 4) * 5, bloom, t);
  }
  for (let i = 0; i < 12; i++) {
    const x = 130 + hash(i + 94) * 943, y = (i % 2 ? 112 : 760) + Math.sin(t * 0.65 + i) * 10;
    ellipse(c, x + Math.sin(t * 0.2 + i) * 9, y, 1.4, 1.4, '#f2f0c6b0');
  }
  spring(c, s, t); nest(c, s, t, bloom); c.restore();
}
export function gardenArrival(c, s, t) {
  if (!s.gardenArrived) return;
  c.save(); c.translate(1040, 641);
  glow(c, 0, -5, 43, '#ffe8ac59');
  polygon(c, [[-7, 0], [-22, 8], [-32, 2], [-21, -2]], '#d68c50', '#877351', 1);
  ellipse(c, 0, -4, 17, 11, '#f3d994', '#9c865c', 1.4);
  ellipse(c, -3, -4, 10, 6, '#fff0bb');
  line(c, [[-10, -5], [-1, -1], [6, -4]], '#cda563', 1.3);
  ellipse(c, 12, -13, 8, 8, '#ffecaa', '#a78d5d', 1);
  polygon(c, [[19, -14], [27, -10], [19, -9]], '#d48f58');
  line(c, [[13, -14], [16, -14]], '#5e6255', 1.5);
  polygon(c, [[8, -19], [7, -27], [13, -22], [17, -25], [17, -18]], '#edc66e');
  c.restore();
}
