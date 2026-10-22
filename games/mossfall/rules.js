import { AREAS, ENEMY_NAMES, walkable, distance, objective } from './world.js';
export function message(w, text) {
  w.log.push(text);
  w.log = w.log.slice(-5);
}
export function enemies(w) {
  return w.areas[w.area].enemies.filter((e) => e.hp > 0);
}
function occupied(w, x, y) {
  return enemies(w).some((e) => e.x === x && e.y === y);
}
export function nextStep(w, x, y) {
  const start = w.player,
    queue = [[start.x, start.y, []]],
    seen = new Set([`${start.x},${start.y}`]);
  while (queue.length) {
    const [cx, cy, path] = queue.shift();
    if (cx === x && cy === y) return path[0] || null;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const nx = cx + dx,
        ny = cy + dy,
        key = `${nx},${ny}`;
      if (
        seen.has(key) ||
        !walkable(w.area, nx, ny) ||
        (occupied(w, nx, ny) && (nx !== x || ny !== y))
      )
        continue;
      seen.add(key);
      queue.push([nx, ny, [...path, [dx, dy]]]);
    }
  }
  return null;
}
function damageEnemy(w, e, amount, emit) {
  e.hp -= amount;
  message(w, `${ENEMY_NAMES[e.kind]} −${amount}`);
  if (e.hp <= 0) {
    w.player.shards += e.kind === 'boss' ? 4 : 2;
    w.player.xp++;
    w.player.focus = Math.min(w.player.maxFocus, w.player.focus + 1);
    message(w, `${ENEMY_NAMES[e.kind]} falls. +2 amber · +1 focus`);
    emit('mossfall.enemy_defeated', ENEMY_NAMES[e.kind], {
      enemy: e.id,
      area: w.area
    });
    if (w.player.xp === 3) {
      w.player.maxHp += 4;
      w.player.hp += 4;
      message(w, 'Lantern grows brighter: +4 maximum health.');
    }
  }
}
function plan(w, e) {
  const p = w.player,
    dx = Math.sign(p.x - e.x),
    dy = Math.sign(p.y - e.y);
  if (e.kind === 'boss') {
    // Alternate cross-shaped roots and a horizontal sweep; every tell has a one-step escape.
    if (w.turn % 2)
      return Array.from({ length: 15 }, (_, x) => ({ x, y: e.y })).concat(
        Array.from({ length: 9 }, (_, y) => ({ x: e.x, y }))
      );
    return [
      { x: p.x, y: p.y },
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y }
    ];
  }
  if (e.kind === 'moth')
    return [
      { x: p.x, y: p.y },
      { x: p.x + dx, y: p.y + dy }
    ];
  if (e.kind === 'sentinel') {
    const sx = Math.abs(p.x - e.x) >= Math.abs(p.y - e.y) ? dx : 0,
      sy = sx ? 0 : dy;
    return [1, 2, 3].map((n) => ({ x: e.x + sx * n, y: e.y + sy * n }));
  }
  return [{ x: p.x, y: p.y }];
}
function enemyTurn(w, guard, emit) {
  for (const e of enemies(w)) {
    if (e.stunned > 0) {
      e.stunned--;
      e.intent = [];
      continue;
    }
    if (e.intent.length) {
      if (e.intent.some((t) => t.x === w.player.x && t.y === w.player.y)) {
        const raw = e.kind === 'boss' ? 6 : e.kind === 'sentinel' ? 5 : 3;
        const hit = Math.max(0, raw - guard);
        w.player.hp -= hit;
        message(
          w,
          hit
            ? `${ENEMY_NAMES[e.kind]} hits for ${hit}.`
            : 'Your guard absorbs the blow.'
        );
      }
      e.intent = [];
      continue;
    }
    const range =
      e.kind === 'boss'
        ? 30
        : e.kind === 'moth'
          ? 5
          : e.kind === 'sentinel'
            ? 3
            : 1;
    if (distance(e, w.player) <= range)
      e.intent = plan(w, e).filter((t) => walkable(w.area, t.x, t.y));
    else {
      const options = [
        [Math.sign(w.player.x - e.x), 0],
        [0, Math.sign(w.player.y - e.y)]
      ];
      options.sort((a, b) =>
        Math.abs(w.player.x - e.x) > Math.abs(w.player.y - e.y)
          ? Math.abs(b[0]) - Math.abs(a[0])
          : Math.abs(b[1]) - Math.abs(a[1])
      );
      for (const [dx, dy] of options) {
        const x = e.x + dx,
          y = e.y + dy;
        if (
          (dx || dy) &&
          walkable(w.area, x, y) &&
          !occupied(w, x, y) &&
          (x !== w.player.x || y !== w.player.y)
        ) {
          e.x = x;
          e.y = y;
          break;
        }
      }
    }
  }
  if (w.player.hp <= 0) {
    const loss = Math.min(3, w.player.shards);
    w.player.shards -= loss;
    w.deaths++;
    w.area = 'haven';
    w.player.x = 5;
    w.player.y = 4;
    w.player.hp = w.player.maxHp;
    w.player.focus = w.player.maxFocus;
    for (const a of Object.values(w.areas))
      for (const e of a.enemies) {
        e.intent = [];
        if (e.hp > 0) e.hp = e.maxHp;
      }
    message(
      w,
      `The hearth calls you back. Lost ${loss} amber; seals and defeated foes remain.`
    );
    emit('mossfall.recovered', 'Returned to hearth', { lostAmber: loss });
  }
}
export function interact(w, object, emit) {
  const p = w.player;
  if (object.kind === 'camp') {
    const cost = Math.min(1, p.shards);
    p.shards -= cost;
    p.hp = p.maxHp;
    p.focus = p.maxFocus;
    w.rests++;
    message(
      w,
      `Restored at the hearth. ${cost ? '1 amber burned.' : 'The hearth shelters you for free.'} Defeated enemies stay defeated.`
    );
    return true;
  }
  if (object.id === 'elder') {
    w.met = true;
    if (w.won && !w.returned) {
      w.returned = true;
      emit('mossfall.homecoming', 'The living seed returned to the hearth', {
        turn: w.turn,
        deaths: w.deaths
      });
    }
    w.dialog = {
      title: w.won ? 'A forest begins again' : 'Rowan · keeper of the hearth',
      text: w.won
        ? 'You place the living seed in Rowan’s hands. The waters clear and Neri returns home. Your journey remains saved; explore the paths you left behind.'
        : w.seals.length
          ? 'Neri’s lantern is burning again. The rain seal lies east in the archive. When both seals sing, take the north path from Briar Hollow.'
          : 'Neri carried our first seal into Briar Hollow. Free her from the wolves, then recover the rain seal in the archive to the east. Two seals open the north path to the Hollow Crown.',
      choices: [{ label: 'I’ll carry the light', action: 'close' }]
    };
    return true;
  }
  if (object.id === 'forge') {
    w.dialog = {
      title: 'Shape your lantern',
      text: p.talent
        ? `Your oath: ${p.talent}. A new oath costs 3 amber. Your choice changes your lantern pulse.`
        : 'Choose an oath, free the first time. Q unleashes your lantern pulse. Both paths can finish the journey.',
      choices: [
        {
          label: 'Warden · pulse deals 3, stuns nearby foes',
          action: 'warden'
        },
        {
          label: 'Wayfarer · pulse costs 1, pushes foes back',
          action: 'wayfarer'
        },
        { label: 'Leave the anvil', action: 'close' }
      ]
    };
    return true;
  }
  if (w.areas[w.area].taken.includes(object.id)) return false;
  if (object.kind === 'seal') {
    if (enemies(w).length) {
      message(w, 'The thorns hold fast. Defeat the enemies here first.');
      return false;
    }
    w.areas[w.area].taken.push(object.id);
    if (object.id === 'heart-seed') {
      w.won = true;
      message(w, 'The living seed is yours. Bring it home to Rowan.');
    } else {
      w.seals.push(object.id);
      p.hp = Math.min(p.maxHp, p.hp + 6);
      p.focus = p.maxFocus;
      message(
        w,
        object.id === 'keeper'
          ? 'Neri is free. “Take my seal. The second sleeps in the archive, east.” +6 health.'
          : 'Rain seal recovered. The north gate in Briar Hollow opens. +6 health.'
      );
    }
    emit('mossfall.quest_advanced', objective(w), {
      seals: w.seals,
      won: w.won
    });
    return true;
  }
  if (object.id === 'hollow-cache') {
    w.dialog = {
      title: 'A wayfarer’s last gift',
      text: 'Choose one weapon. Your old blade stays in the chest, so you can switch here later.',
      choices: [
        {
          label: 'Briar spear · strike from two tiles, damage 3',
          action: 'spear'
        },
        { label: 'Hearth axe · adjacent strike, damage 5', action: 'axe' },
        { label: 'Keep my blade · damage 3', action: 'close' }
      ]
    };
    return true;
  }
  p.tonics++;
  w.areas[w.area].taken.push(object.id);
  message(w, 'Found a healing tonic. R restores 8 health and consumes a beat.');
  return true;
}
export function choose(w, action) {
  if (['warden', 'wayfarer'].includes(action)) {
    if (w.player.talent && w.player.talent !== action && w.player.shards < 3) {
      message(w, 'Changing your oath needs 3 amber.');
      w.dialog = null;
      return;
    }
    if (w.player.talent && w.player.talent !== action) w.player.shards -= 3;
    w.player.talent = action;
    message(w, `Oath of the ${action} chosen.`);
  }
  if (['spear', 'axe'].includes(action)) {
    w.player.weapon = action;
    message(
      w,
      `${action === 'spear' ? 'Briar spear' : 'Hearth axe'} equipped.`
    );
  }
  w.dialog = null;
}
export function act(w, action, emit = () => {}) {
  if (w.dialog) return false;
  const p = w.player;
  let guard = 0;
  if (action.type === 'move') {
    const x = p.x + action.dx,
      y = p.y + action.dy;
    const enemy = enemies(w).find((e) => e.x === x && e.y === y);
    if (enemy) damageEnemy(w, enemy, p.weapon === 'axe' ? 5 : 3, emit);
    else if (walkable(w.area, x, y)) {
      p.x = x;
      p.y = y;
    } else return false;
  } else if (action.type === 'strike') {
    const e = enemies(w).find((e) => e.id === action.id);
    if (!e || distance(e, p) > (p.weapon === 'spear' ? 2 : 1)) {
      message(w, 'Move closer to strike. Spear reaches two tiles.');
      return false;
    }
    damageEnemy(w, e, p.weapon === 'axe' ? 5 : 3, emit);
  } else if (action.type === 'pulse') {
    const cost = p.talent === 'wayfarer' ? 1 : 2;
    if (p.focus < cost) {
      message(w, 'Not enough focus. Space braces and restores 1 focus.');
      return false;
    }
    p.focus -= cost;
    let hits = 0;
    for (const e of enemies(w).filter((e) => distance(e, p) <= 2)) {
      hits++;
      damageEnemy(w, e, p.talent === 'warden' ? 3 : 2, emit);
      e.stunned = 1;
      e.intent = [];
      if (p.talent === 'wayfarer') {
        const dx = Math.sign(e.x - p.x),
          dy = dx ? 0 : Math.sign(e.y - p.y);
        if (
          walkable(w.area, e.x + dx, e.y + dy) &&
          !occupied(w, e.x + dx, e.y + dy)
        ) {
          e.x += dx;
          e.y += dy;
        }
      }
    }
    message(w, `Lantern pulse: ${hits} foes interrupted. −${cost} focus.`);
    emit('mossfall.pulse', 'Lantern pulse', { hits, talent: p.talent });
  } else if (action.type === 'guard') {
    guard = 4;
    p.focus = Math.min(p.maxFocus, p.focus + 1);
    message(w, 'Braced: block 4 damage this beat · +1 focus.');
  } else if (action.type === 'heal') {
    if (!p.tonics) {
      message(w, 'No tonics left. Return to the hearth to recover.');
      return false;
    }
    p.tonics--;
    p.hp = Math.min(p.maxHp, p.hp + 8);
    message(w, 'Tonic: +8 health. Enemies advance.');
  } else return false;
  w.turn++;
  enemyTurn(w, guard, emit);
  const exit = AREAS[w.area].exits.find((e) => e.x === p.x && e.y === p.y);
  if (exit) {
    if (exit.to === 'heart' && w.seals.length < 2)
      message(w, 'The Heartwood gate needs Neri’s seal and the rain seal.');
    else {
      w.area = exit.to;
      [p.x, p.y] = exit.at;
      for (const e of enemies(w)) e.intent = [];
      message(w, `Entered ${AREAS[w.area].name}.`);
      emit('mossfall.area_entered', AREAS[w.area].name, { area: w.area });
    }
  }
  return true;
}
