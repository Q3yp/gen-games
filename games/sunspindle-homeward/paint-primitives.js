export const P = {
  ink: '#35324f',
  ivory: '#fff3d2',
  cream: '#efdfb9',
  sand: '#deba87',
  clay: '#bc6850',
  coral: '#e7946b',
  red: '#db422d',
  blue: '#346298',
  cobalt: '#254d84',
  teal: '#4c9595',
  purple: '#77708b',
  gold: '#edb943',
  darkGold: '#a96b33'
};
export const TAU = Math.PI * 2;
export const hash = n => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function polygon(c, points, fill, stroke, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
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
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

export function ellipse(c, x, y, rx, ry, color, stroke, width = 1) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (color) {
    c.fillStyle = color;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}

export function glow(c, x, y, radius, color) {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  c.fillStyle = g;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function arc(c, x, y, radius, from, to, color, width = 1) {
  c.beginPath();
  c.arc(x, y, radius, from, to);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

export function shadow(c, x, y, rx, length = 42, opacity = 0.22) {
  c.save();
  c.globalAlpha = opacity;
  polygon(c, [
    [x - rx, y - 3],
    [x + rx, y - 3],
    [x + rx + length * 0.78, y + length],
    [x - rx + length * 0.78, y + length]
  ], P.purple);
  ellipse(c, x + length * 0.78, y + length, rx, rx * 0.35, P.purple);
  c.restore();
}

export function star(c, x, y, radius, color, rotation = 0, points = 8) {
  const v = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rotation + i * Math.PI / points,
      r = i % 2 ? radius * 0.42 : radius;
    v.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  polygon(c, v, color);
}

export function bird(c, x, y, t, scale = 1, color = P.gold) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  const flap = Math.sin(t * 13) * 8;
  polygon(c, [
    [-1, 0],
    [-16, -8 - flap],
    [-11, -2],
    [0, 5],
    [11, -1],
    [18, -9 + flap],
    [8, 1]
  ], color, P.darkGold, 0.7);
  ellipse(c, 2, 0, 6, 4, P.ivory);
  ellipse(c, 7, -3, 3, 3, color);
  polygon(c, [
    [9, -4],
    [14, -2],
    [9, -1]
  ], P.red);
  ellipse(c, 8, -3, 0.7, 0.7, P.ink);
  polygon(c, [
    [-3, 2],
    [-12, 10],
    [-6, 1]
  ], P.red);
  c.restore();
}
