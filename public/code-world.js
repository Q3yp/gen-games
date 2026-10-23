/** Optional engine-owned JSON world, independent of renderer serialization. */
const TAG = '$codeWorld';
const MAX_BYTES = 2_000_000;
const MAX_CHANGES = 64;
const MAX_PATHS = 32;
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
function check(ok, code, message) {
  if (!ok) throw Object.assign(new Error(message), { code });
}
function copy(value, maxDepth = 100) {
  // Do not silently erase undefined, non-finite values, or class instances.
  const seen = new Set();
  function visit(item, depth = 0) {
    check(depth <= maxDepth, 'INVALID_WORLD', 'World JSON nesting exceeds 100 levels.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number') {
      check(Number.isFinite(item), 'INVALID_WORLD', 'World numbers must be finite.');
      return;
    }
    check(item && typeof item === 'object' &&
      (Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype ||
        Object.getPrototypeOf(item) === null), 'INVALID_WORLD', 'World data must contain only JSON values.');
    check(!seen.has(item), 'INVALID_WORLD', 'World data must not contain cycles.');
    seen.add(item);
    check(!Object.getOwnPropertySymbols(item).length, 'INVALID_WORLD', 'World data must use string keys.');
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) {
        check(Object.hasOwn(item, i), 'INVALID_WORLD', 'World arrays must not contain holes.');
        visit(item[i], depth + 1);
      }
      check(Object.keys(item).length === item.length, 'INVALID_WORLD', 'World arrays must not have extra properties.');
    } else {
      for (const key of Object.keys(item)) {
        const descriptor = Object.getOwnPropertyDescriptor(item, key);
        check('value' in descriptor, 'INVALID_WORLD', 'World data must not contain accessors.');
        visit(descriptor.value, depth + 1);
      }
    }
    seen.delete(item);
  }
  visit(value);
  check(bytes(value) <= MAX_BYTES, 'STATE_TOO_LARGE', 'Keep world saves under 2 MB.');
  return JSON.parse(JSON.stringify(value));
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function validPath(path) {
  return Array.isArray(path) && path.length <= 100 && path.every((part) =>
    typeof part === 'string' || (Number.isSafeInteger(part) && part >= 0));
}
function changedPaths(before, after) {
  const paths = [];
  let truncated = false;
  function walk(a, b, path) {
    if (truncated || Object.is(a, b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' &&
      Array.isArray(a) === Array.isArray(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of keys) {
        const next = [...path, Array.isArray(b) ? Number(key) : key];
        if (!Object.hasOwn(a, key) || !Object.hasOwn(b, key)) paths.push(next);
        else walk(a[key], b[key], next);
        if (paths.length > MAX_PATHS || bytes(paths) > 4000) {
          truncated = true;
          break;
        }
      }
    } else paths.push(path);
  }
  walk(before, after, []);
  return { paths: truncated ? [[]] : paths, truncated };
}
export function isWorldSave(save) {
  return record(save) && Object.hasOwn(save, TAG);
}
export function createWorld(save, options = {}) {
  const initial = copy(save ?? {});
  let data, version, changes;
  if (isWorldSave(initial)) {
    check(initial[TAG] === 1 && Object.keys(initial).length === 4 && record(initial.data) &&
      Number.isSafeInteger(initial.version) && initial.version >= 0 &&
      Array.isArray(initial.changes) && initial.changes.length <= MAX_CHANGES,
    'INVALID_WORLD', 'Invalid engine-owned world save.');
    data = initial.data;
    version = initial.version;
    changes = initial.changes;
    let previous = changes.length ? changes[0].version - 1 : version;
    for (const change of changes) {
      check(record(change) && Number.isSafeInteger(change.version) &&
        change.version > 0 && change.version === previous + 1 && change.version <= version &&
        Array.isArray(change.paths) && change.paths.length > 0 && change.paths.length <= MAX_PATHS &&
        change.paths.every(validPath) && typeof change.truncated === 'boolean',
      'INVALID_WORLD', 'Invalid world change history.');
      previous = change.version;
    }
    check(previous === version && bytes(changes) <= 24000,
      'INVALID_WORLD', 'World history must end at the current version and stay bounded.');
  } else {
    check(record(initial), 'INVALID_WORLD', 'World data must be a JSON object.');
    data = initial;
    version = 0;
    changes = [];
  }
  // Reserve two nesting levels for the engine envelope.
  data = freeze(copy(data, 98));
  let phase = 'staged';
  let busy = false;
  const snapshot = () => copy({ [TAG]: 1, version, data, changes });
  const api = Object.freeze({
    get version() { return version; },
    read(path = []) {
      check(validPath(path), 'INVALID_PATH', 'Use an array of JSON object keys or array indexes.');
      let value = data;
      for (const part of path) {
        if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined;
        value = value[part];
      }
      return value;
    },
    transact(mutator, { expectedVersion } = {}) {
      check(phase === 'staged' || (phase === 'active' && (!options.canWrite || options.canWrite())),
        'WORLD_INACTIVE', 'This renderer cannot change the world now.');
      check(!busy, 'WORLD_TRANSACTION_BUSY', 'World transactions cannot be nested.');
      check(expectedVersion === undefined || expectedVersion === version,
        'STALE_WORLD', 'The world changed; read its current version before retrying.');
      check(typeof mutator === 'function' && mutator.constructor?.name !== 'AsyncFunction',
        'INVALID_WORLD_TRANSACTION', 'Provide a synchronous draft mutation function.');
      busy = true;
      try {
        const draft = copy(data);
        const result = mutator(draft);
        if (result && typeof result.then === 'function') {
          Promise.resolve(result).catch(() => {});
          check(false, 'INVALID_WORLD_TRANSACTION', 'World transactions must finish synchronously.');
        }
        const next = copy(draft, 98);
        const delta = changedPaths(data, next);
        if (!delta.paths.length) return { version, paths: [], truncated: false };
        check(Number.isSafeInteger(version + 1), 'WORLD_VERSION_EXHAUSTED', 'World version limit reached.');
        const change = { version: version + 1, ...delta };
        const history = [...changes, change];
        while (history.length > MAX_CHANGES || bytes(history) > 24000) history.shift();
        check(bytes({ [TAG]: 1, version: version + 1, data: next, changes: history }) <= MAX_BYTES,
          'STATE_TOO_LARGE', 'Keep world saves under 2 MB including change history.');
        data = freeze(next);
        version++;
        changes = history;
        // Notifications are advisory; they cannot turn a committed transaction into a failure.
        try { options.onChange?.(version); } catch { /* Periodic checkpoint still persists it. */ }
        return copy(change);
      } finally { busy = false; }
    },
    observe(sinceVersion = version) {
      check(Number.isSafeInteger(sinceVersion) && sinceVersion >= 0 && sinceVersion <= version,
        'INVALID_WORLD_VERSION', 'Observe from a nonnegative version no newer than the world.');
      const oldest = changes.length ? changes[0].version - 1 : version;
      return copy({ version, sinceVersion, resetRequired: sinceVersion < oldest,
        changes: sinceVersion < oldest ? [] : changes.filter((change) => change.version > sinceVersion) });
    }
  });
  snapshot(); // Reject a legacy seed that leaves no room for envelope metadata.
  return Object.freeze({
    api,
    snapshot,
    fork: (nextOptions = options) => createWorld(snapshot(), nextOptions),
    seal() {
      check(phase !== 'revoked', 'WORLD_INACTIVE', 'A revoked world cannot be sealed.');
      phase = 'sealed';
    },
    activate() {
      check(phase !== 'revoked', 'WORLD_INACTIVE', 'A revoked world cannot be activated.');
      phase = 'active';
    },
    revoke() { phase = 'revoked'; }
  });
}
