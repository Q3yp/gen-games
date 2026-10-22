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
  const gate = s.islands.find(
    (i) =>
      i.bloom && (i.id === 'home' || i.portalTo) && distance(s.player, i) < 58
  );
  if (!gate) return;
  s.regions ??= {};
  const from = s.region || 'surface',
    to = gate.portalTo || (from === 'surface' ? 'undertide' : 'surface');
  const exitId = gate.portalExit || 'home';
  const carried = structuredClone(
    s.lanterns.find((l) => l.id === s.player.carrying) || null
  );
  const returning = Boolean(s.regions[to]);
  const travelers = {
    islands: s.islands
      .filter((i) => i.awake && distance(i, s.player) < 380)
      .map((i) => structuredClone(i)),
    shadows: (s.shadows || [])
      .filter((c) => c.phase === 'dispersed' && distance(c, s.player) < 240)
      .map((c) => structuredClone(c))
  };
  const hp = s.player.hp;
  s.regions[from] = capture(s);
  for (const kind of ['islands', 'shadows'])
    s.regions[from][kind] = s.regions[from][kind].filter(
      (o) => !travelers[kind].some((t) => t.id === o.id)
    );
  if (carried) {
    s.regions[from].lanterns = s.regions[from].lanterns.filter(
      (l) => l.id !== carried.id
    );
    s.regions[from].player.carrying = null;
  }
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
  const destination =
    s.islands.find((i) => i.id === exitId) ||
    s.islands.find((i) => i.id === 'home');
  if (exitId !== 'home') {
    destination.bloom = true;
    destination.kind = 'sanctuary';
    destination.portalTo = from;
    destination.portalExit = gate.id;
  }
  s.player.x = destination.x + 190;
  s.player.y = destination.y - 30;
  if (carried) {
    s.lanterns = s.lanterns.filter((l) => l.id !== carried.id);
    Object.assign(carried, { x: s.player.x, y: s.player.y, vx: 0, vy: 0 });
    s.lanterns.push(carried);
    s.player.carrying = carried.id;
  } else if (returning) s.player.carrying = null;
  s.target = { x: s.player.x, y: s.player.y };
  for (const kind of ['islands', 'shadows']) {
    s[kind] ??= [];
    for (const [i, traveler] of travelers[kind].entries()) {
      s[kind] = s[kind].filter(
        (o) => o.id !== traveler.id && !(kind === 'islands' && o.awake)
      );
      Object.assign(traveler, {
        x: Math.max(70, s.player.x - 145 - i * 50),
        y: Math.min(900, s.player.y + 110 + i * 35)
      });
      s[kind].push(traveler);
    }
  }
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
