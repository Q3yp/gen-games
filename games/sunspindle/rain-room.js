// An authored situation, not an engine component catalog. Mechanics live in ordinary code.
import { glassworks } from './blast-room.js';

export const rainBalcony = {
  version: 1,
  validate(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Rain balcony config must be an object');
    for (const key of Object.keys(raw))
      if (!['room', 'name', 'entry', 'exit', 'kilns', 'screen'].includes(key)) throw Error(`Unknown config.${key}`);
    const kilns = raw.kilns ?? [{ x: 300, y: 270 }, { x: 950, y: 430 }];
    if (!Array.isArray(kilns) || kilns.length < 1 || kilns.length > 4) throw Error('Use 1–4 rain kilns');
    for (const p of kilns) if (!p || Object.keys(p).some(k => !['x', 'y'].includes(k)))
      throw Error('Each kiln needs only x and y');
    const screen = raw.screen === null ? null : raw.screen ?? { x: 660, y: 570 };
    let scene;
    try {
      scene = glassworks.validate({ room: raw.room, name: raw.name ?? 'The Rain Balcony',
        entry: raw.entry ?? { x: 400, y: 650 }, exit: raw.exit ?? { x: 1040, y: 650 },
        enemies: kilns.map(p => ({ ...p, kind: 'artillery' })), jars: screen ? [screen] : [] });
    } catch (error) { throw Error(error.message.replaceAll('glassworks', 'balcony').replaceAll('Glass vessels', 'The screen')); }
    if (screen && (screen.x < 132 || screen.x > 1068 || screen.y < 202 || screen.y > 668
      || scene.enemies.some(e => Math.hypot(e.x - screen.x, e.y - screen.y) < 117)))
      throw Error('Keep the screen inside the balcony and clear of kilns');
    return { scene, screen: screen ? { ...screen } : null };
  },
  build(c) {
    const room = glassworks.build(c.scene);
    return { ...room, roomKey: 'rain-balcony', presentation: 'rain-balcony',
      exitOnClear: true, finishAtExit: true,
      objective: { locked: 'Cross the balcony with the sunbird.', open: 'The rain has passed. The garden is open.' },
      notice: 'Rain taps the porcelain.', clearNotice: 'The rain has passed. The garden is open.',
      endNotice: 'The sunbird settles in the moon garden.',
      enemies: room.enemies.map((e, i) => ({ ...e, id: `rain-${room.room}-${i}`, projectileKind: 'rainbolt',
        hp: 4, maxHp: 4, timer: .25 + i * .85, phaseDuration: .25 + i * .85 })),
      props: c.screen ? [{ ...c.screen, id: `screen-${room.room}`, kind: 'stone-screen', r: 42,
        hp: 2, maxHp: 2, flash: 0 }] : [] };
  }
};
