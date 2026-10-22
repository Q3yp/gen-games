import { distance } from './physics.js';

// This orchard's consequences are authored here, not imposed by the engine.
export function gardenLife(s, dt, fx, record, notice) {
  if (s.roomKey !== 'crown-garden') return;
  if (!s.gardenSpringUsed && s.player.hp > 0 && s.player.hp < s.player.maxHp
    && distance(s.player, { x: 300, y: 550 }) < 38) {
    const restored = Math.min(2, s.player.maxHp - s.player.hp);
    s.gardenSpringUsed = true;
    s.player.hp += restored;
    fx.burst(300, 550, '#fff2b0', 18, 100);
    fx.ring(s.player.x, s.player.y, '#fff2b0', 80, .8);
    notice('Two warm petals dissolve in your hand.', 3);
    record('garden.spring', 'The keeper used the orchard’s two healing petals.', { restored, hp: s.player.hp });
  }
  if (s.cleared && !s.gardenQuiet) {
    s.gardenQuiet = true;
    s.shots = [];
    s.player.grace = Math.max(s.player.grace, 2);
    fx.ring(s.exit.x, s.exit.y, '#f8e4a1', 170, 1.3);
  }
  if (s.awaitingHost && s.exitReady && !s.pendingRoom && !s.gardenArrived) {
    s.gardenArrived = true;
    s.gardenBloom = 0;
    fx.burst(s.exit.x, s.exit.y - 28, '#fff5b8', 30, 90);
    notice('Home.', 5);
    record('garden.arrived', 'The sunbird settled in its nest. The orchard opened into dawn.',
      { hp: s.player.hp, springUsed: !!s.gardenSpringUsed });
  }
  if (s.gardenArrived) s.gardenBloom = Math.min(1, (s.gardenBloom || 0) + dt / 2.8);
}
