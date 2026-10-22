import { TOOL_DEFINITIONS } from './tool-schemas.js';
import { requireValue as check } from './errors.js';
import { isRecord } from './validate.js';

const schemas = new Map(
  TOOL_DEFINITIONS.map(({ name, inputSchema }) => [name, inputSchema])
);
const label = (value) => JSON.stringify(String(value).slice(0, 80));

function matchesType(value, type) {
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return Number.isFinite(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

/** Validate only supplied top-level names, types and enums. Keep operation
 * defaults/required fields in their handlers and nested payloads game-defined. */
export function validateToolArguments(tool, args) {
  const schema = schemas.get(tool);
  check(schema, 'TOOL_NOT_FOUND', `Unknown tool ${label(tool)}.`,
    `Supported tools: ${[...schemas.keys()].join(', ')}.`);
  const properties = schema.properties || {};
  const supported = `Supported fields: ${Object.keys(properties).join(', ')}.`;
  const hint = (key, value) => {
    const selectors = Object.entries(properties).filter(
      ([name, rule]) => name !== key && rule.enum?.includes(value)
    );
    return selectors.length === 1
      ? `Use ${selectors[0][0]}: ${label(value)}. ${supported}`
      : supported;
  };

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(args)) {
      check(Object.hasOwn(properties, key), 'UNKNOWN_ARGUMENT',
        `${tool} does not support argument ${label(key)}.`, hint(key, args[key]));
    }
  }
  for (const [key, rule] of Object.entries(properties)) {
    const value = args[key];
    if (value === undefined) continue;
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    check(!rule.type || types.some((type) => matchesType(value, type)),
      'INVALID_ARGUMENT', `${tool}.${key} must be ${types.join(' or ')}.`,
      hint(key, value));
    if (rule.enum) {
      check(rule.enum.includes(value), 'INVALID_ARGUMENT',
        `${tool}.${key} has an unsupported value.`,
        `Supported ${key} values: ${rule.enum.join(', ')}. ${supported}`);
    }
  }
}
