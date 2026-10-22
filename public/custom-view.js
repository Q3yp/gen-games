import { reportUI } from './diagnostics.js';
/** Mount each trusted pack once. Normal state updates preserve its local animation loop. */
import { $, state, world, game, freeze, clone, asset, escapeHTML, dispatch, setText } from './shared.js';

function syncInteraction() {
  const owned = Boolean(state.custom?.instance?.ownsInteraction && !state.custom.paused && !$('#custom-renderer').hidden);
  const immersive = owned && state.custom?.instance?.presentation === 'immersive';
  document.body.classList.toggle('custom-immersive', immersive);
  document.body.classList.toggle('custom-owned', owned);
  $('#play-surface').classList.toggle('has-custom', owned);
  $('#play-surface').classList.toggle('immersive', immersive);
  $('.command-panel').hidden = owned;
  $('#scene-description').hidden = owned;
}
function customFallback(message) {
  const warning = $('#custom-warning');
  warning.hidden = !message;
  $('span', warning).textContent = message;
  if (!state.custom) {
    $('#custom-renderer').hidden = true;
    $('#standard-renderer').hidden = false;
    setText('#render-mode', 'STANDARD VIEW');
  }
  syncInteraction();
}
function disposeCustom() {
  state.customGeneration++;
  try { state.custom?.instance.dispose?.(); } catch { /* Disposer errors cannot stop play. */ }
  state.custom = null;
  state.customKey = '';
  state.customFailureKey = '';
  $('#custom-renderer').replaceChildren();
  $('#custom-renderer').hidden = true;
  $('#standard-renderer').hidden = false;
  customFallback('');
  setText('#render-mode', 'STANDARD VIEW');
  syncInteraction();
}
async function updateCustom(view, snapshot) {
  if (view.paused || view.revision === snapshot.revision) return;
  if (view.updating) { view.queued = true; return; }
  view.updating = true;
  const previousDOM = view.root.cloneNode(true);
  const previousSnapshot = view.snapshot;
  try {
    view.snapshot = snapshot;
    await view.instance.update(snapshot);
    view.revision = snapshot.revision;
    syncInteraction();
  } catch (error) {
    if (state.custom !== view) return;
    try { view.instance.dispose?.(); } catch { /* Stop the failed component if possible. */ }
    view.snapshot = previousSnapshot;
    view.paused = true;
    reportUI('ui.failed', view.path, error, 'Fix update(session), then reload the view. The last good visual and standard controls remain available.');
    // Preserve the last good visual state. Built-in controls remain interactive below it.
    previousDOM.inert = true;
    previousDOM.setAttribute('aria-label', 'Paused custom view showing the last successful state');
    $('#custom-renderer').replaceChildren(previousDOM);
    view.root = previousDOM;
    customFallback('Custom view paused at its last good state. Standard controls remain live; reload the view to retry.');
    console.warn('Custom update failed; restored the last-good visual state.', error);
  } finally {
    view.updating = false;
    if (view.queued && !view.paused && state.custom === view) { view.queued = false; void renderCustom(); }
  }
}
async function renderCustom() {
  const raw = world().ui || game()?.ui;
  if (!raw || state.customDisabled) { if (state.custom) disposeCustom(); return; }
  const version = `${game()?.version || '1'}-${world().uiVersion || '1'}-${state.customReload}`;
  const key = `${state.session.id}:${raw}:${version}`;
  const snapshot = freeze(clone(state.session));
  if (state.custom && key === state.customKey) {
    const view = state.custom;
    const generation = ++state.customGeneration; // Cancel a reload of a source no longer requested.
    await updateCustom(view, snapshot);
    if (generation === state.customGeneration && state.custom === view && !view.paused) {
      if (state.customFailureKey) reportUI('ui.recovered', view.path);
      state.customFailureKey = '';
      customFallback('');
    }
    return;
  }
  if (state.custom && key === state.customFailureKey) { await updateCustom(state.custom, snapshot); return; }
  if (!state.custom && key === state.customFailureKey) return;
  const generation = ++state.customGeneration;
  const candidateRoot = document.createElement('div');
  candidateRoot.className = 'pack-view';
  let candidate;
  try {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith('/games/') || !url.pathname.endsWith('.js')) throw new Error('Custom views must be local JavaScript game modules.');
    // Only explicit source/version changes reload code, never ordinary player actions.
    url.searchParams.set('v', version);
    const module = await import(url.href);
    if (generation !== state.customGeneration) return;
    if (typeof module.default !== 'function') throw new Error('The module must export a createUI function.');
    candidate = { root: candidateRoot, path: raw, snapshot, revision: snapshot.revision, paused: false, instance: null };
    const safeDispatch = async (action, args) => freeze(clone(await dispatch(action, args)));
    const api = Object.freeze({ root: candidateRoot, dispatch: safeDispatch, asset, escapeHTML, get snapshot() { return candidate.snapshot; } });
    candidate.instance = await module.default(api);
    if (!candidate.instance || typeof candidate.instance.update !== 'function') throw new Error('The custom view must provide update(session).');
    await candidate.instance.update(snapshot);
    if (generation !== state.customGeneration) { candidate.instance.dispose?.(); return; }
    const previous = state.custom;
    if (state.customFailureKey || previous?.paused) reportUI('ui.recovered', raw);
    $('#custom-renderer').replaceChildren(candidateRoot);
    $('#custom-renderer').hidden = false;
    $('#standard-renderer').hidden = true;
    state.custom = candidate;
    state.customKey = key;
    state.customFailureKey = '';
    customFallback('');
    setText('#render-mode', 'PACK VIEW');
    try { previous?.instance.dispose?.(); } catch { /* Keep the newly validated view. */ }
    if (state.session.revision !== snapshot.revision) void renderCustom();
  } catch (error) {
    try { candidate?.instance?.dispose?.(); } catch { /* The old component stays untouched. */ }
    if (generation !== state.customGeneration) return;
    state.customFailureKey = key;
    reportUI('ui.failed', raw, error, 'Fix the module path/export or source, then reload the view. Previous working controls or standard fallback remain available.');
    if (state.custom) await updateCustom(state.custom, snapshot);
    customFallback(state.custom ? 'Could not reload the custom view. The previous working component is still active.' : 'Custom view unavailable. The standard view is ready to play.');
    console.warn('Custom renderer failed; preserving the last-good component.', error);
  }
}
export { renderCustom, disposeCustom };
