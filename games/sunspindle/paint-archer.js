// Bow sentinel silhouette; drawn string and nocked arrow expose its windup.
import { P, polygon, line, ellipse, star } from './paint-primitives.js';

export function archer(c, e, t) {
  const wind = e.phase === 'windup',
    flash = e.flash > 0;
  c.save();
  c.translate(e.x, e.y - 10);
  c.rotate(e.angle || 0);
  line(c, [
    [-7, -7],
    [-22, -15],
    [-25, -12]
  ], P.ink, 4);
  line(c, [
    [-4, 7],
    [-18, 16],
    [-23, 15]
  ], P.ink, 4);
  polygon(c, [
    [-27, -16],
    [-8, -21],
    [12, -11],
    [14, 8],
    [-10, 19],
    [-28, 13],
    [-20, 0]
  ], flash ? '#fff' : P.cobalt, P.ink, 1.5);
  polygon(c, [
    [-24, -13],
    [-11, -18],
    [5, -8],
    [4, 7],
    [-11, 14]
  ], '#548aa3');
  line(c, [
    [-19, -12],
    [-8, -9],
    [-9, 10],
    [-20, 10]
  ], '#d3bd82', 1.2);
  ellipse(c, 8, 0, 12, 10, flash ? '#fff' : '#c78d53', P.ink, 1.4);
  polygon(c, [
    [9, -7],
    [20, -4],
    [26, 0],
    [19, 4],
    [9, 7],
    [13, 0]
  ], P.ivory, P.ink, 1);
  line(c, [
    [15, -4],
    [19, -3]
  ], P.ink, 1.6);
  polygon(c, [
    [4, -9],
    [-8, -21],
    [1, -18],
    [7, -10]
  ], P.coral, P.ink, 0.7);
  const draw = wind ? 9 : 1;
  line(c, [
    [3, -11],
    [16, -20],
    [26, -15]
  ], P.ink, 5);
  line(c, [
    [3, 9],
    [14 + draw, 10],
    [27, -1]
  ], P.ink, 5);
  line(c, [
    [3, -11],
    [16, -20],
    [26, -15]
  ], P.cream, 3);
  line(c, [
    [3, 9],
    [14 + draw, 10],
    [27, -1]
  ], P.cream, 3);
  c.beginPath();
  c.moveTo(26, -29);
  c.quadraticCurveTo(45, 0, 26, 29);
  c.strokeStyle = P.darkGold;
  c.lineWidth = 3;
  c.stroke();
  line(c, [
    [26, -29],
    [17 + draw, 0],
    [26, 29]
  ], P.ivory, 1);
  if (wind) {
    line(c, [
      [15, 0],
      [49, 0]
    ], P.ink, 1.3);
    polygon(c, [
      [49, 0],
      [41, -4],
      [41, 4]
    ], P.red);
    star(c, 42, 0, 5, '#ffdd8d', t, 4);
  }
  c.restore();
}
