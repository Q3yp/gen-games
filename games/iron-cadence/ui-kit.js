import { stats } from './character.js';

// Rebuilt only on discrete actions, never during a held defense.
export function createKit(ui, s, { use, equip }) {
  const { skillButtons, consumables, equipment, characterSummary } = ui;
  let version = -1;
  function updateKit() {
    version = s.versions.character;
    skillButtons.replaceChildren();
    consumables.replaceChildren();
    equipment.replaceChildren();
    const st = stats(s),
      p = s.character;
    characterSummary.textContent = `${p.title} · XP ${p.xp}/${p.level * 100} · Power ${st.power} · Armor ${st.armor} · Parry +${st.parry}ms · ${s.objective}`;
    // Kit buttons are replaced only on discrete actions, never during a held defense.
    for (const id of p.skills) {
      const d = s.content.skills[id];
      if (!d) continue;
      const b = document.createElement('button');
      b.textContent = `${d.name} · ${d.mp} MP`;
      b.title = d.description;
      b.onclick = () => use('skill', id);
      skillButtons.append(b);
    }
    for (const [id, n] of Object.entries(p.inventory)) {
      const d = s.content.items[id];
      if (!d || n <= 0) continue;
      const b = document.createElement('button');
      b.textContent =
        d.kind === 'equipment'
          ? `${p.equipment === id ? '◆ ' : 'Equip '}${d.name}`
          : `${d.name} ×${n}`;
      b.title = d.description;
      b.onclick = () => (d.kind === 'equipment' ? equip(id) : use('item', id));
      (d.kind === 'equipment' ? equipment : consumables).append(b);
    }
  }
  return {
    update: updateKit,
    refresh() {
      if (version !== s.versions.character) updateKit();
    }
  };
}
