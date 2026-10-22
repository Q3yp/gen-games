// Optional Tidelight encounter. Importing this module creates no creature.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createShadows(
  s,
  { record = () => {}, notice = () => {} } = {}
) {
  const shadows = () => (Array.isArray(s.shadows) ? s.shadows : []);
  function prepare(c) {
    c.phase ??= 'hunt';
    c.seals ??= 3;
    c.timer ??= 0;
    c.grace ??= 0;
    c.angle ??= 0;
    c.chargeProgress ??= 0;
    if (c.seals <= 0) c.phase = 'dispersed';
  }
  function home() {
    return s.islands?.find((i) => i.id === 'home');
  }
  function sheltered(point) {
    const h = home();
    return h && distance(h, point) < h.r + 110;
  }
  function move(c, angle, amount) {
    c.angle = angle;
    c.x = clamp(c.x + Math.cos(angle) * amount, 65, 1535);
    c.y = clamp(c.y + Math.sin(angle) * amount, 80, 930);
    const h = home();
    if (h && distance(c, h) < h.r + 95) {
      const a = Math.atan2(c.y - h.y, c.x - h.x);
      c.x = h.x + Math.cos(a) * (h.r + 95);
      c.y = h.y + Math.sin(a) * (h.r + 95);
    }
  }
  function stagger(c, origin, duration = 2.2) {
    c.phase = 'stunned';
    c.timer = duration;
    c.chargeProgress = 0;
    c.fleeAngle = Math.atan2(c.y - origin.y, c.x - origin.x);
  }
  function crack(c, cause) {
    c.seals = Math.max(0, c.seals - 1);
    record('shadow.cracked', 'A shell seal split beneath the water.', {
      id: c.id,
      cause,
      seals: c.seals
    });
    if (!c.seals) {
      c.phase = 'dispersed';
      c.timer = 0;
      c.chargeProgress = 0;
      notice('The dark shell opens. Its light rises, free.', 6);
      record('shadow.freed', 'Freed the light inside a shadow shell.', {
        id: c.id
      });
    } else notice('A pale fracture opens across the shell.', 4);
  }
  function rescue() {
    const h = home();
    s.player.x = h ? clamp(h.x + h.r + 35, 65, 1535) : 320;
    s.player.y = h ? clamp(h.y - 75, 80, 930) : 710;
    s.player.hp = 5;
    // A stale point-to-sail destination must not immediately undo the rescue.
    s.target = { x: s.player.x, y: s.player.y };
    for (const c of shadows()) {
      prepare(c);
      c.grace = 8;
      if (c.phase !== 'dispersed') stagger(c, s.player, 4);
    }
    notice('The home tide catches your boat. Your discoveries remain.', 6);
    record(
      'boat.rescued',
      'The home tide restored the boat without losing discoveries.'
    );
  }
  function pulse() {
    if (s.paused) return;
    for (const c of shadows()) {
      prepare(c);
      if (c.phase === 'dispersed' || distance(c, s.player) > 240) continue;
      const vulnerable = c.phase === 'charge' && distance(c, s.player) <= 145;
      stagger(c, s.player);
      if (vulnerable) crack(c, 'bell');
      else
        record('shadow.repelled', 'The silver bell pushed the shadow back.', {
          id: c.id
        });
    }
  }
  function tick(c, dt) {
    prepare(c);
    c.grace = Math.max(0, c.grace - dt);
    if (c.phase === 'dispersed') return;
    if (c.phase === 'stunned') {
      c.timer -= dt;
      // A long, readable recoil; no damage is possible until a fresh charge.
      move(c, c.fleeAngle ?? c.angle, 34 * dt);
      if (c.timer <= 0) {
        c.phase = 'hunt';
        c.timer = 0.8;
      }
      return;
    }
    if (c.phase === 'recover') {
      c.timer -= dt;
      if (c.timer <= 0) {
        c.phase = 'hunt';
        c.timer = 0.6;
      }
      return;
    }
    if (c.phase === 'charge') {
      c.timer -= dt;
      c.chargeProgress = clamp(1 - c.timer / 1.5, 0, 1);
      if (c.timer <= 0) {
        c.phase = 'dash';
        c.timer = Math.min(1.45, Math.max(0.35, distance(c, c.aim) / 210));
        c.hit = false;
        record('shadow.dashed', 'The shadow lunged along its pale wake.', {
          id: c.id
        });
      }
      return;
    }
    if (c.phase === 'dash') {
      move(c, c.angle, Math.min(dt, c.timer) * 210);
      c.timer -= dt;
      const ruin = s.islands?.find(
        (i) => i.awake && distance(c, i) < i.r * 0.7 + 24
      );
      if (ruin) {
        stagger(c, ruin, 3.4);
        crack(c, 'walking-ruin');
        return;
      }
      if (
        !c.hit &&
        c.grace <= 0 &&
        !sheltered(s.player) &&
        distance(c, s.player) < 32
      ) {
        c.hit = true;
        s.player.hp = Math.max(0, (s.player.hp ?? 5) - 1);
        // Shared invulnerability stored on all encounters, never on a hidden clock.
        for (const other of shadows()) other.grace = 3;
        record('boat.struck', 'The shell scraped the boat.', {
          id: c.id,
          hp: s.player.hp
        });
        notice('The hull shudders. The shadow drifts past.', 3);
        if (!s.player.hp) {
          rescue();
          return;
        }
      }
      if (c.timer <= 0) {
        c.phase = 'recover';
        c.timer = 2.5;
        c.chargeProgress = 0;
      }
      return;
    }
    c.timer = Math.max(0, c.timer - dt);
    const lights = (s.lanterns || []).filter((l) => l.lit && !sheltered(l));
    const light = lights.sort((a, b) => distance(c, a) - distance(c, b))[0];
    c.targetId = light?.id ?? null;
    if (!light) return;
    c.angle = Math.atan2(light.y - c.y, light.x - c.x);
    if (distance(c, light) < 265 && c.timer <= 0) {
      c.phase = 'charge';
      c.timer = 1.5;
      c.chargeProgress = 0;
      // Lock the visible attack line now, not to the player's future position.
      c.aim = { x: light.x, y: light.y };
      record(
        'shadow.charging',
        'Three shell seams brighten; a pale wake points toward a light.',
        {
          id: c.id,
          light: light.id,
          x: c.aim.x,
          y: c.aim.y
        }
      );
      return;
    }
    move(c, c.angle, 38 * dt);
  }
  function step(dt) {
    if (s.paused || !Number.isFinite(dt) || dt <= 0 || !shadows().length)
      return;
    // Never fast-forward a lethal attack after a suspended browser frame.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0) {
      const slice = Math.min(remaining, 1 / 60);
      for (const c of shadows()) tick(c, slice);
      remaining -= slice;
    }
  }
  return { step, pulse };
}
