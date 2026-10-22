import { line } from './paint-primitives.js';
import { island } from './paint-islands.js';
import { lantern, manta, skiff } from './paint-objects.js';
import { background, atmosphere } from './paint-background.js';
import { ripples, bellKnocks } from './paint-water.js';
import { paintUndertide, paintDivingBubble } from './paint-undertide.js';
import { paintShadows } from './paint-shadows.js';

export function paint(c, s, view) {
  const w = view.width,
    h = view.height,
    t = Number(view.time || 0),
    scale = Math.min(w / 1600, h / 1000),
    ox = (w - 1600 * scale) / 2,
    oy = (h - 1000 * scale) / 2;
  c.save();
  c.clearRect(0, 0, w, h);
  c.fillStyle = '#071622';
  c.fillRect(0, 0, w, h);
  c.translate(ox, oy);
  c.scale(scale, scale);
  const bounds = {
    x: -ox / scale,
    y: -oy / scale,
    width: w / scale,
    height: h / scale
  };
  const underwater = s.region === 'undertide';
  if (underwater) paintUndertide(c, s, t);
  else background(c, t, bounds);
  ripples(c, s.ripples || []);
  bellKnocks(c, s.islands || [], t);
  (s.islands || [])
    .slice()
    .sort((a, b) => a.y - b.y)
    .forEach((o, i) => island(c, o, t, i));
  if (s.world?.bridge) {
    line(
      c,
      [
        [710, 450],
        [900, 460]
      ],
      '#627f73',
      13
    );
    line(
      c,
      [
        [710, 445],
        [900, 455]
      ],
      '#a8b598',
      2
    );
  }
  for (const o of s.lanterns || [])
    if (o.lit !== false && o.id !== s.player?.carrying)
      lantern(c, o.x, o.y, t, o.color);
  for (const o of s.creatures || []) manta(c, o, t);
  paintShadows(c, s, t);
  if (s.player) {
    skiff(
      c,
      {
        ...s.player,
        lightColor: s.lanterns.find((l) => l.id === s.player.carrying)?.color
      },
      t
    );
    if (s.region === 'undertide') paintDivingBubble(c, s.player, t);
  }
  atmosphere(c, s, t, bounds);
  c.restore();
}
