// The engine retains this arbitrary world when the renderer/rules are replaced.
export const stateMode = 'host';
export default function create(host) {
  const root = document.createElement('div');
  root.style.cssText = 'width:100%;height:100%;min-height:240px;display:grid;place-items:center;background:#10151c;color:#92a3b8';
  root.textContent = '○';
  root.setAttribute('aria-label', 'Empty authoring canvas. Gameplay has not been authored.');
  host.root.append(root);
  host.lifecycle.own(() => root.remove());
  // Author any canvas/DOM/WebGL renderer and local mechanics here.
  // host.world.read() is immutable. transact(draft => ...) changes your JSON.
  // host.lifecycle.input(...) wires gated input; the engine owns save/cleanup.
  // The shell's Ask host request channel needs no per-game implementation.
  return {
    step(dt) {},
    render() {},
    inspect() { return { progress: 'Empty authoring canvas', worldVersion: host.world.version }; }
  };
}
