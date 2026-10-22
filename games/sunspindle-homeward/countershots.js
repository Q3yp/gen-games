import { confine, direction, segmentContact } from './physics.js';

const movingWeight = o => ['outbound', 'returning'].includes(o.mode) && Math.hypot(o.vx, o.vy) > 0;

export function countershots(s, fight, fx, record) {
  function shatter(shot, color = '#ffc875') {
    shot.life = 0;
    fx.burst(shot.x, shot.y, color, 8, 110);
  }
  function reflect(shot) {
    if (shot.kind !== 'rainbolt' || shot.friendly || shot.reflected || shot.life <= 0 || !movingWeight(s.orb)) return false;
    const owner = s.enemies.find(e => e.id === shot.ownerId && e.hp > 0);
    if (!owner) { shatter(shot, '#caffff'); return true; }
    const n = direction(shot, owner);
    Object.assign(shot, { friendly: true, reflected: true, color: '#aaffff',
      vx: n.x * 420, vy: n.y * 420, angle: Math.atan2(n.y, n.x), life: 7 });
    fx.burst(shot.x, shot.y, '#efffff', 22, 280);
    fx.ring(shot.x, shot.y, '#91f9ff', 88, 0.4);
    fx.ring(shot.x, shot.y, '#ffffff', 55, 0.24);
    s.shake = Math.max(s.shake, 5); s.hitstop = Math.max(s.hitstop, 0.045);
    record('projectile.reflected', 'The moving sunweight turned a rainbolt back toward its kiln.',
      { id: shot.id, ownerId: shot.ownerId, target: owner.id, attackSource: 'sunweight', cause: 'sunweight-contact' });
    return true;
  }
  function weightHit(shot) {
    if (shot.friendly || shot.reflected || shot.life <= 0) return;
    if (shot.kind === 'rainbolt') reflect(shot);
    else shatter(shot);
  }
  function advance(shot, dt, hostileDt) {
    if (shot.life <= 0) return;
    if (shot.friendly && !s.enemies.some(e => e.id === shot.ownerId && e.hp > 0)) {
      shatter(shot, '#caffff'); return;
    }
    const elapsed = shot.friendly ? dt : hostileDt;
    const from = { x: shot.x, y: shot.y };
    const to = { x: shot.x + shot.vx * elapsed, y: shot.y + shot.vy * elapsed };
    shot.life -= elapsed;
    const contacts = [];
    function add(type, target, radius, priority) {
      const t = segmentContact(from, to, target, radius);
      if (t !== null) contacts.push({ type, target, t, priority });
    }
    for (const p of s.props) if (p.hp > 0) add('prop', p, p.r + shot.r, 0);
    if (shot.friendly) {
      for (const e of s.enemies) if (e.hp > 0) add('enemy', e, e.radius + shot.r, 2);
    } else {
      add('player', s.player, shot.r + 16, 2);
      if (shot.kind === 'rainbolt' && !shot.reflected && movingWeight(s.orb))
        add('weight', s.orb, shot.r + s.orb.radius, 1);
    }
    contacts.sort((a, b) => a.t - b.t || a.priority - b.priority);
    const hit = contacts[0], t = hit?.t ?? 1;
    shot.x = from.x + (to.x - from.x) * t; shot.y = from.y + (to.y - from.y) * t;
    if (!hit) { if (confine(shot, shot.r)) shot.life = 0; return; }
    if (hit.type === 'weight') { reflect(shot); return; }
    if (hit.type === 'prop') {
      if (hit.target.kind === 'stone-screen' && ['shell', 'rainbolt'].includes(shot.kind))
        fight.propHit(hit.target, 1, shot.friendly ? 'reflected-rainbolt' : shot.kind);
    } else if (hit.type === 'enemy') {
      record('projectile.hit', 'A turned rainbolt struck a guard with its kiln’s own fire.',
        { id: shot.id, ownerId: shot.ownerId, target: hit.target.id, damage: 2,
          attackSource: 'reflected-rainbolt', cause: 'countershot' });
      fight.enemyHit(hit.target, 2, direction(from, shot), 'reflected-rainbolt');
    } else fight.playerHit(from, shot.kind === 'rainbolt' ? 'rainbolt' : shot.kind === 'shell' ? 'artillery volley' : 'reed volley');
    shatter(shot, shot.friendly ? '#caffff' : '#ffc875');
  }
  function step(dt, hostileDt) {
    for (const shot of s.shots) advance(shot, dt, hostileDt);
    s.shots = s.shots.filter(shot => shot.life > 0);
  }
  return { step, weightHit };
}
