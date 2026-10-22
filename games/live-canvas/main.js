import { initial, patch, validate, projection } from './state.js';

export default function create(host, { save }) {
  const state = save?.version === 1 ? structuredClone(save) : initial();
  validate(state.world);
  let selected = null, drag = null, disposed = false;
  const root = document.createElement('section');
  root.className = 'lc';
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = host.asset('./style.css');
  root.append(style);
  const stage = document.createElement('div');
  stage.className = 'lc-stage';
  stage.setAttribute('aria-label', 'Live world. Select things, drag movable things, or describe an intention.');
  root.append(stage);
  const caption = document.createElement('p');
  caption.className = 'lc-caption';
  root.append(caption);
  const controls = document.createElement('div');
  controls.className = 'lc-controls';
  const choices = document.createElement('div');
  choices.className = 'lc-choices';
  controls.append(choices);
  const form = document.createElement('form');
  const input = document.createElement('input');
  input.placeholder = 'What do you want to do?';
  input.maxLength = 1000;
  input.setAttribute('aria-label', 'Your intention');
  const send = document.createElement('button');
  send.textContent = 'Act';
  form.append(input, send);
  controls.append(form);
  const status = document.createElement('div');
  status.className = 'lc-status';
  status.setAttribute('role', 'status');
  status.textContent = 'An empty canvas. Your live director creates what comes next.';
  controls.append(status);
  root.append(controls);
  host.root.append(root);

  const src = asset => asset?.src?.startsWith('./') ? host.asset(asset.src) : asset?.src;
  function persist() { host.requestSave?.(); }
  function player(kind, data, acknowledgment) {
    state.versions.input++;
    state.lastInput = { sequence: state.versions.input, kind, ...data };
    status.textContent = acknowledgment;
    // Player intent is untrusted game input, never executable source or authority.
    host.emit('player.intent', acknowledgment, { ...state.lastInput, source: 'player', untrusted: true });
    persist();
  }
  function position(event) {
    const r = stage.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - r.left) / r.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - r.top) / r.height * 100)) };
  }
  function actions() {
    choices.replaceChildren();
    const thing = state.world.things[selected];
    for (const action of [...state.world.actions, ...(thing?.actions || [])]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.onclick = () => {
        if (!host.active) return;
        const target = thing?.actions?.includes(action) ? selected : null;
        player('action', { target, action: action.id, label: action.label, data: action.data ?? null }, `You chose: ${action.label}`);
      };
      choices.append(button);
    }
  }
  function renderWorld() {
    drag = null;
    stage.replaceChildren();
    stage.style.backgroundColor = state.world.background.color;
    const background = src(state.world.assets[state.world.background.asset]);
    // Assign an image element, never interpolate authored URLs into CSS/HTML.
    if (background) {
      const image = document.createElement('img');
      image.className = 'lc-background'; image.src = background; image.alt = '';
      stage.append(image);
    }
    caption.textContent = state.world.caption;
    for (const [key, thing] of Object.entries(state.world.things)) {
      if (thing.hidden) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `lc-thing${selected === key ? ' selected' : ''}`;
      el.dataset.id = key;
      el.style.left = `${thing.x}%`; el.style.top = `${thing.y}%`;
      el.style.width = `${thing.width}%`; el.style.height = `${thing.height}%`;
      el.style.zIndex = String((thing.z || 0) + 101);
      el.setAttribute('aria-label', `${thing.label}${thing.draggable ? ', draggable' : ''}`);
      el.classList.toggle('draggable', Boolean(thing.draggable));
      const imageSrc = src(state.world.assets[thing.asset]);
      if (imageSrc) {
        const image = document.createElement('img');
        image.src = imageSrc; image.alt = ''; image.draggable = false;
        el.append(image);
      }
      const label = document.createElement('span');
      label.className = 'lc-label'; label.textContent = thing.label;
      el.append(label);
      if (thing.emotion) {
        const emotion = document.createElement('span');
        emotion.className = 'lc-emotion'; emotion.textContent = thing.emotion;
        el.append(emotion);
      }
      if (thing.speech) {
        const speech = document.createElement('span');
        speech.className = 'lc-speech'; speech.textContent = thing.speech;
        el.append(speech);
      }
      el.onpointerdown = event => {
        if (!host.active || event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        selected = key;
        stage.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
        el.classList.add('selected'); actions();
        const origin = position(event);
        drag = { key, el, pointer: event.pointerId, origin, start: { x: thing.x, y: thing.y }, moved: false, destination: { x: thing.x, y: thing.y } };
        el.setPointerCapture(event.pointerId);
      };
      el.onkeydown = event => {
        if (!host.active || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault(); selected = key; renderWorld();
        player('select', { target: key }, `You selected ${thing.label}.`);
      };
      stage.append(el);
    }
    if (!state.world.things[selected] || state.world.things[selected].hidden) selected = null;
    actions();
  }
  stage.onpointermove = event => {
    if (!drag || event.pointerId !== drag.pointer || !host.active) return;
    const p = position(event), thing = state.world.things[drag.key];
    if (!thing?.draggable) return;
    if (Math.hypot(p.x - drag.origin.x, p.y - drag.origin.y) > 0.5) drag.moved = true;
    if (drag.moved) {
      drag.destination = { x: Math.max(0, Math.min(100, drag.start.x + p.x - drag.origin.x)), y: Math.max(0, Math.min(100, drag.start.y + p.y - drag.origin.y)) };
      drag.el.style.left = `${drag.destination.x}%`; drag.el.style.top = `${drag.destination.y}%`;
    }
  };
  stage.onpointerup = event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const d = drag; drag = null;
    if (!host.active) { renderWorld(); return; }
    const thing = state.world.things[d.key];
    if (d.moved) {
      Object.assign(thing, d.destination);
      state.versions.world++;
      player('drag', { target: d.key, from: d.start, to: d.destination }, `You moved ${thing.label}.`);
    } else player('select', { target: d.key }, `You selected ${thing.label}.`);
  };
  stage.onpointercancel = () => { if (drag) renderWorld(); };
  stage.onpointerdown = event => {
    if (!host.active || event.button !== 0 || event.target.closest('.lc-thing')) return;
    selected = null; renderWorld();
    const p = position(event);
    const marker = document.createElement('span');
    marker.className = 'lc-marker'; marker.style.left = `${p.x}%`; marker.style.top = `${p.y}%`;
    marker.onanimationend = () => marker.remove(); stage.append(marker);
    player('point', { position: p }, 'You indicated a place.');
  };
  form.onsubmit = event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!host.active || !text) return;
    input.value = '';
    player('text', { target: selected, text }, 'Your intention was heard.');
  };
  renderWorld();
  return {
    serialize: () => structuredClone(state),
    inspect: () => projection(state),
    versions: () => ({ ...state.versions }),
    capabilities: () => [
      { name: 'world.apply', description: 'Atomically set/delete paths relative to this game-owned world. Validate whole result before mutation. Arrays replaced whole. See games/live-canvas/AUTHORING.md.', scopes: ['world', 'input'], inputSchema: { type: 'object', required: ['operations'], additionalProperties: false, properties: { operations: { type: 'array', minItems: 1, maxItems: 100 }, note: { type: 'string', maxLength: 500 } } } },
      { name: 'asset.bind', description: 'Bind generated image URL to an existing asset placeholder, without remounting or changing story state. Guard assets version. Use /assets/ URL returned by asset import.', scopes: ['assets'], inputSchema: { type: 'object', required: ['id', 'src'], additionalProperties: false, properties: { id: { type: 'string', maxLength: 64 }, src: { type: 'string', maxLength: 500000 } } } }
    ],
    command(name, args) {
      if (disposed) throw new Error('LIVE_CANVAS: Instance disposed. Re-observe active release.');
      let next;
      if (name === 'world.apply') next = patch(state.world, args.operations);
      else if (name === 'asset.bind') {
        if (!Object.hasOwn(state.world.assets, args.id)) throw new Error('LIVE_CANVAS: Asset placeholder missing. Create it with world.apply first.');
        next = patch(state.world, [{ op: 'set', path: ['assets', args.id, 'src'], value: args.src }]);
      } else throw new Error('LIVE_CANVAS: Unknown command. Discover world.apply or asset.bind.');
      if (JSON.stringify(next) === JSON.stringify(state.world)) return { applied: true, changed: false, versions: { ...state.versions } };
      const assetsChanged = JSON.stringify(next.assets) !== JSON.stringify(state.world.assets);
      state.world = next;
      if (name === 'world.apply') state.versions.world++;
      if (assetsChanged) state.versions.assets++;
      renderWorld();
      status.textContent = '';
      host.emit('world.changed', args.note || (name === 'asset.bind' ? 'A visual is ready.' : 'The world changed.'), { command: name, versions: { ...state.versions } });
      persist();
      return { applied: true, changed: true, versions: { ...state.versions } };
    },
    dispose() { disposed = true; root.remove(); }
  };
}
