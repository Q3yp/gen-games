import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { validateDirectorToken } from './director.js';
import { requireValue as check } from './errors.js';
import {
  validateJSONState,
  validateEnvelope,
  validateSchema,
  isRecord
} from './validate.js';
import { snapshotRelease } from './source-release.js';

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
        { ...command, commandId: command.id }
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
    check(
      Buffer.byteLength(JSON.stringify(value)) <= 12000,
      'SUMMARY_TOO_LARGE',
      'Keep inspect summaries below 12 KB; return focused gameplay facts.'
    );
    return value;
  }

  events(session, events) {
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
      this.summary(item.data ?? {});
      let key, fingerprint;
      if (item.id !== undefined) {
        check(
          typeof item.id === 'string' && /^[\w.:-]{1,160}$/.test(item.id),
          'INVALID_EVENT_ID',
          'Semantic event id must be a short stable identifier.'
        );
        key = `event:${session.runtime.runEpoch}:${item.id}`;
        fingerprint = JSON.stringify(item);
        const existing = this.engine.store.request(session.id, key);
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
      const event = this.event(session, item.type, item.text, {
        ...item.data,
        eventId: item.id,
        source: 'browser',
        untrusted: true
      });
      if (key) {
        this.engine.store.remember(session.id, key, fingerprint, {
          cursor: event.seq
        });
        accepted.push(item.id);
      }
    }
    return accepted;
  }

  capabilities(value) {
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

  telemetry(runtime, input) {
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
      runtime.versions = this.summary(input.versions);
    }
    if (input.summary !== undefined)
      runtime.summary = this.summary(input.summary);
    runtime.projection = {
      summary: runtime.summary,
      versions: runtime.versions || {},
      observedAt: new Date().toISOString(),
      runEpoch: runtime.runEpoch,
      release: input.release,
      telemetrySeq: sequence
    };
  }

  async asset(args) {
    validateEnvelope(args);
    const session = this.session(args.sessionId);
    const key = `asset:${args.requestId}`;
    const fingerprint = JSON.stringify(args);
    const previous = this.engine.store.request(session.id, key);
    if (previous) {
      check(
        previous.fingerprint === fingerprint,
        'IDEMPOTENCY_CONFLICT',
        'Asset request ID reused for different arguments.'
      );
      return previous.result;
    }
    check(
      typeof args.path === 'string' &&
        !args.path.split(/[\\/]/).some((part) => part.startsWith('.')),
      'INVALID_ASSET_PATH',
      'Use a relative asset path inside this game directory.'
    );
    const base = await realpath(resolve(this.directory, session.gameId));
    const source = await realpath(resolve(base, args.path));
    check(
      source.startsWith(base + sep),
      'INVALID_ASSET_PATH',
      'Asset must remain inside this game directory.'
    );
    const extension = extname(source).toLowerCase();
    check(
      [
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.webp',
        '.avif',
        '.wav',
        '.mp3'
      ].includes(extension),
      'UNSUPPORTED_ASSET',
      'Use a raster image or audio file. Executable assets require source publication.'
    );
    const bytes = await readFile(source);
    check(
      bytes.length <= 20_000_000,
      'ASSET_TOO_LARGE',
      'Assets must be below 20 MB.'
    );
    const hash = createHash('sha256').update(bytes).digest('hex');
    const directory = resolve(dirname(this.output), 'assets');
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, `${hash}${extension}`), bytes, {
      flag: 'wx'
    }).catch((error) => {
      if (error.code !== 'EEXIST') throw error;
    });
    const result = {
      text: `ASSET ${hash}: ready for a game-defined binding command; no source publication required.`,
      data: { hash, url: `/assets/${hash}${extension}`, bytes: bytes.length }
    };
    // Concurrent identical imports are harmless and retain a single durable request.
    this.engine.store.transaction(() => {
      const replay = this.engine.store.request(session.id, key);
      if (replay)
        check(
          replay.fingerprint === fingerprint,
          'IDEMPOTENCY_CONFLICT',
          'Asset request ID reused for different arguments.'
        );
      else this.engine.store.remember(session.id, key, fingerprint, result);
    });
    return result;
  }

  async publish(args) {
    validateEnvelope(args);
    let session = this.session(args.sessionId);
    const existing = this.engine.store.request(session.id, args.requestId);
    if (existing) {
      check(
        existing.fingerprint === JSON.stringify(args),
        'IDEMPOTENCY_CONFLICT',
        'Request ID was used for different publish arguments.'
      );
      return existing.result;
    }
    check(
      args.expectedRelease === session.runtime.release,
      'STALE_RELEASE',
      'Read inspect runtime, then publish against the observed release.'
    );
    const release = await snapshotRelease(
      this.directory,
      this.output,
      session.gameId
    );
    session = this.session(args.sessionId);
    const replay = this.engine.store.request(session.id, args.requestId);
    if (replay) {
      check(
        replay.fingerprint === JSON.stringify(args),
        'IDEMPOTENCY_CONFLICT',
        'Request ID was used for different publish arguments.'
      );
      return replay.result;
    }
    check(
      args.expectedRelease === session.runtime.release,
      'STALE_RELEASE',
      'Another publication won while files were loading. Inspect before publishing again.'
    );
    const previousRelease = session.runtime.release;
    Object.assign(session.runtime, {
      release: release.release,
      entry: release.entry,
      saveVersion: release.saveVersion
    });
    session.revision++;
    const result = {
      text: `PENDING ${release.release}: source published; waiting for browser activation.`,
      data: {
        release: release.release,
        previousRelease,
        entry: release.entry,
        status: 'pending'
      }
    };
    this.atomic(() => {
      this.engine.store.save(session);
      this.engine.store.remember(
        session.id,
        args.requestId,
        JSON.stringify(args),
        result
      );
      this.event(
        session,
        'runtime.release',
        `Release ${release.release} ready; browser activation pending.`,
        {
          release: release.release,
          entry: release.entry,
          saveVersion: release.saveVersion,
          previousRelease
        }
      );
    });
    Object.assign(this.engine.game(session.gameId), {
      pack: release.pack,
      release
    });
    return result;
  }

  command(args) {
    validateEnvelope(args);
    const session = this.session(args.sessionId);
    const request = this.engine.store.request(session.id, args.requestId);
    if (request) {
      check(
        request.fingerprint === JSON.stringify(args),
        'IDEMPOTENCY_CONFLICT',
        'Request ID was already used for different arguments.'
      );
      const current = session.runtime.commands?.find(
        (command) => command.id === args.requestId
      );
      return current
        ? {
            text: `${current.status.toUpperCase()} ${current.id}`,
            data: current
          }
        : request.result;
    }
    check(
      args.expectedRelease === session.runtime.activeRelease,
      'STALE_RELEASE',
      'Command must target the active release.'
    );
    if (args.expectedRunEpoch !== undefined)
      check(
        args.expectedRunEpoch === session.runtime.runEpoch,
        'STALE_RUN',
        'Command targets a different browser run. Observe and reassess.'
      );
    if (args.directorToken)
      validateDirectorToken(this.engine, session.id, args.directorToken);
    if (args.causeEventId !== undefined)
      check(
        typeof args.causeEventId === 'string' &&
          /^[\w.:-]{1,160}$/.test(args.causeEventId),
        'INVALID_CAUSE_EVENT',
        'causeEventId must be a stable semantic event ID from observe.'
      );
    const capability = session.runtime.capabilities?.find(
      (item) => item.name === args.name
    );
    if (session.runtime.capabilities !== undefined) {
      check(
        Number.isInteger(args.expectedRunEpoch),
        'RUN_EPOCH_REQUIRED',
        'Registered commands require expectedRunEpoch from current projection.'
      );
      check(
        capability,
        'UNKNOWN_COMMAND',
        'Command is not registered by the active game. Use discover.'
      );
      validateSchema(args.args || {}, capability.inputSchema);
      for (const scope of capability.scopes || [])
        check(
          Object.hasOwn(args.expectedVersions || {}, scope),
          'SCOPE_VERSION_REQUIRED',
          `Command requires expectedVersions.${scope}. Inspect projection first.`
        );
    }
    if (args.expectedVersions !== undefined) {
      check(
        isRecord(args.expectedVersions),
        'INVALID_VERSIONS',
        'expectedVersions must be a scope-to-version object.'
      );
      for (const [scope, expected] of Object.entries(args.expectedVersions))
        check(
          session.runtime.versions?.[scope] === expected,
          'STALE_SCOPE',
          `Scope ${scope} changed; inspect projection and reassess.`,
          undefined,
          { scope, expected, current: session.runtime.versions?.[scope] }
        );
    }
    const old = session.runtime.commands?.find(
      (command) => command.id === args.requestId
    );
    if (old) {
      check(
        old.name === args.name &&
          JSON.stringify(old.args) === JSON.stringify(args.args || {}),
        'IDEMPOTENCY_CONFLICT',
        'Command ID was used with different arguments.'
      );
      return { text: `${old.status.toUpperCase()} ${old.id}`, data: old };
    }
    check(
      typeof args.name === 'string' && args.name.length <= 100,
      'INVALID_COMMAND',
      'Provide a command name implemented by the game.'
    );
    this.summary(args.args || {});
    const command = {
      id: args.requestId,
      name: args.name,
      args: args.args || {},
      status: 'pending',
      queuedAtMs: Date.now(),
      expectedVersions: args.expectedVersions || {},
      directorToken: args.directorToken,
      causeEventId: args.causeEventId,
      runEpoch: session.runtime.runEpoch,
      release: session.runtime.activeRelease
    };
    const retained = (session.runtime.commands || []).filter(
      (item) => item.status === 'pending'
    );
    check(
      retained.length < 30,
      'COMMAND_QUEUE_FULL',
      'The browser has 30 pending commands. Wait for acknowledgement before queuing more.'
    );
    const recent = (session.runtime.commands || [])
      .filter((item) => item.status !== 'pending')
      .slice(-(29 - retained.length));
    session.runtime.commands = [
      ...retained,
      ...(retained.length === 29 ? [] : recent),
      command
    ];
    const result = {
      text: `PENDING ${command.id}: waiting for the playing browser.`,
      data: command
    };
    this.atomic(() => {
      this.engine.store.save(session);
      this.engine.store.remember(
        session.id,
        args.requestId,
        JSON.stringify(args),
        result
      );
      this.event(
        session,
        'runtime.command',
        `Command ${args.name} queued; not yet applied.`,
        {
          ...command,
          commandId: command.id
        }
      );
    });
    return result;
  }
}
