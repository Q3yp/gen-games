import { requireValue as check } from './errors.js';
import { isRecord } from './validate.js';

/** Bounded semantic delivery and browser-owned inspection telemetry. */
export function validateSummary(value) {
  check(
    Buffer.byteLength(JSON.stringify(value)) <= 12000,
    'SUMMARY_TOO_LARGE',
    'Keep inspect summaries below 12 KB; return focused gameplay facts.'
  );
  return value;
}

export function appendSemanticEvents(host, session, events) {
  check(
    Array.isArray(events) && events.length <= 30,
    'EVENT_LIMIT',
    'Batch at most 30 semantic events.'
  );
  const accepted = [];
  for (const item of events) {
    check(
      typeof item.type === 'string' &&
        item.type.length <= 100 &&
        !item.type.startsWith('runtime.') &&
        item.type !== 'state.changed',
      'INVALID_EVENT',
      'Use a game-specific semantic event type.'
    );
    check(
      typeof item.text === 'string' && item.text.length <= 2000,
      'INVALID_EVENT',
      'Use event text up to 2000 characters.'
    );
    validateSummary(item.data ?? {});
    let key, fingerprint;
    if (item.id !== undefined) {
      check(
        typeof item.id === 'string' && /^[\w.:-]{1,160}$/.test(item.id),
        'INVALID_EVENT_ID',
        'Semantic event id must be a short stable identifier.'
      );
      key = `event:${session.runtime.runEpoch}:${item.id}`;
      fingerprint = JSON.stringify(item);
      const existing = host.engine.store.request(session.id, key);
      if (existing) {
        check(
          existing.fingerprint === fingerprint,
          'IDEMPOTENCY_CONFLICT',
          'Event ID reused with different content.'
        );
        accepted.push(item.id);
        continue;
      }
    }
    const event = host.event(session, item.type, item.text, {
      ...item.data,
      eventId: item.id,
      source: 'browser',
      untrusted: true
    });
    if (key) {
      host.engine.store.remember(session.id, key, fingerprint, {
        cursor: event.seq
      });
      accepted.push(item.id);
    }
  }
  return accepted;
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
    Buffer.byteLength(JSON.stringify(value)) <= 48000,
    'CAPABILITIES_TOO_LARGE',
    'Keep capability descriptions below 48 KB.'
  );
}

export function recordTelemetry(runtime, input) {
  if (input.summary === undefined && input.versions === undefined) return;
  const sequence = input.telemetrySeq ?? 0;
  check(
    Number.isSafeInteger(sequence) && sequence >= 0,
    'INVALID_TELEMETRY_SEQUENCE',
    'telemetrySeq must be a nonnegative safe integer.'
  );
  const previous = runtime.projection;
  if (
    previous?.runEpoch === runtime.runEpoch &&
    previous.release === input.release &&
    sequence < previous.telemetrySeq
  )
    return;
  if (input.timings !== undefined) {
    check(
      Array.isArray(input.timings) && input.timings.length <= 30,
      'INVALID_TIMINGS',
      'Provide at most 30 browser-local timing spans.'
    );
    runtime.timings = {
      observedAt: new Date().toISOString(),
      runEpoch: runtime.runEpoch,
      release: input.release,
      spans: validateSummary(input.timings)
    };
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
      'versions must map game-defined scopes to string or finite number tokens.'
    );
    runtime.versions = validateSummary(input.versions);
  }
  if (input.summary !== undefined)
    runtime.summary = validateSummary(input.summary);
  runtime.projection = {
    summary: runtime.summary,
    versions: runtime.versions || {},
    observedAt: new Date().toISOString(),
    runEpoch: runtime.runEpoch,
    release: input.release,
    telemetrySeq: sequence
  };
}
