// An open glassblower's garden, drawn beneath actors in world coordinates.
import { polygon, line, ellipse, glow, hash, star } from './paint-primitives.js';

function leaves(c, x, y, scale, t) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  line(c, [[0, 30], [2, -4], [-12, -35]], '#527b57', 3);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + Math.sin(t * 0.7 + i) * 0.04;
    const px = Math.cos(a) * (10 + i * 2), py = -i * 7;
    c.save();
    c.translate(px, py);
    c.rotate(a);
    ellipse(c, 0, 0, 20, 8, i % 2 ? '#459773' : '#78b98b');
    line(c, [[-14, 0], [13, 0]], '#c8df9b88', 1);
    c.restore();
  }
  c.restore();
}

function glass(c, x, y, color, size = 1) {
  c.save(); c.translate(x, y); c.scale(size, size);
  ellipse(c, 6, 10, 19, 5, '#537a7730');
  polygon(c, [[-9, -30], [9, -30], [8, -17], [19, 1], [14, 12], [-14, 12], [-19, 1], [-8, -17]], color, '#336a78', 1);
  line(c, [[-6, -26], [-6, -16], [-13, 0], [-10, 6]], '#f4ffdaaa', 3);
  ellipse(c, 0, -30, 9, 3, '#c9eadc', '#336a78', 1);
  c.restore();
}

export function blastCourt(c, s, t) {
  c.save();
  const sky = c.createLinearGradient(0, 0, 0, 800);
  sky.addColorStop(0, '#e4f2d9'); sky.addColorStop(0.25, '#f9dfbb'); sky.addColorStop(1, '#fff1d5');
  c.fillStyle = sky; c.fillRect(0, 0, 1200, 800);
  // Leafy glimpses remain open between the arcade's freestanding uprights.
  for (let i = 0; i < 15; i++) {
    ellipse(c, i * 91 - 20, 65 + hash(i) * 35, 85, 69, i % 2 ? '#aacba2' : '#c8deb0');
  }
  polygon(c, [[0, 172], [1200, 163], [1200, 800], [0, 800]], '#fff0d5');
  for (let row = 0; row < 9; row++) {
    const y = 190 + row * 66;
    line(c, [[0, y], [1200, y - 13]], '#d9b99535', 1);
    for (let col = 0; col < 10; col++) {
      const x = col * 140 + (row % 2) * 70;
      line(c, [[x, y - 1], [x + 15, y + 64]], '#d9b99530', 1);
    }
  }
  // Apricot arches, without doors or the old locked exit.
  for (let x = 32; x < 1200; x += 190) {
    polygon(c, [[x, 165], [x + 18, 165], [x + 132, 310], [x + 107, 310]], '#6b9b9220');
    c.strokeStyle = '#e9af89'; c.lineWidth = 24;
    c.beginPath(); c.moveTo(x, 162); c.lineTo(x, 88);
    c.bezierCurveTo(x, 12, x + 190, 12, x + 190, 88); c.lineTo(x + 190, 162); c.stroke();
    c.strokeStyle = '#fff3d4'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(x - 7, 156); c.lineTo(x - 7, 88);
    c.bezierCurveTo(x - 7, 4, x + 197, 4, x + 197, 88); c.stroke();
    ellipse(c, x, 164, 20, 7, '#d48c71');
    leaves(c, x + 18, 70, 0.7, t);
  }
  // Low work benches sit beyond the traversable floor, not across it.
  for (const x of [208, 605, 1010]) {
    polygon(c, [[x - 57, 137], [x + 58, 137], [x + 78, 153], [x - 43, 153]], '#edba8d', '#bf8a70', 1);
    line(c, [[x - 43, 153], [x - 43, 180]], '#bb7c60', 6);
    line(c, [[x + 61, 153], [x + 61, 180]], '#bb7c60', 6);
    glass(c, x - 27, 130, '#239a8fcc', 0.8);
    glass(c, x + 14, 131, '#3b7bc0bb', 1);
  }
  // Pools of refracted color, subtle enough to preserve attack readability.
  for (let i = 0; i < 15; i++) {
    const x = 130 + hash(i + 2) * 950, y = 235 + hash(i + 90) * 445;
    polygon(c, [[x, y], [x + 29, y - 7], [x + 61, y + 23], [x + 19, y + 28]], i % 2 ? '#58bdaa10' : '#5f92d510');
  }
  // Irregular beds break the rectangular room outline.
  for (const [x, y, k] of [[16, 335, 1.3], [1170, 405, 1.4], [31, 690, 1], [1120, 734, 1]]) {
    ellipse(c, x, y + 23, 60 * k, 26, '#e7c099');
    ellipse(c, x, y + 18, 49 * k, 21, '#bad3a1');
    leaves(c, x, y, k, t);
    leaves(c, x + 36, y + 15, k * 0.65, t + 1);
  }
  line(c, [[87, 727], [290, 739], [475, 732], [676, 743], [1014, 727]], '#ddb18b', 3);
  for (let i = 0; i < 9; i++) {
    const x = 165 + i * 106;
    star(c, x, 759 + Math.sin(i) * 8, 4, i % 2 ? '#439d99' : '#4474b2', 0.3, 4);
  }
  glow(c, 337, 225, 160, '#fffbd02a');
  c.restore();
}
