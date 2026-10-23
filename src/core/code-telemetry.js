import { requireValue as check } from './errors.js';
import {
  validateSemanticEvent,
  validateTelemetry,
  validateTelemetrySequence
} from '../../public/code-contract.js';
export {
  validateSummary,
  validateCapabilities
} from '../../public/code-contract.js';

/** Bounded semantic delivery and browser-owned inspection telemetry. */
export function appendSemanticEvents(host, session, events) {
  check(
    Array.isArray(events) && events.length <= 30,
    'EVENT_LIMIT',
    'Batch at most 30 semantic events.'
  );
  const accepted = [];
  for (const item of events) {
    validateSemanticEvent(item);
    let key, fingerprint;
    if (item.id !== undefined) {
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

export function recordTelemetry(runtime, input) {
  if (input.summary === undefined && input.versions === undefined) return;
  const sequence = input.telemetrySeq ?? 0;
  validateTelemetrySequence(sequence);
  const previous = runtime.projection;
  if (
    previous?.runEpoch === runtime.runEpoch &&
    previous.release === input.release &&
    sequence < previous.telemetrySeq
  )
    return;
  validateTelemetry(input);
  if (input.timings !== undefined) {
    runtime.timings = {
      observedAt: new Date().toISOString(),
      runEpoch: runtime.runEpoch,
      release: input.release,
      spans: input.timings
    };
  }
  if (input.versions !== undefined) runtime.versions = input.versions;
  if (input.summary !== undefined) runtime.summary = input.summary;
  runtime.projection = {
    summary: runtime.summary,
    versions: runtime.versions || {},
    observedAt: new Date().toISOString(),
    runEpoch: runtime.runEpoch,
    release: input.release,
    telemetrySeq: sequence
  };
}
