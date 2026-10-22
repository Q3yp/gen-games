import { AREAS, ENEMY_NAMES, newWorld, distance, objective } from './world.js';
import { act, choose, interact, enemies, nextStep, message } from './rules.js';
import { paint } from './paint.js';

export default function create(host, { save }) {
  const w = save?.version === 1 ? structuredClone(save) : newWorld();
  let time = 0,
    travel = null,
    travelClock = 0,
    disposed = false,
    hover = null;
  const root = document.createElement('section');
  root.className = 'mf-game';
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = host.asset('./style.css');
  root.append(style);
  const stage = document.createElement('div');
  stage.className = 'mf-stage';
  root.append(stage);
  const canvas = document.createElement('canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    'Mossfall woodland RPG. WASD or arrows to move, Q pulse, Space brace, R tonic, E interact.'
  );
  canvas.width = 1100;
  canvas.height = 760;
  stage.append(canvas);
  const top = document.createElement('header');
  top.className = 'mf-top';
  stage.append(top);
  const side = document.createElement('aside');
  side.className = 'mf-side';
  stage.append(side);
  const bottom = document.createElement('footer');
  bottom.className = 'mf-bottom';
  stage.append(bottom);
  const modal = document.createElement('div');
  modal.className = 'mf-modal';
  stage.append(modal);
  host.root.append(root);
  const ctx = canvas.getContext('2d');
  const observer = new ResizeObserver(() => {
    const r = root.getBoundingClientRect();
    const scale = Math.min(r.width / 1100, r.height / 760);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  });
  observer.observe(root);
  function emit(type, text, data) {
    host.emit?.(type, text, data);
  }
  function persist() {
    host.requestSave?.();
  }
  function commit(action) {
    travel = null;
    const changed = act(w, action, emit);
    update();
    if (changed) persist();
    return changed;
  }
  function useObject(o) {
    travel = null;
    interact(w, o, emit);
    update();
    persist();
  }
  function nearbyObject() {
    return AREAS[w.area].objects
      .filter(
        (o) =>
          !w.areas[w.area].taken.includes(o.id) && distance(o, w.player) <= 1
      )
      .sort((a, b) => distance(a, w.player) - distance(b, w.player))[0];
  }
  function onKey(event) {
    if (
      !host.active ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.repeat
    )
      return;
    const key = event.key.toLowerCase();
    if (w.dialog) {
      if (key === 'escape' || key === 'enter') {
        choose(w, 'close');
        update();
        persist();
      }
      return;
    }
    const dirs = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0]
    };
    if (dirs[key]) {
      event.preventDefault();
      const [dx, dy] = dirs[key];
      commit({ type: 'move', dx, dy });
    } else if (key === ' ') {
      event.preventDefault();
      commit({ type: 'guard' });
    } else if (key === 'q') commit({ type: 'pulse' });
    else if (key === 'r') commit({ type: 'heal' });
    else if (key === 'e') {
      const o = nearbyObject();
      if (o) useObject(o);
      else {
        message(w, 'Stand beside a person, chest or seal to interact.');
        update();
      }
    }
  }
  function point(event) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((((event.clientX - r.left) * 1100) / r.width - 40) / 60),
      y: Math.floor((((event.clientY - r.top) * 760) / r.height - 105) / 60)
    };
  }
  function click(event) {
    if (!host.active || w.dialog) return;
    const tile = point(event),
      enemy = enemies(w).find((e) => e.x === tile.x && e.y === tile.y);
    if (
      enemy &&
      distance(enemy, w.player) <= (w.player.weapon === 'spear' ? 2 : 1)
    )
      return commit({ type: 'strike', id: enemy.id });
    const object = AREAS[w.area].objects.find(
      (o) =>
        o.x === tile.x &&
        o.y === tile.y &&
        !w.areas[w.area].taken.includes(o.id)
    );
    if (object && distance(object, w.player) <= 1) return useObject(object);
    const step = nextStep(w, tile.x, tile.y);
    if (!step) return;
    const originalArea = w.area;
    const inCombat = enemies(w).some((e) => distance(e, w.player) <= 6);
    commit({ type: 'move', dx: step[0], dy: step[1] });
    if (!inCombat && w.area === originalArea)
      travel = { ...tile, area: w.area, objectId: object?.id };
  }
  function onHover(e) {
    hover = point(e);
  }
  canvas.addEventListener('click', click);
  canvas.addEventListener('pointermove', onHover);
  window.addEventListener('keydown', onKey);
  function button(label, action, className = '') {
    const el = document.createElement('button');
    el.textContent = label;
    el.className = className;
    el.addEventListener('click', () => {
      if (host.active) action();
    });
    return el;
  }
  function update() {
    const p = w.player,
      area = AREAS[w.area];
    top.replaceChildren();
    const heading = document.createElement('div');
    heading.innerHTML = `<small>MOSSFALL · ${area.subtitle}</small><h1>${area.name}</h1>`;
    top.append(heading);
    const quest = document.createElement('p');
    quest.textContent = objective(w);
    top.append(quest);
    side.replaceChildren();
    const stats = document.createElement('div');
    stats.innerHTML = `<span class="mf-overline">LANTERN BEARER</span><strong>${p.hp}<i> / ${p.maxHp}</i></strong><span class="mf-health"><b style="width:${(100 * p.hp) / p.maxHp}%"></b></span><p>HEALTH</p><div class="mf-focus">${'◆'.repeat(p.focus)}${'◇'.repeat(p.maxFocus - p.focus)}</div><p>FOCUS</p><hr><h3>${p.weapon === 'spear' ? 'Briar spear' : p.weapon === 'axe' ? 'Hearth axe' : 'Traveler’s blade'}</h3><p>${p.talent ? `Oath: ${p.talent}` : 'No oath · visit anvil'}</p><p>${p.shards} amber · ${p.tonics} tonics</p><p>${w.seals.length}/2 seals · beat ${w.turn}</p>`;
    side.append(stats);
    const visible = enemies(w).filter((e) => distance(e, p) <= 7);
    if (visible.length) {
      const label = document.createElement('h4');
      label.textContent = 'THE NEXT BEAT';
      side.append(label);
      for (const e of visible) {
        const item = document.createElement('p');
        item.className = e.intent.length ? 'mf-danger' : '';
        item.textContent = `${ENEMY_NAMES[e.kind]} ${Math.max(0, e.hp)}/${e.maxHp} · ${e.stunned ? 'stunned' : e.intent.length ? 'STRIKES AMBER' : 'moving / readying'}`;
        side.append(item);
      }
    } else {
      const tip = document.createElement('p');
      tip.className = 'mf-tip';
      tip.textContent =
        'Time waits for you. Explore freely. Enemies act only when you move, strike, brace, pulse or heal.';
      side.append(tip);
    }
    bottom.replaceChildren();
    const log = document.createElement('div');
    log.className = 'mf-log';
    log.textContent = w.log.slice(-2).join('  ·  ');
    bottom.append(log);
    const controls = document.createElement('div');
    controls.className = 'mf-controls';
    controls.append(
      button(`Q · Pulse (${p.talent === 'wayfarer' ? 1 : 2} focus)`, () =>
        commit({ type: 'pulse' })
      ),
      button('Space · Brace +focus', () => commit({ type: 'guard' })),
      button(`R · Tonic (${p.tonics})`, () => commit({ type: 'heal' }))
    );
    const near = nearbyObject();
    if (near)
      controls.append(
        button(`E · ${near.name}`, () => useObject(near), 'mf-context')
      );
    bottom.append(controls);
    const help = document.createElement('small');
    help.textContent =
      'WASD / arrows to move · bump or click nearby enemy to strike · click objects to approach · amber = next attack · click to move one beat near foes';
    bottom.append(help);
    modal.replaceChildren();
    modal.hidden = !w.dialog;
    if (w.dialog) {
      const panel = document.createElement('div');
      panel.className = 'mf-dialog';
      const title = document.createElement('h2');
      title.textContent = w.dialog.title;
      const text = document.createElement('p');
      text.textContent = w.dialog.text;
      panel.append(title, text);
      for (const c of w.dialog.choices)
        panel.append(
          button(c.label, () => {
            choose(w, c.action);
            emit('mossfall.choice', c.label, { action: c.action });
            persist();
            update();
          })
        );
      modal.append(panel);
    }
  }
  update();
  return {
    serialize: () => structuredClone(w),
    step(dt) {
      if (disposed) return;
      time += dt;
      if (host.active && travel) {
        travelClock += dt;
        if (travelClock > 0.16) {
          travelClock = 0;
          if (
            travel.area !== w.area ||
            w.dialog ||
            enemies(w).some((e) => distance(e, w.player) <= 6)
          )
            travel = null;
          else {
            const target = travel,
              o = AREAS[w.area].objects.find((o) => o.id === target.objectId);
            if (o && distance(o, w.player) <= 1) useObject(o);
            else {
              const step = nextStep(w, target.x, target.y);
              if (!step) travel = null;
              else {
                act(w, { type: 'move', dx: step[0], dy: step[1] }, emit);
                update();
                persist();
              }
            }
          }
        }
      }
    },
    render() {
      paint(ctx, w, time);
      if (
        hover &&
        !w.dialog &&
        hover.x >= 0 &&
        hover.x < 15 &&
        hover.y >= 0 &&
        hover.y < 9
      ) {
        ctx.strokeStyle = 'rgba(255,239,192,.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(42 + hover.x * 60, 107 + hover.y * 60, 56, 56);
      }
    },
    inspect() {
      return {
        area: w.area,
        objective: objective(w),
        character: w.player,
        seals: w.seals,
        won: w.won,
        turn: w.turn,
        nearbyActors: enemies(w).map((e) => ({
          id: e.id,
          kind: e.kind,
          hp: e.hp,
          position: [e.x, e.y],
          nextAttack: e.intent
        })),
        claimedLoot: w.areas[w.area].taken,
        latest: w.log.slice(-3),
        commands: {
          help: 'Lists host commands',
          journal: 'Read persistent quest and character facts'
        }
      };
    },
    command(name, args = {}) {
      if (name === 'help' || name === 'journal')
        return {
          area: w.area,
          objective: objective(w),
          character: w.player,
          seals: w.seals,
          visited: Object.keys(w.areas).filter(
            (id) => w.areas[id].taken.length
          ),
          commands: ['help', 'journal']
        };
      throw new Error(
        `Unknown Mossfall command: ${name}. Available: help, journal.`
      );
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      canvas.removeEventListener('click', click);
      canvas.removeEventListener('pointermove', onHover);
      window.removeEventListener('keydown', onKey);
      root.remove();
    }
  };
}
