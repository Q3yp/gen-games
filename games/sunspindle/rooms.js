const localFields = ['room', 'roomName', 'entry', 'exit', 'player', 'orb', 'enemies', 'props',
  'shots', 'particles', 'rings', 'clock', 'cleared', 'exitReady', 'exitAsked', 'awaitingHost'];

export function enterThreadmill(s) {
  if (s.room !== 1 || !s.awaitingHost || s.threadmillEntered) return false;
  s.rooms ||= {};
  // Preserve the actual departure, including the spared guard and its attack state.
  s.rooms['1'] = structuredClone(Object.fromEntries(localFields.filter(k => k in s).map(k => [k, s[k]])));
  s.room = 2; s.roomName = 'The Threadmill'; s.threadmillEntered = true;
  s.entry = { x: 210, y: 430 }; s.exit = { x: 1050, y: 430 };
  Object.assign(s.player, { ...s.entry, angle: 0, grace: 1.8, flash: 0, trail: [] });
  Object.assign(s.orb, { x: 239, y: 430, vx: 0, vy: 0, mode: 'held', distanceLeft: 0, hits: [], trail: [] });
  s.enemies = [{ id: 'bronze-warden', kind: 'guardian', x: 640, y: 425, radius: 40,
    hp: 3, maxHp: 3, angle: Math.PI, turnRate: 0.9, shieldArc: Math.PI / 2,
    phase: 'watch', timer: 1.1, phaseDuration: 1.1, flash: 0, blockFlash: 0,
    vx: 0, vy: 0, aimX: -1, aimY: 0, aimDistance: 400, lungeSpeed: 390,
    crashCooldown: 0, down: 0, hitPlayer: false }];
  s.props = [265, 610].map((y, i) => ({ id: i ? 'south-sunseal' : 'north-sunseal',
    kind: 'sunseal', x: 990, y, r: 28, hp: 1, maxHp: 1, flash: 0 }));
  s.shots = []; s.particles = []; s.rings = [];
  s.exitReady = false; s.exitAsked = false; s.awaitingHost = false; s.cleared = false;
  s.respawn = 0; s.shake = 0; s.hitstop = 0; s.timeFlow = 0.06; s.paused = true;
  s.notice = 'Two sunseals hold the far gate.';
  s.noticeLife = 9; s.arrivalPending = { from: 1, to: 2 };
  return true;
}
