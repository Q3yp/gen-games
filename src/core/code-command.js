import { requireValue as check } from './errors.js';
import { validateEnvelope, validateSchema, isRecord } from './validate.js';
import { validateDirectorToken } from './director.js';

/** Small agent-facing receipts. Full command inputs stay in durable storage. */
export function commandSummary(command) {
  if (!command) return null;
  const {
    id,
    name,
    status,
    runEpoch,
    release,
    expectedVersions,
    causeEventId,
    applicationId,
    errorCode,
    queuedAtMs,
    completedAt,
    queueToCommitMs
  } = command;
  const summary = {
    id,
    name,
    status,
    runEpoch,
    release,
    expectedVersions,
    causeEventId,
    applicationId,
    errorCode,
    queuedAtMs,
    completedAt,
    queueToCommitMs
  };
  if (command.error) summary.error = String(command.error).slice(0, 500);
  if (command.result !== undefined) {
    const text = JSON.stringify(command.result);
    summary.result =
      text.length <= 1200
        ? command.result
        : {
            truncated: true,
            inspectCommandId: id,
            bytes: Buffer.byteLength(text)
          };
  }
  return summary;
}

export function commandList(runtime, id) {
  const commands = runtime.commands || [];
  if (id)
    return commands.filter((command) => command.id === id).map(commandSummary);
  // Active queue and a few most recent receipts, not the entire saved history.
  return [
    ...commands.filter((command) => command.status === 'pending'),
    ...commands.filter((command) => command.status !== 'pending').slice(-5)
  ].map(commandSummary);
}

/** Fill omitted guards only from this turn's delivered observation. */
function inheritTurnGuards(args, turn, capability) {
  const snapshot = turn.guardSnapshot;
  const missing = (field) =>
    check(
      false,
      'DIRECTOR_SNAPSHOT_MISSING',
      `Delivered turn has no ${field}; provide an explicit observed guard or start a new turn.`
    );
  const expectedRelease =
    args.expectedRelease === undefined
      ? snapshot?.release
      : args.expectedRelease;
  const expectedRunEpoch =
    args.expectedRunEpoch === undefined
      ? snapshot?.runEpoch
      : args.expectedRunEpoch;
  if (expectedRelease === undefined) missing('release');
  if (expectedRunEpoch === undefined) missing('run epoch');
  check(
    args.expectedVersions === undefined || isRecord(args.expectedVersions),
    'INVALID_VERSIONS',
    'expectedVersions must be a scope-to-version object.'
  );
  const expectedVersions = { ...args.expectedVersions };
  for (const scope of capability?.scopes || []) {
    if (Object.hasOwn(expectedVersions, scope)) continue;
    if (!Object.hasOwn(snapshot?.versions || {}, scope))
      missing(`scope ${scope}`);
    expectedVersions[scope] = snapshot.versions[scope];
  }
  return { ...args, expectedRelease, expectedRunEpoch, expectedVersions };
}

/** Fence and durably queue a game-defined command; browser application follows. */
export function queueCommand(host, args) {
  validateEnvelope(args);
  const fingerprint = JSON.stringify(args);
  const session = host.session(args.sessionId);
  const request = host.engine.store.request(session.id, args.requestId);
  if (request) {
    check(
      request.fingerprint === fingerprint,
      'IDEMPOTENCY_CONFLICT',
      'Request ID was already used for different arguments.'
    );
    const current = session.runtime.commands?.find(
      (command) => command.id === args.requestId
    );
    return current
      ? {
          text: `${current.status.toUpperCase()} ${current.id}`,
          data: commandSummary(current)
        }
      : { ...request.result, data: commandSummary(request.result.data) };
  }
  const capability = session.runtime.capabilities?.find(
    (item) => item.name === args.name
  );
  if (args.directorToken) {
    const turn = validateDirectorToken(
      host.engine,
      session.id,
      args.directorToken
    );
    args = inheritTurnGuards(args, turn, capability);
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
  if (args.causeEventId !== undefined)
    check(
      typeof args.causeEventId === 'string' &&
        /^[\w.:-]{1,160}$/.test(args.causeEventId),
      'INVALID_CAUSE_EVENT',
      'causeEventId must be a stable semantic event ID from observe.'
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
    return {
      text: `${old.status.toUpperCase()} ${old.id}`,
      data: commandSummary(old)
    };
  }
  check(
    typeof args.name === 'string' && args.name.length <= 100,
    'INVALID_COMMAND',
    'Provide a command name implemented by the game.'
  );
  host.summary(args.args || {});
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
  host.atomic(() => {
    host.engine.store.save(session);
    host.engine.store.remember(session.id, args.requestId, fingerprint, result);
    host.event(
      session,
      'runtime.command',
      `Command ${args.name} queued; not yet applied.`,
      {
        ...commandSummary(command),
        commandDetailRequired: true,
        commandId: command.id
      }
    );
  });
  return { ...result, data: commandSummary(command) };
}
