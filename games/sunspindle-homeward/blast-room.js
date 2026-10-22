// A campaign-authored glassworks scene. New mechanics remain ordinary source code.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function shape(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${name} must be an object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw Error(`Unknown ${name}.${key}`);
}
function point(p, radius, name, extra = []) {
  shape(p, ['x', 'y', ...extra], name);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)
    || p.x < 90 + radius || p.x > 1110 - radius
    || p.y < 160 + radius || p.y > 710 - radius) throw Error(`${name} is outside the glassworks`);
}
export const glassworks = {
  version: 1,
  validate(raw) {
    shape(raw, ['room', 'name', 'entry', 'exit', 'enemies', 'jars'], 'config');
    if (!Number.isInteger(raw.room) || raw.room < 3 || raw.room > 9999) throw Error('config.room must be an integer from 3 to 9999');
    const c = { room: raw.room, name: raw.name ?? 'The Glassworks',
      entry: raw.entry ?? { x: 260, y: 490 }, exit: raw.exit ?? { x: 1040, y: 650 },
      enemies: raw.enemies ?? [{ kind: 'artillery', x: 930, y: 290 },
        { kind: 'ram', x: 580, y: 520 }, { kind: 'ram', x: 920, y: 610 }],
      jars: raw.jars ?? [{ x: 650, y: 350 }, { x: 810, y: 560 }] };
    if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80) throw Error('Invalid glassworks name');
    point(c.entry, 24, 'entry'); point(c.exit, 0, 'exit');
    if (!Array.isArray(c.enemies) || c.enemies.length < 1 || c.enemies.length > 6) throw Error('Use 1–6 glassworks threats');
    if (!Array.isArray(c.jars) || c.jars.length > 4) throw Error('Use at most 4 glass vessels');
    c.enemies.forEach((e, i) => {
      if (!['ram', 'archer', 'artillery'].includes(e?.kind)) throw Error(`Unsupported enemy ${i}`);
      point(e, e.kind === 'artillery' ? 55 : 29, `enemies[${i}]`, ['kind']);
      if (distance(e, c.entry) < 220) throw Error('Keep threats clear of the arrival');
      if (c.enemies.slice(0, i).some(other => distance(e, other) <
        (e.kind === 'artillery' ? 55 : 29) + (other.kind === 'artillery' ? 55 : 29) + 20))
        throw Error('Separate glassworks threats');
    });
    c.jars.forEach((p, i) => {
      point(p, 28, `jars[${i}]`);
      if (distance(p, c.entry) < 90 || distance(p, c.exit) < 75
        || c.enemies.some(e => distance(e, p) < (e.kind === 'artillery' ? 95 : 65)))
        throw Error('Glass vessels must not overlap arrivals, exits or enemies');
      if (c.jars.slice(0, i).some(other => distance(p, other) < 80)) throw Error('Separate glass vessels');
    });
    if (distance(c.entry, c.exit) < 180) throw Error('Separate arrival and exit');
    return structuredClone(c);
  },
  build(c) {
    return { room: c.room, roomName: c.name, roomKey: 'glassworks', presentation: 'glassworks',
      objective: { locked: 'Clear the glassworks with the sunbird.', open: 'The glassworks are quiet. The garden is open.' },
      entry: { ...c.entry }, exit: { ...c.exit }, notice: 'The kiln is awake.',
      enemies: c.enemies.map((e, i) => ({ ...e, id: `glassworks-${c.room}-${i}`,
        radius: e.kind === 'artillery' ? 55 : e.kind === 'ram' ? 29 : 24,
        hp: e.kind === 'artillery' ? 3 : 2, maxHp: e.kind === 'artillery' ? 3 : 2,
        angle: Math.PI, phase: 'watch', timer: 1.5 + i * .45, phaseDuration: 1.5 + i * .45,
        flash: 0, vx: 0, vy: 0, aimX: -1, aimY: 0, aimDistance: 440,
        crashCooldown: 0, down: 0, hitPlayer: false, blastShake: 0 })),
      props: c.jars.map((p, i) => ({ ...p, id: `glass-${c.room}-${i}`, kind: 'blastjar',
        r: 28, hp: 1, maxHp: 1, flash: 0, blastRadius: 175 })) };
  }
};
