import { direction, distance, segmentHits } from './physics.js';

export function combat(s, record, once, fx, notice) {
  function enemyHit(e, damage, push, source = 'sunweight') {
    if (e.hp <= 0) return;
    e.hp = Math.max(0, e.hp - damage); e.flash = 0.18;
    e.phase = 'recover'; e.timer = e.phaseDuration = 1.25;
    const shove = e.kind === 'guardian' ? 155 : e.kind === 'ram' ? 330 : 430;
    e.vx = push.x * shove; e.vy = push.y * shove;
    s.shake = Math.max(s.shake, 4); s.hitstop = Math.max(s.hitstop, 0.035);
    fx.burst(e.x, e.y, '#fff2ac', 12); fx.ring(e.x, e.y, '#ffdf86', 44, 0.22);
    once('combat.first_hit', 'The sunweight knocked a guard out of its attack.', { target: e.id, source });
    if (e.kind === 'guardian') once('guardian.exposed_hit', 'The sunweight found the unshielded bronze.', { target: e.id });
    if (e.hp === 0) {
      e.down = 0.7; s.defeated++;
      fx.burst(e.x, e.y, e.kind === 'ram' ? '#e88965' : '#68bcb5', 20, 220);
      record('enemy.defeated', 'A guard fell; its place in the courtyard is clear.', { id: e.id, kind: e.kind, source });
    }
  }
  function propHit(p, damage, source) {
    if (p.hp <= 0) return;
    p.hp = Math.max(0, p.hp - damage); p.flash = 0.24;
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
  function sweep(from, to) {
    const o = s.orb, n = direction(from, to, s.player.angle);
    for (const e of s.enemies) {
      if (e.hp <= 0 || o.hits.includes(e.id) || !segmentHits(from, to, e, e.radius + o.radius)) continue;
      o.hits.push(e.id);
      if (shieldBlock(e, from, n)) return;
      enemyHit(e, 1, n);
    }
    for (const p of s.props) {
      if (p.hp <= 0 || o.hits.includes(p.id) || !segmentHits(from, to, p, p.r + o.radius)) continue;
      o.hits.push(p.id); propHit(p, 1, 'sunweight');
    }
    s.shots = s.shots.filter(shot => {
      if (!segmentHits(from, to, shot, shot.r + o.radius)) return true;
      fx.burst(shot.x, shot.y, '#ffc875', 5, 80); return false;
    });
  }
  function collisions(e, previous) {
    if (e.hp <= 0) return;
    const speed = Math.hypot(e.vx, e.vy), charging = e.phase === 'lunge';
    if (!charging && speed < 150) return;
    for (const p of s.props) {
      if (p.hp <= 0 || distance(e, p) >= e.radius + p.r) continue;
      const n = direction(previous, e, e.angle);
      propHit(p, charging ? 2 : 1, e.id);
      e.phase = 'recover'; e.timer = e.phaseDuration = 1.6;
      e.vx = -n.x * 80; e.vy = -n.y * 80;
      if (e.crashCooldown <= 0) {
        e.crashCooldown = 0.8;
        record('combat.collision', 'A guard crashed into a hanging seal.', { guard: e.id, target: p.id });
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
  return { enemyHit, propHit, playerHit, sweep, collisions };
}
