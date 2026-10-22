import { distance } from './state.js';
import { tendHaven } from './haven.js';
import { createShadows } from './shadows.js';
import { crossArch } from './regions.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function simulation(s, emit) {
  const keys = new Set();
  const shadows = createShadows(s, { record, notice });
  let wake = 0;
  function record(type, text, data = {}) {
    s.versions.world++;
    s.history.push({ type, text, ...data });
    s.history = s.history.slice(-12);
    emit(type, text, data);
  }
  function notice(text, life = 4) {
    s.notice = text;
    s.noticeLife = life;
  }
  function discover(id, text, data = {}) {
    if (s.discoveries.includes(id)) return;
    s.discoveries.push(id);
    record('discovery', text, data);
  }
  function interact() {
    const p = s.player;
    if (p.carrying) {
      const l = s.lanterns.find((l) => l.id === p.carrying);
      l.x = p.x + Math.cos(p.angle) * 55;
      l.y = p.y + Math.sin(p.angle) * 55;
      p.carrying = null;
      s.ripples.push({ x: l.x, y: l.y, age: 0 });
      record('lantern.released', 'Set a living light afloat', {
        id: l.id,
        x: Math.round(l.x),
        y: Math.round(l.y)
      });
      notice('The light floats where you leave it.');
      return;
    }
    const l = s.lanterns
      .filter((l) => distance(l, p) < 90)
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (l) {
      p.carrying = l.id;
      record('lantern.carried', 'Lifted a living light', { id: l.id });
      notice('It curls around your hand.');
    } else {
      s.ripples.push({ x: p.x, y: p.y, age: 0 });
      notice('Nothing within reach.', 2);
    }
  }
  function pulse() {
    if (s.pulse > 0) return;
    s.pulse = 2.4;
    shadows.pulse();
    s.ripples.push({ x: s.player.x, y: s.player.y, age: 0, pulse: true });
    let touched = [];
    for (const c of s.creatures)
      if (distance(c, s.player) < 240) {
        c.flee = 3;
        c.fleeFrom = { x: s.player.x, y: s.player.y };
        touched.push(c.id);
      }
    for (const l of s.lanterns)
      if (l.id !== s.player.carrying && distance(l, s.player) < 180) {
        const a = Math.atan2(l.y - s.player.y, l.x - s.player.x);
        l.vx = Math.cos(a) * 70;
        l.vy = Math.sin(a) * 70;
      }
    record('water.sung', 'Rang the boat’s silver bell', {
      creatures: touched,
      carrying: s.player.carrying,
      x: Math.round(s.player.x),
      y: Math.round(s.player.y)
    });
  }
  function step(dt) {
    if (s.paused) return;
    s.seconds += dt;
    s.transition = Math.max(0, (s.transition || 0) - dt);
    s.noticeLife = Math.max(0, s.noticeLife - dt);
    s.pulse = Math.max(0, s.pulse - dt);
    const p = s.player;
    let dx =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    let dy =
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
      (keys.has('w') || keys.has('arrowup') ? 1 : 0);
    if (dx || dy) {
      dx *= 80;
      dy *= 80;
      s.target = { x: p.x + dx, y: p.y + dy };
    } else {
      dx = s.target.x - p.x;
      dy = s.target.y - p.y;
    }
    const d = Math.hypot(dx, dy),
      speed = p.carrying ? 120 : 155;
    if (d > 4) {
      let move = Math.min(speed * dt, d);
      p.x = clamp(p.x + (dx / d) * move, 65, 1535);
      p.y = clamp(p.y + (dy / d) * move, 80, 930);
      p.angle = Math.atan2(dy, dx);
      wake += dt;
      if (wake > 0.13) {
        s.ripples.push({
          x: p.x - Math.cos(p.angle) * 23,
          y: p.y - Math.sin(p.angle) * 23,
          age: 0
        });
        wake = 0;
      }
    }
    for (const island of s.islands) {
      if (island.awake) {
        const light = s.lanterns
          .filter((l) => l.lit)
          .sort((a, b) => distance(a, island) - distance(b, island))[0];
        if (light && distance(light, island) > island.r + 90) {
          const a = Math.atan2(light.y - island.y, light.x - island.x);
          island.x += Math.cos(a) * 35 * dt;
          island.y += Math.sin(a) * 35 * dt;
        }
      }
      const d = distance(p, island);
      if (d < island.r * 0.65 && !(island.id === 'home' && island.bloom)) {
        const a = Math.atan2(p.y - island.y, p.x - island.x);
        p.x = island.x + Math.cos(a) * island.r * 0.65;
        p.y = island.y + Math.sin(a) * island.r * 0.65;
        s.target = { x: p.x, y: p.y };
      }
      if (d < island.r + 125 && island.id !== 'home')
        discover('place:' + island.id, 'Approached ' + island.id, {
          place: island.id,
          carrying: p.carrying
        });
    }
    for (const l of s.lanterns) {
      if (l.id === p.carrying) {
        l.x = p.x + Math.cos(p.angle) * 20;
        l.y = p.y + Math.sin(p.angle) * 20;
      } else {
        l.x = clamp(l.x + (l.vx || 0) * dt, 70, 1530);
        l.y = clamp(l.y + (l.vy || 0) * dt, 90, 920);
        l.vx = (l.vx || 0) * Math.exp(-dt * 2);
        l.vy = (l.vy || 0) * Math.exp(-dt * 2);
      }
    }
    for (const c of s.creatures) {
      let target = s.lanterns
        .filter((l) => l.lit)
        .sort((a, b) => distance(a, c) - distance(b, c))[0];
      let tx = target?.x ?? 800,
        ty = target?.y ?? 550,
        spd = 42 + (c.size || 1) * 12;
      if (c.flee > 0) {
        c.flee -= dt;
        tx = c.x + (c.x - c.fleeFrom.x);
        ty = c.y + (c.y - c.fleeFrom.y);
        spd = 130;
      } else if (target && distance(c, target) < 95) {
        const a = s.seconds * 0.35 + (c.id === 'little-ray' ? 0 : 3);
        tx = target.x + Math.cos(a) * 73;
        ty = target.y + Math.sin(a) * 53;
        discover('befriended:' + c.id, 'A ray began circling your light', {
          creature: c.id,
          light: target.id,
          carried: p.carrying === target.id
        });
      }
      const a = Math.atan2(ty - c.y, tx - c.x);
      c.angle = a;
      c.x += Math.cos(a) * spd * dt;
      c.y += Math.sin(a) * spd * dt;
      c.x = clamp(c.x, 60, 1540);
      c.y = clamp(c.y, 95, 925);
    }
    tendHaven(s, dt, { record, notice });
    shadows.step(dt);
    crossArch(s, { record, notice });
    s.ripples = s.ripples.filter((r) => (r.age += dt) < (r.pulse ? 2 : 1.8));
  }
  return { step, interact, pulse, keys, record, notice, discover };
}
