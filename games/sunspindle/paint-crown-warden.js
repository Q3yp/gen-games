// Whole-body ceramic warden; its crown is damage feedback, never a weak-point puzzle.
import { polygon, line, ellipse, glow, arc, TAU } from './paint-primitives.js';

export function crownTelegraph(c, e, t = 0) {
  if (e.hp <= 0 || !['windup', 'lunge'].includes(e.phase)) return;
  const charge = e.attack === 'charge', moving = e.phase === 'lunge';
  const angle = Number.isFinite(e.aimX) ? Math.atan2(e.aimY, e.aimX) : (e.angle || 0);
  const len = moving ? e.chargeLeft : e.aimDistance;
  const progress = Math.max(0, Math.min(1, 1 - e.timer / (e.phaseDuration || 1)));
  c.save(); c.beginPath(); c.rect(90, 170, 1020, 530); c.clip();
  c.translate(e.x, e.y); c.rotate(angle); c.lineCap = 'round';
  if (charge) {
    const r = e.radius || 58, end = Math.max(0, len || 0);
    line(c, [[0, 0], [end, 0]], `rgba(173,69,45,${0.07 + progress * 0.06})`, r * 2);
    for (const side of [-1, 1]) line(c, [[0, side * r], [end, side * r]], '#b459428f', 1.8);
    arc(c, end, 0, r, -Math.PI / 2, Math.PI / 2, '#b459428f', 1.8);
    c.setLineDash([9, 12]); line(c, [[r + 8, 0], [end, 0]], '#b04f3ba8', 2); c.setLineDash([]);
    for (let x = r + 30; x < end - 14; x += 100) line(c, [[x - 8, -9], [x + 2, 0], [x - 8, 9]], '#a74f3c8c', 2);
    // The far silhouette is a translucent destination, not an extra enemy.
    ellipse(c, end, 0, r, r, null, '#b56c4e5c', 1);
  } else {
    const spread = e.enraged ? 0.42 : 0.3;
    for (const offset of [-spread, 0, spread]) {
      c.save(); c.rotate(offset);
      line(c, [[76, 0], [len || 760, 0]], '#b75a3c10', 36);
      c.setLineDash([3, 11]); line(c, [[80, 0], [len || 760, 0]], '#a8523e9c', 1.6); c.setLineDash([]);
      line(c, [[113, -7], [124, 0], [113, 7]], '#b55d449c', 1.5);
      ellipse(c, 78, 0, 18, 18, null, '#b25a4570', 1.4); c.restore();
    }
  }
  c.restore();
}
function wing(c, side, open, flash, damage) {
  c.save(); c.scale(1, side);
  const tip = 39 + open * 25;
  polygon(c, [[4, 15], [-8, 32], [-30, tip], [-49, tip - 12], [-42, tip - 25], [-28, 17]], flash ? '#fff9dd' : '#7e9a92', '#445b59', 2);
  for (let j = 0; j < 4; j++) {
    const x = -35 + j * 9, y = 24 + (3 - j) * open * 4;
    polygon(c, [[x, y], [x - 8, tip - 9 + j * 0.4], [x - 2, tip - 3], [x + 8, y + 2]], flash ? '#fffdf0' : j % 2 ? '#e2dfc6' : '#c6d1bd', '#8c9478', 1.2);
    line(c, [[x + 1, y + 4], [x - 1, tip - 9]], '#fbefbb', 1.3);
  }
  line(c, [[4, 16], [-12, 30], [-30, tip]], '#d8b16b', 4);
  if (damage > 0.4) line(c, [[-22, 31], [-29, 35], [-25, 42], [-35, tip - 9]], '#596a63', 1.5);
  c.restore();
}
function crown(c, damage, flash) {
  for (const side of [-1, 1]) {
    const points = [[29, side * 12], [41, side * 25], [40, side * 39], [48, side * 47]];
    line(c, points, '#5e6254', 8); line(c, points, flash ? '#fff5bd' : '#d3aa61', 5);
    if (damage < 0.55) line(c, [[40, side * 32], [50, side * 29], [54, side * 20]], '#e2c17a', 4);
    else line(c, [[40, side * 32], [45, side * 30]], '#e9d4a0', 4);
    if (damage < 0.25) polygon(c, [[45, side * 44], [49, side * 57], [54, side * 44], [49, side * 39]], '#f0ce88', '#9e8a60', 1);
    else polygon(c, [[44, side * 43], [49, side * 47], [51, side * 42], [47, side * 40]], '#f4deb1');
    if (damage < 0.8) line(c, [[40, side * 39], [30, side * 46], [26, side * 42]], '#d4b471', 3);
  }
}
export function crownWarden(c, e, t) {
  if (e.hp <= 0 && !(e.down > 0)) return;
  const wind = e.phase === 'windup', rush = e.phase === 'lunge', recovering = e.phase === 'recover';
  const volley = e.attack === 'volley', flash = e.flash > 0;
  const damage = 1 - Math.max(0, e.hp) / (e.maxHp || 12), open = wind && volley ? 1 : recovering ? 0.4 : 0;
  c.save(); c.translate(e.x, e.y);
  if (e.hp <= 0) { c.globalAlpha = Math.min(1, e.down / 0.7); c.scale(1.2, 0.55); }
  ellipse(c, 3, 14, 58, 33, '#324f5033');
  c.rotate(e.angle || 0); c.lineCap = 'round';
  if (rush) {
    for (const y of [-35, -18, 18, 35]) line(c, [[-55, y], [-85 + Math.abs(y) * 0.3, y]], '#9e745b61', 2.5);
  }
  if ((wind && !volley) || rush) c.scale(rush ? 1.06 : 0.96, 0.86);
  wing(c, -1, open, flash, damage); wing(c, 1, open, flash, damage);
  for (const side of [-1, 1]) {
    const stride = rush ? Math.sin(t * 22) * 8 * side : 0;
    line(c, [[-8, side * 24], [-6 + stride, side * 40], [8 + stride, side * 44]], '#566b62', 7);
    line(c, [[-8, side * 24], [-6 + stride, side * 40], [8 + stride, side * 44]], '#c2ac73', 4);
    ellipse(c, -7 + stride, side * 39, 4, 4, '#eee1a7');
  }
  polygon(c, [[-29, -19], [-52, -15], [-59, -4], [-51, 0], [-59, 7], [-49, 18], [-28, 19]], flash ? '#fff4d3' : '#b8b68b', '#566c61', 2);
  for (const side of [-1, 1]) line(c, [[-31, side * 9], [-49, side * 11]], '#f3dca0', 2);
  const ceramic = c.createLinearGradient(-32, -34, 34, 35);
  ceramic.addColorStop(0, flash ? '#ffffff' : '#fff0ce'); ceramic.addColorStop(1, flash ? '#fff8db' : '#aabfb0');
  ellipse(c, -2, 0, 38, 38, ceramic, '#4c685e', 2.5);
  ellipse(c, -6, 0, 27, 31, null, '#e3c384', 2);
  for (const side of [-1, 1]) line(c, [[-26, side * 18], [-10, side * 24], [7, side * 19], [16, side * 9]], '#7b9d8b', 1.4);
  line(c, [[-25, 0], [-10, 0], [0, 0]], '#ffefc2', 3);
  if (damage > 0.18) line(c, [[-24, -25], [-18, -12], [-23, -4], [-10, 5], [-13, 17], [-3, 28]], '#718373', 2);
  if (damage > 0.55) line(c, [[13, -27], [7, -15], [16, -7], [8, 8], [20, 22]], '#65796d', 2);
  crown(c, damage, flash);
  const headX = rush ? 35 : recovering ? 22 : 30;
  ellipse(c, headX, 0, 22, 22, ceramic, '#526c60', 2);
  polygon(c, [[headX + 14, -9], [headX + 28, 0], [headX + 14, 9], [headX + 17, 0]], '#dcba75', '#8d835a', 1.4);
  for (const side of [-1, 1]) {
    ellipse(c, headX + 5, side * 10, 6, 5, '#55766b');
    line(c, [[headX + 3, side * 10], [headX + 8, side * 10]], wind || rush ? '#fff2b5' : '#d7c98d', 2.5);
  }
  if (wind && volley) {
    for (const offset of [-0.3, 0, 0.3]) {
      const x = Math.cos(offset) * 55, y = Math.sin(offset) * 55;
      glow(c, x, y, 19, '#ffd99765'); ellipse(c, x, y, 5, 5, '#ffe8a5', '#ab8251', 1.4);
    }
  }
  c.restore();
}
