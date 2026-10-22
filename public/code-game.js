/** Trusted code games own their world. This host only handles frames and durable envelopes. */
import { $, state, request, notify, clone } from './shared.js';
import { reportUI } from './diagnostics.js';
let run = null;
let generation = 0;
let clientId = crypto.randomUUID();
try { clientId = sessionStorage.getItem('gen-games.client') || clientId; sessionStorage.setItem('gen-games.client', clientId); } catch { /* An ephemeral client still works without storage. */ }
// A refreshed tab keeps its lease; a duplicated tab must acquire a different one.
const probe = crypto.randomUUID();
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('gen-games.clients') : null;
channel?.addEventListener('message', ({ data }) => {
  if (data?.clientId !== clientId) return;
  if (data.type === 'probe' && data.probe !== probe) channel.postMessage({ type: 'claimed', clientId, probe: data.probe });
  if (data.type === 'claimed' && data.probe === probe) {
    clientId = crypto.randomUUID();
    try { sessionStorage.setItem('gen-games.client', clientId); } catch { /* Storage is optional. */ }
  }
});
channel?.postMessage({ type: 'probe', clientId, probe });
const identityReady = new Promise(resolve => setTimeout(resolve, channel ? 80 : 0));
const isCodeGame = () => state.session?.runtime && state.games.some(pack => pack.id === state.session.gameId && pack.runtime === 'code');
const post = (id, body, keepalive = false) => request(`/api/sessions/${encodeURIComponent(id)}/runtime`, { method: 'POST', body: JSON.stringify(body), keepalive });
const releaseInfo = session => ({ ...session.runtime });
function releaseURL(raw) {
  const url = new URL(raw, location.origin);
  if (url.origin !== location.origin || !/^\/(releases|games)\//.test(url.pathname) || !url.pathname.endsWith('.js')) throw new Error('A code game entry must be a local game module.');
  return url;
}
function presentation(on) {
  document.body.classList.toggle('code-game', on);
  document.body.classList.toggle('custom-owned', on);
  document.body.classList.toggle('custom-immersive', on);
  $('#play-surface').classList.toggle('has-custom', on);
  $('#play-surface').classList.toggle('immersive', on);
  $('#custom-renderer').hidden = !on;
  $('#standard-renderer').hidden = on;
  $('.command-panel').hidden = on;
  $('#scene-description').hidden = on;
  $('#standard-view').hidden = on;
}
function disposeCodeGame() {
  generation++;
  if (run) {
    cancelAnimationFrame(run.frame);
    clearInterval(run.timer);
    try { run.instance?.dispose?.(); } catch (error) { console.warn(error); }
    run.root?.remove();
  }
  run = null;
  presentation(false);
}
function fault(current, error) {
  if (run !== current) return;
  current.paused = true;
  reportUI('ui.failed', current.release.entry, error, 'Fix the game module and publish or reload. The last saved run remains available.');
  notify(`Game paused: ${error.message}. Open Menu to reload the game view.`, false, true);
}
function frame(current, time) {
  if (run !== current) return;
  const dt = Math.min(.05, Math.max(0, (time - (current.lastTime || time)) / 1000));
  current.lastTime = time;
  if (!current.swapping && current.instance) void processCommand(current);
  if (!current.paused && !current.swapping && !document.hidden && !$('dialog[open]')) {
    try { current.instance?.step?.(dt); current.instance?.render?.(); }
    catch (error) { fault(current, error); }
  }
  current.frame = requestAnimationFrame(time => frame(current, time));
}
async function checkpoint(current, keepalive = false) {
  if (run !== current || !current.instance || current.writing || current.swapping || current.paused) return;
  current.writing = true;
  const events = current.events.splice(0, 30);
  try {
    const save = clone(current.instance.serialize());
    const summary = clone(current.instance.inspect?.() ?? {});
    current.pendingWrite = post(current.id, { op: 'checkpoint', clientId, runEpoch: current.epoch, release: current.release.release, checkpointSeq: ++current.seq, save, summary, events }, keepalive);
    const response = await current.pendingWrite;
    if (run !== current) return;
    current.lastSave = save;
    current.saveError = false;
    current.seq = Math.max(current.seq, response.checkpointSeq || 0);
  } catch (error) {
    if (run !== current) return;
    // An uncertain write is not replayed; the next checkpoint has a new sequence.
    if (!current.saveError) notify(`Progress is not syncing: ${error.message}`, false, true);
    current.saveError = true;
    if ([403, 409].includes(error.status) || ['RUNTIME_LEASE_LOST', 'STALE_RUN', 'STALE_RELEASE'].includes(error.code)) current.paused = true;
    if (['RUNTIME_LEASE_LOST', 'STALE_RUN'].includes(error.code)) current.reconnectRequired = true;
  } finally { current.writing = false; current.pendingWrite = null; }
}
async function mount(current, session, force = false) {
  const next = releaseInfo(session);
  const key = `${next.release}:${next.runEpoch}`;
  if (current.loading || current.commandBusy || (!force && (current.key === key || current.failedKey === key))) return;
  current.loading = true;
  let candidate, root;
  try {
    const url = releaseURL(next.entry);
    if (force) url.searchParams.set('reload', Date.now());
    const module = await import(url.href);
    if (run !== current) return;
    if (typeof module.default !== 'function') throw new Error('Game module must export a create function.');
    // Freeze the previous simulation only after import; keep its visual until validated.
    current.swapping = true;
    await current.pendingWrite?.catch(() => {});
    if (run !== current) return;
    const sameEpoch = next.runEpoch === current.epoch;
    const save = sameEpoch && current.instance ? clone(current.instance.serialize()) : clone(session.state);
    root = document.createElement('div');
    root.className = 'pack-view code-candidate';
    root.inert = true;
    root.style.cssText = 'position:absolute;inset:0;visibility:hidden;pointer-events:none';
    $('#custom-renderer').append(root);
    const pendingEvents = [];
    const host = Object.freeze({
      root,
      get active() { return run === current && current.instance === candidate && !current.paused && !current.swapping && !$('dialog[open]'); },
      asset: path => { const target = new URL(path, url); return target.origin === location.origin ? target.href : ''; },
      emit: (type, text, data = {}) => { const queue = current.instance === candidate ? current.events : pendingEvents; if (queue.length < 100) queue.push({ type: String(type), text: String(text || ''), data: clone(data) }); },
      notify: text => { if (current.instance === candidate) notify(String(text)); },
      requestSave: () => { if (current.instance === candidate) void checkpoint(current); },
      checkpoint: () => { if (current.instance === candidate) void checkpoint(current); },
    });
    candidate = await module.default(host, { save, release: next, previousRelease: current.instance ? current.release.release : session.runtime.saveRelease });
    if (!candidate || typeof candidate.dispose !== 'function' || typeof candidate.serialize !== 'function') throw new Error('Game must expose serialize() and dispose().');
    candidate.step?.(0);
    candidate.render?.();
    clone(candidate.serialize());
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (run !== current) { candidate.dispose?.(); root.remove(); return; }
    // Server acknowledgement fences a release before the local swap becomes active.
    await post(current.id, { op: 'applied', clientId, runEpoch: next.runEpoch, release: next.release, save: clone(candidate.serialize()), summary: clone(candidate.inspect?.() ?? {}) });
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (run !== current) { candidate.dispose?.(); root.remove(); return; }
    const previous = current.instance;
    const previousRoot = current.root;
    current.instance = candidate;
    current.root = root;
    current.release = next;
    current.epoch = next.runEpoch;
    current.seq = Math.max(current.seq, next.checkpointSeq || 0);
    current.key = key;
    current.failedKey = '';
    current.paused = false;
    current.events.push(...pendingEvents);
    root.style.cssText = '';
    root.inert = false;
    root.classList.remove('code-candidate');
    previousRoot?.remove();
    $('#code-loading')?.remove();
    try { previous?.dispose?.(); } catch (error) { console.warn(error); }
    $('#notice').hidden = true;
    reportUI('ui.recovered', next.entry);
  } catch (error) {
    try { candidate?.dispose?.(); } catch { /* Keep the previous running game. */ }
    root?.remove();
    if (run !== current) return;
    current.failedKey = key;
    if ($('#code-loading')) $('#code-loading').textContent = 'The game could not start. Open Menu to reload.';
    reportUI('ui.failed', next.entry, error, 'Fix and publish a new release. The previous running game was retained.');
    notify(`${current.instance ? 'Update could not be applied; the previous game is still running.' : 'Game could not start.'} ${error.message}`, false, true);
  } finally {
    current.swapping = false;
    current.loading = false;
    if (run === current && state.session?.runtime && `${state.session.runtime.release}:${state.session.runtime.runEpoch}` !== key) void mount(current, state.session);
  }
}
async function startCodeGame() {
  if (!isCodeGame()) return;
  if (run?.id === state.session.id && run.connecting) return;
  if (run?.id === state.session.id && run.epoch === state.session.runtime.runEpoch) { void mount(run, state.session); return; }
  disposeCodeGame();
  const token = generation;
  const session = state.session;
  presentation(true);
  $('#custom-renderer').innerHTML = '<div id="code-loading" class="stage-empty"><span class="loading-orbit" aria-hidden="true"></span><h3>Opening your game</h3></div>';
  const current = { id: session.id, epoch: session.runtime.runEpoch, release: releaseInfo(session), seq: session.runtime.checkpointSeq || 0, connecting: true, events: [], commands: [], results: new Map(), instance: null, root: null };
  run = current;
  try {
    await identityReady;
    if (run !== current) return;
    const connected = await post(session.id, { op: 'connect', clientId });
    if (token !== generation || run !== current) return;
    state.session = connected.session;
    current.epoch = connected.session.runtime.runEpoch;
    current.connecting = false;
    current.seq = connected.session.runtime.checkpointSeq || 0;
    await mount(current, connected.session);
    queuePending(current, connected.session);
    if (run !== current) return;
    current.frame = requestAnimationFrame(time => frame(current, time));
    current.timer = setInterval(() => { void checkpoint(current); void syncRuntime(current); }, 3000);
  } catch (error) { current.connecting = false; fault(current, error); }
}
function reloadCodeGame() {
  if (!run?.instance || run.paused) { disposeCodeGame(); void startCodeGame(); }
  else void mount(run, state.session, true);
}
function queuePending(current, session) {
  for (const command of session.runtime?.commands || []) {
    if (command.status === 'pending' && command.runEpoch === current.epoch && command.release === current.release.release && !current.results.has(command.id) && !current.commands.some(item => item.commandId === command.id)) current.commands.push({ ...command, commandId: command.id });
  }
}
async function syncRuntime(current) {
  if (run !== current || current.polling) return;
  current.polling = true;
  try {
    const { session } = await request(`/api/sessions/${encodeURIComponent(current.id)}`);
    if (run !== current) return;
    state.session = session;
    if (current.reconnectRequired || session.runtime.runEpoch !== current.epoch) { disposeCodeGame(); void startCodeGame(); return; }
    queuePending(current, session);
    void mount(current, session);
  } catch { /* The checkpoint path reports connectivity problems once. */ }
  finally { current.polling = false; }
}
function receiveCodeEvents(events) {
  if (!run) return;
  for (const event of events) {
    if (event.type === 'runtime.release' && state.session?.id === run.id) {
      Object.assign(state.session.runtime, event.data);
      void mount(run, state.session);
    }
    if (event.type !== 'runtime.command' || !event.data?.commandId || event.data.runEpoch !== run.epoch || event.data.release !== run.release.release) continue;
    if (!run.commands.some(command => command.commandId === event.data.commandId)) run.commands.push(event.data);
  }
}
async function processCommand(current) {
  if (current.commandBusy || !current.commands.length) return;
  current.commandBusy = true;
  const command = current.commands.shift();
  try {
    let reply = current.results.get(command.commandId);
    if (!reply) {
      try {
        if (command.runEpoch !== current.epoch || command.release !== current.release.release) throw new Error('Command targets a stale game release or run.');
        if (typeof current.instance.command !== 'function') throw new Error('This game exposes no command interface.');
        reply = { result: clone(await current.instance.command(command.name, clone(command.args || {})) ?? null) };
      } catch (error) { reply = { error: String(error.message || error) }; }
      current.results.set(command.commandId, reply);
      if (current.results.size > 200) current.results.delete(current.results.keys().next().value);
    }
    if (run !== current) return;
    await post(current.id, { op: 'result', clientId, runEpoch: current.epoch, release: current.release.release, commandId: command.commandId, ...reply });
    void checkpoint(current);
  } catch (error) { if (run === current) notify(`Agent command result could not sync: ${error.message}`); }
  finally { current.commandBusy = false; }
}
window.addEventListener('pagehide', () => { if (run) void checkpoint(run, true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && run) void checkpoint(run, true); });
export { isCodeGame, startCodeGame, disposeCodeGame, reloadCodeGame, receiveCodeEvents };
