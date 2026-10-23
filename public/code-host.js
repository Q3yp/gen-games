/** Renderer-independent world, owned input/resources, and existing runtime transport. */
import { notify } from './shared.js';
import { run, checkpoint, runtimeError } from './code-runtime.js';
import { emitEvent } from './code-events.js';
import { createWorld, isWorldSave } from './code-world.js';
import { createLifecycle } from './code-lifecycle.js';

export function createCodeHost({ current, root, url, getCandidate, pendingEvents, stateMode, save }) {
  if (stateMode !== undefined && stateMode !== 'host')
    throw runtimeError('INVALID_STATE_MODE', 'Use stateMode = "host", or omit it for legacy serialization.');
  if (stateMode !== 'host' && isWorldSave(save))
    throw runtimeError('WORLD_MODE_REQUIRED', 'This run has an engine-owned world. Preserve stateMode = "host" in the new renderer.');
  const resources = { world: null, lifecycle: null };
  let saveTimer = null;
  if (stateMode === 'host') resources.world = createWorld(save, {
    canWrite: () => run === current && current.hostResources === resources &&
      !current.paused && !current.swapping && !current.pendingResult &&
      (!current.commandBusy || current.commandExecuting),
    onChange() {
      if (current.hostResources !== resources || saveTimer !== null) return;
      saveTimer = setTimeout(() => {
        saveTimer = null;
        if (current.hostResources === resources) void checkpoint(current);
      }, 250);
    }
  });
  const base = {
    root,
    get active() {
      return run === current && current.instance === getCandidate() &&
        !current.paused && !current.swapping && !current.commandBusy &&
        !current.pendingResult && !document.querySelector('dialog[open]');
    },
    asset(path) {
      const target = new URL(path, url);
      return target.origin === location.origin ? target.href : '';
    },
    emit: (type, text, data = {}) => emitEvent(current, getCandidate(), pendingEvents, type, text, data),
    notify(text) { if (current.instance === getCandidate()) notify(String(text)); },
    requestSave() { if (current.instance === getCandidate()) void checkpoint(current); },
    checkpoint() { if (current.instance === getCandidate()) void checkpoint(current); }
  };
  resources.lifecycle = createLifecycle(base);
  resources.lifecycle.own(() => clearTimeout(saveTimer));
  resources.host = Object.freeze({
    ...base,
    // Spreading accessors would freeze their initial value; retain the live gate.
    get active() { return base.active; },
    lifecycle: resources.lifecycle,
    ...(resources.world ? { world: resources.world.api } : {})
  });
  return resources;
}
export function disposeCodeHost(resources) {
  resources?.world?.revoke();
  resources?.lifecycle?.dispose();
}
