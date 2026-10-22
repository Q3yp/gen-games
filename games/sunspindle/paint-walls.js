// Architectural silhouettes and their long afternoon shadows.
import { P, TAU, polygon, line, ellipse, arc } from './paint-primitives.js';

export function arch(c, x, y, w, h, fill) {
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.lineTo(x - w / 2, y - h + w / 2);
  c.bezierCurveTo(x - w / 2, y - h, x + w / 2, y - h, x + w / 2, y - h + w / 2);
  c.lineTo(x + w / 2, y);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

export function walls(c) {
  polygon(c, [
    [77, 124],
    [1118, 124],
    [1118, 159],
    [77, 159]
  ], P.clay, P.ink, 1);
  c.fillStyle = '#dba27a';
  c.fillRect(77, 122, 1041, 16);
  c.fillStyle = P.ivory;
  c.fillRect(77, 119, 1041, 5);
  for (let x = 101; x < 1115; x += 68) {
    arch(c, x + 20, 150, 32, 25, '#a9614f');
    arc(c, x + 20, 139, 10, Math.PI, TAU, '#eab78d', 1.2);
    line(c, [
      [x + 3, 157],
      [x + 37, 157]
    ], '#efc798', 2);
  }
  for (const x of [73, 320, 570, 820, 1115]) {
    polygon(c, [
      [x - 14, 155],
      [x + 15, 155],
      [x + 117, 289],
      [x + 84, 289]
    ], '#6d688332');
    polygon(c, [
      [x - 12, 153],
      [x - 12, 70],
      [x + 12, 70],
      [x + 12, 153]
    ], '#ead4a7', P.ink, 0.8);
    polygon(c, [
      [x + 12, 70],
      [x + 21, 80],
      [x + 21, 159],
      [x + 12, 153]
    ], '#bd856b', P.ink, 0.7);
    c.fillStyle = '#fff1c8';
    c.fillRect(x - 17, 65, 34, 13);
    c.fillRect(x - 17, 144, 34, 12);
    line(c, [
      [x - 5, 83],
      [x - 5, 136]
    ], '#b39e7d', 1);
    line(c, [
      [x + 2, 83],
      [x + 2, 136]
    ], '#d3bd94', 1);
    ellipse(c, x, 61, 19, 6, P.coral, P.ink, 0.7);
    c.fillStyle = P.clay;
    c.fillRect(x - 9, 48, 18, 13);
    ellipse(c, x, 48, 12, 3, P.ivory, P.ink, 0.7);
  }
  polygon(c, [
    [76, 158],
    [89, 171],
    [89, 712],
    [76, 725]
  ], '#a76354');
  polygon(c, [
    [1111, 159],
    [1126, 148],
    [1126, 724],
    [1111, 712]
  ], '#d4ad82');
  c.fillStyle = '#f7e9bc';
  c.fillRect(72, 715, 1058, 8);
  c.fillStyle = '#b87b60';
  c.fillRect(79, 724, 1042, 8);
  for (let x = 106; x < 1100; x += 61) line(c, [
    [x, 724],
    [x, 731]
  ], '#875f55', 1);
}
