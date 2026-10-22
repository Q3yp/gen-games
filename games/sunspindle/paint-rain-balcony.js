// Moonlit ceramic terraces. All raised scenery stays beyond the combat floor.
import { polygon, line, ellipse, glow, hash } from './paint-primitives.js';

function water(c, x, t) {
  c.fillStyle = '#2c617c'; c.fillRect(x, 154, 22, 575);
  line(c, [[x - 3, 154], [x - 3, 729]], '#d3e4ed', 5);
  line(c, [[x + 25, 154], [x + 25, 729]], '#6b91a9', 5);
  // A few slow currents, never rain or particles over the fighting space.
  for (let i = 0; i < 8; i++) {
    const y = 165 + (i * 73 + t * 9) % 550;
    line(c, [[x + 6, y], [x + 8, y + 16], [x + 6, y + 28]], '#8cbcd16b', 1);
  }
}

export function rainBalcony(c, s, t) {
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, 800);
  sky.addColorStop(0, '#162f54'); sky.addColorStop(1, '#698da9');
  c.fillStyle = sky; c.fillRect(0, 0, 1200, 800);
  glow(c, 214, 51, 120, '#b9d8ed26');
  ellipse(c, 214, 51, 26, 26, '#e6f0ef');
  ellipse(c, 207, 46, 6, 5, '#ccdee1');
  for (let i = 0; i < 35; i++) {
    const x = i * 37, h = 18 + hash(i + 29) * 57;
    c.fillStyle = i % 3 ? '#304b69' : '#233e5d';
    c.fillRect(x, 137 - h, 29, h);
    for (let j = 0; j < 3; j++) {
      if (hash(i * 7 + j) > 0.42) {
        c.fillStyle = '#d5bd856e'; c.fillRect(x + 7 + j * 6, 147 - h, 2, 4);
      }
    }
  }
  for (let i = 0; i < 13; i++) {
    ellipse(c, i * 111 - 28, 142 + hash(i + 71) * 13, 95, 25, '#7898b7');
    ellipse(c, i * 111 + 14, 772 + hash(i + 84) * 20, 115, 40, '#9bb8ca');
  }
  polygon(c, [[41, 147], [1159, 147], [1159, 747], [41, 747]], '#506e87');
  const floor = c.createLinearGradient(0, 150, 1050, 740);
  floor.addColorStop(0, '#a8c5d7'); floor.addColorStop(1, '#89aaba');
  c.fillStyle = floor; c.fillRect(79, 151, 1042, 579);
  // Glazed broad tiles are quiet enough to keep every actor silhouette legible.
  for (let row = 0; row < 8; row++) {
    const y = 156 + row * 76;
    line(c, [[81, y], [1119, y]], '#d6e8ee25', 1);
    for (let col = 0; col < 10; col++) {
      const x = 92 + col * 122 + (row % 2) * 61;
      if (x < 1119) line(c, [[x, y], [x, Math.min(y + 76, 728)]], '#547a8e26', 1);
    }
  }
  line(c, [[90, 164], [1110, 164]], '#e5f2f04a', 2);
  line(c, [[90, 716], [1110, 716]], '#dce9ed6b', 2);
  water(c, 50, t); water(c, 1128, t + 8);
  c.fillStyle = '#305f7b'; c.fillRect(50, 731, 1100, 9);
  line(c, [[46, 744], [1154, 744]], '#bfd6df', 5);
  // Slender rear balustrade and its reflected glaze are outside the arena.
  line(c, [[40, 139], [1160, 139]], '#d3e3eb', 9);
  line(c, [[40, 147], [1160, 147]], '#426582', 5);
  for (let x = 58; x < 1170; x += 108) {
    c.fillStyle = '#a4bdce'; c.fillRect(x, 112, 8, 25);
    ellipse(c, x + 4, 110, 8, 4, '#e1ecee');
  }
  // A sheltered garden beyond the rear railing, not a set of floor obstacles.
  polygon(c, [[886, 134], [886, 80], [1150, 72], [1150, 134]], '#294c60');
  for (let i = 0; i < 14; i++) {
    const x = 898 + i * 18, y = 108 + hash(i + 40) * 19;
    line(c, [[x, 132], [x + 3, y - 14]], '#6b9b9b', 2);
    ellipse(c, x - 5, y, 10, 5, '#547f80');
    ellipse(c, x + 8, y - 7, 11, 5, '#7ba5a1');
    if (i % 3 === 0) ellipse(c, x + 3, y - 15, 4, 3, '#c6d3dd');
  }
  line(c, [[882, 134], [1154, 134]], '#a8c3d0', 7);
  // Painted iris tiles mark the doorway area; the actual exit is drawn elsewhere.
  const ex = s.exit?.x ?? 1040, ey = s.exit?.y ?? 240;
  ellipse(c, ex, ey + 9, 66, 27, '#d8e8e735');
  for (const dx of [-53, 53]) {
    line(c, [[ex + dx, ey + 25], [ex + dx, ey - 3]], '#507d854d', 2);
    polygon(c, [[ex + dx, ey + 12], [ex + dx - 9, ey + 1], [ex + dx, ey + 5],
      [ex + dx + 9, ey - 5], [ex + dx + 3, ey + 15]], '#cadfe458');
  }
  c.restore();
}

export function stoneScreen(c, p, t) {
  const r = p.r ?? 42, hp = p.hp ?? 2, maximum = p.maxHp ?? 2;
  c.save(); c.translate(p.x, p.y);
  if (hp <= 0) {
    ellipse(c, 0, 0, r, r * 0.7, '#42647722');
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, x = Math.cos(a) * r * 0.52, y = Math.sin(a) * r * 0.49;
      polygon(c, [[x - 10, y + 5], [x - 7, y - 7], [x + 5, y - 10],
        [x + 11, y + 1], [x + 5, y + 8]], i % 2 ? '#b7c8cf' : '#e5eceb', '#7893a4', 1);
      line(c, [[x - 6, y - 6], [x + 4, y - 9], [x + 9, y]], '#f3f5ee', 1);
    }
    c.restore(); return;
  }
  // The outer circle is exactly the collision footprint, with no jar neck or handle.
  ellipse(c, 0, 0, r, r, '#7891a2');
  ellipse(c, 0, 0, r - 1.5, r - 1.5, '#c2ced3', '#536e84', 3);
  const stone = c.createLinearGradient(-r, -r, r, r);
  stone.addColorStop(0, '#ffffff'); stone.addColorStop(1, '#ccd8df');
  ellipse(c, 0, -4, r - 4, r - 8, stone, '#edf3f3', 2);
  for (const inset of [12, 18]) {
    ellipse(c, 0, -4, r - inset, r - inset - 4, null, '#a7bac66e', 1.5);
  }
  line(c, [[-r * 0.55, r * 0.65], [0, r * 0.79], [r * 0.55, r * 0.65]], '#8da4b3', 2);
  if (hp < maximum) {
    line(c, [[-r * 0.56, -r * 0.55], [-8, -12], [-15, -2], [3, 8],
      [1, 20], [r * 0.43, r * 0.66]], '#5b778d', 2.5);
    line(c, [[-15, -2], [-25, 6], [-r * 0.81, 3]], '#6c8798', 1.5);
    line(c, [[3, 8], [17, -1], [r * 0.68, -r * 0.39]], '#6c8798', 1.5);
  }
  c.restore();
}
