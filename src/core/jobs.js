import { randomUUID } from 'node:crypto';
import { requireValue as check } from './errors.js';
import { applyOperations } from './validate.js';

export function manageJob(engine, args) {
  const { store } = engine, session = engine.session(args.sessionId);
  if (args.op === 'list') return { jobs: store.jobs(session.id).map(({ token, ...job }) => job), revision: session.revision };
  if (args.op === 'start') {
    engine.revision(session, args.expectedRevision);
    const job = { id: randomUUID(), token: randomUUID(), sessionId: session.id, label: String(args.label || 'Agent turn').slice(0, 160), status: 'running', revision: session.revision, sceneEpoch: session.sceneEpoch, createdAt: new Date().toISOString() };
    store.transaction(() => { store.saveJob(job); const event = store.append(session, { type: 'job.started', text: job.label, data: { jobId: job.id } }); engine.emit('commit', { sessionId: session.id, revision: session.revision, patches: [], events: [event], cursor: event.seq }); });
    return job;
  }
  const job = store.job(args.id); check(job && job.sessionId === session.id, 'JOB_NOT_FOUND', `Job ${args.id} not found in this session.`);
  if (args.op === 'cancel') {
    check(job.status === 'running', 'JOB_NOT_RUNNING', `Job is ${job.status}; no changes.`);
    let event;
    store.transaction(() => { job.status = 'canceled'; job.completedAt = new Date().toISOString(); store.saveJob(job); event = store.append(session, { type: 'job.canceled', text: `${job.label} canceled.`, data: { jobId: job.id } }); });
    engine.emit('commit', { sessionId: session.id, revision: session.revision, patches: [], events: [event], cursor: event.seq }); return { id: job.id, status: job.status };
  }
  check(args.op === 'commit', 'INVALID_JOB_OPERATION', 'Use start, list, cancel, or commit.');
  return engine.transact(args, ctx => {
    const current = store.job(job.id);
    check(current.status === 'running', 'JOB_NOT_RUNNING', `Job is ${current.status}; late completion rejected. No changes.`, 'Start a new job from current context.');
    check(typeof args.token === 'string' && args.token === current.token, 'JOB_TOKEN_MISMATCH', 'The generation token does not match this job.');
    check(ctx.session.sceneEpoch === current.sceneEpoch && ctx.session.revision === current.revision, 'STALE_JOB', 'The player or world changed since this job started. No changes.', 'Read new events and start a fresh job; do not replay old narrative.');
    applyOperations(ctx.state, args.operations);
    current.status = 'committed'; current.completedAt = new Date().toISOString(); store.saveJob(current);
    ctx.emit('job.committed', `${current.label} applied.`, { jobId: current.id });
    return { id: current.id, status: current.status };
  });
}
