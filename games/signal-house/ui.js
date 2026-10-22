/** A normal, trusted ESM UI module. It reads snapshots and dispatches named actions only. */
export default function createUI({ root, dispatch, asset, escapeHTML }) {
  let current = null, busy = false, error = '', draft = '', disposed = false;
  const escape = escapeHTML || (value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])));
  const safe = value => escape(String(value ?? ''));
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
    const waiting = state.dialogue?.pending?.scene === state.scene;
    const trust = vars.trust >= 2 ? 'A shared promise' : vars.trust < 0 ? 'An uneasy silence' : 'Getting acquainted';
    root.innerHTML = `<style>
      .signal-house{--sh-ink:#e9e4d8;--sh-muted:#a9b2b8;--sh-line:#ffffff18;--sh-accent:#dfbd83;color:var(--sh-ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#17232c;border:1px solid var(--sh-line);border-radius:16px;overflow:hidden;min-height:650px}
      .signal-house *{box-sizing:border-box}.signal-house button,.signal-house input{font:inherit}.signal-house button:focus-visible,.signal-house input:focus-visible{outline:2px solid #e7c992;outline-offset:3px}
      .signal-house .sh-grid{display:grid;grid-template-columns:minmax(260px,.86fr) minmax(380px,1.14fr)}.signal-house .sh-art{min-height:650px;position:relative;isolation:isolate;background:#263544;overflow:hidden}.signal-house .sh-art>img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:-2}.signal-house .sh-art:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0a15252b 35%,#11222aeb);z-index:-1}
      .signal-house .sh-logo{position:absolute;top:30px;left:30px;text-transform:uppercase;letter-spacing:.22em;font-size:10px;color:#eee7d9}.signal-house .sh-art-copy{position:absolute;bottom:34px;left:30px;right:30px}.signal-house .sh-wordmark{font:400 clamp(42px,5vw,70px)/.98 Georgia,serif;letter-spacing:-.04em;margin:0 0 20px}.signal-house .sh-rule{width:34px;height:1px;background:var(--sh-accent);margin:22px 0}.signal-house .sh-tag{font:italic 16px/1.6 Georgia,serif;color:#d6d9d7;max-width:250px;margin:0}
      .signal-house .sh-story{padding:30px 32px 25px;min-width:0}.signal-house .sh-eyebrow{font-size:9px;letter-spacing:.2em;color:var(--sh-accent);text-transform:uppercase;margin:0 0 13px}.signal-house .sh-title{font:400 clamp(28px,3.3vw,42px)/1.12 Georgia,serif;letter-spacing:-.025em;margin:0 0 18px}.signal-house .sh-prose{font:16px/1.78 Georgia,serif;color:#d9dedb;margin:0 0 24px}.signal-house .sh-portrait{float:right;width:50px;height:60px;object-fit:cover;object-position:50% 20%;border:1px solid #dbc38a44;border-radius:30px;margin:0 0 10px 15px}
      .signal-house .sh-status{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 23px}.signal-house .sh-chip{font-size:9px;letter-spacing:.035em;color:#aab7bf;border:1px solid var(--sh-line);padding:6px 9px;border-radius:20px}.signal-house .sh-chip.done{color:#d9c391;border-color:#d9c39144;background:#d9c39109}.signal-house .sh-label{font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#91a0ab;margin:0 0 10px}.signal-house .sh-choices{display:grid;grid-template-columns:1fr;gap:7px}.signal-house .sh-choice{width:100%;text-align:left;border:1px solid #92a5b321;color:#dddcd3;border-radius:7px;padding:11px 13px;background:#20303a;cursor:pointer;font-size:12px;line-height:1.45;transition:background .15s,border-color .15s}.signal-house .sh-choice:hover:not(:disabled){background:#2b3c46;border-color:#d6bd7c66}.signal-house .sh-choice:disabled{opacity:.45;cursor:default}.signal-house .sh-arrow{float:right;color:var(--sh-accent);padding-left:12px}
      .signal-house .sh-exchange{border-left:1px solid #c5ab713d;margin:22px 0 18px;padding-left:14px}.signal-house .sh-line{margin:0 0 12px}.signal-house .sh-speaker{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--sh-accent);display:block;margin-bottom:4px}.signal-house .sh-line p{font:14px/1.65 Georgia,serif;color:#c8d0cf;margin:0}.signal-house .sh-line.you p{color:#92a3ad}.signal-house .sh-speech{display:flex;gap:8px;margin-top:20px}.signal-house .sh-speech input{min-width:0;flex:1;background:#12202a;border:1px solid #8a9ba22b;border-radius:7px;color:#e4dfd2;padding:11px 12px;font-size:12px}.signal-house .sh-speech button{border:1px solid #cfb57c55;border-radius:7px;background:#d9bf83;color:#20303a;padding:0 15px;cursor:pointer;font-size:11px}.signal-house .sh-speech button:disabled{opacity:.5;cursor:default}.signal-house .sh-hint{font-size:10px;line-height:1.6;color:#7f94a2;margin:8px 0 0}.signal-house .sh-notebook{border-top:1px solid var(--sh-line);margin-top:23px;padding-top:16px;color:#aeb9bc;font-size:11px;line-height:1.6}.signal-house .sh-notebook p{margin:0}.signal-house .sh-ending{padding:17px;border:1px solid #d9bf8340;border-radius:8px;margin:22px 0;background:#d9bf8307}.signal-house .sh-ending strong{font:20px Georgia,serif;font-weight:400;color:#e7cc92}.signal-house .sh-ending p{font-size:11px;color:#b7c0c0;line-height:1.7;margin:8px 0 0}.signal-house .sh-error{color:#f0ac94;font-size:12px;line-height:1.5;margin:12px 0 0}.signal-house .sh-pending{font-size:10px;line-height:1.7;color:#ceb98f;font-style:italic}
      @media(max-width:900px){.signal-house .sh-grid{grid-template-columns:minmax(190px,.7fr) minmax(300px,1.3fr)}.signal-house .sh-story{padding:25px}.signal-house .sh-art-copy,.signal-house .sh-logo{left:22px}.signal-house .sh-wordmark{font-size:48px}}@media(max-width:640px){.signal-house .sh-grid{grid-template-columns:1fr}.signal-house .sh-art{min-height:250px;height:250px}.signal-house .sh-art>img{object-position:50% 41%}.signal-house .sh-logo{top:20px}.signal-house .sh-art-copy{bottom:22px}.signal-house .sh-wordmark{font-size:40px;margin-bottom:0}.signal-house .sh-tag,.signal-house .sh-rule{display:none}.signal-house .sh-story{padding:25px 20px}.signal-house .sh-prose{font-size:16px}.signal-house .sh-choice{font-size:13px;padding:13px}}
      @media(prefers-reduced-motion:reduce){.signal-house *{transition:none!important}}
    </style><section class="signal-house" aria-label="Signal House adventure"><div class="sh-grid"><aside class="sh-art"><img src="${safe(url(room.background || 'house'))}" alt="${safe(state.assets[room.background || 'house']?.alt || 'Signal House')}"/><span class="sh-logo">A story at the edge of the sea</span><div class="sh-art-copy"><p class="sh-wordmark">Signal<br>House</p><div class="sh-rule"></div><p class="sh-tag">Some voices are worth<br>keeping a light for.</p></div></aside><div class="sh-story"><p class="sh-eyebrow">${safe(room.chapter || 'The midnight band')}</p>${room.portrait ? `<img class="sh-portrait" src="${safe(url(room.portrait))}" alt="${safe(state.assets[room.portrait]?.alt)}"/>` : ''}<h2 class="sh-title">${safe(room.name)}</h2><p class="sh-prose">${safe(room.description)}</p><div class="sh-status" aria-label="Story progress"><span class="sh-chip ${vars.trust >= 2 ? 'done' : ''}">${safe(trust)}</span><span class="sh-chip ${vars.coilRepaired && !vars.unstableCoil ? 'done' : ''}">${vars.coilRepaired ? vars.unstableCoil ? 'Coil · unstable' : 'Coil · repaired' : 'Coil · missing'}</span><span class="sh-chip ${vars.frequencyFound ? 'done' : ''}">${vars.frequencyFound ? '88.4 · tuned' : 'Frequency · unknown'}</span><span class="sh-chip ${vars.memoryFound ? 'done' : ''}">${vars.memoryFound ? 'A memory to hold' : 'An unfinished memory'}</span></div>${conversation.length ? `<div class="sh-exchange" role="log" aria-live="polite">${conversation.map(line => `<div class="sh-line ${line.speaker === 'You' ? 'you' : ''}"><span class="sh-speaker">${safe(line.speaker || 'Narrator')}</span><p>${safe(line.text)}</p></div>`).join('')}</div>` : ''}${vars.outcome ? `<div class="sh-ending"><strong>${safe(vars.ending || 'The story is yours now.')}</strong><p>You reached one of three endings. Start a new session from the game menu to follow a different path.</p></div>` : `<p class="sh-label">What will you do?</p><div class="sh-choices">${choices.map(choice => `<button type="button" class="sh-choice" data-choice="${safe(choice.id)}" ${busy || !match(state, choice.requires) ? 'disabled' : ''}><span class="sh-arrow" aria-hidden="true">↗</span>${safe(choice.label)}</button>`).join('')}</div><form class="sh-speech"><input data-role="speech" aria-label="Speak into the signal" placeholder="Say something into the quiet…" maxlength="1000" autocomplete="off" value="${safe(draft)}"/><button type="submit" ${busy ? 'disabled' : ''}>Speak</button></form><p class="sh-hint">Try asking about Mara, the promise, or the signal. Story choices advance the mystery.</p>${waiting ? '<p class="sh-pending" role="status">Your words are waiting on the midnight band. A connected director can answer.</p>' : ''}`}${error ? `<p class="sh-error" role="alert">${safe(error)}</p>` : ''}<aside class="sh-notebook"><p class="sh-label">Field notes</p><p>${safe(vars.lastNote || room.objective)}</p></aside></div></div></section>`;
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
    update(session) { current = session; render(); },
    dispose() { disposed = true; root.removeEventListener('click', click); root.removeEventListener('input', input); root.removeEventListener('submit', submit); root.innerHTML = ''; }
  };
}
