// Projectile marks, short-lived impacts, companion, and the quiet aiming cursor.
import { P, TAU, hash, polygon, line, ellipse, star, glow, bird } from './paint-primitives.js';

export function arrow(c, a) {
  c.save();
  c.translate(a.x, a.y - 6);
  c.rotate(a.angle ?? Math.atan2(a.vy || 0, a.vx || 0));
  line(c, [
    [-17, 2],
    [10, 2]
  ], '#57435444', 3);
  line(c, [
    [-17, 0],
    [10, 0]
  ], P.ink, 3);
  line(c, [
    [-17, -0.5],
    [9, -0.5]
  ], P.ivory, 1.2);
  polygon(c, [
    [15, 0],
    [5, -5],
    [7, 0],
    [5, 5]
  ], P.red, P.ink, 0.8);
  line(c, [
    [-14, 0],
    [-19, -4]
  ], '#faf0ca', 2);
  line(c, [
    [-14, 0],
    [-19, 4]
  ], '#faf0ca', 2);
  c.restore();
}

export function effects(c, s) {
  for (const r of s.rings || []) {
    const f = Math.max(0, r.life / (r.maxLife || 0.4));
    c.save();
    c.globalAlpha = f * 0.8;
    c.beginPath();
    c.ellipse(r.x, r.y, r.r || 1, (r.r || 1) * 0.75, 0, 0, TAU);
    c.strokeStyle = r.color || P.ivory;
    c.lineWidth = 1 + f * 4;
    c.stroke();
    c.restore();
  }
  for (const p of s.particles || []) {
    const f = Math.max(0, Math.min(1, p.life / (p.maxLife || 0.6))),
      r = Math.max(0.5, p.r || 2);
    c.save();
    c.globalAlpha = f;
    c.translate(p.x, p.y);
    c.rotate(Math.atan2(p.vy || 0, p.vx || 0) + p.life * 2);
    polygon(c, [
      [-r, -r * 0.35],
      [r * 0.7, -r],
      [r, r * 0.7],
      [-r * 0.5, r]
    ], p.color || P.gold);
    c.restore();
  }
}

export function ambience(c, s, t) {
  for (let i = 0; i < 15; i++) {
    const x = (hash(i + 47) * 1200 + t * (3 + hash(i) * 5)) % 1200,
      y = 190 + hash(i + 90) * 500 + Math.sin(t * 0.3 + i) * 9;
    c.save();
    c.globalAlpha = 0.17 + hash(i + 6) * 0.18;
    line(c, [
      [x, y],
      [x + 2, y - 1]
    ], '#fff8dc', 1.3);
    c.restore();
  }
  if (s.awaitingHost && !s.gardenArrived && s.player) {
    const p = s.player;
    glow(c, p.x, p.y - 16, 53, '#fff2aa45');
    ellipse(c, p.x, p.y - 11, 31, 43, null, '#c99a4655', 1);
    for (let i = 0; i < 3; i++) {
      const a = t * 0.9 + i * TAU / 3;
      star(c, p.x + Math.cos(a) * 33, p.y - 11 + Math.sin(a) * 43, 3, '#fff9d1', a, 4);
    }
  }
  if (s.rescue && !s.gardenArrived && s.player) {
    const p = s.player,
      x = p.x - 35 + Math.sin(t * 2.1) * 11,
      y = p.y - 48 + Math.cos(t * 1.7) * 5;
    ellipse(c, x + 15, p.y + 12, 8, 2, '#81748a22');
    bird(c, x, y, t, 0.85);
  }
}

export function pointer(c, s, pointer, t) {
  if (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y) || pointer.x < 90 || pointer.x >
    1110 || pointer.y < 160 || pointer.y > 710) return;
  const x = pointer.x,
    y = pointer.y;
  c.save();
  c.globalAlpha = 0.65;
  const ready = s.orb?.mode === 'held';
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + Math.PI / 4;
    line(c, [
      [x + Math.cos(a) * 7, y + Math.sin(a) * 7],
      [x + Math.cos(a) * 11, y + Math.sin(a) * 11]
    ], ready ? P.ink : P.darkGold, 1.2);
  }
  ellipse(c, x, y, 1, 1, ready ? P.ink : P.gold);
  c.restore();
}
