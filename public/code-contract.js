/** Pure JSON-wire constraints shared by browser preflight and server ingestion. */
const isRecord = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function check(condition, code, message) {
  if (!condition) throw Object.assign(new Error(message), { code });
}

// Validate the representation that the server receives, not structuredClone's
// richer types (for example, Date-valued versions become strings on the wire).
export function jsonSnapshot(value, label) {
  try {
    const json = JSON.stringify(structuredClone(value));
    return json === undefined ? undefined : JSON.parse(json);
  } catch {
    check(
      false,
      'INVALID_JSON',
      `${label} must be JSON-serializable; remove cycles, BigInt, and non-cloneable values.`
    );
  }
}

export function validateSummary(value, label = 'inspect summaries') {
  const json = JSON.stringify(value);
  check(
    typeof json === 'string' &&
      new TextEncoder().encode(json).byteLength <= 12000,
    'SUMMARY_TOO_LARGE',
    `Keep ${label} below 12 KB; return focused gameplay facts.`
  );
  return value;
}

export function validateSemanticEvent(item) {
  check(
    isRecord(item) &&
      typeof item.type === 'string' &&
      item.type.length <= 100 &&
      !item.type.startsWith('runtime.') &&
      item.type !== 'state.changed',
    'INVALID_EVENT',
    'Use a game-specific event type up to 100 characters; runtime.* and state.changed are reserved.'
  );
  check(
    typeof item.text === 'string' && item.text.length <= 2000,
    'INVALID_EVENT',
    'Use event text up to 2000 characters.'
  );
  validateSummary(item.data ?? {}, 'event data, including its observation');
  if (item.id !== undefined)
    check(
      typeof item.id === 'string' && /^[\w.:-]{1,160}$/.test(item.id),
      'INVALID_EVENT_ID',
      'Semantic event id must be a short stable identifier.'
    );
}

export function validateCapabilities(value) {
  check(
    Array.isArray(value) && value.length <= 100,
    'INVALID_CAPABILITIES',
    'Expose at most 100 game-defined commands.'
  );
  const names = new Set();
  for (const item of value) {
    check(
      isRecord(item) &&
        typeof item.name === 'string' &&
        /^[\w.:-]{1,100}$/.test(item.name) &&
        !names.has(item.name),
      'INVALID_CAPABILITIES',
      'Each capability needs a unique name.'
    );
    names.add(item.name);
    check(
      item.inputSchema === undefined || isRecord(item.inputSchema),
      'INVALID_CAPABILITIES',
      'inputSchema must be an object.'
    );
    check(
      item.scopes === undefined ||
        (Array.isArray(item.scopes) &&
          item.scopes.every(
            (scope) => typeof scope === 'string' && scope.length <= 100
          )),
      'INVALID_CAPABILITIES',
      'scopes must contain game-defined version names.'
    );
  }
  check(
    new TextEncoder().encode(JSON.stringify(value)).byteLength <= 48000,
    'CAPABILITIES_TOO_LARGE',
    'Keep capability descriptions below 48 KB.'
  );
}

export function validateTelemetrySequence(sequence) {
  check(
    Number.isSafeInteger(sequence) && sequence >= 0,
    'INVALID_TELEMETRY_SEQUENCE',
    'telemetrySeq must be a nonnegative safe integer.'
  );
}

export function validateTelemetry(input) {
  validateTelemetrySequence(input.telemetrySeq ?? 0);
  if (input.timings !== undefined) {
    check(
      Array.isArray(input.timings) && input.timings.length <= 30,
      'INVALID_TIMINGS',
      'Provide at most 30 browser-local timing spans.'
    );
    validateSummary(input.timings, 'timing spans');
  }
  if (input.versions !== undefined) {
    check(
      isRecord(input.versions) &&
        Object.entries(input.versions).length <= 100 &&
        Object.values(input.versions).every(
          (value) =>
            typeof value === 'string' ||
            (typeof value === 'number' && Number.isFinite(value))
        ),
      'INVALID_VERSIONS',
      'versions() must map game-defined scopes to string or finite number tokens.'
    );
    validateSummary(input.versions, 'version tokens');
  }
  if (input.summary !== undefined) validateSummary(input.summary);
}
