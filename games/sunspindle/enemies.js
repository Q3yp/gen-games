import { confine, direction, distance, separate } from './physics.js';

export function enemies(s, fight, fx) {
  function phase(e, name, time) { e.phase = name; e.timer = e.phaseDuration = time; }
  function aim(e) {
    if (e.kind === 'guardian') {
      e.aimX = Math.cos(e.angle); e.aimY = Math.sin(e.angle);
      e.aimDistance = Math.min(420, distance(e, s.player) + 90);
      return;
    }
    const n = direction(e, s.player, e.angle);
    e.aimX = n.x; e.aimY = n.y; e.angle = Math.atan2(n.y, n.x);
    e.aimDistance = Math.min(470, distance(e, s.player) + 80);
  }
  function volley(e) {
    const artillery = e.kind === 'artillery', rainbolt = artillery && e.projectileKind === 'rainbolt';
    const spread = artillery ? 0.34 : 0.17, speed = rainbolt ? 185 : artillery ? 220 : 285;
    const muzzle = rainbolt ? e.radius + 20 : artillery ? e.radius + 14 : 31;
    for (const offset of rainbolt ? [0] : [-spread, 0, spread]) {
      const angle = e.angle + offset, x = Math.cos(angle), y = Math.sin(angle);
      s.shots.push({ id: `${rainbolt ? 'rainbolt' : artillery ? 'shell' : 'reed'}-${++s.shotSerial}`,
        x: e.x + x * muzzle, y: e.y + y * muzzle,
        vx: x * speed, vy: y * speed, r: rainbolt ? 18 : artillery ? 12 : 7, angle,
        life: rainbolt ? 7 : artillery ? 6 : 4.5, kind: rainbolt ? 'rainbolt' : artillery ? 'shell' : 'arrow',
        ...(rainbolt ? { ownerId: e.id, friendly: false } : {}) });
    }
    fx.burst(e.x + e.aimX * 30, e.y + e.aimY * 30, '#edaa6c', 5, 65);
  }
  function think(e, dt) {
    e.timer -= dt;
    if (e.phase === 'windup') {
      if (e.timer > 0) return;
      if (e.kind === 'ram' || e.kind === 'guardian') {
        phase(e, 'lunge', e.aimDistance / (e.lungeSpeed || 470)); e.hitPlayer = false;
        fx.ring(e.x, e.y, '#ed9570', 42, 0.25);
      } else { volley(e); phase(e, 'recover', e.projectileKind === 'rainbolt' ? 1.9 : e.kind === 'artillery' ? 2.4 : 2.1); }
      return;
    }
    if (e.phase === 'lunge') {
      const speed = e.lungeSpeed || 470;
      e.x += e.aimX * speed * dt; e.y += e.aimY * speed * dt;
      if (!e.hitPlayer && distance(e, s.player) < e.radius + 18) {
        fight.playerHit(e, e.id); e.hitPlayer = true;
      }
      if (e.timer <= 0 || confine(e, e.radius)) phase(e, 'recover', e.kind === 'guardian' ? 1.8 : 1.55);
      return;
    }
    if (e.phase === 'recover') {
      if (e.timer <= 0) phase(e, 'watch', 0.5);
      return;
    }
    const d = distance(e, s.player), n = direction(e, s.player, e.angle);
    if (e.kind === 'artillery') {
      // This planted creature commits to one readable direction, never tracking
      // during its windup. Ordinary hits never reset a rainbolt kiln's rhythm.
      e.angle = Math.atan2(n.y, n.x);
      if (e.timer <= 0) { aim(e); phase(e, 'windup', e.projectileKind === 'rainbolt' ? 1.5 : 2); }
      return;
    }
    if (e.kind === 'guardian') {
      const target = Math.atan2(n.y, n.x);
      const delta = Math.atan2(Math.sin(target - e.angle), Math.cos(target - e.angle));
      e.angle += Math.sign(delta) * Math.min(Math.abs(delta), (e.turnRate || 0.9) * dt);
      if (d > 290) { e.x += Math.cos(e.angle) * 85 * dt; e.y += Math.sin(e.angle) * 85 * dt; }
      if (e.timer <= 0 && d < 520 && Math.abs(delta) < 0.26) { aim(e); phase(e, 'windup', 1.15); }
      return;
    }
    e.angle = Math.atan2(n.y, n.x);
    if (e.kind === 'ram' && d > 340) { e.x += n.x * 78 * dt; e.y += n.y * 78 * dt; }
    if (e.kind === 'archer' && d < 240) { e.x -= n.x * 65 * dt; e.y -= n.y * 65 * dt; }
    if (e.timer <= 0 && d < (e.kind === 'ram' ? 510 : 1000)) {
      aim(e); phase(e, 'windup', e.kind === 'ram' ? 1.35 : 1.65);
    }
  }
  function step(dt, hostileDt) {
    for (const e of s.enemies) {
      e.flash = Math.max(0, e.flash - dt); e.blockFlash = Math.max(0, (e.blockFlash || 0) - dt);
      if (e.kind === 'artillery') e.blastShake = Math.max(0, (e.blastShake || 0) - dt);
      e.crashCooldown = Math.max(0, e.crashCooldown - dt);
      if (e.hp <= 0) { e.down = Math.max(0, e.down - dt); continue; }
      const previous = { x: e.x, y: e.y };
      think(e, hostileDt);
      // Recoil is painted rather than simulated: the artillery's position is
      // fixed even when another guard crashes into it or the player approaches.
      if (e.kind === 'artillery') {
        e.vx = 0; e.vy = 0;
        separate(s.player, e, e.radius + 18);
        confine(s.player, 18);
        continue;
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      fight.collisions(e, previous);
      e.vx *= Math.exp(-dt * 4.8); e.vy *= Math.exp(-dt * 4.8);
      confine(e, e.radius);
      for (const p of s.props) if (p.hp > 0) separate(e, p, e.radius + p.r);
      // Bodies occupy space, but only the clearly telegraphed ram lunge hurts.
      if (e.phase !== 'lunge') separate(e, s.player, e.radius + 18);
      confine(e, e.radius);
    }
    fight.stepShots(dt, hostileDt);
  }
  return { step };
}
