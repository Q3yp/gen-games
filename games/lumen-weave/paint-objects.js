import { TAU } from './geometry.js';
import { HEIGHT } from './simulation.js';
import { glow, line } from './paint-primitives.js';

/** Optical objects share primitives but preserve their independent canvas state. */
export function drawMirror(ctx, body, view, time) {
  const active = view.selected === body.id,
    hover = view.hover === body.id;
  glow(
    ctx,
    body.x,
    body.y,
    90,
    active ? '#a9ffe5' : '#6098bb',
    active ? 0.2 : 0.08
  );
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.strokeStyle = active ? '#9bd8cf77' : '#7497af22';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, body.length / 2 + 15, 0, TAU);
  ctx.stroke();
  if (active || hover) {
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = '#d2eee366';
    ctx.beginPath();
    ctx.arc(0, 0, body.length / 2 + 23, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.rotate(body.angle);
  const gradient = ctx.createLinearGradient(0, -8, 0, 8);
  gradient.addColorStop(0, '#e2fff9');
  gradient.addColorStop(0.35, '#89cacb');
  gradient.addColorStop(0.5, '#253d52');
  gradient.addColorStop(1, '#6385a3');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-body.length / 2, 0);
  ctx.lineTo(-body.length / 2 + 15, -8);
  ctx.lineTo(body.length / 2 - 15, -8);
  ctx.lineTo(body.length / 2, 0);
  ctx.lineTo(body.length / 2 - 15, 8);
  ctx.lineTo(-body.length / 2 + 15, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d4fff0';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#d9fff1';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  if (active || hover)
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(direction * (body.length / 2 + 23), 0, 8, 0, TAU);
      ctx.fillStyle = '#112c38';
      ctx.fill();
      ctx.strokeStyle = '#b7f4da';
      ctx.stroke();
    }
  ctx.restore();
  if (active) {
    ctx.font = '10px ui-monospace,monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4efe4';
    ctx.fillText(
      `${Math.round((body.angle * 180) / Math.PI) % 360}°  ·  DRAG ENDS TO ROTATE`,
      body.x,
      body.y + body.length / 2 + 44
    );
  }
}
export function drawFlower(ctx, body, power, time, prism) {
  const bloom = body.bloomed,
    charge = body.charge || 0,
    r = body.radius || 34,
    color = body.color || '#aaffc7';
  glow(
    ctx,
    body.x,
    body.y,
    bloom ? 135 : 85,
    color,
    bloom ? 0.24 : 0.1 + charge * 0.18
  );
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(time * (bloom ? 0.08 : 0.025));
  for (let i = 0; i < 8; i++) {
    ctx.rotate(TAU / 8);
    ctx.beginPath();
    ctx.ellipse(
      0,
      -(bloom ? 28 : 17),
      bloom ? 13 : 7,
      bloom ? 27 : 17,
      0,
      0,
      TAU
    );
    ctx.fillStyle = bloom ? color : '#29404c';
    ctx.globalAlpha = bloom ? 0.65 : 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = bloom ? color : '#84a9ac55';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = bloom ? '#f2ffe0' : '#142f3c';
  ctx.beginPath();
  ctx.arc(body.x, body.y, bloom ? 10 : 8 + charge * 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#adbec122';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(body.x, body.y, r + 16, 0, TAU);
  ctx.stroke();
  if (charge > 0 && !bloom) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(body.x, body.y, r + 16, -Math.PI / 2, -Math.PI / 2 + TAU * charge);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.font = '11px ui-monospace,monospace';
  ctx.fillStyle = bloom ? color : power ? '#e8fff1' : '#a6bcc7';
  if (!prism || bloom)
    ctx.fillText(
      bloom
        ? 'BLOOMED'
        : power
          ? `DRINKING LIGHT · ${Math.floor(charge * 100)}%`
          : 'SLEEPING SEED',
      body.x,
      body.y + r + 39
    );
}
export function drawStone(ctx, body, time) {
  glow(ctx, body.x, body.y, body.radius + 50, '#bc5688', 0.13);
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(0.3);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7,
      r = body.radius * (0.8 + Math.sin(i * 14) * 0.15);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#17182b';
  ctx.fill();
  ctx.strokeStyle = '#9c5b8166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function drawLantern(ctx, body, power, time) {
  const x = body.x,
    y = body.y,
    r = body.radius || 32,
    needed = body.requiredPower || 0.2,
    full = Math.min(1, power / needed),
    bright = power >= needed,
    color = body.color || '#ffd58a';
  glow(
    ctx,
    x,
    y,
    bright ? 120 : 65,
    color,
    bright ? 0.24 : power ? 0.13 : 0.04
  );
  ctx.save();
  ctx.translate(x, y);
  const cage = () => {
    ctx.beginPath();
    ctx.moveTo(0, -r - 8);
    ctx.lineTo(r, -r * 0.3);
    ctx.lineTo(r * 0.76, r * 0.65);
    ctx.lineTo(0, r + 8);
    ctx.lineTo(-r * 0.76, r * 0.65);
    ctx.lineTo(-r, -r * 0.3);
    ctx.closePath();
  };
  line(ctx, 0, -r - 24, 0, -r - 9, '#a5a795', 1);
  ctx.strokeStyle = '#c1bfa0';
  ctx.strokeRect(-5, -r - 28, 10, 7);
  cage();
  ctx.fillStyle = '#101e2b';
  ctx.fill();
  ctx.save();
  cage();
  ctx.clip();
  const glass = ctx.createLinearGradient(0, r + 8, 0, -r - 8);
  glass.addColorStop(0, color);
  glass.addColorStop(1, '#9aebed');
  ctx.fillStyle = glass;
  ctx.globalAlpha = bright ? 0.38 : 0.18;
  ctx.fillRect(-r, r + 8 - (r * 2 + 16) * full, r * 2, (r * 2 + 16) * full);
  ctx.restore();
  cage();
  ctx.strokeStyle = bright ? color : '#778d98';
  ctx.lineWidth = bright ? 2 : 1.2;
  ctx.stroke();
  for (const direction of [-1, 1])
    line(ctx, 0, -r - 8, direction * r * 0.76, r * 0.65, '#c1d4ca44', 1);
  if (power > 0) {
    ctx.save();
    ctx.globalAlpha = 0.45 + full * 0.5;
    ctx.fillStyle = bright ? '#fff2c7' : color;
    const flicker = Math.sin(time * 6 + x) * 2;
    ctx.beginPath();
    ctx.moveTo(0, -17 - flicker);
    ctx.bezierCurveTo(4, -6, 14, 1, 9, 10);
    ctx.bezierCurveTo(5, 18, -11, 15, -10, 5);
    ctx.bezierCurveTo(-10, -2, -3, -4, 0, -17 - flicker);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#b5c0bb33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r + 16, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = bright ? '#d1ffd4' : color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r + 16, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, power));
  ctx.stroke();
  const notch = -Math.PI / 2 + TAU * needed;
  line(
    ctx,
    Math.cos(notch) * (r + 10),
    Math.sin(notch) * (r + 10),
    Math.cos(notch) * (r + 23),
    Math.sin(notch) * (r + 23),
    '#fff3d2',
    2
  );
  ctx.textAlign = 'center';
  ctx.font = '10px ui-monospace,monospace';
  ctx.fillStyle = bright ? '#d8ffcb' : power ? '#ffc18b' : '#9dacbd';
  ctx.fillText(
    body.bloomed
      ? 'LANTERN AWAKE'
      : bright
        ? 'BRIGHT ENOUGH'
        : power
          ? 'TOO FAINT'
          : 'NEEDS A BRANCH',
    0,
    y > HEIGHT - 190 ? -r - 60 : -r - 41
  );
  ctx.font = '11px ui-monospace,monospace';
  ctx.fillText(
    `${Math.round(power * 100)}% LIGHT / ${Math.round(needed * 100)}% NEEDED`,
    0,
    y > HEIGHT - 190 ? -r - 42 : r + 40
  );
  ctx.restore();
}
