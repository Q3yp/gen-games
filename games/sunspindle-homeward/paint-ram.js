// Horned automaton silhouette; windup and lunge alter the same pose.
import { P, polygon, line } from './paint-primitives.js';

export function ram(c, e, t) {
  const wind = e.phase === 'windup',
    rush = e.phase === 'lunge',
    flash = e.flash > 0;
  c.save();
  c.translate(e.x, e.y - 8);
  c.rotate(e.angle || 0);
  c.scale(rush ? 1.13 : wind ? 0.91 : 1, wind ? 1.08 : 1);
  for (const side of [-1, 1])
    for (const x of [-17, 12]) {
      const offset = rush ? Math.sin(t * 22 + x) * 5 : 0;
      line(c, [
        [x, side * 12],
        [x - 8 + offset, side * 25],
        [x + 1 + offset, side * 27]
      ], P.ink, 5);
      line(c, [
        [x, side * 12],
        [x - 8 + offset, side * 24]
      ], '#bc8f6a', 3);
    }
  polygon(c, [
    [-31, 0],
    [-22, -16],
    [-2, -23],
    [20, -16],
    [27, 0],
    [18, 17],
    [-5, 23],
    [-24, 13]
  ], flash ? P.ivory : '#447c7d', P.ink, 2);
  polygon(c, [
    [-24, -3],
    [-10, -14],
    [10, -13],
    [16, -1],
    [5, 14],
    [-13, 15]
  ], flash ? '#fff' : '#7ba4a0', P.ink, 1);
  for (let x = -15; x < 15; x += 8) line(c, [
    [x, -12],
    [x + 5, 0],
    [x, 13]
  ], '#d2bc7b', 1.5);
  polygon(c, [
    [17, -13],
    [31, -10],
    [35, 0],
    [29, 12],
    [16, 13],
    [22, 0]
  ], flash ? '#fff' : P.cream, P.ink, 1.3);
  for (const side of [-1, 1]) polygon(c, [
    [20, side * 12],
    [23, side * 26],
    [34, side * 31],
    [43, side * 23],
    [33, side * 24],
    [29, side * 15],
    [29, side * 8]
  ], P.ivory, P.ink, 1.3);
  line(c, [
    [27, -6],
    [32, -5]
  ], rush ? P.red : '#cc7e38', 3);
  line(c, [
    [27, 6],
    [32, 5]
  ], rush ? P.red : '#cc7e38', 3);
  polygon(c, [
    [32, -4],
    [38, 0],
    [32, 4]
  ], P.ink);
  line(c, [
    [-28, 1],
    [-40, -2],
    [-43, -8]
  ], P.ink, 3);
  if (wind) {
    line(c, [
      [-34, -19],
      [-43, -24]
    ], '#b15a42', 1.5);
    line(c, [
      [-35, 19],
      [-44, 25]
    ], '#b15a42', 1.5);
  }
  c.restore();
}
