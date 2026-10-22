import { TAU, random } from './geometry.js';
import { WIDTH, HEIGHT } from './simulation.js';
import { glow, line } from './paint-primitives.js';
import {
  drawMirror,
  drawFlower,
  drawStone,
  drawLantern
} from './paint-objects.js';

/** Compose the ambient stage, optical objects, light, and transient effects. */
export function createPainter() {
  const stars = Array.from({ length: 160 }, () => null),
    rand = random(4751);
  stars.forEach(
    (_, index) =>
      (stars[index] = {
        x: rand() * WIDTH,
        y: rand() * HEIGHT,
        r: rand() * 1.8 + 0.3,
        a: rand()
      })
  );
  return function paint(ctx, world, optics, view, time, mechanics) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const sky = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    sky.addColorStop(0, '#05151d');
    sky.addColorStop(0.5, '#0b152c');
    sky.addColorStop(1, '#24172f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    glow(ctx, 500, 350, 550, '#196568', 0.22);
    glow(ctx, 1140, 640, 510, '#693b70', 0.2);
    for (const star of stars) {
      ctx.globalAlpha =
        0.25 + star.a * 0.4 + Math.sin(time * 0.7 + star.x) * 0.15;
      ctx.fillStyle = '#b8d1da';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Fine etched circles make this feel like a physical optical instrument.
    ctx.strokeStyle = '#739eae10';
    ctx.lineWidth = 1;
    for (let radius = 140; radius < 1100; radius += 140) {
      ctx.beginPath();
      ctx.arc(world.source.x, world.source.y, radius, -1.2, 1.2);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const y = HEIGHT - 20 - i * 15;
      ctx.beginPath();
      ctx.moveTo(-40, y);
      ctx.bezierCurveTo(400, y - 100 - i * 4, 850, y + 60, 1500, y - 80);
      ctx.strokeStyle = `rgba(62,117,120,${0.08 + i * 0.008})`;
      ctx.stroke();
    }
    // Bottom foliage sways without participating in the authoritative simulation.
    for (let i = 0; i < 35; i++) {
      const x = i * 47 + Math.sin(i) * 20,
        h = 20 + (Math.sin(i * 7) + 1) * 26,
        sway = Math.sin(time * 0.5 + i) * 6;
      ctx.strokeStyle = i % 3 ? '#244149' : '#3b5554';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 900);
      ctx.quadraticCurveTo(x - 8, 900 - h * 0.5, x + sway, 900 - h);
      ctx.stroke();
      ctx.fillStyle = '#29474c';
      ctx.beginPath();
      ctx.ellipse(x + sway, 900 - h, 3, 11, -0.6, 0, TAU);
      ctx.fill();
    }
    for (const body of world.bodies.filter((body) => body.type === 'stone'))
      drawStone(ctx, body, time);
    for (const beam of optics.segments) {
      const active = world.status !== 'lost';
      ctx.save();
      ctx.globalAlpha = active ? Math.min(1, beam.power) : 0.2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= 0.08;
      line(ctx, beam.x, beam.y, beam.x2, beam.y2, beam.color, 19);
      ctx.globalAlpha *= 0.5;
      line(ctx, beam.x, beam.y, beam.x2, beam.y2, beam.color, 39);
      ctx.globalAlpha = active ? 0.75 * beam.power : 0.1;
      line(
        ctx,
        beam.x,
        beam.y,
        beam.x2,
        beam.y2,
        '#a5f9ed',
        0.7 + 1.9 * Math.sqrt(beam.power)
      );
      ctx.globalAlpha = 0.95 * beam.power;
      line(ctx, beam.x, beam.y, beam.x2, beam.y2, '#f2ffdd', 0.8);
      const length = Math.hypot(beam.x2 - beam.x, beam.y2 - beam.y);
      ctx.fillStyle = '#e2fff1';
      for (let d = (time * 170) % 55; d < Math.min(length, 1700); d += 55) {
        ctx.globalAlpha = (0.35 + Math.sin(d + time) * 0.2) * beam.power;
        ctx.beginPath();
        ctx.arc(beam.x + beam.dx * d, beam.y + beam.dy * d, 2.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    const source = world.source;
    glow(ctx, source.x, source.y, 95, '#82fff0', 0.35);
    ctx.save();
    ctx.translate(source.x, source.y);
    ctx.rotate(time * 0.15);
    ctx.strokeStyle = '#84d7c4';
    ctx.lineWidth = 1;
    ctx.strokeRect(-27, -27, 54, 54);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#a2ffce66';
    ctx.strokeRect(-33, -33, 66, 66);
    ctx.restore();
    ctx.fillStyle = '#e2ffe5';
    ctx.beginPath();
    ctx.arc(source.x, source.y, 10, 0, TAU);
    ctx.fill();
    ctx.font = '10px ui-monospace, monospace';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = '#8ab8b7';
    ctx.textAlign = 'center';
    ctx.fillText('HEARTLIGHT', source.x, source.y + 64);
    for (const body of world.bodies) {
      if (body.type === 'mirror') drawMirror(ctx, body, view, time);
      if (body.type === 'receiver' && body.kind === 'lantern')
        drawLantern(ctx, body, optics.deposits.get(body.id) || 0, time);
      else if (body.type === 'receiver')
        drawFlower(
          ctx,
          body,
          optics.deposits.get(body.id) || 0,
          time,
          Boolean(world.prism?.enabled)
        );
    }
    for (const mechanic of mechanics)
      mechanic.draw?.(ctx, world, { time, view, optics, glow });
    for (const particle of view.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.life * 3);
      ctx.fillRect(
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size
      );
      ctx.restore();
    }
    for (const ripple of view.ripples) {
      ctx.globalAlpha = ripple.life;
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, (1 - ripple.life) * 160, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#b9d1d855';
    ctx.textAlign = 'right';
    ctx.font = '10px ui-monospace,monospace';
    ctx.fillText(
      `CONSTELLATION ${String(world.seed).padStart(5, '0')} · DRIFT ${String(world.round).padStart(2, '0')}`,
      WIDTH - 32,
      HEIGHT - 24
    );
  };
}
