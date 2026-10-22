import { counterStance } from './counter-stance.js';
// Extension point: import your own module and add its effect here. Engine untouched.
// Each effect owns validate(value) and apply({state, stats, combat}, value).
const amount = (n) => {
  if (!Number.isFinite(n) || n < 0 || n > 100)
    throw Error('Effect amount must be 0–100.');
};
export const effects = {
  counterStance,
  heal: {
    validate: amount,
    apply: ({ state: s, stats }, n) => {
      s.hp = Math.min(stats.maxHp, s.hp + n);
    }
  },
  damage: {
    validate: amount,
    apply: ({ state: s }, n) => {
      s.enemy.hp = Math.max(0, s.enemy.hp - n);
    }
  },
  stamina: {
    validate: amount,
    apply: ({ state: s }, n) => {
      s.stamina = Math.min(100, s.stamina + n);
    }
  },
  mp: {
    validate: amount,
    apply: ({ state: s, stats }, n) => {
      s.character.mp = Math.min(stats.maxMp, s.character.mp + n);
    }
  },
  empower: {
    validate: amount,
    apply: ({ state: s }, n) => {
      s.character.empower = Math.max(s.character.empower, n);
    }
  }
};
export function validateEffects(values) {
  for (const [key, value] of Object.entries(values || {})) {
    if (!effects[key])
      throw Error(
        `Unknown effect ${key}. Available: ${Object.keys(effects).join(', ')}. Add new executable effects in effects.js.`
      );
    effects[key].validate(value);
  }
}
export function runEffects(context, values) {
  for (const [key, value] of Object.entries(values || {}))
    effects[key].apply(context, value);
}
