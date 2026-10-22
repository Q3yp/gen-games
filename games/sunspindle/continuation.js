import { stagePassage } from './commands.js';

// This route was authored for this voyage after its player chose to continue.
// It travels with the immutable source, so a closed browser cannot lose it.
// Existing pending or visited destinations always win; never replace player progress.
export function prepareVoyage(s) {
  if (s.room !== 5 || s.pendingRoom || Object.hasOwn(s.rooms || {}, '6')
    || (s.enteredStages || []).includes('moon-garden-connected')) return;
  stagePassage(s, 'passage.stage', { stageId: 'moon-garden-connected', fromRoom: 5,
    expectedStageId: null, roomKey: 'crown-garden', config: { room: 6 } });
}
