// This is the authored Threadmill, not an engine-wide room/component schema.
const allowed = ['room', 'name', 'entry', 'exit', 'guardian', 'seals', 'notice'];
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function object(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${path} must be an object`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw Error(`Unknown ${path}.${key}`);
}
function text(value, max, path) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error(`Invalid ${path}`);
}
function point(value, radius, path, facing = false) {
  object(value, facing ? ['x', 'y', 'angle'] : ['x', 'y'], path);
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)
    || value.x < 90 + radius || value.x > 1110 - radius
    || value.y < 160 + radius || value.y > 710 - radius) throw Error(`${path} is outside the playable court`);
  if (facing && value.angle !== undefined && (!Number.isFinite(value.angle) || Math.abs(value.angle) > Math.PI * 2))
    throw Error(`${path}.angle must be radians between -2π and 2π`);
}

export const threadmill = {
  version: 1,
  validate(raw) {
    object(raw, allowed, 'config');
    if (!Number.isInteger(raw.room) || raw.room < 2 || raw.room > 9999) throw Error('config.room must be an integer from 2 to 9999');
    const c = { room: raw.room, name: raw.name ?? 'The Threadmill',
      entry: raw.entry ?? { x: 210, y: 430 }, exit: raw.exit ?? { x: 1050, y: 430 },
      guardian: raw.guardian ?? { x: 640, y: 425, angle: Math.PI },
      seals: raw.seals ?? [{ x: 990, y: 265 }, { x: 990, y: 610 }],
      notice: raw.notice ?? 'Two sunseals hold the far gate.' };
    text(c.name, 80, 'config.name'); text(c.notice, 200, 'config.notice');
    point(c.entry, 24, 'config.entry'); point(c.exit, 0, 'config.exit'); point(c.guardian, 40, 'config.guardian', true);
    if (!Array.isArray(c.seals) || c.seals.length !== 2) throw Error('The Threadmill needs exactly two sunseals');
    c.seals.forEach((seal, i) => point(seal, 28, `config.seals[${i}]`));
    if (gap(c.entry, c.exit) < 180 || gap(c.entry, c.guardian) < 200) throw Error('Entry must be clear of the guardian and far gate');
    if (gap(...c.seals) < 100 || c.seals.some(p => gap(p, c.entry) < 90 || gap(p, c.exit) < 80 || gap(p, c.guardian) < 85))
      throw Error('Sunseals must not overlap entry, exit, guardian or each other');
    return structuredClone(c);
  },
  build(c) {
    const suffix = c.room === 2 ? '' : `-${c.room}`;
    return { room: c.room, roomName: c.name, roomKey: 'threadmill', presentation: 'threadmill',
      objective: { locked: 'Break the two sunseals holding the far gate.', open: 'Reach the open gate.' },
      entry: { ...c.entry }, exit: { ...c.exit }, notice: c.notice,
      enemies: [{ id: `bronze-warden${suffix}`, kind: 'guardian', x: c.guardian.x, y: c.guardian.y, radius: 40,
        hp: 3, maxHp: 3, angle: c.guardian.angle ?? Math.PI, turnRate: 0.9, shieldArc: Math.PI / 2,
        phase: 'watch', timer: 1.1, phaseDuration: 1.1, flash: 0, blockFlash: 0,
        vx: 0, vy: 0, aimX: Math.cos(c.guardian.angle ?? Math.PI), aimY: Math.sin(c.guardian.angle ?? Math.PI),
        aimDistance: 400, lungeSpeed: 390, crashCooldown: 0, down: 0, hitPlayer: false }],
      props: c.seals.map((p, i) => ({ id: `${i ? 'south' : 'north'}-sunseal${suffix}`,
        kind: 'sunseal', ...p, r: 28, hp: 1, maxHp: 1, flash: 0 })) };
  }
};

