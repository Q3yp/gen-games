export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function initial(save) {
  if (save?.tidelight) return structuredClone(save);
  return {
    tidelight: 1,
    player: { x: 320, y: 710, angle: -0.6, carrying: null, hp: 5 },
    target: { x: 320, y: 710 },
    lanterns: [
      { id: 'sunseed', x: 410, y: 650, lit: true, color: '#ffd781' },
      { id: 'blue-bell', x: 1110, y: 450, lit: true, color: '#75e3e3' }
    ],
    creatures: [
      { id: 'little-ray', x: 650, y: 730, angle: 0, mood: 'curious', size: 1 },
      { id: 'elder-ray', x: 1250, y: 670, angle: 2, mood: 'curious', size: 1.7 }
    ],
    islands: [
      { id: 'home', x: 180, y: 785, r: 105, kind: 'sanctuary' },
      { id: 'bell', x: 1130, y: 300, r: 115, kind: 'ruin' },
      { id: 'arch', x: 760, y: 260, r: 80, kind: 'gate' }
    ],
    world: { tide: 0, bridge: false },
    discovery: [],
    discoveries: [],
    ripples: [],
    motes: [],
    versions: { world: 0 },
    seconds: 0,
    pulse: 0,
    notice: 'Something is knocking beneath the old bell tower.',
    noticeLife: 9,
    history: [],
    paused: false
  };
}
export function projection(s) {
  return {
    progress: {
      label: 'The ferryman',
      location: s.region === 'undertide' ? 'The Undertide' : 'Drowned district',
      objective: s.notice,
      status: 'exploring',
      discoveries: s.discoveries.length
    },
    player: { ...s.player },
    world: {
      ...s.world,
      lanterns: s.lanterns,
      creatures: s.creatures,
      islands: s.islands,
      shadows: s.shadows || []
    },
    discoveries: s.discoveries,
    latest: s.history.slice(-4)
  };
}
