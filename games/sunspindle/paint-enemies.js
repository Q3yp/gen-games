// Shared enemy placement, damage feedback, and committed attack telegraphs.
import { polygon, line, ellipse, shadow } from './paint-primitives.js';
import { ram } from './paint-ram.js';
import { archer } from './paint-archer.js';
import { guardian } from './paint-guardian.js';
import { artillery } from './paint-artillery.js';

export function telegraph(c, e) {
  if (e.hp <= 0 || !['windup', 'lunge'].includes(e.phase)) return;
  const angle = Number.isFinite(e.aimX) ? Math.atan2(e.aimY, e.aimX) : (e.angle || 0),
    len = Math.min(e.aimDistance || 260, e.kind !== 'archer' ? 470 : 620),
    ram = e.kind === 'ram' || e.kind === 'guardian';
  c.save();
  c.translate(e.x, e.y);
  c.rotate(angle);
  const g = c.createLinearGradient(20, 0, len, 0);
  g.addColorStop(0, ram ? '#b9553c23' : '#b9553c12');
  g.addColorStop(1, '#b9553c00');
  const spread = ram ? (e.kind === 'guardian' ? 48 : 32) : Math.tan(e.kind === 'artillery' ? 0.34 : 0.17) * len;
  polygon(c, [
    [16, -(ram ? 17 : 4)],
    [len, -spread],
    [len, spread],
    [16, ram ? 17 : 4]
  ], g);
  c.setLineDash(ram ? [8, 11] : [2, 9]);
  line(c, [
    [30, 0],
    [len, 0]
  ], ram ? '#a5493f55' : '#8c5b4d77', ram ? 1.6 : 1);
  c.setLineDash([]);
  if (!ram) {
    c.setLineDash([3, 11]);
    for (const side of [-1, 1]) line(c, [
      [30, side * 5],
      [len, side * spread]
    ], '#8c5b4d55', 1);
    c.setLineDash([]);
  }
  if (ram) {
    line(c, [
      [len - 13, -8],
      [len, 0],
      [len - 13, 8]
    ], '#a95b4d55', 1.5);
    line(c, [
      [32, -19],
      [len - 15, -31]
    ], '#a95b4d30', 1);
    line(c, [
      [32, 19],
      [len - 15, 31]
    ], '#a95b4d30', 1);
  }
  c.restore();
}

export function enemy(c, e, t) {
  if (e.hp <= 0 && !(e.down > 0)) return;
  c.save();
  if (e.hp <= 0) {
    c.globalAlpha = Math.min(1, e.down / 0.7);
    c.translate(e.x, e.y);
    c.scale(1.15, 0.55);
    c.translate(-e.x, -e.y);
  } else if (e.flash > 0) {
    c.translate(e.x, e.y);
    c.scale(1.13, 0.82);
    c.translate(-e.x, -e.y);
  }
  shadow(c, e.x, e.y, e.kind === 'ram' ? 25 : 18, e.kind === 'ram' ? 36 : 46, 0.22);
  if (e.kind === 'artillery') artillery(c, e, t);
  else if (e.kind === 'guardian') guardian(c, e, t);
  else if (e.kind === 'ram') ram(c, e, t);
  else archer(c, e, t);
  if (e.hp > 0 && e.hp < e.maxHp) {
    for (let i = 0; i < e.maxHp; i++) ellipse(
      c, e.x + (i - (e.maxHp - 1) / 2) * 7, e.y + (e.kind === 'artillery' ? 72 : 38), 2.2, 2.2,
      i < e.hp ? '#a95b4b' : '#c8b69b'
    );
  }
  c.restore();
}
