// Raincourt combat: fixed ceramic bodies, a committed white-hot muzzle, cyan returns.
import { polygon, line, ellipse, glow } from './paint-primitives.js';

export function rainKiln(c, e, t) {
  const winding = e.phase === 'windup', remaining = Math.max(0, e.timer ?? 0);
  const charge = winding ? Math.max(0, Math.min(1, 1 - remaining / (e.phaseDuration || 2))) : 0;
  const committed = winding && remaining <= 0.65;
  const struck = (e.flash ?? 0) > 0;
  c.save(); c.translate(e.x, e.y); c.rotate(e.angle ?? 0);
  c.scale((e.radius ?? 55) / 55, (e.radius ?? 55) / 55);
  ellipse(c, 0, 6, 53, 39, '#24416038');
  // Three stationary feet and a ribbed shell, not an armor plate or weakpoint.
  for (const side of [-1, 1]) {
    polygon(c, [[-31, side * 23], [-40, side * 39], [-23, side * 43],
      [-10, side * 26]], '#34466c', '#1f3454', 2);
    line(c, [[-35, side * 36], [-24, side * 38]], '#bbd1e0', 4);
    polygon(c, [[15, side * 23], [22, side * 39], [35, side * 33],
      [29, side * 17]], '#607b9f', '#2b4165', 2);
  }
  ellipse(c, -8, 0, 43, 35, struck ? '#ffffff' : '#e5edf0', '#314d72', 3);
  ellipse(c, -21, 0, 22, 30, '#b7cada', '#7290ad', 2);
  line(c, [[-33, -22], [-39, -10], [-39, 10], [-33, 22]], '#f4f8f5', 3);
  for (const side of [-1, 1]) {
    polygon(c, [[-20, side * 25], [-6, side * 31], [13, side * 25], [26, side * 13],
      [11, side * 18], [-5, side * 24]], '#3f5687');
    line(c, [[-16, side * 25], [-6, side * 28], [8, side * 24]], '#96c0d5', 1);
  }
  // Open longitudinal furnace channel feeds a plainly open forward muzzle.
  polygon(c, [[-20, -9], [19, -10], [34, -7], [34, 7], [19, 10], [-20, 9]], '#283458', '#809bb8', 2);
  line(c, [[-15, 0], [28, 0]], committed ? '#fff8d8' : '#b48aaf', committed ? 7 : 3);
  polygon(c, [[17, -13], [37, -18], [48, -18], [48, 18], [37, 18], [17, 13]],
    struck ? '#f8fbff' : '#d5e3e9', '#385278', 2);
  line(c, [[29, -15], [29, 15]], '#617ca5', 4);
  ellipse(c, 47, 0, 8, 18, '#9ab7ca', '#f2f5ef', 3);
  ellipse(c, 49, 0, 5, 13, '#292847');
  if (winding) {
    glow(c, 39, 0, committed ? 66 : 28 + charge * 14,
      committed ? '#ffdb9dc4' : `rgba(220,126,158,${0.2 + charge * 0.3})`);
    ellipse(c, 49, 0, 4, 11, committed ? '#ffffff' : '#e79b8c');
    ellipse(c, 47, 0, 8, 18, null, committed ? '#fff5bf' : '#d7a1ba', committed ? 4 : 2);
    if (committed) line(c, [[4, -5], [21, -5]], '#fff8db', 3);
  }
  if ((e.hp ?? 3) < (e.maxHp ?? 3)) {
    line(c, [[-33, 13], [-23, 8], [-17, 15], [-9, 11]], '#6e849c', 2);
  }
  c.restore();
}

export function rainbolt(c, shot, t) {
  const r = shot.r ?? 18, friendly = Boolean(shot.friendly);
  const pulse = 0.93 + Math.sin(t * 6 + (shot.life ?? 0)) * 0.07;
  c.save(); c.translate(shot.x, shot.y);
  c.rotate(Math.atan2(shot.vy ?? 0, shot.vx ?? 1));
  const tail = friendly ? r * 5.4 : r * 2.3;
  const trail = c.createLinearGradient(-tail, 0, 0, 0);
  trail.addColorStop(0, friendly ? '#48dfff00' : '#9c5a8f00');
  trail.addColorStop(1, friendly ? '#66edffd9' : '#cc719db5');
  polygon(c, [[-tail, 0], [-r, -r * 0.66], [r * 0.3, 0], [-r, r * 0.66]], trail);
  glow(c, 0, 0, r * (friendly ? 2.7 : 2.1), friendly ? '#6ef2ff80' : '#e994715c');
  if (friendly) {
    line(c, [[-tail * 0.8, 0], [-r * 0.8, 0]], '#d7ffff', 3);
    ellipse(c, 0, 0, r * 1.48, r * 1.48, null, '#62edff', 3);
    ellipse(c, 0, 0, r, r, '#57dff2', '#e9ffff', 2);
    ellipse(c, 2, 0, r * 0.72, r * 0.72, '#ffffff');
  } else {
    ellipse(c, 0, 0, r, r, '#8d507f', '#603b70', 2);
    ellipse(c, 1, 0, r * 0.75, r * 0.75, '#ed956c');
    ellipse(c, 3, -1, r * 0.44 * pulse, r * 0.49 * pulse, '#ffdfaa');
    line(c, [[-r * 0.6, -r * 0.61], [0, -r * 0.8], [r * 0.55, -r * 0.54]], '#f2b9d1', 2);
  }
  c.restore();
}
