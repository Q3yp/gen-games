/** Optional local cue judge. No renderer, transport, combat rules or wall-clock timers. */
const copy = (value) => JSON.parse(JSON.stringify(value));
import { validateQTE, fail, number, text } from './code-qte-schema.js';
export { validateQTE, qteSequenceSchema } from './code-qte-schema.js';

export function createQTE({ actions, onResult = () => {} } = {}) {
  if (
    !Array.isArray(actions) ||
    !actions.length ||
    actions.length > 32 ||
    new Set(actions).size !== actions.length
  )
    fail('actions requires 1..32 unique action names.');
  actions = actions.map((action) => text(action, 80, 'action'));
  let sequence = null,
    index = 0,
    results = [],
    terminal = null;
  let elapsed = 0,
    holdingAt = null,
    pausedReason = null,
    disposed = false;
  const down = new Set();
  const current = () => sequence?.cues[index];
  const activeId = () => (sequence && !terminal ? sequence.id : null);
  const scaled = (ms) => ms * sequence.timeScale;
  const finish = (outcome, reason) => {
    terminal = {
      id: sequence.id,
      outcome,
      ...(reason ? { reason } : {}),
      cues: copy(results)
    };
    holdingAt = null;
    pausedReason = null;
    onResult(copy(terminal));
  };
  const resolve = (outcome, reason, offsetMs) => {
    const cue = current();
    results.push({
      index,
      id: cue.id,
      action: cue.action,
      kind: cue.kind,
      outcome,
      reason,
      ...(offsetMs === undefined ? {} : { offsetMs: Math.round(offsetMs) })
    });
    index++;
    elapsed = 0;
    holdingAt = null;
    if (index === sequence.cues.length) {
      const hits = results.filter((result) => result.outcome === 'hit').length;
      finish(hits === results.length ? 'success' : hits ? 'partial' : 'failed');
    }
  };
  const pause = (reason = 'manual') => {
    if (disposed || !activeId()) return false;
    pausedReason = String(reason).slice(0, 160);
    elapsed = 0;
    holdingAt = null;
    return true;
  };
  const hidden = () => {
    if (globalThis.document?.hidden) pause('hidden');
  };
  const blur = () => pause('focus-lost');
  globalThis.document?.addEventListener('visibilitychange', hidden);
  globalThis.window?.addEventListener('blur', blur);
  const status = () => {
    const cue = current();
    const preparation = cue ? scaled(cue.prepareMs) : 0;
    const phase = !sequence
      ? 'idle'
      : terminal
        ? 'complete'
        : pausedReason
          ? 'paused'
          : elapsed < preparation
            ? 'prepare'
            : 'window';
    return {
      id: sequence?.id ?? null,
      label: sequence?.label ?? '',
      phase,
      index,
      total: sequence?.cues.length ?? 0,
      cue: cue ? copy(cue) : null,
      remainingMs:
        !cue || terminal
          ? 0
          : Math.max(
              0,
              Math.ceil(
                (elapsed < preparation
                  ? preparation
                  : preparation + scaled(cue.windowMs)) - elapsed
              )
            ),
      holdProgress:
        holdingAt === null || !cue?.holdMs
          ? 0
          : Math.min(1, (elapsed - holdingAt) / scaled(cue.holdMs)),
      pausedReason,
      result: terminal ? copy(terminal) : null
    };
  };
  return {
    start(raw, { expectedId } = {}) {
      if (disposed) fail('helper is disposed.');
      const next = validateQTE(raw, actions);
      if (expectedId !== activeId())
        throw Object.assign(
          new Error(
            `QTE: expectedId must match active sequence (${activeId() ?? 'null'}).`
          ),
          { code: 'STALE_QTE' }
        );
      if (sequence?.id === next.id) {
        if (JSON.stringify(sequence) !== JSON.stringify(next))
          fail('a sequence id cannot be reused for different cues.');
        return status();
      }
      if (activeId()) finish('cancelled', 'replaced');
      sequence = next;
      index = 0;
      results = [];
      terminal = null;
      elapsed = 0;
      holdingAt = null;
      pausedReason = null;
      if (globalThis.document?.hidden) pause('hidden');
      return status();
    },
    cancel(expectedId, reason = 'cancelled') {
      if (!activeId() || expectedId !== activeId())
        throw Object.assign(
          new Error('QTE: cancellation requires the active sequence id.'),
          { code: 'STALE_QTE' }
        );
      finish('cancelled', String(reason).slice(0, 160));
      return status();
    },
    input(action, pressed, { repeat = false } = {}) {
      if (disposed || !actions.includes(action)) return false;
      if (!pressed) {
        down.delete(action);
        if (
          activeId() &&
          !pausedReason &&
          current().action === action &&
          holdingAt !== null
        )
          resolve(
            'miss',
            'released-early',
            elapsed - scaled(current().prepareMs)
          );
        return false;
      }
      if (repeat || down.has(action)) return false;
      down.add(action);
      if (!activeId() || pausedReason || globalThis.document?.hidden)
        return false;
      const cue = current();
      const offset = elapsed - scaled(cue.prepareMs);
      if (offset < 0 || action !== cue.action) return false;
      if (cue.kind === 'tap') resolve('hit', 'tap', offset);
      else holdingAt = elapsed;
      return true;
    },
    step(dt) {
      if (
        disposed ||
        !activeId() ||
        pausedReason ||
        globalThis.document?.hidden
      )
        return;
      number(dt, 0, 60, 'step dt seconds');
      // Only a large supplied simulation delta is detected. Capped/fixed-step
      // callers intentionally slow QTE time, and do not detect wall-clock stalls.
      if (dt > 0.25) {
        pause('frame-gap');
        return;
      }
      const cue = current();
      elapsed += dt * 1000;
      const deadline = scaled(cue.prepareMs + cue.windowMs);
      if (
        holdingAt !== null &&
        holdingAt + scaled(cue.holdMs) <= Math.min(elapsed, deadline)
      )
        resolve('hit', 'held', holdingAt - scaled(cue.prepareMs));
      else if (elapsed >= deadline)
        resolve('miss', holdingAt === null ? 'timeout' : 'held-too-late');
      // No spillover into the next cue: every cue gets its full visible preparation.
    },
    pause,
    resume() {
      if (disposed || globalThis.document?.hidden || !activeId()) return false;
      pausedReason = null;
      elapsed = 0;
      holdingAt = null;
      // A keyup may have happened outside this window. Forget stale edges;
      // adapters must forward KeyboardEvent.repeat so a still-held key cannot farm.
      down.clear();
      return true;
    },
    status,
    serialize: () => ({
      version: 1,
      sequence: sequence ? copy(sequence) : null,
      index,
      results: copy(results),
      terminal: terminal ? copy(terminal) : null
    }),
    restore(saved) {
      if (disposed) fail('helper is disposed.');
      if (activeId())
        fail('restore is only allowed before a sequence is running.');
      if (!saved || saved.version !== 1) fail('unsupported saved QTE version.');
      if (!saved.sequence) {
        sequence = null;
        index = 0;
        results = [];
        terminal = null;
        elapsed = 0;
        holdingAt = null;
        pausedReason = null;
        down.clear();
        return status();
      }
      // Normalized optional labels are blank internally, not authored blank labels.
      const raw = copy(saved.sequence);
      if (!raw.label) delete raw.label;
      for (const cue of raw.cues ?? []) if (!cue.label) delete cue.label;
      const next = validateQTE(raw, actions);
      if (
        !Number.isInteger(saved.index) ||
        saved.index < 0 ||
        saved.index > next.cues.length ||
        !Array.isArray(saved.results) ||
        saved.results.length !== saved.index
      )
        fail('invalid saved cue progress.');
      saved.results.forEach((result, i) => {
        const cue = next.cues[i];
        if (
          !result ||
          result.index !== i ||
          result.id !== cue.id ||
          result.action !== cue.action ||
          result.kind !== cue.kind ||
          !['hit', 'miss'].includes(result.outcome)
        )
          fail('invalid saved cue result.');
      });
      if (
        saved.terminal &&
        (saved.terminal.id !== next.id ||
          !['success', 'partial', 'failed', 'cancelled'].includes(
            saved.terminal.outcome
          ))
      )
        fail('invalid saved terminal result.');
      if (!saved.terminal && saved.index === next.cues.length)
        fail('completed save needs a terminal result.');
      sequence = next;
      index = saved.index;
      results = copy(saved.results);
      terminal = saved.terminal ? copy(saved.terminal) : null;
      elapsed = 0;
      holdingAt = null;
      down.clear();
      pausedReason = terminal ? null : 'restored';
      return status(); // Never re-emit or re-award a saved terminal result.
    },
    dispose() {
      disposed = true;
      globalThis.document?.removeEventListener('visibilitychange', hidden);
      globalThis.window?.removeEventListener('blur', blur);
      down.clear();
    }
  };
}
