import { stagePassage } from './commands.js';

// This complete, authored journey is frozen before its independent player starts.
// No exit requires a live host, and revisiting a save never resets a destination.
const onward = {
  1: { roomKey: 'glassworks', room: 4 },
  4: { roomKey: 'rain-balcony', room: 5 },
  5: { roomKey: 'crown-garden', room: 6 }
};
export function prepareVoyage(s) {
  const next = onward[s.room];
  if (!next || s.pendingRoom || Object.hasOwn(s.rooms || {}, String(next.room))) return;
  const stageId = `homeward-${s.room}-${next.room}`;
  if ((s.enteredStages || []).includes(stageId)) return;
  stagePassage(s, 'passage.stage', { stageId, fromRoom: s.room,
    expectedStageId: null, roomKey: next.roomKey, config: { room: next.room } });
}
