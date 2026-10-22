import { initial, projection } from './state.js';
import { simulation } from './simulation.js';
import { paint } from './paint.js';
import { sound } from './sound.js';
import { capabilities, stagePassage } from './commands.js';

export default function create(host, { save }) {
  const s = initial(save);
  const root = document.createElement('section');
  root.className = 'ss';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = host.asset('./style.css');
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Sunspindle. WASD or arrows move. Click throws or recalls the sunweight. P pauses.');
  const title = document.createElement('div');
  title.className = 'ss-title';
  title.textContent = 'SUNSPINDLE';
  const health = document.createElement('div');
  health.className = 'ss-health';
  const notice = document.createElement('div');
  notice.className = 'ss-notice';
  notice.setAttribute('role', 'status');
  const controls = document.createElement('div');
  controls.className = 'ss-controls';
  controls.textContent = 'WASD move · click throw / recall · P pause';
  root.append(css, canvas, title, health, notice, controls);
  host.root.append(root);
  const ctx = canvas.getContext('2d');
  const audio = sound();
  const pointer = { x: 650, y: 430 };
  let time = 0, disposed = false;
  const off = [];
  const emit = (type, text, data) => {
    host.emit(type, text, data);
    host.requestSave();
  };
  const sim = simulation(s, emit);
  function listen(target, name, fn) {
    target.addEventListener(name, fn);
    off.push(() => target.removeEventListener(name, fn));
  }
  function point(e) {
    const b = canvas.getBoundingClientRect();
    const scale = Math.min(b.width / 1200, b.height / 800);
    return {
      x: (e.clientX - b.left - (b.width - 1200 * scale) / 2) / scale,
      y: (e.clientY - b.top - (b.height - 800 * scale) / 2) / scale
    };
  }
  listen(canvas, 'pointermove', e => Object.assign(pointer, point(e)));
  listen(canvas, 'pointerdown', e => {
    if (!host.active || e.button !== 0) return;
    canvas.focus();
    Object.assign(pointer, point(e));
    audio.unlock();
    if (s.paused) {
      s.paused = false;
      host.requestSave();
      return;
    }
    audio.play(s.orb.mode === 'held' ? 'throw' : 'recall');
    sim.throwOrRecall(pointer);
  });
  listen(window, 'keydown', e => {
    if (!host.active || e.repeat) return;
    if (e.target instanceof Element && e.target.closest('input,textarea,select,button,a,[contenteditable]')) return;
    const k = e.key.toLowerCase();
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
    if (k === 'p') {
      s.paused = !s.paused;
      sim.keys.clear();
      host.requestSave();
    } else if (!s.paused) sim.keys.add(k);
  });
  listen(window, 'keyup', e => sim.keys.delete(e.key.toLowerCase()));
  function pause() {
    sim.keys.clear();
    s.paused = true;
    host.requestSave();
  }
  listen(window, 'blur', pause);
  listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  let previousHp = s.player.hp, previousDefeated = s.defeated;
  const impactStates = new Map();
  return {
    step(dt) {
      if (disposed || !host.active) return;
      time += dt;
      sim.step(Math.min(dt, 0.04));
      if (s.player.hp < previousHp) audio.play('hurt');
      if (s.defeated > previousDefeated) audio.play('break');
      for (const enemy of s.enemies) {
        const old = impactStates.get(enemy.id) || { hit: 0, block: 0 };
        if ((enemy.blockFlash || 0) > old.block + .04) audio.play('block');
        else if ((enemy.flash || 0) > old.hit + .04) audio.play('hit');
        impactStates.set(enemy.id, { hit: enemy.flash || 0, block: enemy.blockFlash || 0 });
      }
      previousHp = s.player.hp;
      previousDefeated = s.defeated;
    },
    render() {
      const b = root.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
      const w = Math.floor(b.width * dpr), h = Math.floor(b.height * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(ctx, s, { width: b.width, height: b.height, time, pointer });
      health.textContent = '◆'.repeat(Math.max(0, Math.ceil(s.player.hp))) + '◇'.repeat(Math.max(0, s.player.maxHp - Math.ceil(s.player.hp)));
      health.setAttribute('aria-label', `Health ${s.player.hp} of ${s.player.maxHp}`);
      notice.textContent = s.paused ? (s.clock < .1 ? 'Click to enter the courtyard' : 'Paused · click to return') : s.noticeLife > 0 ? s.notice : '';
    },
    serialize: () => structuredClone(s),
    inspect: () => projection(s),
    versions: () => ({ ...s.versions }),
    capabilities,
    command: (name, args) => stagePassage(s, name, args, emit),
    dispose() {
      disposed = true;
      off.forEach(fn => fn());
      audio.close();
      root.remove();
    }
  };
}
