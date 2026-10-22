import { $, state, world, scene, game, terminal, setText, number } from './shared.js';
import { renderSelectors, renderCharacter, renderFocus, renderChoices, renderContext } from './panels.js';
import { renderGrid, renderStory } from './scenes.js';
import { renderCustom } from './custom-view.js';
let renderFrame;
function render() {
  if (!state.session) return;
  const current = scene();
  const pack = game();
  $('#reload-view').hidden = !(world().ui || pack?.ui);
  renderSelectors();
  setText('#world-title', pack?.title || state.session.gameId);
  setText('#world-description', pack?.description || 'A persistent world, ready to play and extend.');
  setText('#world-version', `V${pack?.version || '1.0'} · PERSISTENT WORLD`);
  setText('#world-number', String(state.games.findIndex(item => item.id === state.session.gameId) + 1).padStart(2, '0'));
  setText('#scene-title', current.name || world().scene || 'Untitled scene');
  setText('#scene-description', current.description || '');
  setText('#scene-kind', Array.isArray(current.map) ? 'TACTICAL EXPLORATION' : 'INTERACTIVE STORY');
  const sceneIndex = Object.keys(world().scenes || {}).indexOf(world().scene) + 1;
  setText('#scene-badge', current.chapter || `SCENE ${String(Math.max(1, sceneIndex)).padStart(2, '0')}`);
  setText('#revision', String(state.session.revision).padStart(3, '0'));
  setText('#stage-hint', Array.isArray(current.map) ? 'Explore the ruins. Choose your next move.' : 'Every choice leaves a trace.');
  const combatEnabled = (pack?.plugins || []).includes('combat');
  $('.player-panel').hidden = !combatEnabled;
  $('#skills-heading').closest('section').hidden = !combatEnabled;
  renderCharacter();
  if (Array.isArray(current.map) && current.map.length) renderGrid(); else renderStory();
  renderFocus(); renderChoices(); renderContext();
  const oldEnding = $('.game-over-banner', $('#play-surface'));
  if (terminal()) {
    const banner = oldEnding || document.createElement('div');
    banner.className = 'game-over-banner';
    banner.textContent = `${String(world().variables?.outcome || 'Journey ended').replaceAll('_', ' ')} · Your run is saved. Start a new run to play again.`;
    if (!oldEnding) $('#play-surface').append(banner);
  } else oldEnding?.remove();
  void renderCustom();
}
function scheduleRender() { if (!renderFrame) renderFrame = requestAnimationFrame(() => { renderFrame = null; render(); }); }

export { render, scheduleRender };
