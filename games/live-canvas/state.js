const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const fail = text => { throw new Error(`LIVE_CANVAS: ${text}`); };
const id = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(v) && !unsafe.has(v);
function text(v, max, label) {
  if (typeof v !== 'string' || v.length > max) fail(`${label} must be text, at most ${max} characters.`);
}
function fields(v, allowed, label) {
  if (!object(v) || Object.keys(v).some(k => !allowed.includes(k))) fail(`${label}: allowed fields are ${allowed.join(', ')}.`);
}
function json(v, depth = 0) {
  if (depth > 16) fail('Data nesting exceeds 16 levels.');
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return;
  if (typeof v === 'number' && Number.isFinite(v)) return;
  if (!object(v) && !Array.isArray(v)) fail('Use finite JSON data only.');
  for (const [key, value] of Object.entries(v)) {
    if (unsafe.has(key)) fail(`Unsafe key ${key}.`);
    json(value, depth + 1);
  }
}
export function validate(world) {
  json(world);
  if (JSON.stringify(world).length > 750000) fail('World exceeds 750 KB; import large media with the asset tool.');
  fields(world, ['background', 'caption', 'assets', 'things', 'actions', 'facts'], 'world');
  fields(world.background, ['color', 'asset'], 'background');
  text(world.background.color, 80, 'background.color');
  text(world.caption, 2000, 'caption');
  if (!object(world.assets) || !object(world.things) || !object(world.facts) || !Array.isArray(world.actions)) fail('assets, things and facts must be objects; actions must be an array.');
  if (Object.keys(world.things).length > 100 || Object.keys(world.assets).length > 100) fail('Keep at most 100 things and 100 assets.');
  for (const [key, asset] of Object.entries(world.assets)) {
    if (!id(key)) fail('Use short alphanumeric, underscore or hyphen asset IDs.');
    fields(asset, ['src', 'summary'], `asset ${key}`);
    text(asset.summary, 500, `asset ${key}.summary`);
    if (asset.src !== undefined) {
      text(asset.src, 500000, `asset ${key}.src`);
      if (!/^(\.\/|\/assets\/|https:\/\/|data:image\/(svg\+xml|png|jpeg|webp);)/.test(asset.src)) fail(`asset ${key}: use ./pack-file, /assets/ URL, HTTPS image or image data URI.`);
    }
  }
  function reference(value, label) {
    if (value !== undefined && (!id(value) || !Object.hasOwn(world.assets, value))) fail(`${label} must reference an existing asset ID.`);
  }
  reference(world.background.asset, 'background.asset');
  const actions = (items, label) => {
    if (!Array.isArray(items) || items.length > 12) fail(`${label} must be an array of at most 12 actions.`);
    const seen = new Set();
    for (const action of items) {
      fields(action, ['id', 'label', 'data'], label);
      if (!id(action.id) || seen.has(action.id)) fail(`${label}: action IDs must be safe and unique.`);
      seen.add(action.id);
      text(action.label, 100, 'action.label');
    }
  };
  actions(world.actions, 'world.actions');
  for (const [key, thing] of Object.entries(world.things)) {
    if (!id(key)) fail('Use short alphanumeric, underscore or hyphen thing IDs.');
    fields(thing, ['label', 'x', 'y', 'width', 'height', 'asset', 'speech', 'emotion', 'draggable', 'actions', 'facts', 'z', 'hidden'], `thing ${key}`);
    text(thing.label, 120, `${key}.label`);
    for (const field of ['x', 'y', 'width', 'height']) {
      if (!Number.isFinite(thing[field]) || thing[field] < 0 || thing[field] > 100 || (['width', 'height'].includes(field) && thing[field] === 0)) fail(`${key}.${field} must be ${['width', 'height'].includes(field) ? '>0' : '0'}..100 (stage percent).`);
    }
    for (const field of ['speech', 'emotion']) if (thing[field] !== undefined) text(thing[field], field === 'speech' ? 1000 : 100, `${key}.${field}`);
    for (const field of ['draggable', 'hidden']) if (thing[field] !== undefined && typeof thing[field] !== 'boolean') fail(`${key}.${field} must be boolean.`);
    if (thing.z !== undefined && (!Number.isInteger(thing.z) || Math.abs(thing.z) > 100)) fail(`${key}.z must be an integer from -100 to 100.`);
    if (thing.facts !== undefined && !object(thing.facts)) fail(`${key}.facts must be an object.`);
    if (thing.actions !== undefined) actions(thing.actions, `${key}.actions`);
    reference(thing.asset, `${key}.asset`);
  }
  return world;
}
export function initial() {
  return { version: 1, versions: { world: 0, input: 0, assets: 0 }, lastInput: null,
    world: { background: { color: '#101319' }, caption: '', assets: {}, things: {}, actions: [], facts: {} } };
}
export function patch(world, operations) {
  if (!Array.isArray(operations) || operations.length < 1 || operations.length > 100) fail('operations must contain 1–100 set/delete operations.');
  const next = structuredClone(world);
  for (const operation of operations) {
    fields(operation, ['op', 'path', 'value'], 'operation');
    const { op, path, value } = operation;
    if (!['set', 'delete'].includes(op) || !Array.isArray(path) || !path.length || path.length > 16 || path.some(k => typeof k !== 'string' || !k || unsafe.has(k))) fail('Use {op:"set"|"delete",path:[safe string keys],value?}; paths are relative to world.');
    let parent = next;
    for (const key of path.slice(0, -1)) {
      if (!object(parent) || !Object.hasOwn(parent, key)) fail(`Missing path parent ${key}; create the parent first.`);
      parent = parent[key];
    }
    if (!object(parent)) fail('Path parent must be an object. Replace arrays as a whole.');
    if (op === 'set') { json(value); parent[path.at(-1)] = structuredClone(value); }
    else delete parent[path.at(-1)];
  }
  return validate(next);
}
export function projection(state) {
  return { world: { ...state.world, assets: Object.fromEntries(Object.entries(state.world.assets).map(([key, asset]) => [key, { summary: asset.summary, ready: Boolean(asset.src) }])) }, lastInput: state.lastInput };
}
