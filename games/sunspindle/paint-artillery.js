// Squat ceramic kiln-crab, volatile glass vessels, and readable slow embers.
import { polygon, line, ellipse, glow, star, hash } from './paint-primitives.js';

export function artillery(c, e, t) {
  const winding = e.phase === 'windup';
  const charge = winding ? Math.max(0, Math.min(1, 1 - (e.timer || 0) / (e.phaseDuration || 2.0))) : 0;
  const firing = e.phase === 'recover' && e.timer > 2.25;
  const flash = (e.flash || 0) > 0;
  c.save(); c.translate(e.x + Math.sin(t * 74) * (e.blastShake || 0) * 7, e.y);
  ellipse(c, 10, 17, 61, 33, '#516a6c28');
  c.rotate(e.angle || 0); c.scale((e.radius || 55) / 55, (e.radius || 55) / 55);
  // The mouth direction is the real aim angle, and the charge opens the legs.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = -30 + i * 25, spread = 42 + charge * 7;
      const joints = [[x, side * 22], [x - 11, side * spread], [x + 2, side * (spread + 7)]];
      line(c, joints, '#36595e', 10); line(c, joints, '#40a492', 6);
      ellipse(c, x + 2, side * (spread + 7), 8, 5, '#f4d4a5', '#456568', 1);
    }
  }
  ellipse(c, -4, 0, 49, 38, flash ? '#fffbe3' : '#f2c9a0', '#765c58', 2);
  ellipse(c, -11, -2, 33, 31, flash ? '#fff' : '#fff0cf', '#cf8a70', 2);
  // Open chimney: clearly a furnace rather than a shield or armor plate.
  ellipse(c, -17, -3, 19, 23, '#dc9b7a', '#916050', 2);
  ellipse(c, -17, -3, 12, 16, '#603e50');
  glow(c, -15, -2, 23 + charge * 18, `rgba(255,143,44,${0.22 + charge * 0.6})`);
  star(c, -15, -2, 8 + charge * 5, '#ffb54c', t * 0.6, 6);
  for (const side of [-1, 1]) {
    polygon(c, [[-36, side * 18], [-21, side * 29], [4, side * 29], [17, side * 17], [6, side * 22], [-18, side * 22]], '#3ba594', '#478b80', 1);
    line(c, [[17, side * 17], [26, side * 25]], '#7b5c53', 5);
    ellipse(c, 28, side * 24, 8, 7, '#fff3ca', '#876052', 1);
    ellipse(c, 32, side * 24, 3, 3, '#334c5d');
  }
  // A flared cobalt nozzle with a warm, plainly visible firing aperture.
  polygon(c, [[21, -14], [42, -18 - charge * 3], [56, -15 - charge * 3], [56, 15 + charge * 3], [42, 18 + charge * 3], [21, 14]], flash ? '#fff9d8' : '#477ea4', '#354f68', 2);
  ellipse(c, 53, 0, 9, 16 + charge * 3, '#ffcf85', '#f5e5bc', 3);
  ellipse(c, 55, 0, 5, 11 + charge * 3, '#713e45');
  if (winding || firing) {
    glow(c, 56, 0, 28 + charge * 25, '#ffb83f70');
    ellipse(c, 56, 0, 4 + charge * 2, 8 + charge * 5, '#ffe890');
    for (let i = 0; i < 3; i++) {
      const d = 19 + ((t * 22 + i * 13) % 36);
      ellipse(c, 56 + d, Math.sin(i * 3 + t * 4) * 13, 2, 2, '#ed944d');
    }
  }
  if ((e.hp ?? 3) < 3) line(c, [[-41, -10], [-31, -4], [-34, 7], [-24, 15]], '#bd775e', 2);
  if ((e.hp ?? 3) < 2) line(c, [[-4, -29], [3, -19], [-4, -12]], '#bd775e', 2);
  c.restore();
}

export function blastJar(c, p, t) {
  c.save(); c.translate(p.x, p.y); c.scale((p.r || 28) / 28, (p.r || 28) / 28);
  const broken = p.broken || p.hp <= 0;
  ellipse(c, 6, 10, 29, 13, '#537a7728');
  if (broken) {
    ellipse(c, 0, 2, 22, 10, '#d88d6c25');
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, d = 10 + hash(i + 8) * 23;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.6;
      polygon(c, [[x - 5, y + 3], [x + 1, y - 7], [x + 8, y + 2]], i % 2 ? '#68b5a6' : '#5689b0', '#3d7f83', 0.8);
      line(c, [[x - 2, y + 1], [x + 1, y - 4]], '#def5d3', 1);
    }
    c.restore(); return;
  }
  const pulse = 0.7 + Math.sin(t * 3 + p.x) * 0.12;
  glow(c, 0, -7, 42, `rgba(255,176,59,${pulse * 0.35})`);
  polygon(c, [[-11, -36], [11, -36], [10, -25], [24, -13], [26, 7], [17, 20], [-17, 20], [-26, 7], [-24, -13], [-10, -25]], p.flash > 0 ? '#fff8d9' : '#459f9dbb', '#326f83', 2);
  ellipse(c, 0, 1, 17, 14, '#f7b84e');
  glow(c, 0, -1, 23, '#ffe37aaf');
  star(c, 0, -2, 11 + pulse * 2, '#fff2b3', t * 0.4, 6);
  line(c, [[-7, -26], [-15, -16], [-11, -5], [-19, 6]], '#e9ffd6', 2);
  line(c, [[15, -12], [7, -2], [13, 5], [6, 16]], '#fff1b6', 2);
  line(c, [[-19, -11], [-21, -2], [-19, 8]], '#e3ffe0aa', 3);
  ellipse(c, 0, -36, 12, 4, '#6eafae', '#336a7b', 1.5);
  ellipse(c, 0, -37, 7, 2, '#30586a');
  line(c, [[-16, 15], [0, 19], [16, 15]], '#237786', 2);
  c.restore();
}

export function sunbolt(c, shot) {
  c.save(); c.translate(shot.x, shot.y);
  c.rotate(Math.atan2(shot.vy || 0, shot.vx || 1));
  const r = shot.r || 9;
  glow(c, 0, 0, r * 2.5, '#ffb94860');
  polygon(c, [[-r * 2.4, 0], [-r * 0.6, -r * 0.6], [0, 0], [-r * 0.6, r * 0.6]], '#ed954e77');
  ellipse(c, 0, 0, r, r * 0.85, '#ee884b', '#a35a54', 1.5);
  ellipse(c, 2, -1, r * 0.52, r * 0.46, '#ffefaf');
  c.restore();
}
