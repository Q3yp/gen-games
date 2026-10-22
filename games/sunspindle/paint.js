import { palace, exitArch, foreground } from './paint-palace.js';
import { threadmill } from './paint-threadmill.js';
import { courier, enemy, telegraph, crystal, weight } from './paint-figures.js';
import { arrow, effects, ambience, pointer } from './paint-effects.js';

export function paint(c, s, view) {
  const w = view.width,
    h = view.height,
    scale = Math.min(w / 1200, h / 800),
    ox = (w - 1200 * scale) / 2,
    oy = (h - 800 * scale) / 2,
    t = Number(s.clock ?? view.time ?? 0);
  c.save();
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#dfbf91';
  c.fillRect(0, 0, w, h);
  c.translate(ox, oy);
  c.scale(scale, scale);
  c.beginPath();
  c.rect(0, 0, 1200, 800);
  c.clip();
  if (s.shake > 0) {
    const k = Math.min(7, s.shake * 30);
    c.translate(Math.sin(t * 137) * k, Math.cos(t * 117) * k * 0.6);
  }
  palace(c, s, t);
  exitArch(c, s, t);
  if (s.room === 2) threadmill(c, s, t);
  for (const e of s.enemies || []) telegraph(c, e);
  // Ground-position sorting keeps characters and the hanging prism overlapping naturally.
  const entities = [
    ...(s.enemies || []).map(value => ({ type: 'enemy', value })),
    ...(s.props || []).map(value => ({ type: 'prop', value }))
  ];
  if (s.player) entities.push({ type: 'player', value: s.player });
  entities.sort((a, b) => a.value.y - b.value.y);
  for (const e of entities) {
    if (e.type === 'player') courier(c, e.value, t);
    else if (e.type === 'enemy') enemy(c, e.value, t);
    else if (e.value.kind === 'crystal') crystal(c, e.value, s, t);
  }
  for (const a of s.shots || []) arrow(c, a);
  weight(c, s, t);
  effects(c, s);
  ambience(c, s, t);
  pointer(c, s, view.pointer, t);
  foreground(c, t);
  // A thin inner ink edge unifies the scene without a panel, HUD, or vignette.
  c.strokeStyle = '#6a584f30';
  c.lineWidth = 1;
  c.strokeRect(10.5, 10.5, 1179, 779);
  c.restore();
}
