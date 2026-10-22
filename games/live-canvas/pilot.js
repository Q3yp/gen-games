// One optional game-owned mechanic, added in response to a real player's request.
// No engine schema, plot destination or generated-art dependency lives here.
export function createPilot({ root, stage, state, host, player, persist }) {
  state.versions.pilot ??= 0;
  state.pilot ??= { enabled: false, x: 50, progress: 0, passedGap: false, gap: { center: 62, width: 22 }, speed: 18 };
  state.pilot.legId ??= 'leg-1';
  state.pilot.courseLabel ??= 'Cloud gap';
  state.pilot.targetY ??= 40;
  state.pilot.completedLegs ??= state.pilot.passedGap ? [{ id: state.pilot.legId, label: state.pilot.courseLabel, x: state.pilot.x }] : [];
  const overlay = document.createElement('div');
  overlay.className = 'lc-pilot';
  overlay.innerHTML = '<div class="lc-gap"><span>Cloud gap</span></div><div class="lc-cloud left"></div><div class="lc-cloud right"></div><div class="lc-course"><i></i><b>▲</b></div><div class="lc-pilot-readout"></div>';
  root.append(overlay);
  const gap = overlay.querySelector('.lc-gap'), course = overlay.querySelector('.lc-course'), marker = course.querySelector('b'), band = course.querySelector('i'), readout = overlay.querySelector('.lc-pilot-readout');
  const held = new Set();
  let preview = null;
  const editing = target => target?.closest('input,textarea,select,[contenteditable="true"]');
  const direction = key => ['arrowleft', 'a'].includes(key) ? -1 : ['arrowright', 'd'].includes(key) ? 1 : 0;
  const aligned = p => Math.abs(p.x - p.gap.center) <= p.gap.width / 2;
  function render() {
    const p = preview || state.pilot;
    overlay.hidden = !p.enabled;
    const drift = p.enabled ? (p.x - 50) : 0;
    stage.style.setProperty('--pilot-drift', `${-drift * .35}px`);
    stage.style.setProperty('--pilot-roll', `${-drift * .025}deg`);
    stage.style.setProperty('--pilot-scale', p.enabled ? '1.06' : '1');
    gap.querySelector('span').textContent = p.courseLabel;
    gap.style.top = `${p.targetY - 11.5}%`;
    gap.style.left = `${p.gap.center}%`; gap.style.width = `${p.gap.width}%`;
    gap.classList.toggle('aligned', aligned(p));
    band.style.left = `${p.gap.center - p.gap.width / 2}%`; band.style.width = `${p.gap.width}%`;
    marker.style.left = `${p.x}%`;
    overlay.style.setProperty('--cloud-drift', `${-drift * 1.4}px`);
    const guidance = aligned(p) ? 'Heading aligned · coasting' : `${p.x < p.gap.center ? 'Steer right →' : '← Steer left'}${p.progress >= 88 ? ' · safely holding approach' : ' · coasting toward approach'}`;
    readout.textContent = p.passedGap ? `Reached ${p.courseLabel} · ← / → or A / D changes heading` : `${guidance} · ${Math.round(p.progress)}% to ${p.courseLabel} · release to hold heading`;
  }
  function finish(reason) {
    held.clear();
    if (!preview) return;
    const from = { x: state.pilot.x, progress: state.pilot.progress };
    state.pilot = preview; preview = null;
    state.versions.pilot++;
    render();
    player('pilot', { legId: state.pilot.legId, from, to: { x: state.pilot.x, progress: state.pilot.progress }, aligned: aligned(state.pilot), passedGap: state.pilot.passedGap, reason }, reason === 'gap-crossed' ? `You reached ${state.pilot.courseLabel}.` : 'Heading held; the rooftop keeps coasting.');
  }
  function down(event) {
    const key = event.key.toLowerCase();
    if (!direction(key) || editing(event.target) || event.ctrlKey || event.metaKey || event.altKey || !host.active || !state.pilot.enabled) return;
    event.preventDefault();
    if (!held.size && !event.repeat) {
      preview ??= structuredClone(state.pilot);
      // Invalidate older maneuver replies once, not on animation frames.
      state.versions.pilot++;
      player('pilot.start', { x: preview.x, progress: preview.progress }, 'You take the heading.');
    }
    held.add(key);
  }
  function up(event) {
    const key = event.key.toLowerCase();
    if (!held.has(key)) return;
    event.preventDefault(); held.delete(key);
    if (!held.size) finish('released');
  }
  const blur = () => finish('interrupted');
  const visibility = () => { if (document.hidden) finish('interrupted'); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);
  render();
  return {
    capability: { name: 'pilot.configure', description: 'Configure optional local steering. enabled required; gapCenter/gapWidth/speed optional. Preserves current course/history. nextLeg is a new unique leg ID; courseLabel and targetY label/place its marker. Coasts without held keys; arrows or A/D steer. Guards pilot and input.', scopes: ['pilot', 'input'], inputSchema: { type: 'object', required: ['enabled'], additionalProperties: false, properties: { enabled: { type: 'boolean' }, gapCenter: { type: 'number', minimum: 5, maximum: 95 }, gapWidth: { type: 'number', minimum: 10, maximum: 60 }, speed: { type: 'number', minimum: 5, maximum: 40 }, resetCourse: { type: 'boolean' }, nextLeg: { type: 'string', maxLength: 64 }, courseLabel: { type: 'string', maxLength: 80 }, targetY: { type: 'number', minimum: 12, maximum: 70 } } } },
    configure(args) {
      if (held.size) throw new Error('LIVE_CANVAS: Helm is held. Wait for its release before configuring.');
      const p = structuredClone(preview || state.pilot);
      if (typeof args.enabled !== 'boolean') throw new Error('LIVE_CANVAS: enabled must be boolean.');
      p.enabled = args.enabled;
      for (const [key, low, high] of [['gapCenter', 5, 95], ['gapWidth', 10, 60], ['speed', 5, 40]]) {
        if (args[key] !== undefined && (!Number.isFinite(args[key]) || args[key] < low || args[key] > high)) throw new Error(`LIVE_CANVAS: ${key} must be ${low}..${high}.`);
      }
      p.gap.center = args.gapCenter ?? p.gap.center;
      p.gap.width = args.gapWidth ?? p.gap.width;
      p.speed = args.speed ?? p.speed;
      if (p.gap.center - p.gap.width / 2 < 0 || p.gap.center + p.gap.width / 2 > 100) throw new Error('LIVE_CANVAS: Keep the full gap within 0..100.');
      if (args.courseLabel !== undefined && (typeof args.courseLabel !== 'string' || !args.courseLabel.trim() || args.courseLabel.length > 80)) throw new Error('LIVE_CANVAS: courseLabel must be 1–80 characters.');
      if (args.targetY !== undefined && (!Number.isFinite(args.targetY) || args.targetY < 12 || args.targetY > 70)) throw new Error('LIVE_CANVAS: targetY must be 12..70.');
      const nextId = args.nextLeg ?? (args.resetCourse === true ? `leg-${p.completedLegs.length + 2}` : null);
      if (nextId !== null) {
        if (typeof nextId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(nextId) || nextId === p.legId || p.completedLegs.some(leg => leg.id === nextId)) throw new Error('LIVE_CANVAS: nextLeg must be a new unique 1–64 character ID.');
        p.legId = nextId; p.progress = 0; p.passedGap = false;
      }
      p.courseLabel = args.courseLabel ?? p.courseLabel; p.targetY = args.targetY ?? p.targetY;
      preview = null; state.pilot = p; state.versions.pilot++; render(); persist();
      host.emit('pilot.configured', 'Local steering updated.', { ...p });
      return { pilot: structuredClone(p), versions: { ...state.versions } };
    },
    step(dt) {
      if (!host.active || document.hidden || !state.pilot.enabled) return;
      if (!preview && state.pilot.passedGap && !held.size) return;
      preview ??= structuredClone(state.pilot);
      const sign = Math.sign([...held].reduce((sum, key) => sum + direction(key), 0));
      const elapsed = Math.max(0, Math.min(.05, dt));
      preview.x = Math.max(0, Math.min(100, preview.x + sign * preview.speed * elapsed));
      if (!preview.passedGap) {
        if (aligned(preview) || preview.progress < 88) preview.progress = Math.min(aligned(preview) ? 100 : 88, preview.progress + elapsed * 18);
        if (preview.progress >= 100) {
          preview.passedGap = true;
          preview.completedLegs.push({ id: preview.legId, label: preview.courseLabel, x: preview.x });
          finish('gap-crossed'); return;
        }
      }
      render();
    },
    // Save actual navigation progress, not frame counters or key/pointer noise.
    snapshot: () => structuredClone(preview || state.pilot),
    inspect: () => ({ ...structuredClone(preview || state.pilot), maneuvering: held.size > 0, coasting: Boolean((preview || state.pilot).enabled && !(preview || state.pilot).passedGap) }),
    refresh: render,
    dispose() {
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', visibility);
      overlay.remove();
    }
  };
}
