/** Reliable semantic event queue, emission snapshots, and acknowledgments. */
import { notify, clone } from './shared.js';
import { jsonSnapshot, validateSemanticEvent } from './code-contract.js';
import {
  run,
  clientId,
  post,
  projection,
  runtimeError,
  measure,
  fault
} from './code-runtime.js';
function scheduleEvents(current, delay = 0) {
  if (
    run !== current ||
    current.eventTimer ||
    current.eventWriting ||
    !current.events.length
  )
    return;
  current.eventTimer = setTimeout(() => {
    current.eventTimer = null;
    void flushEvents(current);
  }, delay);
}
async function flushEvents(current) {
  if (
    run !== current ||
    current.eventWriting ||
    !current.instance ||
    !current.events.length ||
    current.swapping ||
    current.commandBusy ||
    current.pendingResult
  )
    return;
  current.eventWriting = true;
  const events = current.events.slice(0, 30);
  try {
    const response = await post(current.id, {
      op: 'events',
      clientId,
      runEpoch: current.epoch,
      release: current.release.release,
      events: events.map(({ started, observed, ...event }) => event),
      ...(events.at(-1).observed || projection(current, current.instance))
    });
    const accepted = new Set(response.acceptedEventIds || []);
    for (const event of events)
      if (accepted.has(event.id)) measure('event-ack', event.id, event.started);
    current.events = current.events.filter((event) => !accepted.has(event.id));
    if (events.some((event) => !accepted.has(event.id)))
      throw runtimeError(
        'EVENT_ACK_MISSING',
        'The server did not acknowledge every semantic event.'
      );
    current.eventError = false;
  } catch (error) {
    if (run !== current) return;
    if (!current.eventError)
      notify(`Game events are not syncing: ${error.message}`, false, true);
    current.eventError = true;
  } finally {
    current.eventWriting = false;
    scheduleEvents(current, current.eventError ? 1000 : 0);
  }
}
function emitEvent(current, candidate, pendingEvents, type, text, data = {}) {
  const queue =
    current.instance === candidate
      ? current.commandEvents || current.events
      : pendingEvents;
  let event;
  try {
    if (queue.length >= (current.commandEvents === queue ? 30 : 1000))
      throw runtimeError(
        'EVENT_QUEUE_FULL',
        'Semantic event queue is full; commands may emit at most 30 events and offline queues at most 1000.'
      );
    const observed = candidate ? projection(current, candidate) : null;
    event = {
      type: String(type),
      text: String(text || ''),
      data: jsonSnapshot(
        {
          ...clone(data),
          observation: observed
            ? {
                versions: observed.versions,
                runEpoch: current.epoch,
                release: current.release.release
              }
            : null
        },
        'host.emit data'
      ),
      observed
    };
    validateSemanticEvent(event);
  } catch (error) {
    const rejected = runtimeError(
      error.code || 'INVALID_EVENT',
      `host.emit: ${error.code || 'INVALID_EVENT'}: ${error.message} Event was not queued; fix the game and publish a corrected release.`
    );
    if (current.instance === candidate) {
      // A command must still durably acknowledge its save and earlier valid
      // events. It stays frozen while pending, then faults after that receipt.
      if (current.commandEvents) current.commandFault = rejected;
      else fault(current, rejected);
    }
    throw rejected;
  }
  const id = crypto.randomUUID();
  if (current.instance === candidate && !current.commandEvents) {
    current.causeStarts.set(
      id,
      current.inputDispatch
        ? {
            started: current.inputDispatch.started,
            startKind: 'dom-input'
          }
        : { started: performance.now(), startKind: 'semantic-emission' }
    );
    if (current.causeStarts.size > 500)
      current.causeStarts.delete(current.causeStarts.keys().next().value);
  }
  queue.push({ ...event, id, started: performance.now() });
  if (current.instance === candidate) {
    if (current.renderInputs.length < 100)
      current.renderInputs.push({ id, started: performance.now() });
    if (!current.commandEvents) scheduleEvents(current);
  }
  return id;
}
export { scheduleEvents, emitEvent };
