export const TAU = Math.PI * 2;
export const noise = (n) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}
export function glow(c, x, y, r, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,199,100,0)');
  ellipse(c, x, y, r, r, g);
}
export function line(c, points, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p)));
  c.stroke();
}
export function arch(c, x, y, w, h, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.fillStyle = '#243e49';
  c.strokeStyle = '#63807c';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-w * 0.6, 0);
  c.lineTo(-w * 0.6, -h * 0.65);
  c.quadraticCurveTo(-w * 0.6, -h * 0.93, 0, -h);
  c.quadraticCurveTo(w * 0.6, -h * 0.93, w * 0.6, -h * 0.65);
  c.lineTo(w * 0.6, 0);
  c.lineTo(w * 0.34, 0);
  c.lineTo(w * 0.34, -h * 0.64);
  c.quadraticCurveTo(w * 0.34, -h * 0.83, 0, -h * 0.9);
  c.quadraticCurveTo(-w * 0.34, -h * 0.83, -w * 0.34, -h * 0.64);
  c.lineTo(-w * 0.34, 0);
  c.closePath();
  c.fill();
  c.stroke();
  for (let j = 0; j < 4; j++) {
    let yy = -h * 0.15 * j;
    line(
      c,
      [
        [-w * 0.6, yy],
        [-w * 0.35, yy]
      ],
      '#76867a',
      0.6
    );
    line(
      c,
      [
        [w * 0.35, yy],
        [w * 0.6, yy]
      ],
      '#76867a',
      0.6
    );
  }
  c.restore();
}
