/** Tidelight owns these command fields; they are not engine-wide mechanics. */
const number = { type: 'number' };
const id = { type: 'string', minLength: 1, maxLength: 80 };
const record = (properties) => ({
  type: 'object',
  properties,
  required: ['id', 'x', 'y'],
  additionalProperties: false
});
const inputSchema = {
  type: 'object',
  properties: {
    notice: { type: 'string', maxLength: 200 },
    tide: { type: 'number', minimum: -1, maximum: 1 },
    bridge: { type: 'boolean' },
    awaken: id,
    shadow: record({ id, x: number, y: number }),
    creature: record({
      id,
      x: number,
      y: number,
      angle: number,
      mood: { type: 'string', maxLength: 80 },
      size: { type: 'number', minimum: 0.1, maximum: 10 }
    }),
    lantern: record({
      id,
      x: number,
      y: number,
      lit: { type: 'boolean' },
      color: { type: 'string', maxLength: 80 },
      vx: { type: 'number', minimum: -1000, maximum: 1000 },
      vy: { type: 'number', minimum: -1000, maximum: 1000 }
    })
  },
  additionalProperties: false
};

function validate(value, rule, path) {
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw Error(`${path} must be an object`);
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(rule.properties, key))
        throw Error(`Unknown field ${path}.${key}`);
      validate(value[key], rule.properties[key], `${path}.${key}`);
    }
    for (const key of rule.required || []) {
      if (!Object.hasOwn(value, key)) throw Error(`${path} requires ${key}`);
    }
    return;
  }
  if (
    typeof value !== rule.type ||
    (rule.type === 'number' && !Number.isFinite(value))
  )
    throw Error(
      `${path} must be ${rule.type === 'number' ? 'a finite number' : rule.type}`
    );
  if (
    (rule.minimum !== undefined && value < rule.minimum) ||
    (rule.maximum !== undefined && value > rule.maximum)
  )
    throw Error(`${path} is out of range`);
  if (
    (rule.minLength !== undefined && value.trim().length < rule.minLength) ||
    (rule.maxLength !== undefined && value.length > rule.maxLength)
  )
    throw Error(`${path} has invalid length`);
}

export function capabilities() {
  return [
    {
      name: 'world.change',
      description:
        'Host-authored world change. Introduce a creature or light, change tide, and a brief diegetic notice. No player reset.',
      scopes: ['world'],
      inputSchema: structuredClone(inputSchema)
    }
  ];
}

export function changeWorld(s, name, args) {
  if (name !== 'world.change') throw Error('Unknown command');
  validate(args, inputSchema, 'world.change');
  const island = Object.hasOwn(args, 'awaken')
    ? s.islands.find((item) => item.id === args.awaken)
    : null;
  if (Object.hasOwn(args, 'awaken') && !island) throw Error('Unknown island');
  // Prepare independent records before changing any existing world state.
  const updates = [];
  const shadowList = s.shadows || [];
  if (args.shadow && shadowList.some((c) => c.id === args.shadow.id))
    throw Error('Shadow already exists; preserve its current state');
  for (const [key, list] of [
    ['creature', s.creatures],
    ['lantern', s.lanterns],
    ['shadow', shadowList]
  ]) {
    if (!Object.hasOwn(args, key)) continue;
    const item = structuredClone(args[key]);
    updates.push({
      list,
      item,
      old: list.find((entry) => entry.id === item.id)
    });
  }
  if (args.shadow) s.shadows = shadowList;
  if (island) island.awake = true;
  if (Object.hasOwn(args, 'notice')) {
    s.notice = args.notice;
    s.noticeLife = 7;
  }
  if (Object.hasOwn(args, 'tide')) s.world.tide = args.tide;
  if (Object.hasOwn(args, 'bridge')) s.world.bridge = args.bridge;
  for (const { list, item, old } of updates) {
    if (old) Object.assign(old, item);
    else list.push(item);
  }
  s.versions.world++;
  return { changed: true };
}
