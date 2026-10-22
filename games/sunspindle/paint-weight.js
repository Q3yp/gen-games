// Held, flying, resting, and returning weight share one physical silhouette.
import { P, TAU, polygon, line, ellipse, arc, shadow, star, glow } from './paint-primitives.js';

export function weight(c, s, t) {
  const o = s.orb,
    p = s.player;
  if (!o || !p) return;
  const held = o.mode === 'held',
    returning = o.mode === 'returning',
    resting = o.mode === 'resting',
    lift = held ? 18 : resting ? 2 : 10,
    x = o.x,
    y = o.y - lift;
  if (!held) {
    c.save();
    const sy = p.y - 18,
      dist = Math.hypot(x - p.x, y - sy),
      sag = resting ? Math.min(36, dist * 0.09) : Math.min(11, dist * 0.02);
    c.beginPath();
    c.moveTo(p.x, sy);
    c.quadraticCurveTo((p.x + x) / 2, (sy + y) / 2 + sag, x, y);
    c.strokeStyle = '#55435470';
    c.lineWidth = 4;
    c.stroke();
    c.strokeStyle = returning ? '#fff8ce' : '#c68c30';
    c.lineWidth = returning ? 2.7 : 2;
    c.stroke();
    if (returning) {
      const f = (t * 3) % 1;
      star(c, x + (p.x - x) * f, y + (sy - y) * f, 5, P.ivory, t, 4);
    }
    c.restore();
  }
  const trail = o.trail || [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1],
      b = trail[i];
    c.save();
    c.globalAlpha = Math.max(0.05, (b.life / (b.maxLife || 0.2)) * 0.6);
    line(c, [
      [a.x, a.y - 10],
      [b.x, b.y - 10]
    ], returning ? '#ffed9f' : '#df9b36', 4 + i / trail.length * 7);
    c.restore();
  }
  shadow(c, o.x, o.y, 13, held ? 20 : resting ? 7 : 25, 0.2);
  if (!held) glow(c, x, y, resting ? 37 : 45, returning ? '#fff3b588' : '#ffd47c4d');
  c.save();
  c.translate(x, y);
  c.rotate(o.spin || t * 0.7);
  const vertices = [];
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    vertices.push([Math.cos(a) * 18, Math.sin(a) * 18]);
  }
  polygon(c, vertices, P.darkGold, P.ink, 2);
  polygon(c, vertices.map(([a, b]) => [a * 0.82, b * 0.82 - 2]), P.gold);
  star(c, 0, -2, 12, '#fff0a4', 0, 8);
  ellipse(c, 0, -2, 5, 5, '#edbd54', P.darkGold, 1);
  line(c, [
    [-10, -10],
    [-4, -14]
  ], P.ivory, 2);
  c.restore();
  if (resting) {
    const pulse = 1 + Math.sin(t * 3) * 0.07;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      line(c, [
        [x + Math.cos(a) * 24 * pulse, y + Math.sin(a) * 24 * pulse],
        [x + Math.cos(a) * 29 * pulse, y + Math.sin(a) * 29 * pulse]
      ], P.darkGold, 1.5);
    }
  }
  if (returning) arc(c, x, y, 25, t * 9, t * 9 + Math.PI * 1.4, '#fff7ce', 3);
}
