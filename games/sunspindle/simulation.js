import { clamp, confine, direction, distance, separate } from './physics.js';
import { effects } from './effects.js';
import { combat } from './combat.js';
import { enemies } from './enemies.js';
import { enterThreadmill } from './rooms.js';

export function simulation(s, emit = () => {}) {
  const keys = new Set(), fx = effects(s);
  function record(type, text, data = {}) {
    s.versions.world++;
    s.story.push({ type, text, ...data, at: Math.round(s.clock * 10) / 10 });
    s.story = s.story.slice(-18);
    emit(type, text, { ...data, room: s.room });
  }
  function once(type, text, data) {
    if (s.seen[type]) return;
    s.seen[type] = true; record(type, text, data);
  }
  function notice(text, life = 4) { s.notice = text; s.noticeLife = life; }
  const fight = combat(s, record, once, fx, notice), guards = enemies(s, fight, fx);
  function held() {
    const p = s.player, o = s.orb;
    o.mode = 'held'; o.x = p.x + Math.cos(p.angle) * 29; o.y = p.y + Math.sin(p.angle) * 29;
    o.vx = o.vy = 0; o.trail = [];
  }
  function throwOrRecall(point) {
    if (s.paused || s.respawn > 0 || s.player.hp <= 0 || s.orb.mode === 'returning') return false;
    const p = s.player, o = s.orb;
    o.flight++; o.hits = [];
    if (o.mode !== 'held') {
      o.mode = 'returning';
      fx.ring(o.x, o.y, '#fff4b6', 42, 0.25);
      once('sunweight.first_recall', 'The sunweight returns to its keeper’s new position.',
        { from: { x: Math.round(o.x), y: Math.round(o.y) }, to: { x: Math.round(p.x), y: Math.round(p.y) } });
      return true;
    }
    const aim = Number.isFinite(point?.x) && Number.isFinite(point?.y)
      ? point : { x: p.x + Math.cos(p.angle) * 100, y: p.y + Math.sin(p.angle) * 100 };
    const n = direction(p, aim, p.angle);
    p.angle = Math.atan2(n.y, n.x); held();
    o.mode = 'outbound'; o.vx = n.x * 850; o.vy = n.y * 850; o.distanceLeft = 820;
    fx.ring(o.x, o.y, '#ffe5a0', 34, 0.18);
    once('sunweight.first_throw', 'A bright weight flies freely across the courtyard.');
    return true;
  }
  function weight(dt) {
    const o = s.orb, p = s.player;
    o.spin += dt * (o.mode === 'held' || o.mode === 'resting' ? 1.8 : 18);
    if (o.mode === 'held') { held(); return; }
    if (o.mode === 'resting') return;
    const previous = { x: o.x, y: o.y };
    if (o.mode === 'returning') {
      const n = direction(o, p), travel = Math.min(1000 * dt, distance(o, p));
      o.vx = n.x * 1000; o.vy = n.y * 1000;
      o.x += n.x * travel; o.y += n.y * travel;
    } else {
      const travel = Math.min(850 * dt, o.distanceLeft);
      o.x += o.vx / 850 * travel; o.y += o.vy / 850 * travel; o.distanceLeft -= travel;
    }
    fight.sweep(previous, o);
    const last = o.trail.at(-1);
    if (!last || distance(last, o) > 10) o.trail.push({ x: o.x, y: o.y, life: 0.16, maxLife: 0.16 });
    if (o.mode === 'returning' && distance(o, p) < 32) {
      fx.burst(p.x, p.y, '#ffe5a0', 5, 70); held();
    } else if (o.mode === 'outbound' && (confine(o, o.radius) || o.distanceLeft <= 0)) {
      o.mode = 'resting'; o.vx = o.vy = 0;
      fx.ring(o.x, o.y, '#ffdc86', 38, 0.24); fx.burst(o.x, o.y, '#ffcc71', 7, 90);
    }
  }
  function input() {
    const has = (...names) => names.some(name => keys.has(name));
    let x = +has('KeyD', 'd', 'D', 'ArrowRight', 'arrowright') - +has('KeyA', 'a', 'A', 'ArrowLeft', 'arrowleft');
    let y = +has('KeyS', 's', 'S', 'ArrowDown', 'arrowdown') - +has('KeyW', 'w', 'W', 'ArrowUp', 'arrowup');
    const length = Math.hypot(x, y);
    if (length) { x /= length; y /= length; }
    return { x, y, moving: length > 0 };
  }
  function returnToSafety(dt) {
    s.respawn = Math.max(0, s.respawn - dt);
    if (s.respawn > 0) return;
    Object.assign(s.player, { ...(s.entry || { x: 270, y: 490 }), hp: s.player.maxHp, grace: 3, flash: 0, trail: [] });
    held(); s.shots = [];
    for (const e of s.enemies) if (e.hp > 0) {
      e.phase = 'recover'; e.timer = e.phaseDuration = 2.4; e.vx = e.vy = 0;
      if (distance(e, s.player) < 170) { e.x = Math.max(540, e.x); e.y = clamp(e.y, 200, 670); }
    }
    fx.ring(s.player.x, s.player.y, '#fff2b6', 95, 0.6);
    notice('Up again. Your progress is kept.', 3);
    record('player.returned', 'The keeper is back on their feet, with the courtyard’s progress preserved.');
  }
  function objectives() {
    if (!s.cleared && s.enemies.length && s.enemies.every(e => e.hp <= 0)) {
      s.cleared = true;
      record('room.cleared', 'The guards are gone. The courtyard belongs to the keeper.', { rescue: s.rescue });
    }
    if (!s.exitReady || s.exitAsked || distance(s.player, s.exit) > 76) return;
    s.exitAsked = true; s.awaitingHost = true; s.shots = [];
    s.player.hp = s.player.maxHp;
    fx.ring(s.exit.x, s.exit.y, '#fff2a7', 160, 1);
    notice('The sunbird keeps you safe while it finds the way onward.', 7);
    record('game.decision_due', 'The keeper and rescued sunbird reached the open arch. What lies beyond is not yet authored.',
      { reason: 'open-exit', rescued: true, guardsRemaining: s.enemies.filter(e => e.hp > 0).length });
  }
  function tick(dt) {
    s.clock += dt;
    const p = s.player, move = input();
    p.grace = Math.max(0, p.grace - dt); p.flash = Math.max(0, p.flash - dt);
    for (const prop of s.props) prop.flash = Math.max(0, prop.flash - dt);
    if (s.respawn > 0) { returnToSafety(dt); return; }
    p.x += move.x * 285 * dt; p.y += move.y * 285 * dt;
    for (const prop of s.props) if (prop.hp > 0) separate(p, prop, 18 + prop.r);
    confine(p, 18);
    if (move.moving) {
      p.angle = Math.atan2(move.y, move.x);
      const last = p.trail.at(-1);
      if (!last || distance(last, p) > 18) p.trail.push({ x: p.x, y: p.y, life: 0.15, maxLife: 0.15 });
    }
    s.timeFlow = move.moving || ['outbound', 'returning'].includes(s.orb.mode) ? 1 : 0.06;
    weight(dt); guards.step(dt, dt * s.timeFlow); confine(p, 18); objectives();
  }
  function step(dt) {
    if (s.room === 1 && s.awaitingHost && enterThreadmill(s)) keys.clear();
    if (s.paused || !Number.isFinite(dt) || dt <= 0) return;
    if (s.arrivalPending) {
      record('room.entered', 'The keeper and sunbird entered the Threadmill.', s.arrivalPending);
      delete s.arrivalPending;
    }
    dt = Math.min(dt, 0.1);
    fx.step(dt);
    if (s.hitstop > 0) { s.hitstop = Math.max(0, s.hitstop - dt); return; }
    const steps = Math.ceil(dt / 0.0125);
    for (let i = 0; i < steps; i++) tick(dt / steps);
  }
  return { step, throwOrRecall, keys, dash: () => false };
}
