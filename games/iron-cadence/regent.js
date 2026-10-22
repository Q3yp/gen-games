// A campaign-specific finale. All phase changes and seal judgments run locally.
export const REGENT_ID = 'sg-stormglass-regent';
const stormPattern = [
  {
    kind: 'thrust',
    windup: 1.7,
    recovery: 1.25,
    damage: 22,
    label: 'Crown needle · dodge the pointed blade'
  },
  {
    kind: 'sweep',
    windup: 1.9,
    recovery: 1.5,
    damage: 20,
    label: 'Returning tide · hold guard, charge a counter'
  },
  {
    kind: 'slash',
    windup: 1.3,
    recovery: 1.2,
    damage: 18,
    label: 'Broken crown · guard or dodge the quick crosscut'
  }
];
export function resetRegent(s) {
  s.regent =
    s.encounterId === REGENT_ID
      ? {
          phase: 1,
          bell: false,
          prism: false,
          shattered: false,
          complete: false,
          firstPattern: structuredClone(s.pattern)
        }
      : null;
}
export function retryRegent(s) {
  if (s.regent?.firstPattern)
    s.pattern = structuredClone(s.regent.firstPattern);
  resetRegent(s);
}
export function regentDefense(s, kind, outcome, record) {
  const r = s.regent;
  if (!r || r.complete || r.shattered) return;
  let changed = false;
  if (kind === 'sweep' && ['block', 'parry'].includes(outcome) && !r.bell) {
    r.bell = true;
    changed = true;
  }
  if (kind === 'thrust' && outcome === 'evade' && !r.prism) {
    r.prism = true;
    changed = true;
  }
  if (!changed) return;
  s.versions.encounter++;
  record(
    'seal',
    r.bell && r.prism ? 'Both earned seals answer.' : 'An earned seal answers.',
    { bell: r.bell, prism: r.prism }
  );
  if (r.bell && r.prism) {
    r.shattered = true;
    s.enemy.hp = Math.max(0, s.enemy.hp - 24);
    s.stamina = Math.min(100, s.stamina + 20);
    record(
      'crown-break',
      'Crown shattered: 24 damage, +20 breath. A one-time reward for both defenses.',
      { damage: 24, breath: 20, enemyHp: s.enemy.hp }
    );
  }
}
export function regentBoundary(s, record) {
  const r = s.regent;
  if (!r || r.complete || r.phase !== 1 || s.enemy.hp > s.enemy.maxHp / 2)
    return;
  r.phase = 2;
  s.pattern = structuredClone(stormPattern);
  s.pendingPattern = null;
  s.index = 0;
  s.versions.pattern++;
  s.versions.encounter++;
  s.caption =
    'The crown splits. Phase II: pointed thrust, returning sweep, quick crosscut. Same defenses, changing rhythm. Your two seals still answer if unspent.';
  record(
    'boss-phase',
    'Phase II: the storm cadence begins with a thrust. Dodge; then guard the returning sweep.',
    { phase: 2 }
  );
}
export function finishRegent(s) {
  if (!s.regent) return;
  s.regent.complete = true;
  s.objective =
    'Oath delivered. The flooded gates are open; Iona’s character and earned spoils remain saved.';
  s.caption =
    'The Stormglass Regent kneels. Tarn rings the outer bell; Vey turns the floodglass toward dawn. Iona delivers the oath, and the city opens its gates. Campaign complete.';
  s.versions.narration++;
}
export function regentHint(s) {
  const r = s.regent;
  if (!r) return '';
  if (r.complete)
    return 'OATH DELIVERED · Stormglass liberated · character and rewards saved';
  return `REGENT · PHASE ${r.phase}/2 · ${r.shattered ? 'CROWN SHATTERED (24 damage +20 breath claimed)' : `Bell ${r.bell ? '●' : '○'} guard a sweep · Prism ${r.prism ? '●' : '○'} dodge a thrust · both: 24 damage +20 breath once`} · Half HP: storm cadence after this opening.`;
}
