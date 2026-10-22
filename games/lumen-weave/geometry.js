export const TAU = Math.PI * 2;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function circleHit(ray, body, radius) {
  const ox = ray.x - body.x,
    oy = ray.y - body.y,
    b = ox * ray.dx + oy * ray.dy,
    c = ox * ox + oy * oy - radius * radius,
    d = b * b - c;
  if (d < 0) return null;
  const t = -b - Math.sqrt(d);
  if (t < 0.2) return null;
  return { distance: t, x: ray.x + t * ray.dx, y: ray.y + t * ray.dy, body };
}
export function lineHit(ray, body) {
  const tx = Math.cos(body.angle),
    ty = Math.sin(body.angle),
    half = (body.length || 120) / 2;
  const cross = ray.dx * ty - ray.dy * tx;
  if (Math.abs(cross) < 0.00001) return null;
  const ox = body.x - ray.x,
    oy = body.y - ray.y,
    t = (ox * ty - oy * tx) / cross,
    u = (ox * ray.dy - oy * ray.dx) / cross;
  if (t < 0.2 || Math.abs(u) > half) return null;
  return {
    distance: t,
    x: ray.x + t * ray.dx,
    y: ray.y + t * ray.dy,
    nx: -ty,
    ny: tx,
    body
  };
}
export function reflect(ray, hit) {
  const dot = ray.dx * hit.nx + ray.dy * hit.ny;
  return {
    x: hit.x,
    y: hit.y,
    dx: ray.dx - 2 * dot * hit.nx,
    dy: ray.dy - 2 * dot * hit.ny,
    power: ray.power * 0.98,
    color: ray.color
  };
}
