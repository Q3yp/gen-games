import { toggleFork } from './mechanics/prism.js';
import { distance, clamp } from './geometry.js';
import { WIDTH, HEIGHT } from './simulation.js';
/** Pointer mechanics are game code. New plugins can intercept input or add controls. */
export function bindInput(
  canvas,
  getWorld,
  view,
  changed,
  mechanics,
  isActive = () => true
) {
  let drag = null;
  const point = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) * WIDTH) / box.width,
      y: ((event.clientY - box.top) * HEIGHT) / box.height
    };
  };
  const findBody = (p) =>
    getWorld()
      .bodies.filter((body) => body.draggable)
      .filter((body) => distance(body, p) < (body.length || 100) / 2 + 32)
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
  function down(event) {
    const world = getWorld();
    if (world.status === 'lost') return;
    const p = point(event);
    for (const mechanic of mechanics)
      if (mechanic.pointer?.('down', p, world, view, event)) return;
    const body = findBody(p);
    if (!body) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    view.selected = body.id;
    const r = distance(p, body),
      rotate =
        event.button === 2 ||
        event.shiftKey ||
        r > (body.length || 100) / 2 + 10 ||
        view.mode === 'rotate';
    drag = {
      id: body.id,
      mode: rotate ? 'rotate' : 'move',
      ox: p.x - body.x,
      oy: p.y - body.y,
      offset: body.angle - Math.atan2(p.y - body.y, p.x - body.x)
    };
    changed('begin', body);
    canvas.style.cursor = rotate ? 'crosshair' : 'grabbing';
  }
  function move(event) {
    const world = getWorld(),
      p = point(event);
    view.hover = findBody(p)?.id || null;
    if (!drag) {
      canvas.style.cursor = view.hover ? 'grab' : 'default';
      return;
    }
    const body = world.bodies.find((body) => body.id === drag.id);
    if (!body) return;
    if (drag.mode === 'rotate')
      body.angle = Math.atan2(p.y - body.y, p.x - body.x) + drag.offset;
    else {
      body.x = clamp(p.x - drag.ox, 175, WIDTH - 90);
      body.y = clamp(p.y - drag.oy, 155, HEIGHT - 125);
    }
    changed('move', body);
  }
  function up(event) {
    if (!drag) return;
    const body = getWorld().bodies.find((body) => body.id === drag.id);
    drag = null;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    changed('end', body);
  }
  function wheel(event) {
    const body =
      findBody(point(event)) ||
      getWorld().bodies.find((body) => body.id === view.selected);
    if (!body || getWorld().status === 'lost') return;
    event.preventDefault();
    view.selected = body.id;
    changed('begin', body);
    body.angle += Math.sign(event.deltaY) * (event.shiftKey ? 0.01 : 0.065);
    changed('end', body);
  }
  function key(event) {
    if (
      !isActive() ||
      !canvas.isConnected ||
      canvas.closest('.code-candidate') ||
      /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      document.querySelector('dialog[open]')
    )
      return;
    if (event.key === 'Tab') return;
    if (event.key === '1' || event.key === '2' || event.key === '3') {
      const body = getWorld().bodies.filter((body) => body.draggable)[
        Number(event.key) - 1
      ];
      if (body) {
        view.selected = body.id;
        changed('select', body);
      }
      return;
    }
    const body = getWorld().bodies.find((body) => body.id === view.selected);
    if (!body || getWorld().status === 'lost') return;
    if (event.key.toLowerCase() === 'f' && getWorld().prism?.enabled) {
      event.preventDefault();
      changed('begin', body);
      toggleFork(getWorld(), body);
      changed('end', body);
      return;
    }
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    }[event.key];
    if (direction) {
      event.preventDefault();
      changed('begin', body);
      body.x = clamp(
        body.x + direction[0] * (event.shiftKey ? 2 : 14),
        175,
        WIDTH - 90
      );
      body.y = clamp(
        body.y + direction[1] * (event.shiftKey ? 2 : 14),
        155,
        HEIGHT - 125
      );
      changed('end', body);
    } else if (['q', 'e', 'a', 'd'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      changed('begin', body);
      body.angle +=
        (['q', 'a'].includes(event.key.toLowerCase()) ? -1 : 1) *
        (event.shiftKey ? 0.01 : 0.065);
      changed('end', body);
    }
  }
  const context = (event) => event.preventDefault();
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  canvas.addEventListener('contextmenu', context);
  document.addEventListener('keydown', key);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('contextmenu', context);
    document.removeEventListener('keydown', key);
  };
}
