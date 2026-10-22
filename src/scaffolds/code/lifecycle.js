/** Optional local wiring only. Replace it freely; no renderer or save shape is imposed. */
export function createLifecycle(host) {
  const cleanups = [];
  let disposed = false;
  const own = cleanup => {
    if (disposed) throw new Error('This game instance is disposed.');
    cleanups.push(cleanup);
    return cleanup;
  };
  const listen = (target, type, handler, options) => {
    if (disposed) throw new Error('This game instance is disposed.');
    target.addEventListener(type, handler, options);
    return own(() => target.removeEventListener(type, handler, options));
  };
  return {
    get active() { return !disposed && host.active; },
    own,
    listen, // Use for keyup, pointercancel, blur, and other cleanup edges even while inactive.
    input(target, type, handler, options) {
      return listen(target, type, event => {
        if (!disposed && host.active) handler.call(target, event);
      }, options);
    },
    save() { if (!disposed) host.requestSave(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors = [];
      for (const cleanup of cleanups.reverse()) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      cleanups.length = 0;
      if (errors.length) throw new AggregateError(errors, 'Game cleanup failed.');
    }
  };
}
