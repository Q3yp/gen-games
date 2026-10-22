import { atSafeExit, pendingBlocker } from './rooms.js';
import { prepareVoyage } from './continuation.js';

const enemy = (id, kind, x, y, timer) => ({
  id, kind, x, y, hp: kind === 'archer' ? 2 : 3, maxHp: kind === 'archer' ? 2 : 3,
  radius: kind === 'guardian' ? 40 : kind === 'ram' ? 29 : 24, angle: Math.PI, phase: 'watch', timer,
  phaseDuration: timer, flash: 0, vx: 0, vy: 0, aimX: -1, aimY: 0,
  aimDistance: 400, crashCooldown: 0, down: 0, blockFlash: 0, turnRate: 0.9, shieldArc: Math.PI / 2
});

function fresh() {
  return {
    sunspindle: 1,
    player: { x: 270, y: 490, angle: -0.15, hp: 5, maxHp: 5, dash: 0, grace: 1.2, flash: 0, trail: [] },
    orb: { x: 297, y: 486, vx: 0, vy: 0, radius: 19, mode: 'held', spin: 0,
      flight: 0, hits: [], trail: [], distanceLeft: 0 },
    enemies: [enemy('red-horn', 'ram', 640, 450, 1.8), enemy('reed-bow', 'archer', 900, 570, 2.8)],
    props: [{ id: 'bird-prism', x: 890, y: 340, r: 38, hp: 2, maxHp: 2, kind: 'crystal', flash: 0 }],
    shots: [], particles: [], rings: [], clock: 0, paused: true, room: 1, rooms: {},
    roomName: 'Sun Court', roomKey: 'sun-court', presentation: 'courtyard', entry: { x: 270, y: 490 },
    pendingRoom: null, enteredStages: [], departures: {},
    defeated: 0, rescue: false, exitReady: false, exitAsked: false, awaitingHost: false,
    exit: { x: 1030, y: 245 }, story: [], versions: { world: 0, route: 0 }, seen: {},
    shake: 0, hitstop: 0, respawn: 0, timeFlow: 0.06,
    notice: 'Break the bird’s prison. The world waits while you are still.',
    noticeLife: 8, choices: [], shotSerial: 0, cleared: false
  };
}

export function initial(save) {
  const base = fresh();
  if (!save || typeof save !== 'object' || !save.sunspindle) {
    prepareVoyage(base);
    return base;
  }
  const old = structuredClone(save);
  const s = { ...base, ...old };
  s.player = { ...base.player, ...old.player };
  s.orb = { ...base.orb, ...old.orb };
  s.exit = { ...base.exit, ...old.exit };
  s.versions = { ...base.versions, ...old.versions };
  s.seen = { ...old.seen };
  s.roomKey = old.roomKey || (s.room === 2 ? 'threadmill' : 'sun-court');
  s.presentation = old.presentation || (s.room === 2 ? 'threadmill' : 'courtyard');
  for (const key of ['enemies', 'props', 'shots', 'particles', 'rings', 'story', 'choices'])
    s[key] = Array.isArray(old[key]) ? old[key] : base[key];
  s.player.trail = Array.isArray(s.player.trail) ? s.player.trail : [];
  s.orb.trail = Array.isArray(s.orb.trail) ? s.orb.trail : [];
  s.orb.hits = Array.isArray(s.orb.hits) ? s.orb.hits : [];
  s.enemies = s.enemies.map(e => ({ ...enemy(e.id, e.kind, e.x, e.y, 1), ...e }));
  s.props = s.props.map(p => ({ maxHp: p.kind === 'crystal' ? 2 : 1, flash: 0, ...p }));
  // A migration may add defaults, never restore already-broken props or slain guards.
  if (s.rescue && s.room === 1) s.exitReady = true;
  if (s.player.hp <= 0 && !(s.respawn > 0)) s.respawn = 0.9;
  prepareVoyage(s);
  return s;
}

export function projection(s) {
  const complete = (s.finishAtExit || s.roomKey === 'glassworks') && s.awaitingHost && !s.pendingRoom
    && (s.roomKey !== 'crown-garden' || s.gardenArrived);
  return {
    progress: { label: 'Sunspindle', location: `${s.roomName || 'Sun Court'} · ${s.room}`,
      objective: complete ? s.endNotice || 'The glassworks are quiet. The sunbird rests at the garden gate.'
        : s.awaitingHost ? 'The rescued bird is waiting at the open arch.'
        : s.objective ? s.objective[s.exitReady ? 'open' : 'locked']
        : s.room === 2 ? s.exitReady ? 'Reach the open Threadmill gate.' : 'Break the two sunseals holding the far gate.'
        : s.rescue ? 'Reach the east arch with the bird.' : 'Break the crystal holding the sunbird.',
      status: complete ? 'complete' : s.awaitingHost ? 'awaiting-next-room' : s.paused ? 'paused' : 'playing',
      rescued: s.rescue, exitReady: s.exitReady, defeated: s.defeated },
    player: { x: Math.round(s.player.x), y: Math.round(s.player.y), hp: s.player.hp, maxHp: s.player.maxHp },
    sunweight: { mode: s.orb.mode, x: Math.round(s.orb.x), y: Math.round(s.orb.y) },
    threats: s.enemies.filter(e => e.hp > 0).map(e => ({ id: e.id, kind: e.kind, hp: e.hp,
      x: Math.round(e.x), y: Math.round(e.y), phase: e.phase })),
    props: s.props.map(p => ({ id: p.id, kind: p.kind, hp: p.hp, x: p.x, y: p.y })),
    route: { currentRoom: s.room, roomKey: s.roomKey,
      atSafeExit: atSafeExit(s),
      pending: s.pendingRoom ? { stageId: s.pendingRoom.stageId, fromRoom: s.pendingRoom.fromRoom,
        destination: s.pendingRoom.room.room, roomKey: s.pendingRoom.roomKey, factoryVersion: s.pendingRoom.factoryVersion, blockedReason: pendingBlocker(s) } : null },
    versions: { ...s.versions }, latest: s.story.slice(-5)
  };
}
