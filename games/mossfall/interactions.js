import { objective } from './world.js';
import { message, enemies } from './state.js';

/** NPCs, loot, build choices and persistent quest consequences. */
export function interact(w, object, emit) {
  const p = w.player;
  if (object.id === 'neri-home') {
    w.dialog = {
      title: 'Neri · home again',
      text:
        'You came back for me, then for the forest. My lantern belongs beside this hearth now. ' +
        (w.watchman === 'spared'
          ? 'And the watchman you spared keeps our fire alive.'
          : w.watchman === 'slain'
            ? 'I wish the watchman could have come home too. We will remember him.'
            : 'There is still someone bound to the southern bell grove. If you go, remember that a blade is not the only way to free a life.'),
      choices: [{ label: 'Welcome home, Neri', action: 'close' }]
    };
    return true;
  }
  if (['bell-guide', 'bell-vow'].includes(object.id)) {
    w.dialog = {
      title: 'Neri’s watchman',
      text:
        w.watchman === 'spared'
          ? 'You brought him home without taking his life. Rowan’s hearth will never charge you amber again.'
          : w.watchman === 'slain'
            ? 'His amber is yours, but the old hearth pact died with him. This choice remains.'
            : 'An old watchman is bound to the southern bell grove. Keep him alive, lure or push him onto the glowing root circle, then ring the nearby bell. Sparing him gives no amber or experience, but makes hearth rests permanently free. Killing him gives normal combat loot and loses that pact. His attacks follow the Drowned knight’s warning rules. Retreat anytime; no time limit.',
      choices:
        w.area === 'grove' && !w.watchman
          ? [
              {
                label: 'Wake the watchman · begin optional trial',
                action: 'wake-watchman'
              },
              { label: 'Leave him sleeping', action: 'close' }
            ]
          : [{ label: 'I understand', action: 'close' }]
    };
    return true;
  }
  if (object.id === 'root-circle') {
    message(
      w,
      'The watchman must stand on this glowing circle, alive. Ring the bell from an adjacent tile.'
    );
    return false;
  }
  if (object.id === 'mercy-bell') {
    const watcher = w.areas.grove.enemies.find(
      (e) => e.id === 'grove-watchman' && e.hp > 0
    );
    if (w.watchman === 'spared') {
      message(w, 'The bell is quiet. The watchman tends your hearth now.');
      return true;
    }
    if (!watcher || watcher.x !== 10 || watcher.y !== 4) {
      message(
        w,
        'The bell needs the living watchman on the glowing root circle. Lure him or push him; do not kill him.'
      );
      return false;
    }
    w.watchman = 'spared';
    w.areas.grove.enemies = w.areas.grove.enemies.filter(
      (e) => e.id !== 'grove-watchman'
    );
    message(
      w,
      'The watchman lowers his blade. No amber or XP claimed. All future hearth rests are free. Rowan will remember.'
    );
    emit('mossfall.watchman_choice', 'The watchman was spared', {
      outcome: 'spared',
      freeHearthRest: true
    });
    return true;
  }
  if (object.kind === 'camp') {
    const cost = w.watchman === 'spared' ? 0 : Math.min(1, p.shards);
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
      text:
        (w.watchman === 'spared'
          ? 'The watchman you spared tends our fire. Hearth rests are now free. '
          : w.watchman === 'slain'
            ? 'The watchman’s light is gone, and the old hearth pact is lost. '
            : '') +
        (w.won
          ? 'You place the living seed in Rowan’s hands. Neri returns home, her lantern bright beside the hearth. Your journey remains saved; explore the paths you left behind.'
          : w.seals.length === 2
            ? 'Both seals are singing. The north path from Briar Hollow leads to the Hollow Crown.'
            : w.seals.length
              ? 'Neri’s lantern is burning again. The rain seal lies east in the archive. When both seals sing, take the north path from Briar Hollow.'
              : 'Neri carried our first seal into Briar Hollow. Free her from the wolves, then recover the rain seal in the archive to the east. Two seals open the north path to the Hollow Crown.'),
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
          label: 'Warden · 2 focus: deal 3 within 2 tiles + interrupt',
          action: 'warden'
        },
        {
          label: 'Wayfarer · 1 focus: deal 2 within 2 tiles + interrupt + push',
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
  if (action === 'wake-watchman' && w.area === 'grove' && !w.watchman) {
    w.watchman = 'active';
    w.areas.grove.enemies.push({
      id: 'grove-watchman',
      kind: 'sentinel',
      x: 12,
      y: 4,
      hp: 9,
      maxHp: 9,
      intent: [],
      stunned: 0
    });
    message(
      w,
      'The watchman wakes. Root circle: glowing seal. Ring the nearby bell while he stands there alive. Retreat remains open.'
    );
  }
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
