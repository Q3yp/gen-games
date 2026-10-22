import { P, TAU, polygon, line, ellipse, arc, star, glow } from './paint-primitives.js';

function wheel(c, x, y, radius, t, flip = 1) {
  c.save();
  c.translate(x, y);
  c.scale(flip, 1);
  ellipse(c, 12, 16, radius + 4, radius * 0.86, '#735b6330');
  for (const dy of [-radius, radius]) {
    line(c, [[-33, dy], [37, dy]], '#5b4542', 12);
    line(c, [[-33, dy - 2], [37, dy - 2]], '#ca8c48', 7);
  }
  line(c, [[0, -radius - 35], [0, radius + 30]], '#75503c', 17);
  line(c, [[-4, -radius - 35], [-4, radius + 30]], '#e5b56a', 5);
  c.rotate(Math.sin(t * 0.22) * 0.025);
  ellipse(c, 0, 0, radius, radius, '#995e3730', '#62463c', 13);
  ellipse(c, -1, -2, radius, radius, null, '#d5a457', 8);
  ellipse(c, -2, -3, radius - 7, radius - 7, null, '#ffe2a1', 2);
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12;
    line(c, [[Math.cos(a) * 14, Math.sin(a) * 14],
      [Math.cos(a) * (radius - 8), Math.sin(a) * (radius - 8)]], '#7b4e38', 6);
    line(c, [[Math.cos(a) * 14 - 2, Math.sin(a) * 14 - 2],
      [Math.cos(a) * (radius - 9) - 2, Math.sin(a) * (radius - 9) - 2]], '#e7b96d', 2);
    ellipse(c, Math.cos(a) * radius, Math.sin(a) * radius, 3, 3, '#fff0b8');
  }
  ellipse(c, 0, 0, 21, 21, '#b27942', '#503e3c', 2);
  ellipse(c, -3, -4, 13, 13, '#f0c77a', '#81563a', 2);
  star(c, -3, -4, 9, '#fff0b3', 0, 8);
  c.restore();
}

function canopy(c, t) {
  // Folded cloth remains above the fighting floor; its warmth comes from weave.
  for (let panel = 0; panel < 4; panel++) {
    const x = 104 + panel * 254, sag = 14 + Math.sin(t * 0.7 + panel) * 2;
    c.save();
    c.beginPath();
    c.moveTo(x - 25, -4);
    c.lineTo(x + 246, -4);
    c.lineTo(x + 222, 84);
    c.bezierCurveTo(x + 155, 143 + sag, x + 57, 126 + sag, x - 13, 75);
    c.closePath();
    const cloth = c.createLinearGradient(x, 0, x + 80, 145);
    cloth.addColorStop(0, panel % 2 ? '#c95e43' : '#d96a48');
    cloth.addColorStop(0.55, '#b53e37');
    cloth.addColorStop(1, '#e49c67');
    c.fillStyle = cloth;
    c.fill();
    c.strokeStyle = '#803c35';
    c.lineWidth = 1.6;
    c.stroke();
    c.clip();
    for (let i = 0; i < 24; i++) {
      const u = x - 15 + i * 12;
      line(c, [[u, 0], [u + 5, 55], [u + 20, 136]], i % 3 ? '#ffdc9925' : '#692b3224', 1);
    }
    for (let y = 12; y < 150; y += 8) line(c, [[x - 25, y], [x + 247, y + 10]], '#f6bc7b1f', 0.7);
    c.beginPath();
    c.moveTo(x - 14, 64);
    c.bezierCurveTo(x + 57, 119 + sag, x + 155, 130 + sag, x + 228, 71);
    c.strokeStyle = '#edc176';
    c.lineWidth = 7;
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const u = x + 13 + i * 29, y = 62 + Math.sin((i + 0.5) * Math.PI / 8) * 42;
      star(c, u, y, 6, '#f7cf88', Math.PI / 4, 4);
    }
    c.restore();
    for (let i = 0; i < 10; i++) {
      const u = i / 9, px = x - 12 + u * 234;
      const py = 80 + Math.sin(u * Math.PI) * (39 + sag * 0.2);
      line(c, [[px, py], [px + 2, py + 8]], '#efd29a', 1.3);
    }
  }
  line(c, [[77, 12], [1120, 12]], '#6f4939', 5);
  line(c, [[77, 10], [1120, 10]], '#f8d498', 2);
}

function cord(c, p, exit, index) {
  const broken = p.hp <= 0, barY = exit.y - 51 + index * 29;
  const hingeX = exit.x + 25, anchorX = 1123;
  const bendY = p.y + (index ? -47 : 47);
  c.beginPath();
  c.moveTo(p.x + 25, p.y - 8);
  if (broken) c.bezierCurveTo(p.x + 34, p.y + 49, anchorX - 30, bendY + 40, anchorX, bendY);
  else c.lineTo(anchorX, bendY);
  c.lineTo(anchorX, barY);
  c.lineTo(hingeX, barY);
  c.strokeStyle = '#584c452d';
  c.lineWidth = 6;
  c.stroke();
  c.strokeStyle = broken ? '#bd9c6e' : '#855235';
  c.lineWidth = 3;
  c.stroke();
  c.strokeStyle = broken ? '#ecd2a6' : '#f7ce7d';
  c.lineWidth = 1;
  c.stroke();
  for (const [x, y] of [[anchorX, bendY], [anchorX, barY]]) {
    ellipse(c, x, y, 7, 7, '#c99049', '#674b3c', 1.3);
    ellipse(c, x, y, 3, 3, '#ffe7ae');
  }
  c.save();
  c.translate(hingeX, barY);
  if (broken) c.rotate(Math.PI * 0.46);
  polygon(c, [[-58, -6], [4, -6], [7, 0], [4, 6], [-58, 6]], '#a16b3d', '#513f39', 1.4);
  line(c, [[-54, -3], [1, -3]], '#ffe2a2', 2);
  for (let x = -48; x < -5; x += 14) star(c, x, 0, 3, '#ebbd71', 0, 4);
  ellipse(c, 0, 0, 4, 4, '#efd19a', '#6e4d3a', 1);
  c.restore();
}

function sunseal(c, p, t) {
  const r = p.r || 28, broken = p.hp <= 0;
  line(c, [[p.x - 20, p.y - r], [p.x - 20, p.y - 80],
    [p.x + 20, p.y - 80], [p.x + 20, p.y - r]], '#8d6742', 1.5);
  line(c, [[p.x - 30, p.y - 82], [1120, p.y - 82]], '#9e6d41', 7);
  line(c, [[p.x - 30, p.y - 85], [1120, p.y - 85]], '#f4cc86', 2);
  ellipse(c, p.x + 12, p.y + 25, 35, 11, '#76566524');
  if (broken) {
    arc(c, p.x, p.y - 3, r + 2, 3.5, 5.9, '#c99b5b', 3);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, x = p.x + Math.cos(a) * (13 + i * 2), y = p.y + 22 + Math.sin(a) * 11;
      polygon(c, [[x - 5, y], [x + 2, y - 8], [x + 7, y + 2]], i % 2 ? '#e6b373' : '#b75e42', '#906249', 0.7);
    }
    line(c, [[p.x - 20, p.y - r], [p.x - 16, p.y - 4], [p.x - 23, p.y + 6]], '#bf9761', 1.5);
    return;
  }
  glow(c, p.x, p.y, r * 1.9, '#ffe59845');
  star(c, p.x, p.y, r + 8, '#e7ae55', Math.PI / 12, 12);
  ellipse(c, p.x, p.y, r, r, p.flash > 0 ? '#fff9d0' : '#c56742', '#66473d', 1.6);
  ellipse(c, p.x - 1, p.y - 1, r - 4, r - 4, '#ecb362', '#f7dc9c', 1.3);
  star(c, p.x, p.y, r - 8, '#a65d3c', 0, 8);
  ellipse(c, p.x, p.y, 10, 10, '#fff0b5', '#885a3b', 1.4);
  arc(c, p.x, p.y, r - 8, -2.9, -1.5, '#fff5cc', 2);
  star(c, p.x - 15, p.y - 18, 4, '#fff9db', t * 0.3, 4);
}

export function threadmill(c, s, t) {
  if (s.room !== 2) return;
  c.save();
  c.lineJoin = 'round';
  canopy(c, t);
  wheel(c, 10, 425, 91, t);
  wheel(c, 1188, 555, 82, t, -1);
  for (let i = 0; i < 15; i++) {
    const x = 184 + i * 50;
    line(c, [[x, 738], [x + 45, 796]], '#c5976444', 1);
  }
  line(c, [[143, 750], [1077, 750]], '#805037', 13);
  line(c, [[143, 746], [1077, 746]], '#dfb371', 5);
  for (let x = 167; x < 1070; x += 27) line(c, [[x, 742], [x + 9, 758]], '#f6d594', 2);
  const seals = (s.props || []).filter(p => p.kind === 'sunseal');
  const exit = s.exit || { x: 1050, y: 430 };
  seals.forEach((p, i) => cord(c, p, exit, i));
  seals.forEach(p => sunseal(c, p, t));
  c.restore();
}
