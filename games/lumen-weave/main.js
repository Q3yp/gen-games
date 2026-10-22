import mechanics from './mechanics/index.js';
import { toggleFork } from './mechanics/prism.js';
import { configureLanternTrial } from './mechanics/lantern.js';
import { newWorld, trace, step, WIDTH, HEIGHT } from './simulation.js';
import { createPainter } from './paint.js';
import { mountHUD } from './hud.js';
import { bindInput } from './input.js';
import { TAU } from './geometry.js';
/** The host supplies a surface and persistence, not the game's mechanics. */
export default function create(host, { save }) {
  let world = save?.bodies
    ? structuredClone(save)
    : newWorld(save?.seed || 8421, save?.round || 1, save?.best || 0);
  let time = 0,
    hudClock = 0,
    lastStatus = world.status,
    disposed = false,
    audio = null,
    muted = true,
    undo = [],
    paused = Boolean(world.tinkering),
    showHelp = false,
    resultsOpen = true;
  const view = {
    selected: 'shard-a',
    hover: null,
    mode: 'move',
    particles: [],
    ripples: []
  };
  for (const mechanic of mechanics) mechanic.install?.(world);
  function routeKey() {
    return `${world.seed}:${world.round}:${world.lantern?.enabled ? 'lantern' : world.prism?.enabled ? 'prism' : 'flowers'}`;
  }
  function recordRoute() {
    world.records ||= {};
    const key = routeKey();
    world.records[key] = Math.min(world.records[key] ?? Infinity, world.moves);
  }
  if (world.status === 'won') recordRoute();
  const { root, canvas, updateHUD } = mountHUD(host);
  const ctx = canvas.getContext('2d'),
    paint = createPainter();
  let optics = trace(world, mechanics),
    toastTime = 0;
  function resize() {
    const r = canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  function toast(text) {
    root.querySelector('.lw-toast').textContent = text;
    toastTime = 3;
  }
  function checkpoint(reason) {
    void (host.checkpoint?.(reason) || host.requestSave?.());
  }
  function note(type, text, data = {}) {
    host.emit?.(type, text, data);
  }
  function tone(frequency = 440, duration = 0.15) {
    if (muted) return;
    try {
      audio ||= new AudioContext();
      void audio.resume();
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime + duration
      );
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + duration);
    } catch {
      /* Sound is optional. */
    }
  }
  function burst(body) {
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * TAU,
        speed = 40 + Math.random() * 180;
      view.particles.push({
        x: body.x,
        y: body.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 1.5,
        max: 2.5,
        size: 2 + Math.random() * 4,
        color: body.color
      });
    }
    view.ripples.push({ x: body.x, y: body.y, life: 1, color: body.color });
    tone(330 + world.combo * 110, 0.65);
    toast(
      `${world.combo} / ${world.bodies.filter((item) => item.type === 'receiver').length} ${world.lantern?.enabled ? 'lanterns awake' : 'seeds blooming'} · +7 heartlight`
    );
    note('garden.bloom', 'A seed bloomed.', {
      id: body.id,
      elapsed: world.elapsed,
      moves: world.moves,
      score: world.score
    });
    checkpoint('bloom');
  }
  function changed(phase, body) {
    if (phase === 'begin') {
      undo.push(structuredClone(world));
      if (undo.length > 30) undo.shift();
      if (world.status === 'ready') world.status = 'playing';
    }
    if (phase === 'end') {
      world.moves++;
      tone(180 + Math.abs(body?.angle || 0) * 60, 0.05);
      note('garden.manipulate', 'A shard was moved or rotated.', {
        id: body?.id,
        x: body?.x,
        y: body?.y,
        angle: body?.angle,
        fork: Boolean(body?.fork),
        moves: world.moves
      });
    }
    optics = trace(world, mechanics);
    drawHUD();
  }
  const unbind = bindInput(
    canvas,
    () => world,
    view,
    changed,
    mechanics,
    () => host.active !== false
  );
  function reset(next = false) {
    const best = world.best,
      prism = world.prism?.enabled,
      lantern = world.lantern?.enabled,
      records = world.records || {};
    world = newWorld(world.seed, next ? world.round + 1 : world.round, best);
    world.records = records;
    for (const mechanic of mechanics) mechanic.install?.(world);
    if (world.prism) world.prism.enabled = Boolean(prism);
    if (lantern) configureLanternTrial(world);
    view.particles = [];
    view.ripples = [];
    undo = [];
    paused = false;
    showHelp = false;
    resultsOpen = true;
    lastStatus = 'ready';
    view.selected = 'shard-a';
    optics = trace(world, mechanics);
    drawHUD();
    note(
      'garden.run',
      next ? 'A new drift began.' : 'The constellation was retried.',
      { round: world.round, seed: world.seed }
    );
    checkpoint('new-run');
  }
  function drawHUD() {
    updateHUD({
      world,
      view,
      paused,
      showHelp,
      resultsOpen,
      undoCount: undo.length,
      bestRoute: world.records?.[routeKey()] ?? world.moves
    });
  }
  function click(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'reset') reset();
    if (action === 'next') reset(true);
    if (action === 'prism') {
      reset(true);
      world.prism.enabled = true;
      drawHUD();
      toast('A new law: fork the light. All flowers must shine together.');
      note(
        'garden.prism.start',
        'The player opted into a new simultaneous-light challenge.',
        { round: world.round }
      );
      checkpoint('prism-challenge');
    }
    if (action === 'lantern') {
      reset(true);
      configureLanternTrial(world);
      optics = trace(world, mechanics);
      drawHUD();
      toast(
        'A new material: lanterns drink light. Each needs a bright branch.'
      );
      note(
        'garden.lantern.start',
        'The player chose the absorbing-lantern trial.',
        { round: world.round }
      );
      checkpoint('lantern-trial');
    }
    if (action === 'flowers') {
      world.lantern.enabled = false;
      reset(true);
    }
    if (action === 'fork' && world.status !== 'lost') {
      const body = world.bodies.find((body) => body.id === view.selected);
      if (body) {
        changed('begin', body);
        toggleFork(world, body);
        changed('end', body);
      }
    }
    if (action === 'practice') {
      world.status = 'playing';
      world.energy = 85;
      paused = true;
      drawHUD();
      toast('Timer paused. Move the shards, then resume to grow seeds.');
    }
    if (action === 'pause') {
      paused = !paused;
      drawHUD();
      toast(
        paused
          ? 'Time is held. Plan your route in the light.'
          : 'The garden is listening again.'
      );
    }
    if (action === 'mode') {
      view.mode = view.mode === 'move' ? 'rotate' : 'move';
      drawHUD();
    }
    if (action === 'results') {
      resultsOpen = !resultsOpen;
      drawHUD();
    }
    if (action === 'help') {
      showHelp = !showHelp;
      drawHUD();
    }
    if (action === 'sound') {
      muted = !muted;
      event.target.textContent = muted ? 'Sound off' : 'Sound on';
      tone(440, 0.3);
    }
    if (action === 'undo' && undo.length) {
      const records = world.records;
      world = undo.pop();
      world.records = records;
      for (const mechanic of mechanics) mechanic.install?.(world);
      optics = trace(world, mechanics);
      drawHUD();
      note('garden.undo', 'The player undid a manipulation.');
    }
    if (action === 'left' || action === 'right') {
      const body = world.bodies.find((body) => body.id === view.selected);
      if (body && world.status !== 'lost') {
        changed('begin', body);
        body.angle += (action === 'left' ? -1 : 1) * 0.065;
        changed('end', body);
      }
    }
  }
  root.addEventListener('click', click);
  drawHUD();
  return {
    step(dt) {
      if (disposed) return;
      time += dt;
      hudClock += dt;
      optics = trace(world, mechanics);
      if (!paused) step(world, dt, optics, mechanics, burst);
      for (const particle of view.particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 1 - dt * 0.5;
        particle.vy += 14 * dt;
        particle.life -= dt;
      }
      view.particles = view.particles.filter((p) => p.life > 0);
      for (const ripple of view.ripples) ripple.life -= dt * 0.65;
      view.ripples = view.ripples.filter((r) => r.life > 0);
      if (toastTime > 0) {
        toastTime -= dt;
        if (toastTime <= 0) root.querySelector('.lw-toast').textContent = '';
      }
      if (world.status !== lastStatus) {
        lastStatus = world.status;
        if (world.status === 'won') recordRoute();
        drawHUD();
        if (['won', 'lost'].includes(world.status)) {
          note(
            `garden.${world.status}`,
            world.status === 'won'
              ? world.lantern?.enabled
                ? 'All lanterns awakened.'
                : 'All seeds bloomed.'
              : 'The heartlight ran out.',
            {
              score: world.score,
              moves: world.moves,
              elapsed: world.elapsed,
              round: world.round,
              prism: world.prism
            }
          );
          checkpoint('run-finished');
        }
      }
      if (hudClock > 0.2) {
        hudClock = 0;
        drawHUD();
      }
    },
    render() {
      paint(ctx, world, optics, view, time, mechanics);
    },
    serialize() {
      return { ...structuredClone(world), tinkering: paused };
    },
    inspect() {
      return {
        goal: world.lantern?.enabled
          ? 'Power all four absorbing lanterns at ≥20% source intensity simultaneously for 2 seconds. Lanterns stop light; flowers do not.'
          : world.prism?.enabled
            ? 'Keep every flower illuminated together for 2 seconds. Fork shards split light straight and reflected.'
            : 'Route light into all seeds before energy reaches zero.',
        status: world.status,
        paused,
        prism: world.prism,
        lantern: world.lantern,
        round: world.round,
        seed: world.seed,
        energy: world.energy,
        score: world.score,
        moves: world.moves,
        selected: view.selected,
        source: world.source,
        bodies: world.bodies,
        lit: [...optics.deposits],
        mechanics: mechanics.map((m) => m.id),
        controls:
          'Drag shard centers; drag end handles or wheel/Q/E to rotate. 1/2/3 selects, arrows move. Pause/tinker holds timer. In prism challenge, F forks selected shard into straight and reflected branches; flowers transmit light.'
      };
    },
    command(name, args) {
      for (const mechanic of mechanics) {
        const result = mechanic.command?.(name, args, world);
        if (result !== undefined) return result;
      }
      return {
        error: 'UNKNOWN_COMMAND',
        message: 'Author a mechanic module to add commands.'
      };
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      unbind();
      root.removeEventListener('click', click);
      void audio?.close();
      host.root.replaceChildren();
    }
  };
}
