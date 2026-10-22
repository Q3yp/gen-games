import { confine, direction, distance, separate, segmentHits } from './physics.js';

export function enemies(s, fight, fx) {
  function phase(e, name, time) { e.phase = name; e.timer = e.phaseDuration = time; }
  function aim(e) {
    const n = direction(e, s.player, e.angle);
    e.aimX = n.x; e.aimY = n.y; e.angle = Math.atan2(n.y, n.x);
    e.aimDistance = Math.min(470, distance(e, s.player) + 80);
  }
  function volley(e) {
    for (const offset of [-0.17, 0, 0.17]) {
      const angle = e.angle + offset, x = Math.cos(angle), y = Math.sin(angle);
      s.shots.push({ id: `reed-${++s.shotSerial}`, x: e.x + x * 31, y: e.y + y * 31,
        vx: x * 285, vy: y * 285, r: 7, angle, life: 4.5, kind: 'arrow' });
    }
    fx.burst(e.x + e.aimX * 30, e.y + e.aimY * 30, '#edaa6c', 5, 65);
  }
  function think(e, dt) {
    e.timer -= dt;
    if (e.phase === 'windup') {
      if (e.timer > 0) return;
      if (e.kind === 'ram') {
        phase(e, 'lunge', e.aimDistance / 470); e.hitPlayer = false;
        fx.ring(e.x, e.y, '#ed9570', 42, 0.25);
      } else { volley(e); phase(e, 'recover', 2.1); }
      return;
    }
    if (e.phase === 'lunge') {
      e.x += e.aimX * 470 * dt; e.y += e.aimY * 470 * dt;
      if (!e.hitPlayer && distance(e, s.player) < e.radius + 18) {
        fight.playerHit(e, e.id); e.hitPlayer = true;
      }
      if (e.timer <= 0 || confine(e, e.radius)) phase(e, 'recover', 1.55);
      return;
    }
    if (e.phase === 'recover') {
      if (e.timer <= 0) phase(e, 'watch', 0.5);
      return;
    }
    const d = distance(e, s.player), n = direction(e, s.player, e.angle);
    e.angle = Math.atan2(n.y, n.x);
    if (e.kind === 'ram' && d > 340) { e.x += n.x * 78 * dt; e.y += n.y * 78 * dt; }
    if (e.kind === 'archer' && d < 240) { e.x -= n.x * 65 * dt; e.y -= n.y * 65 * dt; }
    if (e.timer <= 0 && d < (e.kind === 'ram' ? 510 : 1000)) {
      aim(e); phase(e, 'windup', e.kind === 'ram' ? 1.35 : 1.65);
    }
  }
  function step(dt, hostileDt) {
    for (const e of s.enemies) {
      e.flash = Math.max(0, e.flash - dt); e.crashCooldown = Math.max(0, e.crashCooldown - dt);
      if (e.hp <= 0) { e.down = Math.max(0, e.down - dt); continue; }
      const previous = { x: e.x, y: e.y };
      think(e, hostileDt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      fight.collisions(e, previous);
      e.vx *= Math.exp(-dt * 4.8); e.vy *= Math.exp(-dt * 4.8);
      confine(e, e.radius);
      for (const p of s.props) if (p.hp > 0) separate(e, p, e.radius + p.r);
      // Bodies occupy space, but only the clearly telegraphed ram lunge hurts.
      if (e.phase !== 'lunge') separate(e, s.player, e.radius + 18);
      confine(e, e.radius);
    }
    for (const shot of s.shots) {
      const previous = { x: shot.x, y: shot.y };
      shot.x += shot.vx * hostileDt; shot.y += shot.vy * hostileDt; shot.life -= hostileDt;
      if (segmentHits(previous, shot, s.player, shot.r + 16)) {
        fight.playerHit(previous, 'reed volley'); shot.life = 0;
      }
      if (s.props.some(p => p.hp > 0 && segmentHits(previous, shot, p, p.r + shot.r))) shot.life = 0;
      if (confine(shot, shot.r)) shot.life = 0;
    }
    s.shots = s.shots.filter(shot => shot.life > 0);
  }
  return { step };
}
