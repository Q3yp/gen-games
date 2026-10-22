import { stats } from './character.js';
import { drawArena, drawDuelist } from './visuals.js';
export function paint(c, s, combat, time, fx, q) {
  const W = 1100,
    H = 650,
    st = stats(s),
    v = combat.view(),
    a = combat.threat();
  c.clearRect(0, 0, W, H);
  drawArena(c, time, { width: W, height: H });
  const wind = s.phase === 'windup',
    p = wind ? 1 - s.remaining / s.phaseTotal : 0;
  const hit =
    fx.life > 0 &&
    ['hit', 'strike', 'parry', 'hurt', 'counter'].includes(fx.kind);
  const shake =
    fx.kind === 'hurt' && fx.life > 0 ? Math.sin(time * 70) * fx.life * 14 : 0;
  c.save();
  c.translate(shake, 0);
  let px =
      340 -
      (v.dodge > 0
        ? Math.sin(Math.min(1, v.dodge / (0.46 * s.timing)) * Math.PI) * 90
        : 0),
    ex = 760;
  if (s.phase === 'recovery' && fx.life > 0.1 && fx.kind === 'hurt')
    ex -= 60 * fx.life;
  drawDuelist(c, {
    x: px,
    y: 452,
    dir: 1,
    color: '#79d9d0',
    sword: v.guard
      ? -1
      : fx.life > 0 && ['hit', 'strike', 'glance', 'counter'].includes(fx.kind)
        ? 0.9
        : -0.3,
    enemy: false,
    time,
    guard: v.guard,
    attack: hit && fx.kind !== 'hurt',
    empowered: s.character.empower > 0 || v.counter?.stage === 'charging'
  });
  drawDuelist(c, {
    x: ex,
    y: 452,
    dir: -1,
    color: '#d5a975',
    sword: wind ? -1.5 + p * 0.5 : s.phase === 'recovery' ? 0.7 : -0.4,
    enemy: true,
    time,
    windup: p,
    attack: s.phase === 'recovery' && fx.kind === 'hurt' && fx.life > 0
  });
  if (v.guard) {
    c.strokeStyle = '#9ff9e9';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(px + 15, 380, 72, -1.25, 1.25);
    c.stroke();
  }
  if (wind) {
    const col =
      a.kind === 'thrust'
        ? '#ff7c8c'
        : a.kind === 'sweep'
          ? '#b3a0ff'
          : '#ffc96f';
    c.strokeStyle = col;
    c.lineWidth = 5;
    c.setLineDash([7, 9]);
    c.beginPath();
    if (a.kind === 'thrust') {
      c.moveTo(ex - 70, 370);
      c.lineTo(px + 50, 370);
    } else {
      c.ellipse(
        550,
        a.kind === 'sweep' ? 443 : 365,
        145,
        30,
        0,
        0,
        Math.PI * 2
      );
    }
    c.stroke();
    c.setLineDash([]);
    text(a.kind.toUpperCase(), 550, 230, 17, col);
    text(a.label, 550, 260, 23, '#fff3dc');
    bar(400, 282, 300, 7, p, col, '#ffffff18');
    text(
      a.kind === 'thrust'
        ? 'DODGE · SPACE'
        : a.kind === 'sweep'
          ? 'GUARD · K'
          : 'GUARD / DODGE',
      550,
      319,
      13,
      col
    );
  }
  if (s.phase === 'recovery') {
    const r = v.counter,
      charging = r?.stage === 'charging',
      left = Math.max(0, (v.openingMax ?? 2) - (v.openingHits ?? 0));
    text(
      charging
        ? 'BELL RETURN'
        : left
          ? `OPENING · ${left}/2 HITS`
          : 'OPENING SPENT',
      550,
      260,
      22,
      '#8ff2c6'
    );
    text(
      charging
        ? r.needsHold
          ? 'HOLD K AGAIN · THEN RELEASE'
          : r.ready
            ? 'RELEASE K · OR HOLD FOR POWER'
            : 'KEEP HOLDING K · CHARGING'
        : left
          ? 'STRIKE · J'
          : 'CONSERVE BREATH · NEXT DEFENSE',
      550,
      288,
      14,
      '#cfffe9'
    );
    bar(
      430,
      306,
      240,
      6,
      charging ? r.progress : s.remaining / s.phaseTotal,
      '#8ff2c6',
      '#ffffff18'
    );
    if (charging)
      text(
        `${Math.round(r.progress * 100)}% · ${s.remaining.toFixed(1)}s opening · J / Space cancels`,
        550,
        330,
        12,
        '#cfffe9'
      );
  }
  if (v.counter?.stage === 'armed')
    text(
      'BELL RETURN ARMED · DEFEND WITH K, KEEP HOLDING',
      550,
      482,
      12,
      '#bfffe8'
    );
  if (fx.life > 0) {
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.4,
        rad = (1 - fx.life) * 110;
      c.fillStyle = fx.kind === 'hurt' ? '#ff8f86' : '#ffe0a1';
      c.fillRect(
        (fx.kind === 'hurt' ? px : ex - 30) + Math.cos(angle) * rad,
        370 + Math.sin(angle) * rad,
        3 + fx.life * 4,
        3 + fx.life * 4
      );
    }
    if (hit) {
      c.strokeStyle = '#fff1cc';
      c.lineWidth = 6 * fx.life;
      c.beginPath();
      c.moveTo(520, 300);
      c.lineTo(710, 420);
      c.stroke();
    }
  }
  if (fx.kind === 'counter' && fx.life > 0) {
    c.strokeStyle = `rgba(159,249,233,${fx.life})`;
    c.lineWidth = 3 + fx.life * 4;
    c.beginPath();
    c.arc(ex - 30, 370, 25 + (1 - fx.life) * 115, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
  text('IRON CADENCE', 44, 40, 14, '#d2ad7a', 'left');
  text(s.location, 44, 65, 12, '#9caeba', 'left', 600);
  if (fx.textLife > 0 && s.phase !== 'ready')
    text(s.outcomes.at(-1)?.text || '', 550, 565, 15, '#d5dfe1');
  caption(s.caption);
  if (s.phase === 'qte' && q) {
    c.fillStyle = '#0b1429ec';
    c.fillRect(250, 205, 600, 240);
    text(
      s.sequence?.sequence?.label || 'CLASH OF BLADES',
      550,
      242,
      15,
      '#e8c8a0'
    );
    text(q.cue?.label || q.cue?.action || 'Prepare', 550, 288, 25, '#f2ede6');
    text(
      `${q.phase.toUpperCase()} · ${(q.remainingMs / 1000).toFixed(1)}s`,
      550,
      324,
      17,
      '#9df0de'
    );
    text(
      q.cue?.kind === 'hold'
        ? 'HOLD THROUGH THE WINDOW'
        : 'PRESS WHEN THE WINDOW OPENS',
      550,
      360,
      12,
      '#c9c5ea'
    );
    text(
      `${(q.index || 0) + 1} / ${q.total || 0}  ·  J strike  /  K guard  /  Space dodge`,
      550,
      395,
      13,
      '#aab9cb'
    );
  }
  if (s.paused || ['victory', 'defeat'].includes(s.phase)) {
    c.fillStyle = '#0a1325b8';
    c.fillRect(220, 200, 660, 260);
    text(
      s.phase === 'victory'
        ? s.regent?.complete
          ? 'OATH DELIVERED'
          : 'OPPONENT YIELDS'
        : s.phase === 'defeat'
          ? 'TAKE A BREATH'
          : s.phase === 'ready'
            ? s.enemy.name
            : 'PAUSED',
      550,
      260,
      29,
      '#f2e8d4',
      'center',
      610
    );
    text(
      s.phase === 'victory'
        ? s.regent?.complete
          ? 'Stormglass is free. Your character and earned spoils are saved.'
          : 'Your progress is saved. Rest, equip, and await the next encounter.'
        : s.phase === 'defeat'
          ? 'Retry this opponent. Your character and earned rewards remain.'
          : 'Read the intent. Defend with purpose. Strike the opening.',
      550,
      305,
      16,
      '#c6d5df'
    );
    text(
      s.phase === 'defeat'
        ? 'Retry below'
        : s.phase === 'victory'
          ? s.regent?.complete
            ? 'Campaign complete · the city remembers Iona'
            : 'The road continues with your live host'
          : 'Enter / Start to continue · P pauses',
      550,
      350,
      15,
      '#9ce9d4'
    );
    text(
      `Timing ×${s.timing} · wider windows, same consequences`,
      550,
      390,
      12,
      '#e1c392'
    );
  }
  function caption(value) {
    c.font = '14px system-ui, sans-serif';
    const words = String(value || '').split(/\s+/),
      lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && c.measureText(next).width > 1000) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    for (let i = 0; i < Math.min(3, lines.length); i++)
      text(lines[i], 550, 588 + i * 19, 14, '#aebecb', 'center', 1000);
  }
  function text(t, x, y, size, color, align = 'center', maxWidth = 1000) {
    c.fillStyle = color;
    c.font = `${size >= 20 ? '600 ' : ''}${size}px system-ui, sans-serif`;
    c.textAlign = align;
    c.fillText(String(t), x, y, maxWidth);
  }
  function bar(x, y, w, h, f, color, back) {
    c.fillStyle = back;
    c.fillRect(x, y, w, h);
    c.fillStyle = color;
    c.fillRect(x, y, w * Math.max(0, Math.min(1, f)), h);
  }
}
