import { isRecord } from './validate.js';
/** Small RFC-6902-like patches with array paths. Arrays are replaced atomically. */
export function diff(before, after, path = [], result = []) {
  if (Object.is(before, after)) return result;
  if (isRecord(before) && isRecord(after)) {
    for (const key of Object.keys(before)) if (!Object.hasOwn(after, key)) result.push({ op: 'delete', path: [...path, key] });
    for (const key of Object.keys(after)) {
      if (!Object.hasOwn(before, key)) result.push({ op: 'set', path: [...path, key], value: after[key] });
      else diff(before[key], after[key], [...path, key], result);
    }
  } else if (JSON.stringify(before) !== JSON.stringify(after)) result.push({ op: 'set', path, value: after });
  return result;
}
export function publicEvent(event) {
  return event.type === 'state.changed' ? { ...event, data: { fields: event.data.patches?.length || 0 } } : event;
}
