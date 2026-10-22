import { clamp, direction, distance, segmentHits } from './physics.js';

function phase(e, name, time) { e.phase = name; e.timer = e.phaseDuration = time; }
export function confineWarden(e) {
  const x = e.x, y = e.y;
  e.x = clamp(e.x, 90 + e.radius, 1110 - e.radius);
  e.y = clamp(e.y, 170 + e.radius, 700 - e.radius);
  return x !== e.x || y !== e.y;
}

export function crownWarden(s, fight, fx) {
  function commit(e) {
    e.attack = (e.attackCycle || 0) % 2 ? 'charge' : 'volley';
    e.attackCycle = (e.attackCycle || 0) + 1;
    const useWeight = e.attack === 'charge' && ['resting', 'outbound', 'returning'].includes(s.orb.mode);
    const target = useWeight ? s.orb : s.player, n = direction(e, target, e.angle);
    Object.assign(e, { targetX: target.x, targetY: target.y, targetKind: useWeight ? 'sunweight' : 'player',
      aimX: n.x, aimY: n.y, angle: Math.atan2(n.y, n.x),
      aimDistance: e.attack === 'charge' ? clamp(distance(e, target) + 70, 180, 680) : 760 });
    phase(e, 'windup', e.attack === 'charge' ? 1.5 : 1.8);
    fight.recordOnce(`warden.first_${e.attack}`, e.attack === 'charge'
      ? 'The crown warden committed its whole body to a single path.'
      : 'The crown opened three mouths of rain.', { target: e.id, targetKind: e.targetKind });
  }
  function volley(e) {
    const spread = e.enraged ? 0.42 : 0.3;
    for (const offset of [-spread, 0, spread]) {
      const angle = e.angle + offset, x = Math.cos(angle), y = Math.sin(angle);
      s.shots.push({ id: `rainbolt-${++s.shotSerial}`, kind: 'rainbolt', ownerId: e.id, friendly: false,
        x: e.x + x * (e.radius + 20), y: e.y + y * (e.radius + 20),
        vx: x * 185, vy: y * 185, r: 18, angle, life: 7 });
    }
    fx.burst(e.x, e.y, '#ffe1aa', 15, 110);
    phase(e, 'recover', 1.6);
  }
  return function think(e, dt) {
    e.staggerCooldown = Math.max(0, (e.staggerCooldown || 0) - dt);
    if (!e.enraged && e.hp <= e.maxHp / 2) {
      e.enraged = true;
      fx.ring(e.x, e.y, '#ffd789', 110, 0.7);
      fight.recordOnce('warden.crown_cracked', 'The crown split; the warden spread its remaining fire wider.', { target: e.id });
    }
    e.timer -= dt;
    if (e.phase === 'windup') {
      if (e.timer > 0) return;
      if (e.attack === 'volley') { volley(e); return; }
      e.chargeLeft = e.aimDistance; e.hitPlayer = false;
      e.chargeSpeed = e.enraged ? 420 : 390;
      phase(e, 'lunge', e.chargeLeft / e.chargeSpeed);
      fx.ring(e.x, e.y, '#ed9570', 75, 0.3);
      return;
    }
    if (e.phase === 'lunge') {
      const from = { x: e.x, y: e.y }, travel = Math.min(e.chargeLeft, (e.chargeSpeed || 390) * dt);
      e.x += e.aimX * travel; e.y += e.aimY * travel; e.chargeLeft -= travel;
      const wall = confineWarden(e);
      if (!e.hitPlayer && segmentHits(from, e, s.player, e.radius + 18)) {
        fight.playerHit(e, e.id); e.hitPlayer = true;
      }
      // Resolve screen impact while this final movement is still a charge.
      fight.collisions(e, from);
      if (wall || e.chargeLeft <= 0 || e.timer <= 0) phase(e, 'recover', 1.6);
      return;
    }
    if (e.phase === 'recover') { if (e.timer <= 0) phase(e, 'watch', 0.45); return; }
    if (e.timer <= 0) commit(e);
  };
}
