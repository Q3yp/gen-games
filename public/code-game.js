/** Trusted code games own their world. This host only handles frames and durable envelopes. */
import { $, state, request, notify, clone } from './shared.js';
import { reportUI } from './diagnostics.js';
let run = null;
let generation = 0;
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
const isCodeGame = () =>
  state.session?.runtime &&
  state.games.some(
    (pack) => pack.id === state.session.gameId && pack.runtime === 'code'
  );
const post = (id, body, keepalive = false) =>
  request(`/api/sessions/${encodeURIComponent(id)}/runtime`, {
    method: 'POST',
    body: JSON.stringify(body),
    keepalive,
    signal: AbortSignal.timeout(15000)
  });
const releaseInfo = (session) => ({ ...session.runtime });
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
  run = null;
  presentation(false);
}
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
    versions: clone(instance.versions?.() ?? {})
  };
}
function runtimeError(code, message) {
  return Object.assign(new Error(message), { code });
}
function measure(name, id, start, detail = {}) {
  performance.measure(`gen-games.${name}`, {
    start,
    end: performance.now(),
    detail: { correlationId: id, ...detail }
  });
  // Keep browser-local diagnostics bounded, even during long sessions.
  const entries = performance.getEntriesByName(`gen-games.${name}`);
  if (entries.length > 200) performance.clearMeasures(`gen-games.${name}`);
}
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
async function mount(current, session, force = false) {
  const next = releaseInfo(session);
  const key = `${next.release}:${next.runEpoch}`;
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
      run !== current ||
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
    if (run !== current) return;
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
      emit: (type, text, data = {}) => {
        const queue =
          current.instance === candidate
            ? current.commandEvents || current.events
            : pendingEvents;
        if (queue.length >= (current.commandEvents === queue ? 30 : 1000)) {
          const error = runtimeError(
            'EVENT_QUEUE_FULL',
            'Semantic event queue is full; commands may emit at most 30 events and offline queues at most 1000.'
          );
          if (current.instance === candidate) fault(current, error);
          throw error;
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
        queue.push({
          id,
          type: String(type),
          text: String(text || ''),
          data: {
            ...clone(data),
            observation: candidate
              ? {
                  versions: clone(candidate.versions?.() ?? {}),
                  runEpoch: current.epoch,
                  release: current.release.release
                }
              : null
          },
          started: performance.now(),
          observed: candidate ? projection(current, candidate) : null
        });
        if (current.instance === candidate) {
          if (current.renderInputs.length < 100)
            current.renderInputs.push({ id, started: performance.now() });
          if (!current.commandEvents) scheduleEvents(current);
        }
        return id;
      },
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
    if (run !== current) {
      candidate.dispose?.();
      root.remove();
      return;
    }
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
    if (run !== current) {
      candidate.dispose?.();
      root.remove();
      return;
    }
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
    $('#announcer').textContent = 'Game is running.';
    reportUI('ui.recovered', next.entry);
  } catch (error) {
    try {
      candidate?.dispose?.();
    } catch {
      /* Keep the previous running game. */
    }
    root?.remove();
    if (run !== current) return;
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
    notify(
      `${current.instance ? 'Update could not be applied; the previous game is still running.' : 'Game could not start.'} ${error.message}`,
      false,
      true
    );
  } finally {
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
    causeStarts: new Map(),
    commandRenders: [],
    instance: null,
    root: null
  };
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
function queuePending(current, session) {
  for (const command of session.runtime?.commands || []) {
    if (
      command.status === 'pending' &&
      command.runEpoch === current.epoch &&
      command.release === current.release.release &&
      !current.results.has(command.id) &&
      !current.commands.some((item) => item.commandId === command.id)
    )
      current.commands.push({ ...command, commandId: command.id });
  }
}
async function syncRuntime(current) {
  if (run !== current || current.polling) return;
  current.polling = true;
  try {
    const { session } = await request(
      `/api/sessions/${encodeURIComponent(current.id)}`
    );
    if (run !== current) return;
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
      Object.assign(state.session.runtime, event.data);
      void mount(run, state.session);
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
      run.commands.push(event.data);
  }
}
async function processCommand(current) {
  if (
    current.commandBusy ||
    current.paused ||
    current.swapping ||
    (!current.pendingResult && !current.commands.length)
  )
    return;
  if (current.retryAt && performance.now() < current.retryAt) return;
  current.commandBusy = true;
  if (current.root) current.root.inert = true;
  try {
    // Never let an older checkpoint race the atomic command application/save.
    await current.pendingWrite?.catch(() => {});
    if (run !== current || current.paused) return;
    if (!current.pendingResult) {
      const command = current.commands.shift();
      if (!current.commandStarts.has(command.commandId))
        current.commandStarts.set(command.commandId, performance.now());
      let envelope = current.results.get(command.commandId);
      if (!envelope) {
        let reply;
        let invoked = false;
        try {
          if (command.directorToken) {
            await post(current.id, {
              op: 'authorize',
              clientId,
              runEpoch: current.epoch,
              release: current.release.release,
              commandId: command.commandId
            });
            if (run !== current) return;
          }
          if (
            command.runEpoch !== current.epoch ||
            (command.expectedRunEpoch != null &&
              command.expectedRunEpoch !== current.epoch)
          )
            throw runtimeError('STALE_RUN', 'Command targets a stale run.');
          if (command.release !== current.release.release)
            throw runtimeError(
              'STALE_RELEASE',
              'Command targets a stale release.'
            );
          const registered =
            typeof current.instance.capabilities === 'function';
          const capabilities = current.instance.capabilities?.() ?? [];
          if (
            registered &&
            !capabilities.some((item) => item.name === command.name)
          )
            throw runtimeError(
              'UNKNOWN_COMMAND',
              'Command is not registered by this game.'
            );
          const capability = capabilities.find(
            (item) => item.name === command.name
          );
          for (const scope of capability?.scopes || []) {
            if (!Object.hasOwn(command.expectedVersions || {}, scope))
              throw runtimeError(
                'STALE_SCOPE',
                `Command requires an expected version for scope ${scope}.`
              );
          }
          const versions = current.instance.versions?.() ?? {};
          for (const [scope, expected] of Object.entries(
            command.expectedVersions || {}
          )) {
            if (!Object.hasOwn(versions, scope) || versions[scope] !== expected)
              throw runtimeError(
                'STALE_SCOPE',
                `Scope ${scope} changed before command application.`
              );
          }
          if (typeof current.instance.command !== 'function')
            throw runtimeError(
              'UNKNOWN_COMMAND',
              'This game exposes no command interface.'
            );
          if (
            registered &&
            current.instance.command.constructor?.name === 'AsyncFunction'
          )
            throw runtimeError(
              'ASYNC_COMMAND_UNSUPPORTED',
              'Registered command handlers must be synchronous; command was not invoked.'
            );
          current.commandEvents = [];
          invoked = true;
          const applyStarted = performance.now();
          const result = current.instance.command(
            command.name,
            clone(command.args || {}),
            Object.freeze({
              requestId: command.commandId,
              causeEventId: command.causeEventId,
              runEpoch: current.epoch,
              release: current.release.release,
              expectedVersions: clone(command.expectedVersions || {})
            })
          );
          measure('command-apply', command.commandId, applyStarted);
          if (registered && result && typeof result.then === 'function') {
            // A trusted game must not continue mutations from background tasks.
            Promise.resolve(result).catch(() => {});
            current.invalidAsyncCommand = true;
            throw runtimeError(
              'ASYNC_COMMAND_UNSUPPORTED',
              'Registered commands must return synchronously. This command may already have changed game state; the captured save is retained.'
            );
          }
          reply = {
            result: clone((registered ? result : await result) ?? null)
          };
        } catch (error) {
          reply = {
            error:
              String(error.message || error) +
              (invoked
                ? ' The handler may have changed game state; its captured save is retained.'
                : ''),
            errorCode: error.code || 'COMMAND_FAILED'
          };
        }
        current.resultEventStarts = new Map(
          (current.commandEvents || []).map((event) => [
            event.id,
            event.started
          ])
        );
        envelope = {
          op: 'result',
          clientId,
          runEpoch: current.epoch,
          release: current.release.release,
          commandId: command.commandId,
          applicationId: command.commandId,
          causeEventId: command.causeEventId,
          events: (current.commandEvents || []).map(
            ({ started, observed, ...event }) => event
          ),
          checkpointSeq: ++current.seq,
          save: clone(current.instance.serialize()),
          ...projection(current, current.instance),
          ...reply
        };
        current.commandEvents = null;
        current.results.set(command.commandId, envelope);
        if (current.results.size > 200)
          current.results.delete(current.results.keys().next().value);
      }
      current.pendingResult = envelope;
    }
    const envelope = current.pendingResult;
    const response = await post(current.id, envelope);
    if (run !== current) return;
    for (const event of envelope.events || []) {
      const started = current.resultEventStarts?.get(event.id);
      if (started != null) measure('event-ack', event.id, started);
    }
    current.resultEventStarts = null;
    const commandStarted = current.commandStarts.get(envelope.commandId);
    if (commandStarted != null)
      measure('command-ack', envelope.commandId, commandStarted);
    current.commandStarts.delete(envelope.commandId);
    if (
      !envelope.error &&
      envelope.causeEventId &&
      current.causeStarts.has(envelope.causeEventId)
    ) {
      current.commandRenders.push({
        commandId: envelope.commandId,
        causeEventId: envelope.causeEventId
      });
    }
    current.lastSave = envelope.save;
    current.seq = Math.max(current.seq, response.checkpointSeq || 0);
    current.pendingResult = null;
    current.retryAt = 0;
    current.resultError = false;
    if (current.invalidAsyncCommand)
      fault(
        current,
        runtimeError(
          'ASYNC_COMMAND_UNSUPPORTED',
          'This game violated the synchronous command contract; reload a corrected release.'
        )
      );
  } catch (error) {
    if (run !== current) return;
    if (!current.pendingResult) {
      fault(current, error);
      return;
    }
    if (!current.resultError)
      notify(
        `Game paused until the agent command is saved: ${error.message}`,
        false,
        true
      );
    current.resultError = true;
    current.retryAt = performance.now() + 1000;
    if (
      ['RUNTIME_LEASE_LOST', 'STALE_RUN', 'STALE_RELEASE'].includes(error.code)
    ) {
      current.paused = true;
      current.reconnectRequired = true;
    }
  } finally {
    current.commandBusy = false;
    scheduleEvents(current);
    if (current.root)
      current.root.inert = !!(current.pendingResult || current.paused);
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
