import { random } from '../geometry.js';

/** A chosen new material, never a silent change to the transparent flower law. */
export function configureLanternTrial(world) {
  const rand = random(world.seed + world.round * 6197);
  const sourceY = 452 + rand() * 32,
    trunkX = 440 + rand() * 45,
    branchX = 940 + rand() * 45;
  const lowY = 630 + rand() * 24;
  world.lantern = { enabled: true };
  world.prism = { enabled: true, chord: 0, lit: 0, complete: false };
  world.source = { x: 105, y: sourceY, angle: 0 };
  // Layouts derive from a clear binary-tree corridor. Initial shards are deliberately
  // unassembled; generation never moves them into a solution or reveals one in UI.
  world.bodies = [
    {
      id: 'shard-a',
      type: 'mirror',
      x: 460,
      y: sourceY,
      angle: -0.62,
      length: 132,
      draggable: true
    },
    {
      id: 'shard-b',
      type: 'mirror',
      x: 720,
      y: 590,
      angle: 0.5,
      length: 132,
      draggable: true
    },
    {
      id: 'shard-c',
      type: 'mirror',
      x: 1100,
      y: 565,
      angle: -0.65,
      length: 132,
      draggable: true
    },
    {
      id: 'lantern-a',
      type: 'receiver',
      kind: 'lantern',
      x: trunkX,
      y: 760,
      radius: 32,
      requiredPower: 0.2,
      charge: 0,
      color: '#aaffc7'
    },
    {
      id: 'lantern-b',
      type: 'receiver',
      kind: 'lantern',
      x: 235 + rand() * 35,
      y: lowY,
      radius: 32,
      requiredPower: 0.2,
      charge: 0,
      color: '#ffa8dc'
    },
    {
      id: 'lantern-c',
      type: 'receiver',
      kind: 'lantern',
      x: branchX,
      y: 210 + rand() * 25,
      radius: 32,
      requiredPower: 0.2,
      charge: 0,
      color: '#c6adff'
    },
    {
      id: 'lantern-d',
      type: 'receiver',
      kind: 'lantern',
      x: 1215,
      y: sourceY,
      radius: 32,
      requiredPower: 0.2,
      charge: 0,
      color: '#ffd591'
    },
    {
      id: 'stone-a',
      type: 'stone',
      x: 690 + rand() * 25,
      y: sourceY - 125,
      radius: 47
    },
    {
      id: 'stone-b',
      type: 'stone',
      x: 740 + rand() * 25,
      y: sourceY + 125,
      radius: 47
    }
  ];
  return world;
}
