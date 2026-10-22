// Layer the courier’s scarf, clothing, head, and small health pips.
import { P, polygon, line, ellipse, shadow } from './paint-primitives.js';

export function courier(c, p, t) {
  if (!p) return;
  shadow(c, p.x, p.y, 12, 29, 0.22);
  for (const q of p.trail || []) {
    c.save();
    c.globalAlpha = Math.max(0, (q.life / (q.maxLife || 0.3))) * 0.13;
    ellipse(c, q.x, q.y - 10, 10, 16, P.red);
    c.restore();
  }
  c.save();
  c.translate(p.x, p.y);
  const angle = p.angle || 0,
    move = (p.trail || []).length > 2,
    bob = move ? Math.sin(t * 17) * 1.5 : Math.sin(t * 3) * 0.5;
  if (p.grace > 0 && t > 0) c.globalAlpha = 0.64 + Math.sin(t * 24) * 0.2;
  c.translate(0, bob);
  const dx = -Math.cos(angle),
    dy = -Math.sin(angle),
    tailX = dx * 38 - 8,
    tailY = dy * 19 - 21;
  c.beginPath();
  c.moveTo(-3, -23);
  c.bezierCurveTo(dx * 16, -26, tailX + 8, tailY - 10, tailX, tailY);
  c.bezierCurveTo(tailX - 6, tailY + 7, tailX - 15, tailY + 1, tailX - 19, tailY + 7);
  c.lineTo(tailX - 3, tailY + 11);
  c.bezierCurveTo(tailX + 10, tailY + 12, dx * 14, -8, 3, -16);
  c.closePath();
  c.fillStyle = P.red;
  c.fill();
  line(c, [
    [tailX - 12, tailY + 7],
    [tailX + 1, tailY + 7],
    [dx * 15, -15]
  ], '#f59454', 1.3);
  const step = move ? Math.sin(t * 17) * 3 : 0;
  line(c, [
    [-6, -1],
    [-8, 7 + step],
    [-3, 8 + step]
  ], P.ink, 4);
  line(c, [
    [6, -1],
    [7, 7 - step],
    [12, 8 - step]
  ], P.ink, 4);
  polygon(c, [
    [-9, -20],
    [7, -23],
    [12, -5],
    [7, 2],
    [-12, 2]
  ], p.flash > 0 ? '#fff' : P.ivory, P.ink, 1.5);
  polygon(c, [
    [-8, -16],
    [5, -16],
    [7, -2],
    [-10, -2]
  ], P.cobalt);
  line(c, [
    [-8, -7],
    [8, -7]
  ], P.gold, 3);
  const ax = Math.cos(angle) * 15,
    ay = Math.sin(angle) * 9 - 15;
  line(c, [
    [3, -18],
    [ax, ay]
  ], P.ink, 6);
  line(c, [
    [3, -19],
    [ax, ay - 1]
  ], P.ivory, 4);
  ellipse(c, ax, ay, 3, 3, '#bc7752', P.ink, 0.8);
  ellipse(c, 0, -28, 9, 9, P.ink);
  ellipse(c, Math.cos(angle) * 2, -28 + Math.sin(angle), 7, 7, '#db9d6c', P.ink, 1);
  polygon(c, [
    [-9, -31],
    [-7, -37],
    [4, -38],
    [10, -31],
    [5, -32],
    [0, -35],
    [-4, -30]
  ], '#36364b');
  ellipse(c, Math.cos(angle) * 6, -29 + Math.sin(angle) * 3, 1, 1, P.ink);
  polygon(c, [
    [-8, -23],
    [8, -24],
    [10, -19],
    [-5, -18],
    [-10, -20]
  ], p.flash > 0 ? '#fff' : P.red, P.ink, 0.7);
  c.restore();
  const n = p.maxHp || 5;
  for (let i = 0; i < n; i++) ellipse(
    c, p.x + (i - (n - 1) / 2) * 8, p.y + 21, 2.4, 2.4,
    i < p.hp ? P.red : '#d1b695', i < p.hp ? '#a83932' : '#a79177', 0.6
  );
}
