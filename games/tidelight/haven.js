import { distance } from './state.js';
/** A sanctuary emerges from the player's gathering, not a menu reward. */
export function tendHaven(s, dt, { record, notice }) {
  const home = s.islands.find((i) => i.id === 'home');
  if (!home) return;
  if (!home.bloom) {
    const light = s.lanterns.find(
      (l) => l.lit && l.id !== s.player.carrying && distance(l, home) < 150
    );
    const visitor = s.islands.find((i) => i.awake && distance(i, home) < 320);
    if (light && visitor) {
      home.bloom = true;
      s.world.haven = true;
      s.lanterns.push({
        id: 'hearth-seed',
        x: home.x,
        y: home.y + home.r * 0.7,
        lit: true,
        color: '#ffbe83'
      });
      notice('The empty arch remembers how to bloom.', 7);
      record(
        'haven.bloomed',
        'Gathered a living light and a wandering ruin into a sanctuary',
        { light: light.id, visitor: visitor.id }
      );
    }
  }
  if (home.bloom && distance(s.player, home) < 180)
    s.player.hp = Math.min(5, s.player.hp + dt * 0.2);
}
