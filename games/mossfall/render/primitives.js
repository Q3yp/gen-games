// Shared map coordinates and small canvas drawing vocabulary.
export const CELL = 60,
  LEFT = 40,
  TOP = 105,
  WIDTH = 900,
  HEIGHT = 540;
export const TAU = Math.PI * 2;
export const noise = (x, y, salt = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
export const point = (x, y) => ({
  x: LEFT + x * CELL + CELL / 2,
  y: TOP + y * CELL + CELL / 2
});
export function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}
export function polygon(ctx, points, fill, stroke, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
export function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
export function glow(ctx, x, y, size, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, size);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
}
export function diamond(ctx, x, y, r, color) {
  polygon(
    ctx,
    [
      [x, y - r],
      [x + r * 0.65, y],
      [x, y + r],
      [x - r * 0.65, y]
    ],
    color
  );
}
export function label(ctx, x, y, text, color = '#c2d2b9') {
  ctx.save();
  ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#071914';
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
