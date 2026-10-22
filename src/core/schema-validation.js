import { requireValue as check } from './errors.js';

export const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);

export function matchesType(value, type) {
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return Number.isFinite(value);
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  if (type === 'null') return value === null;
  return typeof value === type;
}

const fieldPath = (path, key) => path ? `${path}.${key}` : key;

/** The supported command/action subset, not a general JSON Schema evaluator. */
function schemaError(value, schema, path = '', depth = 0) {
  if (!isRecord(schema)) return;
  const label = path || 'Arguments';
  const fail = (message, code = 'INVALID_ARGUMENT', hint) => ({ code, message, hint, depth });
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (schema.type && !types.some(type => matchesType(value, type)))
    return fail(`${label} must be ${types.join(' or ')}.`);
  if (schema.enum && !schema.enum.includes(value))
    return fail(`${label} must be one of ${schema.enum.join(', ')}.`);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fail(`${label} must be finite.`);
    if (schema.minimum !== undefined && value < schema.minimum)
      return fail(`${label} must be at least ${schema.minimum}.`);
    if (schema.maximum !== undefined && value > schema.maximum)
      return fail(`${label} must be at most ${schema.maximum}.`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      return fail(`${label} is too short.`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      return fail(`${label} is too long.`);
  }
  if (isRecord(value)) {
    const properties = schema.properties || {};
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) {
      if (!Object.hasOwn(properties, key))
        return { ...fail(`Unknown argument: ${fieldPath(path, key)}.`, 'UNKNOWN_ARGUMENT',
          'Use discover to inspect the action schema.'), depth: depth + 1 };
    }
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key) || value[key] === undefined)
        return { ...fail(`Required argument: ${fieldPath(path, key)}.`, 'MISSING_ARGUMENT'), depth: depth + 1 };
    }
    for (const [key, rule] of Object.entries(properties)) {
      if (!Object.hasOwn(value, key) || value[key] === undefined) continue;
      const error = schemaError(value[key], rule, fieldPath(path, key), depth + 1);
      if (error) return error;
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      return fail(`${label} must have at least ${schema.minItems} items.`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      return fail(`${label} must have at most ${schema.maxItems} items.`);
    if (isRecord(schema.items)) for (let index = 0; index < value.length; index++) {
      const error = schemaError(value[index], schema.items, `${path || 'Arguments'}[${index}]`, depth + 1);
      if (error) return error;
    }
  }
  if (schema.anyOf !== undefined) {
    const errors = [];
    if (Array.isArray(schema.anyOf)) for (const option of schema.anyOf) {
      const error = schemaError(value, option, path, depth);
      if (!error) return;
      errors.push(error);
    }
    const deepest = errors.reduce((best, error) => !best || error.depth > best.depth ? error : best, null);
    if (deepest?.depth > depth)
      return { ...deepest, hint: `No anyOf option matched for ${label}.` };
    return fail(`${label} must match an anyOf option.`, 'INVALID_ARGUMENT',
      [...new Set(errors.map(error => error.message))].slice(0, 3).join(' ') || undefined);
  }
}

export function validateSchema(args, schema) {
  const error = schemaError(args, schema);
  if (error) check(false, error.code, error.message, error.hint);
}
