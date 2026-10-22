export const AREAS = {
  haven: {
    name: 'The Last Hearth',
    subtitle: 'SANCTUARY · a promise worth returning for',
    tiles: [
      '###############',
      '##...........##',
      '#.............#',
      '#..##.....##..#',
      '#..............',
      '#..##.....##..#',
      '#.............#',
      '##...........##',
      '###############'
    ],
    exits: [{ x: 14, y: 4, to: 'hollow', at: [0, 4], label: 'Briar Hollow →' }],
    objects: [
      { id: 'elder', kind: 'npc', x: 6, y: 3, name: 'Rowan' },
      { id: 'fire', kind: 'camp', x: 5, y: 5, name: 'Rest · restore health' },
      { id: 'forge', kind: 'npc', x: 9, y: 5, name: 'Anvil · shape your light' }
    ],
    enemies: []
  },
  hollow: {
    name: 'Briar Hollow',
    subtitle: 'CHAPTER I · the keeper in the thorns',
    tiles: [
      '#######.#######',
      '##...........##',
      '#...##........#',
      '#...##...##...#',
      '.........##....',
      '#..~~.........#',
      '#..~~...##....#',
      '##...........##',
      '###############'
    ],
    exits: [
      { x: 0, y: 4, to: 'haven', at: [13, 4], label: '← Hearth' },
      { x: 14, y: 4, to: 'ruins', at: [0, 4], label: 'Drowned Archive →' },
      { x: 7, y: 0, to: 'heart', at: [7, 7], label: '↑ Heartwood · 2 seals' }
    ],
    objects: [
      {
        id: 'keeper',
        kind: 'seal',
        x: 11,
        y: 2,
        name: 'Keeper Neri · first seal'
      },
      {
        id: 'hollow-cache',
        kind: 'cache',
        x: 5,
        y: 7,
        name: 'Wayfarer’s chest'
      }
    ],
    enemies: [
      { id: 'thorn1', kind: 'thorn', x: 6, y: 4, hp: 6 },
      { id: 'thorn2', kind: 'thorn', x: 10, y: 6, hp: 6 }
    ]
  },
  ruins: {
    name: 'The Drowned Archive',
    subtitle: 'CHAPTER II · light remembers the way',
    tiles: [
      '###############',
      '##...~...~...##',
      '#....~...~....#',
      '#..#...#...#..#',
      '..............#',
      '#..#...#...#..#',
      '#....~...~....#',
      '##...........##',
      '###############'
    ],
    exits: [{ x: 0, y: 4, to: 'hollow', at: [13, 4], label: '← Briar Hollow' }],
    objects: [
      { id: 'archive-seal', kind: 'seal', x: 12, y: 4, name: 'Rain seal' },
      {
        id: 'archive-cache',
        kind: 'cache',
        x: 12,
        y: 7,
        name: 'Glass vial · healing'
      }
    ],
    enemies: [
      { id: 'moth1', kind: 'moth', x: 7, y: 2, hp: 5 },
      { id: 'sentinel1', kind: 'sentinel', x: 10, y: 4, hp: 9 }
    ]
  },
  heart: {
    name: 'The Hollow Crown',
    subtitle: 'CHAPTER III · a heart still beating',
    tiles: [
      '###############',
      '##...........##',
      '#...##...##...#',
      '#.............#',
      '#.............#',
      '#.............#',
      '#...##...##...#',
      '##...........##',
      '#######.#######'
    ],
    exits: [{ x: 7, y: 8, to: 'hollow', at: [7, 1], label: '↓ Briar Hollow' }],
    objects: [
      { id: 'heart-seed', kind: 'seal', x: 7, y: 2, name: 'The living seed' }
    ],
    enemies: [{ id: 'crown', kind: 'boss', x: 7, y: 3, hp: 24 }]
  }
};
export const ENEMY_NAMES = {
  thorn: 'Briar wolf',
  moth: 'Glass moth',
  sentinel: 'Drowned knight',
  boss: 'The Hollow Crown'
};
export function newWorld() {
  return {
    version: 1,
    area: 'haven',
    player: {
      x: 3,
      y: 4,
      hp: 18,
      maxHp: 18,
      focus: 4,
      maxFocus: 4,
      weapon: 'blade',
      talent: null,
      tonics: 2,
      shards: 0,
      xp: 0
    },
    areas: Object.fromEntries(
      Object.entries(AREAS).map(([id, a]) => [
        id,
        {
          taken: [],
          enemies: a.enemies.map((e) => ({
            ...e,
            maxHp: e.hp,
            intent: [],
            stunned: 0
          }))
        }
      ])
    ),
    seals: [],
    turn: 0,
    deaths: 0,
    rests: 0,
    met: false,
    won: false,
    log: [
      'Find Rowan beside the hearth. Click a destination or use WASD / arrows.'
    ],
    dialog: null
  };
}
export function walkable(area, x, y) {
  return AREAS[area].tiles[y]?.[x] === '.';
}
export function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
export function objective(w) {
  if (w.returned)
    return 'The hearth is whole. Explore, change your build, or await a new trail.';
  if (w.won) return 'Bring the living seed home to Rowan.';
  if (!w.met) return 'Speak to Rowan at the hearth.';
  if (!w.seals.includes('keeper')) return 'Free keeper Neri in Briar Hollow.';
  if (!w.seals.includes('archive-seal'))
    return 'Recover the rain seal in the Drowned Archive.';
  return 'Open Heartwood north of Briar Hollow. Restore its living seed.';
}
