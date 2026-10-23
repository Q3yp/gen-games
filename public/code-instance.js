/** Opt-in world adapter. Authored renderers retain their own method receiver. */
import { validateCapabilities } from './code-contract.js';

const SCOPE = '$world';
const COMMAND = 'world.patch';
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function check(ok, code, message) {
  if (!ok) throw Object.assign(new Error(message), { code });
}
function jsonCopy(value) {
  const seen = new Set();
  function visit(item, depth) {
    check(depth <= 100, 'INVALID_WORLD_PATCH', 'Patch values are nested too deeply.');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    check(item && typeof item === 'object' &&
      (Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype ||
        Object.getPrototypeOf(item) === null), 'INVALID_WORLD_PATCH', 'Patch values must be JSON only.');
    check(!seen.has(item) && !Object.getOwnPropertySymbols(item).length,
      'INVALID_WORLD_PATCH', 'Patch values cannot contain cycles or symbol keys.');
    seen.add(item);
    const keys = Object.keys(item);
    if (Array.isArray(item)) check(keys.length === item.length &&
      Array.from({ length: item.length }, (_, index) => Object.hasOwn(item, index)).every(Boolean),
    'INVALID_WORLD_PATCH', 'Patch arrays cannot contain holes or custom properties.');
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      check('value' in descriptor && !forbidden.has(key), 'INVALID_WORLD_PATCH',
        'Patch values cannot contain accessors or prototype-related keys.');
      visit(descriptor.value, depth + 1);
    }
    seen.delete(item);
  }
  visit(value, 0);
  const json = JSON.stringify(value);
  check(new TextEncoder().encode(json).byteLength <= 256000,
    'WORLD_PATCH_TOO_LARGE', 'Keep a world patch below 256 KB.');
  return JSON.parse(json);
}
function equal(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
}
function keyFor(parent, key, insertion = false) {
  check(parent !== null && typeof parent === 'object', 'INVALID_WORLD_PATH', 'Patch parent must be an existing object or array.');
  if (Array.isArray(parent)) check(Number.isSafeInteger(key) && key >= 0 &&
    key < parent.length + (insertion ? 1 : 0), 'INVALID_WORLD_PATH', 'Array paths require an in-range numeric index.');
  else check(typeof key === 'string', 'INVALID_WORLD_PATH', 'Object paths require string keys.');
  return key;
}
function patch(world, args, context) {
  check(Object.hasOwn(context?.expectedVersions || {}, SCOPE), 'STALE_SCOPE', 'world.patch requires expectedVersions.$world.');
  check(context.expectedVersions[SCOPE] === world.api.version, 'STALE_SCOPE', 'The world changed before patch application.');
  const input = jsonCopy(args);
  check(record(input) && Object.keys(input).length === 1 && Array.isArray(input.operations) &&
    input.operations.length > 0 && input.operations.length <= 100,
  'INVALID_WORLD_PATCH', 'Provide operations containing 1 to 100 explicit add, replace, remove, or test operations.');
  for (const operation of input.operations) {
    check(record(operation) && ['add', 'replace', 'remove', 'test'].includes(operation.op) &&
      Array.isArray(operation.path) && operation.path.length > 0 && operation.path.length <= 100 &&
      operation.path.every(key => (typeof key === 'string' && !forbidden.has(key)) ||
        (Number.isSafeInteger(key) && key >= 0)),
    'INVALID_WORLD_PATCH', 'Use supported operations and nonempty safe array-of-key paths; root changes are not supported.');
    const needsValue = operation.op !== 'remove';
    check(Object.hasOwn(operation, 'value') === needsValue &&
      Object.keys(operation).every(key => ['op', 'path', ...(needsValue ? ['value'] : [])].includes(key)),
    'INVALID_WORLD_PATCH', 'add, replace, and test require value; remove accepts only op and path.');
  }
  return world.api.transact(draft => {
    for (const { op, path, value } of input.operations) {
      let parent = draft;
      for (const part of path.slice(0, -1)) {
        keyFor(parent, part);
        check(Object.hasOwn(parent, part), 'INVALID_WORLD_PATH', 'Patch ancestors must already exist.');
        parent = parent[part];
      }
      const key = keyFor(parent, path.at(-1), op === 'add');
      const exists = Object.hasOwn(parent, key);
      check(op === 'add' ? Array.isArray(parent) || !exists : exists,
        'INVALID_WORLD_PATH', op === 'add' ? 'add requires an absent object key; use replace explicitly.' : 'Patch target must already exist.');
      if (op === 'test') check(equal(parent[key], value), 'WORLD_PATCH_TEST_FAILED', 'World patch test failed; nothing was changed.');
      else if (op === 'remove') {
        if (Array.isArray(parent)) parent.splice(key, 1);
        else delete parent[key];
      } else if (op === 'add' && Array.isArray(parent)) parent.splice(key, 0, value);
      else parent[key] = value;
    }
  }, { expectedVersion: context.expectedVersions[SCOPE] });
}

export function wrapWorldInstance(instance, world) {
  check(instance && typeof instance === 'object', 'INVALID_GAME_INSTANCE', 'createGame() must return an instance.');
  const capabilities = () => {
    const authored = typeof instance.capabilities === 'function' ? instance.capabilities.call(instance) : [];
    validateCapabilities(authored);
    check(!authored.some(item => item.name === COMMAND),
      'RESERVED_WORLD_CAPABILITY', 'The world.patch command name is reserved for the engine.');
    const merged = [...authored, { name: COMMAND, description: 'Atomically patch existing world paths. Root replacement is forbidden; add never overwrites object keys. Array add inserts at a numeric index (length appends).', scopes: [SCOPE],
      inputSchema: { type: 'object', required: ['operations'], additionalProperties: false,
        properties: { operations: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', required: ['op', 'path'], additionalProperties: false, properties: {
          op: { enum: ['add', 'replace', 'remove', 'test'] }, path: { type: 'array', minItems: 1, maxItems: 100, items: { type: ['string', 'integer'] } }, value: {}
        } } } } } }];
    validateCapabilities(merged);
    return merged;
  };
  const versions = () => {
    const authored = typeof instance.versions === 'function' ? instance.versions.call(instance) : {};
    check(record(authored) && !Object.hasOwn(authored, SCOPE), 'RESERVED_WORLD_VERSION', 'versions() must return an object without the reserved $world scope.');
    return { ...authored, [SCOPE]: world.api.version };
  };
  capabilities();
  versions();
  const wrapped = {
    dispose() {},
    serialize: () => world.snapshot(),
    capabilities,
    versions,
    command(name, args, context) {
      // A normal wrapper must not disguise an async authored function from the runtime.
      if (name === COMMAND) return patch(world, args, context);
      check(typeof instance.command === 'function', 'UNKNOWN_COMMAND', 'This game exposes no authored command handler.');
      check(instance.command.constructor?.name !== 'AsyncFunction', 'ASYNC_COMMAND_UNSUPPORTED', 'Registered command handlers must be synchronous; authored handler was not invoked.');
      // Preserve returned thenables so the runtime can retain state and fault the run.
      return instance.command.call(instance, name, args, context);
    }
  };
  for (const name of ['step', 'render', 'inspect', 'dispose']) {
    if (typeof instance[name] === 'function') wrapped[name] = (...args) => instance[name].apply(instance, args);
  }
  return wrapped;
}
