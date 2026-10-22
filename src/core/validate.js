import { requireValue as check } from './errors.js';
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
export function safePath(path) {
  check(Array.isArray(path) && path.length > 0 && path.length <= 20 && path.every(key =>
    typeof key === 'string' && key.length > 0 && key.length < 160 && !forbidden.has(key)),
  'INVALID_PATH', 'Use a nonempty array of safe object keys.', 'Example: ["entities","hero","components","stats","health"]');
  return path;
}
export function atPath(value, path) {
  for (const key of safePath(path)) {
    check(value !== null && typeof value === 'object' && Object.hasOwn(value, key), 'NOT_FOUND', `Path not found: ${path.join('.')}`);
    value = value[key];
  }
  return value;
}
export function applyOperations(state, operations) {
  check(Array.isArray(operations) && operations.length > 0 && operations.length <= 100,
    'INVALID_OPERATIONS', 'Provide between 1 and 100 set/delete operations.');
  for (const operation of operations) {
    check(isRecord(operation) && ['set', 'delete'].includes(operation.op), 'INVALID_OPERATION', 'Each operation needs op: set or delete.');
    const path = safePath(operation.path); let parent = state;
    for (const key of path.slice(0, -1)) {
      check(isRecord(parent) && Object.hasOwn(parent, key) && isRecord(parent[key]), 'INVALID_PATH', `Parent object missing: ${path.join('.')}`, 'Create the parent object first.');
      parent = parent[key];
    }
    check(isRecord(parent), 'INVALID_PATH', 'Operations target object fields, not array indexes. Replace arrays atomically.');
    if (operation.op === 'delete') delete parent[path.at(-1)];
    else { check(Object.hasOwn(operation, 'value'), 'INVALID_OPERATION', 'A set operation requires value.'); parent[path.at(-1)] = structuredClone(operation.value); }
  }
  validateState(state);
}
export function validateState(state) {
  check(isRecord(state), 'INVALID_STATE', 'Game state must be an object.');
  for (const key of ['entities', 'scenes', 'assets', 'skills', 'variables']) check(isRecord(state[key]), 'INVALID_STATE', `state.${key} must be an object.`);
  check(typeof state.scene === 'string' && Object.hasOwn(state.scenes, state.scene), 'INVALID_SCENE', 'Active scene must exist in state.scenes.');
  check(typeof state.player === 'string' && Object.hasOwn(state.entities, state.player), 'INVALID_PLAYER', 'Player entity must exist.');
  for (const [id, entity] of Object.entries(state.entities)) {
    check(isRecord(entity) && entity.id === id && typeof entity.name === 'string' && isRecord(entity.components), 'INVALID_ENTITY', `Entity ${id} needs matching id, name, and components.`);
    const stats = entity.components.stats;
    if (stats) for (const [name, value] of Object.entries(stats)) check(typeof value !== 'number' || Number.isFinite(value), 'INVALID_STAT', `${id}.${name} must be finite.`);
  }
  check(Buffer.byteLength(JSON.stringify(state)) <= 2_000_000, 'STATE_TOO_LARGE', 'State exceeds the 2 MB local-runtime limit.', 'Keep media in asset files, not inline game state.');
}
export function validateEnvelope(input) {
  check(isRecord(input), 'INVALID_REQUEST', 'Arguments must be an object.');
  check(typeof input.requestId === 'string' && /^[\w.:-]{1,120}$/.test(input.requestId), 'REQUEST_ID_REQUIRED', 'A unique requestId is required for every mutation.', 'Reuse the same requestId only when retrying the exact same operation.');
}
export function validateSchema(args, schema) {
  if (!schema) return;
  for (const key of schema.required || []) check(args[key] !== undefined, 'MISSING_ARGUMENT', `Required argument: ${key}.`);
  for (const [key, rule] of Object.entries(schema.properties || {})) {
    if (args[key] === undefined) continue;
    const value = args[key], valid = rule.type === 'integer' ? Number.isInteger(value) : rule.type === 'array' ? Array.isArray(value) : rule.type === 'object' ? isRecord(value) : !rule.type || typeof value === rule.type;
    check(valid, 'INVALID_ARGUMENT', `${key} must be ${rule.type}.`);
    if (rule.enum) check(rule.enum.includes(value), 'INVALID_ARGUMENT', `${key} must be one of ${rule.enum.join(', ')}.`);
    if (rule.minimum !== undefined) check(value >= rule.minimum, 'INVALID_ARGUMENT', `${key} must be at least ${rule.minimum}.`);
    if (rule.maximum !== undefined) check(value <= rule.maximum, 'INVALID_ARGUMENT', `${key} must be at most ${rule.maximum}.`);
    if (rule.maxLength) check(value.length <= rule.maxLength, 'INVALID_ARGUMENT', `${key} is too long.`);
  }
}
