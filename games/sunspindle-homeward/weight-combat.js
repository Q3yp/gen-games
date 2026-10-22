import { direction, distance, segmentContact } from './physics.js';

export function weightSweep(s, fight, shots, fx) {
  return function sweep(from, to) {
    const o = s.orb, end = { x: to.x, y: to.y };
    const dx = end.x - from.x, dy = end.y - from.y, travel = Math.hypot(dx, dy);
    if (!['outbound', 'returning'].includes(o.mode) || travel <= 1e-8) return;
    const n = direction(from, end), contacts = [];
    const touching = s.props.find(p => p.id === o.screenContact && p.hp > 0);
    if (!touching || distance(from, touching) > touching.r + o.radius + 2) delete o.screenContact;
    function add(type, target, radius, priority) {
      const t = segmentContact(from, end, target, radius);
      if (t !== null) contacts.push({ type, target, t, priority });
    }
    for (const e of s.enemies)
      if (e.hp > 0 && !o.hits.includes(e.id)) add('enemy', e, e.radius + o.radius, 2);
    for (const p of s.props) {
      if (p.hp <= 0) continue;
      if (p.kind === 'stone-screen') {
        // Recall clears the remembered face without charging a second impact.
        if (o.screenContact === p.id && dx * (from.x - p.x) + dy * (from.y - p.y) >= 0) continue;
        add('screen', p, p.r + o.radius, 0);
      } else if (!o.hits.includes(p.id)) add('prop', p, p.r + o.radius, 2);
    }
    for (const shot of s.shots)
      if (shot.life > 0 && !shot.friendly && !shot.reflected) add('shot', shot, shot.r + o.radius, 1);
    contacts.sort((a, b) => a.t - b.t || a.priority - b.priority);
    for (const { type, target, t } of contacts) {
      if (type === 'shot') { shots.weightHit(target); continue; }
      if (target.hp <= 0) continue;
      if (type === 'screen') {
        if (!o.hits.includes(target.id)) fight.propHit(target, 1, 'sunweight');
        if (!o.hits.includes(target.id)) o.hits.push(target.id);
        const stop = Math.max(0, t - 0.001 / travel);
        o.x = from.x + dx * stop; o.y = from.y + dy * stop;
        o.mode = 'resting'; o.vx = o.vy = o.distanceLeft = 0; o.screenContact = target.id;
        fx.ring(o.x, o.y, '#fff2c3', 40, 0.23);
        break;
      }
      o.hits.push(target.id);
      if (type === 'prop') fight.propHit(target, 1, 'sunweight');
      else {
        if (fight.shieldBlock(target, from, n)) break;
        fight.enemyHit(target, 1, n);
      }
    }
    s.shots = s.shots.filter(shot => shot.life > 0);
  };
}
