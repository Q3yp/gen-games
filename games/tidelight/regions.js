import { distance } from './state.js';
const fields = [
  'islands',
  'lanterns',
  'creatures',
  'shadows',
  'player',
  'target'
];
function capture(s) {
  return Object.fromEntries(
    fields.map((k) => [k, structuredClone(s[k] ?? [])])
  );
}
export function crossArch(s, { record, notice }) {
  const gate = s.islands.find((i) => i.id === 'home' && i.bloom);
  if (!gate || distance(s.player, gate) > 58) return;
  s.regions ??= {};
  const from = s.region || 'surface',
    to = from === 'surface' ? 'undertide' : 'surface';
  const hp = s.player.hp;
  s.regions[from] = capture(s);
  let next = s.regions[to];
  if (!next) {
    next = {
      player: { x: 350, y: 760, angle: -0.4, carrying: 'echo-pearl', hp },
      target: { x: 350, y: 760 },
      lanterns: [
        { id: 'echo-pearl', x: 350, y: 760, lit: true, color: '#a0f1e9' },
        { id: 'heart-in-shell', x: 1190, y: 370, lit: true, color: '#ffac69' }
      ],
      islands: [
        { id: 'home', x: 160, y: 790, r: 85, kind: 'sanctuary', bloom: true },
        {
          ...(s.regions.surface?.islands.find((i) => i.awake) || {}),
          id: s.regions.surface?.islands.find((i) => i.awake)?.id || 'rib',
          x: 450,
          y: 700,
          r: 85,
          kind: 'gate',
          awake: true
        },
        { id: 'sarcophagus', x: 1230, y: 260, r: 130, kind: 'ruin' }
      ],
      creatures: [
        {
          id: 'blind-ray',
          x: 600,
          y: 680,
          angle: 0,
          mood: 'curious',
          size: 1.4
        }
      ],
      shadows: [{ id: 'bell-keeper', x: 1160, y: 440, seals: 3 }]
    };
  }
  Object.assign(s, structuredClone(next));
  s.player.hp = hp;
  const destination = s.islands.find((i) => i.id === 'home');
  s.player.x = destination.x + 190;
  s.player.y = destination.y - 30;
  s.target = { x: s.player.x, y: s.player.y };
  s.region = to;
  s.transition = 1.2;
  s.ripples = [];
  notice(
    to === 'undertide'
      ? 'The knocking was coming from inside the shell.'
      : 'Your little harbour is still here.',
    7
  );
  record('arch.crossed', 'Passed through the living arch', { from, to });
}
