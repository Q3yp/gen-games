/** Validated incremental patches always target the full Session object. */
import { clone, forbidden, isObject } from './shared.js';
function applyPatches(session, patches) {
  let next = clone(session);
  for (const patch of patches || []) {
    if (!['set', 'delete'].includes(patch.op) || !Array.isArray(patch.path) || patch.path.some(key => typeof key !== 'string' || forbidden.has(key))) throw new Error('Unsafe or invalid state patch.');
    if (patch.path.length === 0) { if (patch.op !== 'set') throw new Error('Cannot delete the session.'); next = clone(patch.value); continue; }
    let parent = next;
    for (const key of patch.path.slice(0, -1)) {
      if (!isObject(parent) || !Object.hasOwn(parent, key)) throw new Error('State patch path does not match this snapshot.');
      parent = parent[key];
    }
    if (!isObject(parent)) throw new Error('Invalid state patch target.');
    const key = patch.path.at(-1);
    if (patch.op === 'delete') { if (Array.isArray(parent)) parent.splice(Number(key), 1); else delete parent[key]; }
    else parent[key] = clone(patch.value);
  }
  return next;
}

export { applyPatches };
