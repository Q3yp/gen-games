export function createLayout(host) {
  const root = document.createElement('section');
  root.className = 'ic';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = host.asset('./style.css');
  root.append(css);
  const hud = document.createElement('div');
  hud.className = 'ic-hud';
  hud.setAttribute('role', 'group');
  hud.setAttribute('aria-label', 'Combat status');
  const playerHud = document.createElement('div'),
    enemyHud = document.createElement('div'),
    breathHud = document.createElement('output');
  enemyHud.className = 'ic-enemy-hud';
  breathHud.className = 'ic-breath-hud';
  breathHud.setAttribute('aria-live', 'off');
  const playerName = document.createElement('strong'),
    playerVitals = document.createElement('span'),
    enemyName = document.createElement('strong'),
    enemyVitals = document.createElement('span');
  playerHud.append(playerName, playerVitals);
  enemyHud.append(enemyName, enemyVitals);
  hud.append(playerHud, breathHud, enemyHud);
  root.append(hud);
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 650;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    'Iron Cadence combat arena. J strike, hold K guard, Space dodge, Q and E skills, R potion, P pause, Enter resume.'
  );
  root.append(canvas);
  const ctx = canvas.getContext('2d');
  const combatDeck = document.createElement('div');
  combatDeck.className = 'ic-combat-deck';
  root.append(combatDeck);
  const bossHint = document.createElement('div');
  bossHint.className = 'ic-boss';
  bossHint.setAttribute('role', 'status');
  combatDeck.append(bossHint);
  const cueStrip = document.createElement('div');
  cueStrip.className = 'ic-cue';
  const cueText = document.createElement('span');
  cueText.setAttribute('role', 'status');
  cueText.setAttribute('aria-live', 'polite');
  const cueTime = document.createElement('output');
  cueTime.setAttribute('aria-live', 'off');
  cueStrip.append(cueText, cueTime);
  combatDeck.append(cueStrip);
  const controls = document.createElement('div');
  controls.className = 'ic-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Combat controls');
  combatDeck.append(controls);
  const kit = document.createElement('div');
  kit.className = 'ic-kit';
  kit.setAttribute('role', 'group');
  kit.setAttribute('aria-label', 'Skills and consumables');
  combatDeck.append(kit);
  const skillButtons = document.createElement('div');
  skillButtons.className = 'ic-skills';
  const consumables = document.createElement('div');
  consumables.className = 'ic-consumables';
  kit.append(skillButtons, consumables);
  const note = document.createElement('div');
  note.className = 'ic-note';
  note.setAttribute('aria-live', 'polite');
  combatDeck.append(note);
  const drawer = document.createElement('details');
  drawer.className = 'ic-drawer';
  const drawerToggle = document.createElement('summary');
  drawerToggle.textContent = 'Setup, equipment & how to play';
  drawer.append(drawerToggle);
  root.append(drawer);
  const drawerBody = document.createElement('div');
  drawerBody.className = 'ic-drawer-body';
  drawer.append(drawerBody);
  const settings = document.createElement('div');
  settings.className = 'ic-settings';
  drawerBody.append(settings);
  const characterSummary = document.createElement('p');
  characterSummary.className = 'ic-character-summary';
  drawerBody.append(characterSummary);
  const equipment = document.createElement('div');
  equipment.className = 'ic-equipment';
  equipment.setAttribute('role', 'group');
  equipment.setAttribute('aria-label', 'Equipment, change between fights');
  drawerBody.append(equipment);
  const help = document.createElement('div');
  help.className = 'ic-help';
  help.innerHTML =
    '<b>Read the blade:</b> Crosscut = guard or dodge. Thrust = dodge. Sweep = guard. Press guard just before impact to parry (+8 damage and a longer opening). Each OPENING allows two full-power strikes; more strikes glance for 3 and still cost breath. Bell Return and skills do not spend these two hits. Breath recovers while not guarding.<br><b>Q / E</b> first two skills · <b>R</b> first red vial · <b>P</b> pause · <b>Enter</b> start/resume. Skills and consumables take one action beat; offensive skills require an opening. Rest and equipment changes are safe between fights. Reload pauses, preserving progress; an interrupted QTE repeats only its current cue preparation.';
  drawerBody.append(help);
  host.root.append(root);
  return {
    root,
    canvas,
    ctx,
    controls,
    settings,
    note,
    playerName,
    playerVitals,
    breathHud,
    enemyName,
    enemyVitals,
    bossHint,
    cueText,
    cueTime,
    skillButtons,
    consumables,
    equipment,
    characterSummary
  };
}
