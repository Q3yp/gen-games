import { TAU } from './paint-primitives.js';

function ring(c, x, y, radius, flatten, alpha, width = 1) {
  c.strokeStyle = `rgba(136,210,189,${alpha})`;
  c.lineWidth = width;
  c.beginPath();
  c.ellipse(x, y, radius, radius * flatten, 0, 0, TAU);
  c.stroke();
}

export function ripples(c, wakes) {
  for (const r of wakes) {
    const age = Math.max(0, r.age || 0);
    if (r.pulse) {
      // The bell's reach is measured in world space, unlike flattened boat wakes.
      const progress = Math.min(1, age / 2);
      ring(c, r.x, r.y, 8 + progress * 232, 1, 0.48 * (1 - progress), 2);
    } else {
      ring(c, r.x, r.y, 8 + age * 24, 0.55, Math.max(0, 0.3 - age * 0.08));
    }
  }
}

export function bellKnocks(c, islands, t) {
  const bell = islands.find((o) => o.id === 'bell');
  if (!bell) return;
  const phase = ((t % 5.5) + 5.5) % 5.5;
  // An occasional quiet pair of disturbances just beyond the flooded steps.
  for (const delay of [0, 0.32]) {
    const age = phase - delay;
    if (age < 0 || age > 1.4) continue;
    ring(
      c,
      bell.x,
      bell.y + (bell.r || 65) * 0.68 + 13,
      5 + age * 29,
      0.42,
      0.27 * (1 - age / 1.4),
      1.2
    );
  }
}
