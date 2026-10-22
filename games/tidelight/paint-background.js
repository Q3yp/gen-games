import { noise, ellipse, glow, line, arch } from './paint-primitives.js';

export function background(c, t, { x, y, width, height }) {
  const bg = c.createLinearGradient(0, 0, 1200, 1000);
  bg.addColorStop(0, '#101e33');
  bg.addColorStop(0.45, '#143841');
  bg.addColorStop(1, '#092431');
  c.fillStyle = bg;
  c.fillRect(x, y, width, height);
  // A drowned firmament: distant masonry rises through the moonlit haze.
  const mx = 1150,
    my = 95;
  glow(c, mx, my, 360, 'rgba(122,179,179,.12)');
  ellipse(c, mx, my, 79, 79, '#a9bcaf');
  ellipse(c, mx - 18, my - 12, 72, 72, '#112a3a');
  c.strokeStyle = 'rgba(226,222,177,.7)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(mx, my, 79, -0.8, 1.6);
  c.stroke();
  for (let j = 0; j < 46; j++) {
    let xx = j * 39 - 40,
      hh = 35 + noise(j + 12) * 80;
    c.fillStyle = '#122d3c';
    c.fillRect(xx, 162 - hh, 23 + noise(j) * 22, hh + 27);
    if (j % 3 === 0) arch(c, xx + 13, 173, 27, hh + 30, 0.6);
  }
  for (let j = 0; j < 80; j++) {
    let xx = noise(j * 3) * 1600,
      yy = noise(j * 3 + 1) * 160;
    ellipse(c, xx, yy, 0.5 + noise(j) * 0.6, 0.5, 'rgba(181,214,201,.32)');
  }
  // Broken reflection, not a second moon painted over the navigable water.
  for (let j = 0; j < 53; j++) {
    let yy = 200 + j * 10,
      spread = 30 + j * 2.8,
      xx = mx + Math.sin(j * 2.3 + t * 0.4) * spread * 0.5;
    line(
      c,
      [
        [xx - spread * noise(j + 9), yy],
        [xx + spread * noise(j + 17), yy]
      ],
      `rgba(174,210,180,${0.12 * (1 - j / 60)})`,
      1 + noise(j) * 2
    );
  }
  for (let j = 0; j < 240; j++) {
    const xx = noise(j + 24) * 1600,
      yy = 190 + noise(j + 224) * 810,
      ww = 5 + noise(j + 32) * 27;
    line(
      c,
      [
        [xx, yy + Math.sin(t * 0.5 + j) * 2],
        [xx + ww, yy + Math.sin(t * 0.5 + j + 0.5) * 2]
      ],
      j % 4 === 0 ? 'rgba(107,174,162,.13)' : 'rgba(5,26,41,.20)',
      0.7
    );
  }
}

export function atmosphere(c, s, t, { x, y, width, height }) {
  for (let j = 0; j < 38; j++) {
    const m = s.motes?.[j];
    let xx = m?.x ?? noise(j + 700) * 1600,
      yy = m?.y ?? 180 + noise(j + 800) * 740;
    xx += Math.sin(t * 0.4 + j) * 5;
    yy += Math.cos(t * 0.7 + j) * 4;
    let alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t + j * 2));
    glow(c, xx, yy, 9, `rgba(227,226,146,${alpha * 0.18})`);
    ellipse(c, xx, yy, 1.2, 1.2, `rgba(231,240,174,${alpha})`);
  }
  // Translucent cloud banks drift above the water without hiding the playfield.
  for (let j = 0; j < 6; j++) {
    let xx = 180 + j * 300 + Math.sin(t * 0.025 + j) * 40,
      yy = 210 + noise(j + 990) * 650;
    const fog = c.createRadialGradient(xx, yy, 0, xx, yy, 190);
    fog.addColorStop(0, 'rgba(159,198,185,.035)');
    fog.addColorStop(1, 'rgba(159,198,185,0)');
    ellipse(c, xx, yy, 240, 53, fog);
  }
  const vignette = c.createRadialGradient(800, 470, 300, 800, 470, 950);
  vignette.addColorStop(0, 'rgba(0,10,22,0)');
  vignette.addColorStop(1, 'rgba(0,7,18,.59)');
  c.fillStyle = vignette;
  c.fillRect(x, y, width, height);
}
