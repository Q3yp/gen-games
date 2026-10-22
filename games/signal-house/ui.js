/** A normal, trusted ESM UI module. It reads snapshots and dispatches named actions only. */
export default function createUI({ root, dispatch, asset, escapeHTML }) {
  let current = null, busy = false, error = '', draft = '', disposed = false;
  const escape = escapeHTML || (value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])));
  const safe = value => escape(String(value ?? ''));
  const stylesheetURL = new URL('./ui.css', import.meta.url);
  stylesheetURL.search = new URL(import.meta.url).search;
  function match(state, rule) {
    if (rule == null) return true;
    if (typeof rule === 'boolean') return rule;
    if (Array.isArray(rule)) return rule.every(entry => match(state, entry));
    if (rule.all) return rule.all.every(entry => match(state, entry));
    if (rule.any) return rule.any.some(entry => match(state, entry));
    if (rule.not) return !match(state, rule.not);
    if (rule.hasItem) return state.entities[state.player]?.components?.inventory?.items?.includes(rule.hasItem);
    if (rule.entityAlive) return Boolean(state.entities[rule.entityAlive] && (!state.entities[rule.entityAlive].components.stats || state.entities[rule.entityAlive].components.stats.health > 0));
    const value = (rule.path || []).reduce((record, key) => ['__proto__', 'prototype', 'constructor'].includes(key) ? undefined : record?.[key], state);
    if ('equals' in rule) return value === rule.equals;
    if ('notEquals' in rule) return value !== rule.notEquals;
    if ('gte' in rule) return typeof value === 'number' && value >= rule.gte;
    if ('lte' in rule) return typeof value === 'number' && value <= rule.lte;
    if ('gt' in rule) return typeof value === 'number' && value > rule.gt;
    if ('lt' in rule) return typeof value === 'number' && value < rule.lt;
    if ('exists' in rule) return (value !== undefined) === rule.exists;
    if ('includes' in rule) return (Array.isArray(value) || typeof value === 'string') && value.includes(rule.includes);
    return Boolean(value);
  }
  function url(id) {
    const entry = typeof asset === 'function' ? asset(id) : null;
    return typeof entry === 'string' ? entry : entry?.src || current?.state.assets?.[id]?.src || '';
  }
  function render() {
    if (!current || disposed) return;
    const state = current.state, room = state.scenes[state.scene], vars = state.variables || {};
    const focused = root.querySelector('[data-role="speech"]') === document.activeElement;
    const selection = focused ? document.activeElement.selectionStart : null;
    const choices = (room.choices || []).filter(choice => match(state, choice.when) && !(choice.once && vars.visitedChoices?.[choice.id]));
    const conversation = (state.conversation || []).filter(line => line.scene === state.scene).slice(-4);
    const reply = state.dialogue?.reply;
    if (reply && (!reply.scene || reply.scene === state.scene) && !conversation.some(line => line.text === reply.text && line.speaker === reply.speaker)) conversation.push(reply);
    const directorMode = state.dialogue?.mode === 'director';
    const waiting = state.dialogue?.pending?.scene === state.scene;
    const trust = vars.trust >= 2 ? 'A shared promise' : vars.trust < 0 ? 'An uneasy silence' : 'Getting acquainted';
    // A live director can replace or hide stock milestones without falsifying story flags.
    const defaultProgress = [
      { label: trust, done: vars.trust >= 2 },
      { label: vars.coilRepaired ? vars.unstableCoil ? 'Coil · unstable' : 'Coil · repaired' : 'Coil · missing', done: Boolean(vars.coilRepaired && !vars.unstableCoil) },
      { label: vars.frequencyFound ? '88.4 · tuned' : 'Frequency · unknown', done: Boolean(vars.frequencyFound) },
      { label: vars.memoryFound ? 'A memory to hold' : 'An unfinished memory', done: Boolean(vars.memoryFound) }
    ];
    const progress = (Array.isArray(room.progress) ? room.progress : defaultProgress).filter(item => item && typeof item.label === 'string');
    const progressHTML = progress.map(item => `<span class="sh-chip ${item.done === true ? 'done' : ''}">${safe(item.label)}</span>`).join('');
    const endingNote = typeof room.endingNote === 'string' ? room.endingNote : 'This chapter is complete. Your journey is saved. Start a new run whenever you want to explore another path.';

    root.innerHTML = `<link rel="stylesheet" href="${safe(stylesheetURL.href)}"><section class="signal-house" aria-label="Signal House adventure"><div class="sh-grid"><aside class="sh-art"><img src="${safe(url(room.background || 'house'))}" alt="${safe(state.assets[room.background || 'house']?.alt || 'Signal House')}"/><span class="sh-logo">A story at the edge of the sea</span><div class="sh-art-copy"><p class="sh-wordmark">Signal<br>House</p><div class="sh-rule"></div><p class="sh-tag">Some voices are worth<br>keeping a light for.</p></div></aside><div class="sh-story"><p class="sh-eyebrow">${safe(room.chapter || 'The midnight band')}</p>${room.portrait ? `<img class="sh-portrait" src="${safe(url(room.portrait))}" alt="${safe(state.assets[room.portrait]?.alt)}"/>` : ''}<h2 class="sh-title">${safe(room.name)}</h2><p class="sh-prose">${safe(room.description)}</p><div class="sh-status" aria-label="Story progress">${directorMode ? '<span class="sh-chip done">Director mode</span>' : ''}${progressHTML}</div>${conversation.length ? `<div class="sh-exchange" role="log" aria-live="polite">${conversation.map(line => `<div class="sh-line ${line.speaker === 'You' ? 'you' : ''}"><span class="sh-speaker">${safe(line.speaker || 'Narrator')}</span><p>${safe(line.text)}</p></div>`).join('')}</div>` : ''}${vars.outcome ? `<div class="sh-ending"><strong>${safe(vars.ending || 'The story is yours now.')}</strong>${endingNote ? `<p>${safe(endingNote)}</p>` : ''}</div>` : `<p class="sh-label">What will you do?</p><div class="sh-choices">${choices.map(choice => `<button type="button" class="sh-choice" data-choice="${safe(choice.id)}" ${busy || !match(state, choice.requires) ? 'disabled' : ''}><span class="sh-arrow" aria-hidden="true">↗</span>${safe(choice.label)}</button>`).join('')}</div><form class="sh-speech"><input data-role="speech" aria-label="Speak into the signal" placeholder="Say something into the quiet…" maxlength="1000" autocomplete="off" value="${safe(draft)}"/><button type="submit" ${busy ? 'disabled' : ''}>Speak</button></form><p class="sh-hint">${directorMode ? 'Director mode: all free text waits for a connected director to answer. A director is not attached automatically. Story choices still advance the mystery.' : 'Authored dialogue: try asking about Mara, the promise, or the signal. Story choices advance the mystery.'}</p>${waiting ? '<p class="sh-pending" role="status">Your words are waiting on the midnight band. A connected director can answer.</p>' : ''}`}${error ? `<p class="sh-error" role="alert">${safe(error)}</p>` : ''}<aside class="sh-notebook"><p class="sh-label">Field notes</p><p>${safe(vars.lastNote || room.objective)}</p></aside></div></div></section>`;
    if (focused && !vars.outcome) {
      const input = root.querySelector('[data-role="speech"]');
      input?.focus({ preventScroll: true });
      if (selection != null) input?.setSelectionRange(selection, selection);
    }
  }
  async function act(action, args) {
    if (busy || disposed) return;
    busy = true; error = ''; render();
    try {
      const response = await dispatch(action, args);
      if (response?.ok === false) throw new Error(response.error?.message || 'The signal did not reach the house.');
      if (response?.session) current = response.session;
    } catch (caught) { error = caught?.message || 'The signal was interrupted. Try again.'; }
    finally { busy = false; render(); }
  }
  function click(event) {
    const button = event.target.closest('[data-choice]');
    if (button && root.contains(button)) act('narrative.choose', { choice: button.dataset.choice });
  }
  function input(event) { if (event.target.matches('[data-role="speech"]')) draft = event.target.value; }
  function submit(event) {
    if (!event.target.matches('.sh-speech')) return;
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    draft = '';
    act('narrative.say', { text });
  }
  root.addEventListener('click', click);
  root.addEventListener('input', input);
  root.addEventListener('submit', submit);
  return {
    ownsInteraction: true,
    update(session) { current = session; render(); },
    dispose() { disposed = true; root.removeEventListener('click', click); root.removeEventListener('input', input); root.removeEventListener('submit', submit); root.innerHTML = ''; }
  };
}
