import { threadmill } from './threadmill-room.js';
import { roomFactories } from './authored-rooms.js';
import { distance } from './physics.js';

const localFields = ['room', 'roomName', 'roomKey', 'presentation', 'objective', 'entry', 'exit',
  'player', 'orb', 'enemies', 'props', 'shots', 'particles', 'rings', 'clock',
  'cleared', 'exitReady', 'exitAsked', 'awaitingHost'];

function enter(s, room, stageId = null) {
  const from = s.room;
  const snapshot = structuredClone(Object.fromEntries(localFields.filter(k => k in s).map(k => [k, s[k]])));
  const destination = structuredClone(room);
  const departure = { room: from, health: s.player.hp, rescued: s.rescue,
    livingGuards: s.enemies.filter(e => e.hp > 0).map(e => e.id),
    defeatedGuards: s.enemies.filter(e => e.hp <= 0).map(e => e.id),
    brokenProps: s.props.filter(p => p.hp <= 0).map(p => p.id) };
  s.rooms ||= {}; s.departures ||= {};
  s.rooms[String(from)] = snapshot; s.departures[String(from)] = departure;
  Object.assign(s, destination);
  // Carry the actual player's latest condition, never a health value frozen at staging.
  Object.assign(s.player, { ...s.entry, angle: 0, grace: 1.8, flash: 0, trail: [] });
  Object.assign(s.orb, { x: s.entry.x + 29, y: s.entry.y, vx: 0, vy: 0, mode: 'held', distanceLeft: 0, hits: [], trail: [] });
  s.shots = []; s.particles = []; s.rings = [];
  s.exitReady = false; s.exitAsked = false; s.awaitingHost = false; s.cleared = false;
  s.respawn = 0; s.shake = 0; s.hitstop = 0; s.timeFlow = 0.06; s.paused = true;
  s.noticeLife = 9; s.arrivalPending = { from, to: s.room, stageId };
  s.versions.route = (s.versions.route || 0) + 1;
}

export function enterThreadmill(s) {
  if (s.room !== 1 || !s.awaitingHost || s.threadmillEntered || !s.exitAsked || !s.exitReady
    || s.player.hp <= 0 || s.respawn > 0 || distance(s.player, s.exit) > 76) return false;
  enter(s, threadmill.build(threadmill.validate({ room: 2 })));
  s.threadmillEntered = true;
  return true;
}

export function atSafeExit(s) {
  return s.awaitingHost && s.exitAsked && s.exitReady && s.player.hp > 0
    && !(s.respawn > 0) && distance(s.player, s.exit) <= 76;
}

export function pendingBlocker(s) {
  const c = s.pendingRoom;
  if (!c) return null;
  if (c.fromRoom !== s.room) return 'Departure room changed; replace the pending stage.';
  if (!Object.hasOwn(roomFactories, c.roomKey) || c.factoryVersion !== roomFactories[c.roomKey].version)
    return 'Factory changed; explicitly replace or migrate the pending stage.';
  if (c.room.room === s.room || Object.hasOwn(s.rooms || {}, c.room.room))
    return 'Destination already visited; replace the pending stage without resetting it.';
  return null;
}

export function enterStagedRoom(s) {
  const candidate = s.pendingRoom;
  if (!candidate || !atSafeExit(s) || pendingBlocker(s)) return false;
  enter(s, candidate.room, candidate.stageId);
  s.enteredStages = [...(s.enteredStages || []), candidate.stageId];
  s.pendingRoom = null;
  return true;
}
