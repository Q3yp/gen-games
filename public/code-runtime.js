/** Shared live run, client lease, and durable runtime transport. */
import { request, notify, clone } from './shared.js';
import { reportUI } from './diagnostics.js';
let run = null;
function setRun(current) {
  run = current;
}
let clientId = crypto.randomUUID();
try {
  clientId = sessionStorage.getItem('gen-games.client') || clientId;
  sessionStorage.setItem('gen-games.client', clientId);
} catch {
  /* An ephemeral client still works without storage. */
}
// A refreshed tab keeps its lease; a duplicated tab must acquire a different one.
const probe = crypto.randomUUID();
const channel =
  typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('gen-games.clients')
    : null;
channel?.addEventListener('message', ({ data }) => {
  if (data?.clientId !== clientId) return;
  if (data.type === 'probe' && data.probe !== probe)
    channel.postMessage({ type: 'claimed', clientId, probe: data.probe });
  if (data.type === 'claimed' && data.probe === probe) {
    clientId = crypto.randomUUID();
    try {
      sessionStorage.setItem('gen-games.client', clientId);
    } catch {
      /* Storage is optional. */
    }
  }
});
channel?.postMessage({ type: 'probe', clientId, probe });
const identityReady = new Promise((resolve) =>
  setTimeout(resolve, channel ? 80 : 0)
);
const post = (id, body, keepalive = false) =>
  request(`/api/sessions/${encodeURIComponent(id)}/runtime`, {
    method: 'POST',
    body: JSON.stringify(body),
    keepalive,
    signal: AbortSignal.timeout(15000)
  });
function fault(current, error) {
  if (run !== current) return;
  current.paused = true;
  reportUI(
    'ui.failed',
    current.release.entry,
    error,
    'Fix the game module and publish or reload. The last saved run remains available.'
  );
  notify(
    `Game paused: ${error.message}. Open Menu to reload the game view.`,
    false,
    true
  );
}
function projection(current, instance) {
  return {
    summary: clone(instance.inspect?.() ?? {}),
    ...(typeof instance.capabilities === 'function'
      ? { capabilities: clone(instance.capabilities()) }
      : {}),
    telemetrySeq: ++current.telemetrySeq,
    timings: clone(current.timings || []),
    versions: clone(instance.versions?.() ?? {})
  };
}
function runtimeError(code, message) {
  return Object.assign(new Error(message), { code });
}
function measure(name, id, start, detail = {}) {
  const end = performance.now();
  performance.measure(`gen-games.${name}`, {
    start,
    end,
    detail: { correlationId: id, ...detail }
  });
  if (run) {
    run.timings.push({
      name,
      durationMs: Math.round((end - start) * 100) / 100,
      correlationId: id,
      clock: 'browser.performance.now',
      origin: {
        'input-render': 'local-input-or-semantic-emission',
        'event-ack': 'semantic-emission',
        'command-apply': 'handler-invocation',
        'command-ack': 'browser-command-start',
        'input-to-command-render': detail.startKind
      }[name],
      endpoint: {
        'input-render': 'next-normal-render',
        'event-ack': 'durable-event-ack',
        'command-apply': 'synchronous-handler-return',
        'command-ack': 'durable-command-ack'
      }[name],
      runEpoch: run.epoch,
      release: run.release.release,
      ...detail
    });
    while (
      run.timings.length > 30 ||
      JSON.stringify(run.timings).length > 10000
    )
      run.timings.shift();
  }
  // Keep browser-local diagnostics bounded, even during long sessions.
  const entries = performance.getEntriesByName(`gen-games.${name}`);
  if (entries.length > 200) performance.clearMeasures(`gen-games.${name}`);
}
async function checkpoint(current, keepalive = false) {
  if (
    run !== current ||
    !current.instance ||
    current.writing ||
    current.swapping ||
    current.paused ||
    current.commandBusy ||
    current.pendingResult
  )
    return;
  current.writing = true;
  try {
    const save = clone(current.instance.serialize());
    const observed = projection(current, current.instance);
    current.pendingWrite = post(
      current.id,
      {
        op: 'checkpoint',
        clientId,
        runEpoch: current.epoch,
        release: current.release.release,
        checkpointSeq: ++current.seq,
        save,
        ...observed
      },
      keepalive
    );
    const response = await current.pendingWrite;
    if (run !== current) return;
    current.lastSave = save;
    current.saveError = false;
    current.seq = Math.max(current.seq, response.checkpointSeq || 0);
  } catch (error) {
    if (run !== current) return;
    // An uncertain write is not replayed; the next checkpoint has a new sequence.
    if (!current.saveError)
      notify(`Progress is not syncing: ${error.message}`, false, true);
    current.saveError = true;
    if (
      [403, 409].includes(error.status) ||
      ['RUNTIME_LEASE_LOST', 'STALE_RUN', 'STALE_RELEASE'].includes(error.code)
    )
      current.paused = true;
    if (['RUNTIME_LEASE_LOST', 'STALE_RUN'].includes(error.code))
      current.reconnectRequired = true;
  } finally {
    current.writing = false;
    current.pendingWrite = null;
  }
}
export {
  run,
  setRun,
  clientId,
  identityReady,
  post,
  fault,
  projection,
  runtimeError,
  measure,
  checkpoint
};
