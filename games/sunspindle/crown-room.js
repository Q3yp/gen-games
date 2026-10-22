// A final garden encounter; entry preserves the keeper's actual condition.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function shape(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${name} must be an object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw Error(`Unknown ${name}.${key}`);
}
function point(p, radius, name) {
  shape(p, ['x', 'y'], name);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)
    || p.x < 90 + radius || p.x > 1110 - radius
    || p.y < 170 + radius || p.y > 700 - radius) throw Error(`${name} is outside the crown garden`);
}

export const crownGarden = {
  version: 1,
  validate(raw) {
    shape(raw, ['room', 'name', 'entry', 'exit', 'boss', 'screens'], 'config');
    const c = { room: raw.room ?? 6, name: raw.name ?? 'The Crown Garden',
      entry: raw.entry ?? { x: 240, y: 620 }, exit: raw.exit ?? { x: 1040, y: 650 },
      boss: raw.boss ?? { x: 870, y: 330 },
      screens: raw.screens ?? [{ x: 580, y: 300 }, { x: 580, y: 575 }] };
    if (!Number.isInteger(c.room) || c.room < 3 || c.room > 9999) throw Error('config.room must be an integer from 3 to 9999');
    if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80) throw Error('Invalid crown garden name');
    point(c.entry, 24, 'entry'); point(c.exit, 24, 'exit'); point(c.boss, 58, 'boss');
    if (distance(c.entry, c.exit) < 180 || distance(c.entry, c.boss) < 250)
      throw Error('Keep the arrival clear of the warden and exit');
    if (!Array.isArray(c.screens) || c.screens.length > 2) throw Error('Use at most two garden screens');
    c.screens.forEach((p, i) => {
      point(p, 42, `screens[${i}]`);
      if (distance(p, c.entry) < 100 || distance(p, c.exit) < 95 || distance(p, c.boss) < 125
        || c.screens.slice(0, i).some(other => distance(p, other) < 110))
        throw Error('Keep screens clear of arrivals, exits, the warden and each other');
    });
    return structuredClone(c);
  },
  build(c) {
    return { room: c.room, roomName: c.name, roomKey: 'crown-garden', presentation: 'crown-garden',
      entry: { ...c.entry }, exit: { ...c.exit }, exitOnClear: true, finishAtExit: true,
      objective: { locked: 'Bring the sunbird home through the Crown Garden.', open: 'The garden is yours. Bring the sunbird to its roost.' },
      notice: 'The last warden rises beneath the empty crown.',
      clearNotice: 'The crown has fallen. The sunbird knows the way home.',
      endNotice: 'The sunbird is home. Morning returns to the garden.',
      enemies: [{ ...c.boss, id: `crown-warden-${c.room}`, kind: 'crown-warden', projectileKind: 'rainbolt',
        radius: 58, hp: 12, maxHp: 12, angle: Math.PI, phase: 'watch', timer: 1.2, phaseDuration: 1.2,
        attack: 'volley', attackCycle: 0, targetX: c.entry.x, targetY: c.entry.y, targetKind: 'player',
        aimX: -1, aimY: 0, aimDistance: 620, chargeLeft: 0, enraged: false, staggerCooldown: 0,
        flash: 0, blockFlash: 0, vx: 0, vy: 0, crashCooldown: 0, down: 0, hitPlayer: false }],
      props: c.screens.map((p, i) => ({ ...p, id: `crown-screen-${c.room}-${i}`, kind: 'stone-screen',
        r: 42, hp: 2, maxHp: 2, flash: 0 })) };
  }
};
