/** Trusted code games own their world. This host handles mounting and frames. */
import { $, state, request, notify, clone } from './shared.js';
import { reportUI } from './diagnostics.js';
import {
  run,
  setRun,
  clientId,
  identityReady,
  post,
  fault,
  projection,
  measure,
  checkpoint
} from './code-runtime.js';
import { scheduleEvents, emitEvent } from './code-events.js';
import {
  queuePending,
  receiveCommandDetail,
  processCommand
} from './code-commands.js';
let generation = 0;
const isCodeGame = () =>
  state.session?.runtime &&
  state.games.some(
    (pack) => pack.id === state.session.gameId && pack.runtime === 'code'
  );
const releaseInfo = (session) => ({ ...session.runtime });
const releaseKey = (runtime) => `${runtime.release}:${runtime.runEpoch}`;
function releaseURL(raw) {
  const url = new URL(raw, location.origin);
  if (
    url.origin !== location.origin ||
    !/^\/(releases|games)\//.test(url.pathname) ||
    !url.pathname.endsWith('.js')
  )
    throw new Error('A code game entry must be a local game module.');
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
    run.activationNotice?.();
    if (run.events.length)
      notify(
        `${run.events.length} game events are still unacknowledged and cannot be carried into another run.`,
        false,
        true
      );
    cancelAnimationFrame(run.frame);
    clearInterval(run.timer);
    clearTimeout(run.eventTimer);
    try {
      run.instance?.dispose?.();
    } catch (error) {
      console.warn(error);
    }
    run.root?.remove();
  }
  setRun(null);
  presentation(false);
}
function frame(current, time) {
  if (run !== current) return;
  const dt = Math.min(
    0.05,
    Math.max(0, (time - (current.lastTime || time)) / 1000)
  );
  current.lastTime = time;
  if (!current.swapping && current.instance) void processCommand(current);
  if (
    !current.paused &&
    !current.swapping &&
    !current.commandBusy &&
    !current.pendingResult &&
    !document.hidden &&
    !$('dialog[open]')
  ) {
    try {
      current.instance?.step?.(dt);
      current.instance?.render?.();
      for (const input of current.renderInputs.splice(0))
        measure('input-render', input.id, input.started);
      for (const response of current.commandRenders.splice(0)) {
        const cause = current.causeStarts.get(response.causeEventId);
        if (!cause) continue; // Other tabs/reconnects have no comparable clock origin.
        measure(
          'input-to-command-render',
          response.causeEventId,
          cause.started,
          {
            commandId: response.commandId,
            causeEventId: response.causeEventId,
            startKind: cause.startKind,
            endpoint: 'first-command-render-after-durable-ack'
          }
        );
        current.causeStarts.delete(response.causeEventId);
      }
    } catch (error) {
      fault(current, error);
    }
  }
  current.frame = requestAnimationFrame((time) => frame(current, time));
}
async function mount(current, session, force = false) {
  const next = releaseInfo(session);
  const key = releaseKey(next);
  const isDesired = () =>
    run === current &&
    state.session?.id === current.id &&
    state.session.runtime &&
    releaseKey(state.session.runtime) === key;
  if (!isDesired()) return;
  if (current.key === key && current.failedKey !== key) {
    current.activationNotice?.();
    current.activationNotice = null;
  }
  if (
    current.loading ||
    current.commandBusy ||
    current.pendingResult ||
    current.eventWriting ||
    current.events.length ||
    (!force && (current.key === key || current.failedKey === key))
  )
    return;
  current.loading = true;
  let candidate, root;
  try {
    const url = releaseURL(next.entry);
    if (force) url.searchParams.set('reload', Date.now());
    const module = await import(url.href);
    if (
      !isDesired() ||
      current.commandBusy ||
      current.pendingResult ||
      current.eventWriting ||
      current.events.length
    )
      return;
    if (typeof module.default !== 'function')
      throw new Error('Game module must export a create function.');
    // Freeze the previous simulation only after import; keep its visual until validated.
    current.swapping = true;
    await current.pendingWrite?.catch(() => {});
    if (!isDesired()) return;
    const sameEpoch = next.runEpoch === current.epoch;
    const save =
      sameEpoch && current.instance
        ? clone(current.instance.serialize())
        : clone(session.state);
    root = document.createElement('div');
    root.className = 'pack-view code-candidate';
    root.inert = true;
    root.style.cssText =
      'position:absolute;inset:0;visibility:hidden;pointer-events:none';
    $('#custom-renderer').append(root);
    const pendingEvents = [];
    const host = Object.freeze({
      root,
      get active() {
        return (
          run === current &&
          current.instance === candidate &&
          !current.paused &&
          !current.swapping &&
          !current.commandBusy &&
          !current.pendingResult &&
          !$('dialog[open]')
        );
      },
      asset: (path) => {
        const target = new URL(path, url);
        return target.origin === location.origin ? target.href : '';
      },
      emit: (type, text, data = {}) =>
        emitEvent(current, candidate, pendingEvents, type, text, data),
      notify: (text) => {
        if (current.instance === candidate) notify(String(text));
      },
      requestSave: () => {
        if (current.instance === candidate) void checkpoint(current);
      },
      checkpoint: () => {
        if (current.instance === candidate) void checkpoint(current);
      }
    });
    candidate = await module.default(host, {
      save,
      release: next,
      previousRelease: current.instance
        ? current.release.release
        : session.runtime.saveRelease
    });
    if (!isDesired()) return;
    if (
      !candidate ||
      typeof candidate.dispose !== 'function' ||
      typeof candidate.serialize !== 'function'
    )
      throw new Error('Game must expose serialize() and dispose().');
    candidate.step?.(0);
    candidate.render?.();
    clone(candidate.serialize());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!isDesired()) return;
    // Server acknowledgement fences a release before the local swap becomes active.
    await post(current.id, {
      op: 'applied',
      clientId,
      runEpoch: next.runEpoch,
      release: next.release,
      save: clone(candidate.serialize()),
      ...projection(current, candidate)
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // Once acknowledged, honor the activation before mounting any newer target.
    if (run !== current) return;
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
    for (const type of [
      'pointerdown',
      'keydown',
      'input',
      'click',
      'submit',
      'change'
    ])
      root.addEventListener(
        type,
        () => {
          if (
            current.commandBusy ||
            current.pendingResult ||
            current.paused ||
            current.swapping
          )
            return;
          const dispatch = { started: performance.now() };
          current.inputDispatch = dispatch;
          setTimeout(() => {
            if (current.inputDispatch === dispatch)
              current.inputDispatch = null;
          }, 0);
          if (current.renderInputs.length < 100)
            current.renderInputs.push({
              id: crypto.randomUUID(),
              started: performance.now()
            });
        },
        { capture: true }
      );
    root.style.cssText = '';
    root.inert = false;
    root.classList.remove('code-candidate');
    previousRoot?.remove();
    $('#code-loading')?.remove();
    try {
      previous?.dispose?.();
    } catch (error) {
      console.warn(error);
    }
    // Clear both the visual notice and its live-region copy after confirmed activation.
    notify('');
    current.activationNotice?.();
    current.activationNotice = null;
    $('#announcer').textContent = 'Game is running.';
    reportUI('ui.recovered', next.entry);
  } catch (error) {
    if (run !== current) return;
    // Superseded work is not a game failure, including server-side publication
    // races that arrive before the corresponding stream snapshot.
    if (!isDesired() || error.code === 'STALE_RELEASE') {
      await syncRuntime(current);
      return;
    }
    current.failedKey = key;
    if ($('#code-loading'))
      $('#code-loading').textContent =
        'The game could not start. Open Menu to reload.';
    reportUI(
      'ui.failed',
      next.entry,
      error,
      'Fix and publish a new release. The previous running game was retained.'
    );
    current.activationNotice = notify(
      `${current.instance ? 'Update could not be applied; the previous game is still running.' : 'Game could not start.'} ${error.message}`,
      false,
      true
    );
  } finally {
    if (root !== current.root) {
      try {
        candidate?.dispose?.();
      } catch {
        /* Keep the previous running game. */
      }
      root?.remove();
    }
    current.swapping = false;
    current.loading = false;
    scheduleEvents(current);
    if (
      run === current &&
      state.session?.runtime &&
      `${state.session.runtime.release}:${state.session.runtime.runEpoch}` !==
        key
    )
      void mount(current, state.session);
  }
}
async function startCodeGame() {
  if (!isCodeGame()) return;
  if (run?.id === state.session.id && run.connecting) return;
  if (
    run?.id === state.session.id &&
    run.epoch === state.session.runtime.runEpoch
  ) {
    void mount(run, state.session);
    return;
  }
  disposeCodeGame();
  const token = generation;
  const session = state.session;
  presentation(true);
  $('#custom-renderer').innerHTML =
    '<div id="code-loading" class="stage-empty"><span class="loading-orbit" aria-hidden="true"></span><h3>Opening your game</h3></div>';
  const current = {
    id: session.id,
    epoch: session.runtime.runEpoch,
    release: releaseInfo(session),
    seq: session.runtime.checkpointSeq || 0,
    connecting: true,
    events: [],
    renderInputs: [],
    telemetrySeq:
      session.runtime.telemetrySeq ||
      session.runtime.projection?.telemetrySeq ||
      0,
    commands: [],
    results: new Map(),
    commandStarts: new Map(),
    fetchingCommands: new Set(),
    causeStarts: new Map(),
    timings: [],
    commandRenders: [],
    instance: null,
    root: null
  };
  setRun(current);
  try {
    await identityReady;
    if (run !== current) return;
    const connected = await post(session.id, { op: 'connect', clientId });
    if (token !== generation || run !== current) return;
    state.session = connected.session;
    current.epoch = connected.session.runtime.runEpoch;
    current.connecting = false;
    current.seq = connected.session.runtime.checkpointSeq || 0;
    current.telemetrySeq =
      connected.session.runtime.telemetrySeq ||
      connected.session.runtime.projection?.telemetrySeq ||
      0;
    await mount(current, connected.session);
    queuePending(current, connected.session);
    if (run !== current) return;
    current.frame = requestAnimationFrame((time) => frame(current, time));
    current.timer = setInterval(() => {
      void checkpoint(current);
      void syncRuntime(current);
    }, 3000);
  } catch (error) {
    current.connecting = false;
    fault(current, error);
  }
}
function reloadCodeGame() {
  if (!run?.instance || run.paused) {
    disposeCodeGame();
    void startCodeGame();
  } else void mount(run, state.session, true);
}
async function syncRuntime(current) {
  if (run !== current || current.polling) return;
  current.polling = true;
  try {
    const { session } = await request(
      `/api/sessions/${encodeURIComponent(current.id)}`
    );
    if (run !== current) return;
    // A response started before a publication must not roll back the stream.
    if (state.session?.id !== session.id) return;
    if (session.revision < state.session.revision) return;
    state.session = session;
    if (
      current.reconnectRequired ||
      session.runtime.runEpoch !== current.epoch
    ) {
      disposeCodeGame();
      void startCodeGame();
      return;
    }
    queuePending(current, session);
    void mount(current, session);
  } catch {
    /* The checkpoint path reports connectivity problems once. */
  } finally {
    current.polling = false;
  }
}
function receiveCodeEvents(events) {
  if (!run) return;
  for (const event of events) {
    if (event.type === 'runtime.release' && state.session?.id === run.id) {
      // Events can be replayed or arrive without a snapshot. Fetch the current
      // target instead of letting historical events overwrite a newer snapshot.
      if (event.data?.release === state.session.runtime.release)
        void mount(run, state.session);
      else void syncRuntime(run);
    }
    if (
      event.type !== 'runtime.command' ||
      !event.data?.commandId ||
      event.data.runEpoch !== run.epoch ||
      event.data.release !== run.release.release
    )
      continue;
    if (
      !run.commands.some(
        (command) => command.commandId === event.data.commandId
      )
    )
      if (event.data.commandDetailRequired)
        void receiveCommandDetail(run, event.data);
      else run.commands.push(event.data);
  }
}
window.addEventListener('pagehide', () => {
  if (run) void checkpoint(run, true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && run) void checkpoint(run, true);
});
export {
  isCodeGame,
  startCodeGame,
  disposeCodeGame,
  reloadCodeGame,
  receiveCodeEvents
};
