import { initial, projection, distance } from './state.js';
import { simulation } from './simulation.js';
import { paint } from './paint.js';
import { capabilities, changeWorld } from './commands.js';
export default function create(host, { save }) {
  const s = initial(save),
    root = document.createElement('section');
  root.className = 'tl';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = host.asset('./style.css');
  root.append(css);
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    'Tidelight. Click water to sail. Space lift or release a nearby light. E ring your bell. P pause.'
  );
  root.append(canvas);
  const title = document.createElement('div');
  title.className = 'tl-title';
  title.textContent = 'TIDELIGHT';
  root.append(title);
  const hull = document.createElement('div');
  hull.className = 'tl-hull';
  root.append(hull);
  const hint = document.createElement('div');
  hint.className = 'tl-hint';
  root.append(hint);
  const note = document.createElement('div');
  note.className = 'tl-note';
  note.setAttribute('role', 'status');
  root.append(note);
  const controls = document.createElement('div');
  controls.className = 'tl-controls';
  controls.textContent =
    'Click water to sail · Space lift / release · E bell · P pause';
  root.append(controls);
  host.root.append(root);
  const ctx = canvas.getContext('2d');
  let time = 0,
    disposed = false;
  const pointer = { x: 0, y: 0 };
  const listeners = [];
  const emit = (type, text, data) => {
    host.emit(type, text, data);
    host.requestSave();
  };
  const sim = simulation(s, emit);
  const listen = (target, event, fn) => {
    target.addEventListener(event, fn);
    listeners.push(() => target.removeEventListener(event, fn));
  };
  function point(e) {
    const b = canvas.getBoundingClientRect(),
      scale = Math.min(b.width / 1600, b.height / 1000);
    return {
      x: (e.clientX - b.left - (b.width - 1600 * scale) / 2) / scale,
      y: (e.clientY - b.top - (b.height - 1000 * scale) / 2) / scale
    };
  }
  listen(canvas, 'pointerdown', (e) => {
    if (!host.active) return;
    canvas.focus();
    s.paused = false;
    s.target = point(e);
    s.ripples.push({ ...s.target, age: 0 });
  });
  listen(canvas, 'pointermove', (e) => Object.assign(pointer, point(e)));
  listen(window, 'keydown', (e) => {
    if (!host.active) return;
    const target = e.target;
    if (
      target instanceof Element &&
      (target.isContentEditable ||
        target.closest(
          'input, textarea, select, button, a[href], summary, [contenteditable], [role="button"], [role="textbox"], [role="combobox"]'
        ))
    )
      return;
    const k = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k))
      e.preventDefault();
    if (e.repeat) return;
    if (k === 'p') {
      s.paused = !s.paused;
      sim.keys.clear();
      host.requestSave();
      return;
    }
    if (s.paused) return;
    sim.keys.add(k);
    if (k === ' ') sim.interact();
    if (k === 'e') sim.pulse();
  });
  listen(window, 'keyup', (e) => sim.keys.delete(e.key.toLowerCase()));
  listen(window, 'blur', () => {
    sim.keys.clear();
    s.paused = true;
    host.requestSave();
  });
  listen(document, 'visibilitychange', () => {
    if (document.hidden) {
      sim.keys.clear();
      s.paused = true;
    }
  });
  return {
    step(dt) {
      if (!host.active || disposed) return;
      time += dt;
      sim.step(dt);
    },
    render() {
      const b = root.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio, 2);
      if (
        canvas.width !== Math.floor(b.width * dpr) ||
        canvas.height !== Math.floor(b.height * dpr)
      ) {
        canvas.width = Math.floor(b.width * dpr);
        canvas.height = Math.floor(b.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, s, { width: b.width, height: b.height, time, pointer });
      hull.textContent =
        s.region === 'undertide'
          ? '●'.repeat(Math.ceil(s.player.hp)) +
            '○'.repeat(5 - Math.ceil(s.player.hp))
          : '';
      hull.setAttribute('aria-label', `Hull ${Math.ceil(s.player.hp)} of 5`);
      note.textContent = s.paused
        ? 'Paused · click the water to return'
        : s.noticeLife > 0
          ? s.notice
          : '';
      const close = s.lanterns.find(
        (l) => l.id !== s.player.carrying && distance(l, s.player) < 90
      );
      hint.textContent = s.player.carrying
        ? 'Space · set light afloat'
        : close
          ? 'Space · lift light'
          : '';
    },
    serialize: () => structuredClone(s),
    inspect: () => projection(s),
    versions: () => ({ ...s.versions }),
    capabilities,
    command: (name, args) => changeWorld(s, name, args),
    dispose() {
      disposed = true;
      listeners.forEach((f) => f());
      root.remove();
    }
  };
}
