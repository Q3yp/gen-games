import { commandSummary, queueCommand } from './code-command.js';
import { importAsset, publishSource } from './code-content.js';
import {
  appendSemanticEvents,
  validateSummary,
  validateCapabilities,
  recordTelemetry
} from './code-telemetry.js';
import { validateDirectorToken } from './director.js';
import { requireValue as check } from './errors.js';
import { validateJSONState } from './validate.js';

// Preserve the existing registry import while source handling lives separately.
export { snapshotRelease } from './source-release.js';

export class CodeRuntime {
  constructor(engine, directory, output) {
    this.engine = engine;
    this.directory = directory;
    this.output = output;
    this.leases = new Map();
  }

  event(session, type, text, data = {}) {
    const event = this.engine.store.append(session, { type, text, data });
    const message = {
      sessionId: session.id,
      revision: session.revision,
      patches: [],
      events: [event],
      cursor: event.seq
    };
    if (this.pending) this.pending.push(message);
    else this.engine.emit('commit', message);
    return event;
  }

  session(id) {
    const session = this.engine.session(id);
    check(
      session.runtime,
      'NOT_CODE_GAME',
      'This operation requires a code game.'
    );
    return session;
  }

  fence(session, input) {
    const lease = this.leases.get(session.id);
    check(
      lease && lease.clientId === input.clientId && lease.until > Date.now(),
      'RUNTIME_LEASE_LOST',
      'This browser no longer owns the live game. Reconnect before saving.'
    );
    check(
      input.runEpoch === session.runtime.runEpoch,
      'STALE_RUN',
      'The run changed; reconnect and load the current save.'
    );
    lease.until = Date.now() + 15000;
  }

  browser(id, input) {
    return this.atomic(() => this.browserOperation(id, input));
  }

  atomic(operation) {
    this.pending = [];
    try {
      const result = this.engine.store.transaction(operation);
      const messages = this.pending;
      this.pending = null;
      for (const message of messages) this.engine.emit('commit', message);
      return result;
    } catch (error) {
      this.pending = null;
      throw error;
    }
  }

  browserOperation(id, input) {
    const session = this.session(id);
    const runtime = session.runtime;
    const store = this.engine.store;

    if (input.op === 'connect') {
      check(
        typeof input.clientId === 'string' && input.clientId.length <= 120,
        'INVALID_CLIENT',
        'Provide a browser clientId.'
      );
      const old = this.leases.get(id);
      check(
        !old || old.until <= Date.now() || old.clientId === input.clientId,
        'RUNTIME_BUSY',
        'Another browser owns this game. Close it or wait 15 seconds.'
      );
      if (!old || old.clientId !== input.clientId || old.until <= Date.now()) {
        runtime.runEpoch++;
      }
      for (const command of runtime.commands || []) {
        if (
          command.status === 'pending' &&
          command.runEpoch !== runtime.runEpoch
        ) {
          command.status = 'canceled';
          command.error = 'Run ownership changed before acknowledgement.';
          store.updateRequestResult(id, command.id, {
            text: `CANCELED ${command.id}`,
            data: command
          });
        }
      }
      this.leases.set(id, {
        clientId: input.clientId,
        until: Date.now() + 15000
      });
      store.save(session);
      return { ok: true, session, cursor: store.head(id) };
    }

    this.fence(session, input);
    if (input.op === 'applied') {
      check(
        input.release === runtime.release,
        'STALE_RELEASE',
        'A newer release is pending; do not activate stale code.'
      );
      if (input.save !== undefined) {
        validateJSONState(input.save);
        session.state = input.save;
        runtime.saveRelease = input.release;
        runtime.saveEntry = runtime.entry;
      }
      if (input.capabilities !== undefined) {
        this.capabilities(input.capabilities);
        runtime.capabilities = input.capabilities;
      } else delete runtime.capabilities;
      runtime.activeRelease = input.release;
      runtime.activeEntry = runtime.entry;
      runtime.activeSaveVersion = runtime.saveVersion;
      runtime.activatedAt = new Date().toISOString();
      this.telemetry(runtime, input);
      for (const command of runtime.commands || []) {
        if (command.status === 'pending' && command.release !== input.release) {
          command.status = 'canceled';
          command.error = 'The active release changed before acknowledgement.';
          store.updateRequestResult(id, command.id, {
            text: `CANCELED ${command.id}`,
            data: command
          });
        }
      }
      store.save(session);
      const event = this.event(
        session,
        'runtime.activated',
        `Release ${input.release} is playing.`,
        { release: input.release, runEpoch: runtime.runEpoch }
      );
      return {
        ok: true,
        cursor: event.seq,
        checkpointSeq: runtime.checkpointSeq
      };
    }

    check(
      input.release === runtime.activeRelease,
      'STALE_RELEASE',
      'Save or event belongs to a different active release.'
    );
    if (input.op === 'read-command') {
      const command = runtime.commands?.find(
        (item) => item.id === input.commandId
      );
      check(
        command,
        'COMMAND_NOT_FOUND',
        'Command is no longer in the active queue.'
      );
      return { ok: true, command };
    }
    if (input.op === 'authorize') {
      const command = runtime.commands?.find(
        (item) => item.id === input.commandId
      );
      check(
        command?.status === 'pending',
        'COMMAND_NOT_PENDING',
        'Command is no longer pending.'
      );
      check(
        command.runEpoch === runtime.runEpoch &&
          command.release === runtime.activeRelease,
        'STALE_RUN',
        'Command belongs to an older run or release.'
      );
      if (command.directorToken)
        validateDirectorToken(this.engine, id, command.directorToken);
      return { ok: true, commandId: command.id };
    }
    if (input.op === 'checkpoint') {
      check(
        Number.isInteger(input.checkpointSeq) &&
          input.checkpointSeq > runtime.checkpointSeq,
        'STALE_CHECKPOINT',
        'checkpointSeq must increase; older saves cannot overwrite newer play.'
      );
      validateJSONState(input.save);
      session.state = input.save;
      runtime.checkpointSeq = input.checkpointSeq;
      runtime.saveRelease = input.release;
      runtime.saveEntry = runtime.activeEntry;
      this.telemetry(runtime, input);
      runtime.savedAt = new Date().toISOString();
      store.save(session);
    } else if (input.op === 'result') {
      const key = `application:${runtime.runEpoch}:${input.commandId}`;
      const existing = store.request(id, key);
      const fingerprint = JSON.stringify(input);
      if (existing) {
        check(
          existing.fingerprint === fingerprint,
          'IDEMPOTENCY_CONFLICT',
          'Application ID was already committed with different data.'
        );
        return { ...existing.result, replayed: true };
      }
      const command = runtime.commands?.find(
        (item) => item.id === input.commandId
      );
      check(
        command &&
          command.status === 'pending' &&
          command.runEpoch === runtime.runEpoch &&
          command.release === input.release,
        'COMMAND_NOT_PENDING',
        'Command is unknown or already acknowledged.'
      );
      check(
        input.applicationId === undefined || input.applicationId === command.id,
        'INVALID_APPLICATION_ID',
        'applicationId must equal commandId.'
      );
      check(
        runtime.capabilities === undefined || input.save !== undefined,
        'APPLICATION_SAVE_REQUIRED',
        'Registered commands commit their result and serialized save together.'
      );
      if (input.save !== undefined) {
        check(
          Number.isInteger(input.checkpointSeq) &&
            input.checkpointSeq > runtime.checkpointSeq,
          'STALE_CHECKPOINT',
          'Command save must follow the last durable checkpoint.'
        );
        validateJSONState(input.save);
        session.state = input.save;
        runtime.checkpointSeq = input.checkpointSeq;
        runtime.saveRelease = input.release;
        runtime.saveEntry = runtime.activeEntry;
        runtime.savedAt = new Date().toISOString();
      }
      this.telemetry(runtime, input);
      command.status = input.error ? 'failed' : 'applied';
      command.applicationId = input.applicationId || command.id;
      command.result = this.summary(input.result ?? null);
      command.error = input.error ? String(input.error).slice(0, 1000) : null;
      command.errorCode = input.errorCode || null;
      command.completedAt = new Date().toISOString();
      command.queueToCommitMs = Number.isFinite(command.queuedAtMs)
        ? Math.max(0, Date.now() - command.queuedAtMs)
        : null;
      store.updateRequestResult(id, command.id, {
        text: `${command.status.toUpperCase()} ${command.id}`,
        data: command
      });
      store.save(session);
      const acceptedEventIds = this.events(session, input.events || []);
      const event = this.event(
        session,
        'runtime.command.result',
        `${command.name}: ${command.status}`,
        { ...commandSummary(command), commandId: command.id }
      );
      const result = {
        ok: true,
        acceptedEventIds,
        applicationId: command.applicationId,
        checkpointSeq: runtime.checkpointSeq,
        cursor: event.seq,
        status: command.status
      };
      store.remember(id, key, fingerprint, result);
      return result;
    } else {
      check(
        input.op === 'events' || input.op === 'status',
        'INVALID_RUNTIME_OPERATION',
        'Use connect, checkpoint, events, applied, result, or status.'
      );
    }
    this.telemetry(runtime, input);
    const acceptedEventIds = this.events(session, input.events || []);
    store.save(session);
    return {
      ok: true,
      checkpointSeq: runtime.checkpointSeq,
      acceptedEventIds,
      cursor: store.head(id),
      runtime
    };
  }

  summary(value) {
    return validateSummary(value);
  }
  events(session, events) {
    return appendSemanticEvents(this, session, events);
  }
  capabilities(value) {
    return validateCapabilities(value);
  }
  telemetry(runtime, input) {
    return recordTelemetry(runtime, input);
  }
  asset(args) {
    return importAsset(this, args);
  }
  publish(args) {
    return publishSource(this, args);
  }
  command(args) {
    return queueCommand(this, args);
  }
}
