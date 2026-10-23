/** Optional owned wiring. input is gated; listen remains live for cleanup edges. */
export function createLifecycle(host) {
  const cleanups = [];
  let disposed = false;
  const own = cleanup => {
    if (disposed) throw new Error('This game instance is disposed.');
    if (typeof cleanup !== 'function') throw new TypeError('own() requires a cleanup function.');
    cleanups.push(cleanup);
    return cleanup;
  };
  const listen = (target, type, handler, options) => {
    if (disposed) throw new Error('This game instance is disposed.');
    // Capture the removal flag now, even if the caller later mutates options.
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    target.addEventListener(type, handler, options);
    return own(() => target.removeEventListener(type, handler, capture));
  };
  return {
    get active() { return !disposed && !!host.active; },
    own,
    listen, // keyup, pointercancel, blur, etc. can release input even while inactive.
    input(target, type, handler, options) {
      if (typeof handler !== 'function') throw new TypeError('input() requires a handler function.');
      return listen(target, type, event => {
        if (!disposed && host.active) handler.call(target, event);
      }, options);
    },
    save() { if (!disposed && host.active) return host.requestSave(); },
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
