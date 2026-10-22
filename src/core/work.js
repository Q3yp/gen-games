import { randomUUID } from 'node:crypto';
import { requireValue as check } from './errors.js';
import { isRecord } from './validate.js';

// Tracks externally executed work; does not launch processes or assume a provider.
export function manageWork(engine, args) {
  const { store } = engine,
    session = engine.codeRuntime.session(args.sessionId),
    r = session.runtime;
  const visible = ({ token, ...job }) => {
    const command = r.commands?.find((c) => c.id === job.commandId);
    return {
      ...job,
      ...(command
        ? {
            commandStatus: command.status,
            result: command.result,
            error: command.error
          }
        : {})
    };
  };
  if (args.op === 'list')
    return {
      text: 'External work; queued is not applied. No worker is launched by this tool.',
      data: {
        jobs: store
          .jobs(session.id)
          .filter((j) => j.kind === 'external')
          .map(visible)
      }
    };
  if (args.op === 'start') {
    check(
      args.expectedRunEpoch === r.runEpoch &&
        args.expectedRelease === r.activeRelease,
      'STALE_WORK_CONTEXT',
      'Start with the observed active release and run epoch.'
    );
    check(
      isRecord(args.expectedVersions),
      'INVALID_VERSIONS',
      'Declare expectedVersions, including an empty object if there are no scope guards.'
    );
    check(
      Object.keys(args.expectedVersions).length <= 100,
      'INVALID_VERSIONS',
      'Guard at most 100 scopes.'
    );
    for (const [scope, version] of Object.entries(args.expectedVersions)) {
      check(
        typeof version === 'string' ||
          (typeof version === 'number' && Number.isFinite(version)),
        'INVALID_VERSIONS',
        'Scope versions must be strings or finite numbers.'
      );
      check(
        Object.hasOwn(r.versions || {}, scope) && r.versions[scope] === version,
        'STALE_VERSION',
        `Scope ${scope} changed; inspect versions again.`
      );
    }
    check(
      typeof args.name === 'string' &&
        args.name.length > 0 &&
        args.name.length <= 100,
      'INVALID_COMMAND',
      'Name the game command that will consume the external result.'
    );
    const job = {
      kind: 'external',
      id: randomUUID(),
      token: randomUUID(),
      sessionId: session.id,
      status: 'running',
      label: String(args.label || args.name).slice(0, 160),
      name: args.name,
      expectedRunEpoch: r.runEpoch,
      expectedRelease: r.activeRelease,
      expectedVersions: structuredClone(args.expectedVersions),
      createdAt: new Date().toISOString()
    };
    store.saveJob(job);
    return {
      text: `WORK ${job.id} running externally. Complete with token and command args; no provider has been started.`,
      data: job
    };
  }
  const job = store.job(args.id);
  check(
    job && job.kind === 'external' && job.sessionId === session.id,
    'WORK_NOT_FOUND',
    'No external job with this ID in the session.'
  );
  check(
    args.token === job.token,
    'WORK_TOKEN_MISMATCH',
    'Use the token returned by work start.'
  );
  if (args.op === 'cancel') {
    check(
      job.status === 'running',
      'WORK_NOT_RUNNING',
      'Only unqueued running work can be canceled.'
    );
    job.status = 'canceled';
    job.completedAt = new Date().toISOString();
    store.saveJob(job);
    return {
      text: `WORK ${job.id} canceled; late completion will be rejected.`,
      data: visible(job)
    };
  }
  check(
    args.op === 'complete',
    'INVALID_WORK_OPERATION',
    'Use start, list, complete, or cancel.'
  );
  check(
    ['running', 'queued'].includes(job.status),
    'WORK_NOT_RUNNING',
    `Work is ${job.status}; late completion rejected.`
  );
  check(
    isRecord(args.args),
    'INVALID_COMMAND_ARGS',
    'Complete with game command args containing the result.'
  );
  const commandArgs = {
    sessionId: session.id,
    requestId: `work:${job.id}`,
    name: job.name,
    args: args.args,
    expectedRelease: job.expectedRelease,
    expectedRunEpoch: job.expectedRunEpoch,
    expectedVersions: job.expectedVersions
  };
  const result = engine.codeRuntime.command(commandArgs);
  job.status = 'queued';
  job.commandId = commandArgs.requestId;
  job.completedAt = new Date().toISOString();
  store.saveJob(job);
  return {
    text: `WORK ${job.id}: completion command ${result.data.status}; observe its browser acknowledgement.`,
    data: { ...visible(job), command: result.data }
  };
}
