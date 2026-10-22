import { stats } from './character.js';
import { regentHint } from './regent.js';

export function createHud(ui, s) {
  const {
    playerName,
    playerVitals,
    breathHud,
    enemyName,
    enemyVitals,
    bossHint,
    cueText,
    cueTime
  } = ui;
  let lastHud = '',
    lastBossHint = '',
    lastCue = '',
    lastTimer = '';
  return {
    status() {
      const st = stats(s),
        hudValues = [
          `${s.character.name} · LV ${s.character.level}`,
          `HP ${Math.ceil(s.hp)}/${st.maxHp} · MP ${s.character.mp}/${st.maxMp}`,
          `Breath ${Math.floor(s.stamina)}`,
          s.enemy.name,
          `HP ${Math.ceil(s.enemy.hp)}/${s.enemy.maxHp}`
        ],
        hudKey = JSON.stringify(hudValues);
      if (hudKey !== lastHud) {
        [playerName, playerVitals, breathHud, enemyName, enemyVitals].forEach(
          (el, i) => {
            el.textContent = hudValues[i];
          }
        );
        lastHud = hudKey;
      }
      const bossText = regentHint(s);
      if (bossText !== lastBossHint) {
        bossHint.textContent = bossText;
        bossHint.hidden = !bossText;
        lastBossHint = bossText;
      }
    },
    cues(combat, q) {
      let cue,
        timer = '';
      if (s.phase === 'victory')
        cue = s.regent?.complete
          ? `Campaign complete. ${s.character.name} and earned rewards are saved.`
          : 'Victory. Progress saved; rest and prepare for the next encounter.';
      else if (s.phase === 'defeat')
        cue =
          'Defeated. Retry restores this opponent without erasing your character.';
      else if (s.paused)
        cue = 'Paused. Enter or Start resumes. Release held controls first.';
      else if (s.phase === 'windup') {
        const a = combat.threat();
        cue = `${a.kind.toUpperCase()}: ${a.label}. ${a.kind === 'thrust' ? 'Space: dodge' : a.kind === 'sweep' ? 'K: hold guard' : 'K guard or Space dodge'}.`;
        timer = `Impact in ${Math.max(0, s.remaining).toFixed(1)} seconds`;
      } else if (
        s.phase === 'recovery' &&
        combat.view().counter?.stage === 'charging'
      ) {
        const r = combat.view().counter;
        cue = r.needsHold
          ? 'Bell Return suspended: hold K again, then release in this opening.'
          : r.ready
            ? 'BELL RETURN: release K now, or hold for more power. J / Space cancels.'
            : `BELL RETURN: keep holding K for at least ${r.minSeconds.toFixed(2)}s, then release.`;
        timer = `Charge ${Math.round(r.progress * 100)}% · ${Math.max(0, s.remaining).toFixed(1)}s opening`;
      } else if (s.phase === 'recovery') {
        const v = combat.view(),
          left = Math.max(0, v.openingMax - v.openingHits);
        cue = left
          ? `OPENING ${left}/${v.openingMax}: J strike for full damage. Skills are available.`
          : 'OPENING SPENT: conserve breath; defend the next attack. Skills are available.';
        timer = `${Math.max(0, s.remaining).toFixed(1)} seconds remaining`;
      } else if (s.phase === 'qte') {
        cue = `Clash cue ${(q.index || 0) + 1} of ${q.total}: ${q.phase.toUpperCase()}. ${q.cue?.label || q.cue?.action || ''}. ${q.cue?.kind === 'hold' ? 'Hold through the window.' : 'Press when the window opens.'}`;
        timer = `${(Math.max(0, q.remainingMs || 0) / 1000).toFixed(1)} seconds${q.cue?.kind === 'hold' ? ` · Hold ${Math.round((q.holdProgress || 0) * 100)}%` : ''}`;
      } else cue = 'Ready. The opponent is preparing.';
      if (!s.paused && combat.view().counter?.stage === 'armed')
        cue +=
          ' Bell Return armed: block or parry while holding K, then keep holding to charge.';
      if (cue !== lastCue) {
        cueText.textContent = cue;
        lastCue = cue;
      }
      if (timer !== lastTimer) {
        cueTime.textContent = timer;
        lastTimer = timer;
      }
    }
  };
}
