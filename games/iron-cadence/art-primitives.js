// Pure procedural art. All animation follows the caller's clock; no gameplay state is changed.
export const TAU = Math.PI * 2;
export function path(c, points, fill, stroke, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
export function line(c, points, color, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
export function ellipse(c, x, y, rx, ry, fill) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = fill;
  c.fill();
}
export function glow(c, x, y, r, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}
export function gradient(c, x, y, x2, y2, stops) {
  const g = c.createLinearGradient(x, y, x2, y2);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  return g;
}
