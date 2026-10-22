import { roomFactories } from './authored-rooms.js';

const fields = ['stageId', 'fromRoom', 'expectedStageId', 'roomKey', 'config'];
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value);
export function capabilities() {
  return [{ name: 'passage.stage', scopes: ['route'],
    description: 'Prepare one inactive next room from an authored campaign factory. It enters only at the actual safe exit; this does not invent new mechanics.',
    inputSchema: { type: 'object', additionalProperties: false, required: fields,
      properties: {
        stageId: { type: 'string', minLength: 1, maxLength: 80 },
        fromRoom: { type: 'integer', minimum: 1, maximum: 9999 },
        expectedStageId: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Explicit null for an empty slot, otherwise the exact pending stage ID being replaced.' },
        roomKey: { type: 'string', enum: Object.keys(roomFactories) },
        config: { type: 'object', description: 'Required room (unvisited integer). Threadmill: name, entry, exit, guardian, seals, notice. Glassworks: name, entry, exit, enemies [{kind,x,y}] (ram/archer/artillery), jars [{x,y}]. Rain balcony: name, entry, exit, kilns [{x,y}], screen {x,y} or null. Crown garden: name, entry, exit, boss {x,y}, screens [{x,y}]. Factory validation rejects unsupported fields.' }
      } } }];
}

export function stagePassage(s, name, args, emit = () => {}) {
  if (name !== 'passage.stage') throw Error('Unknown Sunspindle command');
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('passage.stage requires an object');
  for (const key of Object.keys(args)) if (!fields.includes(key)) throw Error(`Unknown passage.stage.${key}`);
  for (const key of fields) if (!Object.hasOwn(args, key)) throw Error(`passage.stage requires ${key}`);
  if (!validId(args.stageId) || (args.expectedStageId !== null && !validId(args.expectedStageId))) throw Error('Invalid stage ID');
  if (!Number.isInteger(args.fromRoom) || args.fromRoom !== s.room) throw Error('Departure room has changed');
  if (!Object.hasOwn(roomFactories, args.roomKey)) throw Error('Unknown authored room factory');
  const factory = roomFactories[args.roomKey];
  const config = factory.validate(args.config), room = factory.build(config);
  if (room.room === s.room || Object.hasOwn(s.rooms || {}, room.room)) throw Error('Destination has already been visited; do not reset it');
  if ((s.enteredStages || []).includes(args.stageId)) throw Error('This staged passage has already been entered');
  const candidate = { stageId: args.stageId, fromRoom: args.fromRoom, roomKey: args.roomKey,
    factoryVersion: factory.version, config, room };
  const old = s.pendingRoom || null;
  if (old?.stageId === args.stageId) {
    if (JSON.stringify(old) !== JSON.stringify(candidate)) throw Error('Use a new stage ID for changed content');
    return { staged: true, unchanged: true, stageId: old.stageId, destination: old.room.room };
  }
  if ((old?.stageId || null) !== args.expectedStageId) throw Error('Pending passage changed; inspect before replacing it');
  // Every validation and allocation above completes before the first state write.
  s.pendingRoom = candidate;
  s.versions.route = (s.versions.route || 0) + 1;
  const result = { staged: true, stageId: candidate.stageId, destination: room.room, roomKey: candidate.roomKey };
  try {
    emit('passage.staged', 'An authored passage is ready beyond the current room.',
      { stageId: candidate.stageId, fromRoom: s.room, destination: room.room, replaced: old?.stageId || null });
  } catch {
    // The durable command receipt still reports the committed stage, never a false failure.
    result.notification = 'Semantic event unavailable; the staged passage is preserved.';
  }
  return result;
}
