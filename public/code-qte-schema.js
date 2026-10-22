/** Data contract and validation for optional local timed cues. */
const fail = (message) => {
  throw Object.assign(new Error(`QTE: ${message}`), { code: 'INVALID_QTE' });
};
const object = (value, keys, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${path} must be an object.`);
  for (const key of Object.keys(value))
    if (!keys.includes(key)) fail(`${path}.${key} is unsupported.`);
};
const number = (value, min, max, path) => {
  if (!Number.isFinite(value) || value < min || value > max)
    fail(`${path} must be ${min}..${max}.`);
  return value;
};
const text = (value, max, path) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(`${path} must be 1..${max} characters.`);
  return value;
};

/** Nested schema is documentation; validateQTE enforces all invariants locally. */
export function qteSequenceSchema(actions) {
  return {
    type: 'object',
    required: ['id', 'cues'],
    additionalProperties: false,
    properties: {
      id: { type: 'string', maxLength: 80 },
      label: { type: 'string', maxLength: 160 },
      prepareMs: { type: 'number', minimum: 250, maximum: 5000 },
      timeScale: { type: 'number', minimum: 0.5, maximum: 3 },
      cues: {
        type: 'array',
        minItems: 1,
        maxItems: 24,
        items: {
          type: 'object',
          required: ['action', 'kind', 'windowMs'],
          additionalProperties: false,
          properties: {
            id: { type: 'string', maxLength: 80 },
            label: { type: 'string', maxLength: 160 },
            action: { type: 'string', enum: [...actions] },
            kind: { type: 'string', enum: ['tap', 'hold'] },
            prepareMs: { type: 'number', minimum: 250, maximum: 5000 },
            windowMs: { type: 'number', minimum: 200, maximum: 10000 },
            holdMs: { type: 'number', minimum: 100, maximum: 8000 }
          }
        }
      }
    }
  };
}

export function validateQTE(raw, actions) {
  object(raw, ['id', 'label', 'prepareMs', 'timeScale', 'cues'], 'sequence');
  const sequence = {
    id: text(raw.id, 80, 'id'),
    label: raw.label === undefined ? '' : text(raw.label, 160, 'label'),
    prepareMs: number(raw.prepareMs ?? 800, 250, 5000, 'prepareMs'),
    timeScale: number(raw.timeScale ?? 1, 0.5, 3, 'timeScale'),
    cues: []
  };
  if (!Array.isArray(raw.cues) || !raw.cues.length || raw.cues.length > 24)
    fail('cues requires 1..24 entries.');
  const ids = new Set();
  raw.cues.forEach((cue, index) => {
    const path = `cues[${index}]`;
    object(
      cue,
      ['id', 'label', 'action', 'kind', 'prepareMs', 'windowMs', 'holdMs'],
      path
    );
    if (!actions.includes(cue.action))
      fail(`${path}.action must be one of ${actions.join(', ')}.`);
    if (!['tap', 'hold'].includes(cue.kind))
      fail(`${path}.kind must be tap or hold.`);
    const next = {
      id: cue.id === undefined ? String(index) : text(cue.id, 80, `${path}.id`),
      label:
        cue.label === undefined ? '' : text(cue.label, 160, `${path}.label`),
      action: cue.action,
      kind: cue.kind,
      prepareMs: number(
        cue.prepareMs ?? sequence.prepareMs,
        250,
        5000,
        `${path}.prepareMs`
      ),
      windowMs: number(cue.windowMs, 200, 10000, `${path}.windowMs`)
    };
    if (ids.has(next.id)) fail(`${path}.id must be unique.`);
    ids.add(next.id);
    if (cue.kind === 'hold') {
      next.holdMs = number(cue.holdMs, 100, 8000, `${path}.holdMs`);
      if (next.holdMs > next.windowMs)
        fail(`${path}.holdMs must fit inside windowMs.`);
    } else if (cue.holdMs !== undefined)
      fail(`${path}.holdMs applies only to hold cues.`);
    sequence.cues.push(next);
  });
  // Return normalized, detached data before any active sequence can be replaced.
  return sequence;
}

export { fail, number, text };
