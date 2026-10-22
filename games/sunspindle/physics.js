export const bounds = { left: 90, right: 1110, top: 160, bottom: 710 };
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function direction(from, to, fallback = 0) {
  const x = to.x - from.x, y = to.y - from.y, length = Math.hypot(x, y);
  return length > 0.01 ? { x: x / length, y: y / length } : { x: Math.cos(fallback), y: Math.sin(fallback) };
}
export function confine(body, r) {
  const x = body.x, y = body.y;
  body.x = clamp(x, bounds.left + r, bounds.right - r);
  body.y = clamp(y, bounds.top + r, bounds.bottom - r);
  return x !== body.x || y !== body.y;
}
export function separate(a, b, radius) {
  const d = distance(a, b);
  if (d >= radius) return false;
  const n = direction(b, a);
  a.x = b.x + n.x * radius;
  a.y = b.y + n.y * radius;
  return true;
}
export function segmentHits(from, to, target, radius) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const divisor = dx * dx + dy * dy;
  const t = divisor ? clamp(((target.x - from.x) * dx + (target.y - from.y) * dy) / divisor, 0, 1) : 0;
  return Math.hypot(target.x - from.x - dx * t, target.y - from.y - dy * t) < radius;
}

// First circle contact along a segment, rather than its closest point. Sorting
// these fractions lets a screen block everything farther along the same sweep.
export function segmentContact(from, to, target, radius) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const ox = from.x - target.x, oy = from.y - target.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a <= 1e-12) return null;
  const b = ox * dx + oy * dy, discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const t = (-b - Math.sqrt(discriminant)) / a;
  return t >= 0 && t <= 1 ? t : null;
}
