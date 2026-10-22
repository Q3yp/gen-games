import { createLifecycle } from './lifecycle.js';

export default function create(host, { save }) {
  const life = createLifecycle(host);
  const state = structuredClone(save); // Your JSON object, not an engine world schema.
  const root = document.createElement('div');
  root.style.cssText = 'width:100%;height:100%;min-height:240px;display:grid;place-items:center;background:#10151c;color:#92a3b8';
  root.textContent = '○';
  root.setAttribute('aria-label', 'Empty game source scaffold. Gameplay has not been authored.');
  host.root.append(root);
  life.own(() => root.remove());

  // Replace this placeholder with any DOM, canvas, WebGL, audio, and mechanics.
  // life.input(root, 'pointerdown', handler) fences player input with host.active.
  // life.listen(window, 'keyup', handler) can release held inputs even while paused.
  // After a meaningful change, life.save(); emit semantic outcomes with host.emit().
  return {
    step(dt) { /* Advance your local simulation. The host owns the frame loop. */ },
    render() { /* Draw your renderer. Candidate render runs before activation. */ },
    serialize() { return structuredClone(state); },
    inspect() { return { progress: 'Source scaffold: gameplay not yet authored.' }; },
    dispose() { life.dispose(); }
  };
}
