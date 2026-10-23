/** Game-defined command delivery, guarded application, and durable results. */
import { notify, clone } from './shared.js';
import {
  run,
  clientId,
  post,
  projection,
  runtimeError,
  measure,
  fault
} from './code-runtime.js';
import { scheduleEvents } from './code-events.js';
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
async function receiveCommandDetail(current, receipt) {
  if (current.fetchingCommands.has(receipt.commandId)) return;
  current.fetchingCommands.add(receipt.commandId);
  try {
    const { command } = await post(current.id, {
      op: 'read-command',
      clientId,
      runEpoch: current.epoch,
      release: current.release.release,
      commandId: receipt.commandId
    });
    if (
      run === current &&
      command.status === 'pending' &&
      !current.results.has(command.id) &&
      !current.commands.some((item) => item.commandId === command.id)
    ) {
      current.commands.push({ ...command, commandId: command.id });
    }
  } catch {
    /* Periodic queue reconciliation retries missed delivery. */
  } finally {
    current.fetchingCommands.delete(receipt.commandId);
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
        current.commandFault = null;
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
          let result;
          current.commandExecuting = true;
          try {
            result = current.instance.command(
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
          } finally { current.commandExecuting = false; }
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
        let observed;
        try {
          observed = projection(current, current.instance);
        } catch (error) {
          // Inspection is optional telemetry, not the command save. Do not let
          // invalid telemetry strand valid events or create an unretryable result.
          current.commandFault ||= runtimeError(
            error.code || 'INVALID_PROJECTION',
            `Game inspection failed: ${error.message}. Fix the game and publish a corrected release.`
          );
        }
        if (current.commandFault)
          reply = {
            error:
              reply.error ||
              `${current.commandFault.message} The handler may have changed game state; its captured save is retained.`,
            errorCode: reply.errorCode || current.commandFault.code
          };
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
          ...observed,
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
    if (current.commandFault) {
      const error = current.commandFault;
      current.commandFault = null;
      fault(current, error);
    }
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
export { queuePending, receiveCommandDetail, processCommand };
