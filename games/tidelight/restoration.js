import { distance } from './state.js';

// The freed light can reconnect the drowned bell to the world above.
export function restoreFarArch(s, { record, notice }) {
  // Resume companions across the first live-authored shortcut as well.
  const previous = s.region === 'surface' ? s.regions?.undertide : null;
  if (previous?.player) {
    for (const c of [...(previous.shadows || [])]) {
      if (
        c.phase !== 'dispersed' ||
        distance(c, previous.player) > 240 ||
        s.shadows?.some((x) => x.id === c.id)
      )
        continue;
      previous.shadows = previous.shadows.filter((x) => x.id !== c.id);
      const gate = s.islands.find((i) => i.portalExit === 'sarcophagus');
      if (!gate) {
        previous.shadows.push(c);
        continue;
      }
      Object.assign(c, { x: gate.x + 130, y: gate.y + 90 });
      (s.shadows ??= []).push(c);
      record(
        'companion.arrived',
        'The pale swimmer slipped through the arch.',
        { id: c.id }
      );
    }
  }
  const freed = s.shadows?.some((c) => c.phase === 'dispersed');
  const light = s.lanterns.find((l) => l.id === 'heart-in-shell');
  if (!freed || !light) return;
  if (!light.freed) {
    light.freed = true;
    record('light.unbound', 'The warm light is no longer bound to the shell.', {
      id: light.id
    });
  }
  const arch = s.islands.find((i) => i.id === 'sarcophagus');
  if (!arch || arch.bloom || distance(light, arch) > arch.r + 105) return;
  arch.bloom = true;
  arch.kind = 'sanctuary';
  arch.portalTo = 'surface';
  arch.portalExit = 'bell';
  notice('Somewhere above, the bell answers.', 5);
  record('arch.restored', 'The freed light reconnected the drowned arch.', {
    id: arch.id
  });
}
