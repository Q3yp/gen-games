import { direction, distance } from './physics.js';
import { countershots } from './countershots.js';
import { weightSweep } from './weight-combat.js';

export function combat(s, record, once, fx, notice) {
  function enemyHit(e, damage, push, source = 'sunweight') {
    if (e.hp <= 0) return;
    const warden = e.kind === 'crown-warden';
    const counterStagger = warden && source === 'reflected-rainbolt' && !(e.staggerCooldown > 0);
    const uninterrupted = warden ? !counterStagger
      : e.kind === 'artillery' && e.projectileKind === 'rainbolt' && source === 'sunweight';
    e.hp = Math.max(0, e.hp - damage); e.flash = 0.18;
    if (!uninterrupted || e.hp <= 0) { e.phase = 'recover'; e.timer = e.phaseDuration = warden ? 2.6 : 1.25; }
    if (counterStagger) {
      e.staggerCooldown = 4;
      once('warden.counter_staggered', 'Its own rain broke the crown warden’s advance.', { target: e.id });
    }
    const shove = warden || e.kind === 'artillery' ? 0 : e.kind === 'guardian' ? 155 : e.kind === 'ram' ? 330 : 430;
    e.vx = push.x * shove; e.vy = push.y * shove;
    if (e.kind === 'artillery') e.blastShake = source === 'blastjar' ? 0.45 : 0.2;
    s.shake = Math.max(s.shake, 4); s.hitstop = Math.max(s.hitstop, 0.035);
    fx.burst(e.x, e.y, '#fff2ac', 12); fx.ring(e.x, e.y, '#ffdf86', 44, 0.22);
    once('combat.first_hit', warden ? 'The sunweight struck the warden’s broad crown.'
      : uninterrupted ? 'The kiln took the hit, but its rainbolt rhythm did not break.'
      : 'The sunweight knocked a guard out of its attack.', { target: e.id, source });
    if (e.kind === 'guardian') once('guardian.exposed_hit', 'The sunweight found the unshielded bronze.', { target: e.id });
    if (e.hp === 0) {
      e.down = 0.7; s.defeated++;
      fx.burst(e.x, e.y, e.kind === 'ram' ? '#e88965' : '#68bcb5', 20, 220);
      record('enemy.defeated', 'A guard fell; its place in the courtyard is clear.', { id: e.id, kind: e.kind, source,
        ...(source === 'reflected-rainbolt' ? { attackSource: source, cause: 'countershot' } : {}) });
      if (warden) {
        for (const shot of s.shots) if (shot.ownerId === e.id) shot.life = 0;
        record('warden.defeated', 'The crown warden fell. The sunbird’s garden is quiet at last.', { id: e.id, source });
      }
    }
  }
  function burstJar(p) {
    p.hp = 0; p.flash = 0.4;
    const radius = 175, targets = [];
    fx.burst(p.x, p.y, '#ffb04f', 36, 340);
    fx.ring(p.x, p.y, '#ffe5a0', radius, 0.45);
    fx.ring(p.x, p.y, '#ed8649', radius, 0.65);
    for (const e of s.enemies) {
      if (e.hp <= 0 || distance(p, e) > radius + e.radius) continue;
      enemyHit(e, 2, direction(p, e), 'blastjar');
      e.timer = e.phaseDuration = 1.6;
      e.flash = 0.35;
      targets.push(e.id);
    }
    // A jar never hurts the keeper or detonates another jar.
    s.shake = Math.max(s.shake, 9); s.hitstop = Math.max(s.hitstop, 0.065);
    record('blastjar.burst', 'A clay sunjar burst outward across the courtyard.', { id: p.id, radius, targets });
  }
  function propHit(p, damage, source) {
    if (p.hp <= 0) return;
    if (p.kind === 'blastjar') {
      if (source === 'sunweight') burstJar(p);
      return;
    }
    p.hp = Math.max(0, p.hp - damage); p.flash = 0.24;
    if (p.kind === 'stone-screen') {
      fx.burst(p.x, p.y, '#dacdc1', p.hp ? 12 : 34, p.hp ? 150 : 290);
      fx.ring(p.x, p.y, p.hp ? '#f6e7ce' : '#ffffff', p.hp ? 58 : 105, p.hp ? 0.28 : 0.6);
      s.shake = Math.max(s.shake, p.hp ? 4 : 8);
      record(p.hp ? 'stone-screen.hit' : 'stone-screen.broken', p.hp
        ? 'The stone screen cracked under the impact.' : 'The stone screen broke apart; its path is permanently clear.',
      { id: p.id, attackSource: source, cause: source === 'reflected-rainbolt' ? 'countershot' : 'impact', hp: p.hp });
      return;
    }
    fx.burst(p.x, p.y, '#b7ffec', p.hp ? 10 : 28, p.hp ? 140 : 250);
    fx.ring(p.x, p.y, '#caffef', p.hp ? 55 : 150, p.hp ? 0.3 : 0.75);
    s.shake = Math.max(s.shake, p.hp ? 4 : 7);
    if (p.kind === 'sunseal' && p.hp === 0) {
      const remaining = s.props.filter(prop => prop.kind === 'sunseal' && prop.hp > 0).length;
      record('sunseal.broken', 'A sunseal fell; its gate cord went slack.', { id: p.id, source, remaining });
      if (!remaining) {
        s.exitReady = true;
        notice('The gate is open. The bronze guardian need not follow.', 6);
        record('gate.opened', 'Both sunseals are broken. The far gate is open.', { guardsRemaining: s.enemies.filter(e => e.hp > 0).length });
      } else notice('One cord remains. The other sunseal holds the gate.', 4);
      return;
    }
    if (p.hp > 0 || p.kind !== 'crystal' || s.rescue) return;
    s.rescue = true; s.exitReady = true;
    s.player.hp = s.player.maxHp; s.player.grace = Math.max(s.player.grace, 2);
    notice('Free! The sunbird opens the east arch. You can leave the guards behind.', 7);
    record('crystal.freed', 'The broken crystal released a sunbird and opened the east arch.',
      { source, guardsRemaining: s.enemies.filter(e => e.hp > 0).length });
  }
  function playerHit(from, source) {
    const p = s.player;
    if (p.grace > 0 || p.hp <= 0 || s.awaitingHost) return;
    p.hp = Math.max(0, p.hp - 1); p.grace = 1.4; p.flash = 0.3;
    const n = direction(from, p);
    p.x += n.x * 22; p.y += n.y * 22;
    s.shake = Math.max(s.shake, 5); s.hitstop = 0.045;
    fx.burst(p.x, p.y, '#fff4ce', 10);
    if (p.hp > 0) {
      once('player.first_hurt', 'A committed attack landed. Move across its path, not along it.', { source });
      return;
    }
    s.respawn = 0.9; s.falls = (s.falls || 0) + 1; s.shots = [];
    notice('Back on your feet in a moment. Broken seals and defeated guards stay gone.', 4);
    record('player.fallen', 'The sunweight is carrying its keeper back to safety; progress is kept.', { source });
  }
  function shieldBlock(e, from, n) {
    const o = s.orb, normal = direction(e, from, e.angle);
    if (e.kind !== 'guardian' || normal.x * Math.cos(e.angle) + normal.y * Math.sin(e.angle) <= 0) return false;
    const dot = n.x * normal.x + n.y * normal.y;
    const reflected = dot < 0 ? { x: n.x - 2 * dot * normal.x, y: n.y - 2 * dot * normal.y } : normal;
    o.x = e.x + normal.x * (e.radius + o.radius + 2);
    o.y = e.y + normal.y * (e.radius + o.radius + 2);
    o.mode = 'outbound'; o.vx = reflected.x * 850; o.vy = reflected.y * 850; o.distanceLeft = 150;
    e.blockFlash = 0.3; s.clanks = (s.clanks || 0) + 1;
    s.hitstop = Math.max(s.hitstop, 0.055); s.shake = Math.max(s.shake, 3);
    fx.burst(o.x, o.y, '#c5f7ff', 14, 210); fx.ring(o.x, o.y, '#efffff', 48, 0.26);
    once('guardian.shield_blocked', 'Bronze rang out: the guardian’s front shield knocked the weight away.', { target: e.id });
    return true;
  }
  function collisions(e, previous) {
    if (e.hp <= 0) return;
    const speed = Math.hypot(e.vx, e.vy), charging = e.phase === 'lunge';
    if (!charging && speed < 150) return;
    for (const p of s.props) {
      if (p.hp <= 0 || distance(e, p) >= e.radius + p.r) continue;
      const n = direction(previous, e, e.angle);
      propHit(p, charging ? 2 : 1, e.id);
      e.phase = 'recover'; e.timer = e.phaseDuration = e.kind === 'crown-warden' ? 2.6 : 1.6;
      e.vx = e.kind === 'crown-warden' ? 0 : -n.x * 80;
      e.vy = e.kind === 'crown-warden' ? 0 : -n.y * 80;
      if (e.crashCooldown <= 0) {
        e.crashCooldown = 0.8;
        record('combat.collision', p.kind === 'stone-screen' ? 'A guard crashed through the stone screen.'
          : 'A guard crashed into a hanging seal.', { guard: e.id, target: p.id });
      }
    }
    for (const other of s.enemies) {
      if (other === e || other.hp <= 0 || e.crashCooldown > 0 || other.crashCooldown > 0) continue;
      if (distance(e, other) >= e.radius + other.radius) continue;
      const n = direction(e, other, e.angle);
      e.crashCooldown = other.crashCooldown = 0.9;
      enemyHit(other, 1, n, e.id);
      e.phase = 'recover'; e.timer = e.phaseDuration = 1.2; e.vx *= -0.15; e.vy *= -0.15;
      record('combat.collision', 'One guard bowled into the other.', { guard: e.id, target: other.id });
    }
  }
  const shots = countershots(s, { enemyHit, propHit, playerHit }, fx, record);
  const sweep = weightSweep(s, { enemyHit, propHit, shieldBlock }, shots, fx);
  return { enemyHit, propHit, playerHit, sweep, collisions, stepShots: shots.step, recordOnce: once };
}
