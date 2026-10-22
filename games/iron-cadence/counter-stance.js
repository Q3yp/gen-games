// Game-owned input mechanic. No engine catalog or per-frame host traffic.
export function validateCounter(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error(
      'counterStance needs {minHold,maxHold,breathPerSecond,minPower,maxPower}.'
    );
  const bounds = {
    minHold: [0.1, 1],
    maxHold: [0.2, 2],
    breathPerSecond: [1, 40],
    minPower: [0.5, 3],
    maxPower: [1, 6]
  };
  for (const key of Object.keys(v))
    if (!bounds[key]) throw Error(`Unknown counterStance field ${key}.`);
  for (const [key, [min, max]] of Object.entries(bounds))
    if (!Number.isFinite(v[key]) || v[key] < min || v[key] > max)
      throw Error(`counterStance.${key} must be ${min}–${max}.`);
  if (v.maxHold <= v.minHold || v.maxPower < v.minPower)
    throw Error(
      'counterStance requires maxHold > minHold and maxPower >= minPower.'
    );
}
export const counterStance = {
  validate: validateCounter,
  apply: ({ combat }, value) => combat.armCounter(value)
};
export function makeCounter(s, record) {
  // Old saves acquire only an inert field. Physical holds are never restored.
  if (s.counter) {
    try {
      validateCounter(s.counter.config);
      if (
        !['armed', 'charging'].includes(s.counter.stage) ||
        !Number.isFinite(s.counter.elapsed) ||
        s.counter.elapsed < 0
      )
        throw Error('Invalid counter save');
    } catch {
      s.counter = null;
    }
  }
  s.counter ??= null;
  if (s.counter?.stage === 'charging') s.counter.needsHold = true;
  function cancel(reason) {
    if (!s.counter) return;
    s.counter = null;
    record('counter-cancel', `Bell Return lost: ${reason}.`);
  }
  function arm(config) {
    validateCounter(config);
    s.counter = {
      stage: 'armed',
      config: structuredClone(config),
      elapsed: 0,
      needsHold: false
    };
  }
  function defend() {
    if (s.counter?.stage !== 'armed') return;
    s.counter.stage = 'charging';
    s.counter.elapsed = 0;
    s.counter.needsHold = false;
    record(
      'counter-ready',
      'Bell Return: keep holding K, then release during this opening.'
    );
  }
  function suspend() {
    if (s.counter?.stage === 'charging') s.counter.needsHold = true;
  }
  function hold() {
    if (s.counter?.stage === 'charging') s.counter.needsHold = false;
  }
  function tick(dt, guard) {
    const r = s.counter;
    if (r?.stage !== 'charging') return;
    if (s.phase !== 'recovery') return cancel('the opening closed');
    if (r.needsHold) return;
    if (!guard) return cancel('guard dropped');
    const cost = r.config.breathPerSecond * dt;
    if (s.stamina <= cost) {
      s.stamina = 0;
      return cancel('out of breath');
    }
    s.stamina -= cost;
    r.elapsed = Math.min(r.config.maxHold, r.elapsed + dt / s.timing);
  }
  function release(guard, power) {
    const r = s.counter;
    if (r?.stage !== 'charging') return null;
    if (s.paused || r.needsHold || !guard) return null;
    if (s.phase !== 'recovery' || s.remaining <= 0) {
      cancel('the opening closed');
      return null;
    }
    if (r.elapsed + 1e-6 < r.config.minHold) {
      cancel('released too early');
      return null;
    }
    const fraction = Math.min(
      1,
      (r.elapsed - r.config.minHold) / (r.config.maxHold - r.config.minHold)
    );
    const damage = Math.round(
      power *
        (r.config.minPower + (r.config.maxPower - r.config.minPower) * fraction)
    );
    // Consume BEFORE damage/event callbacks: repeated keyup or reloaded save cannot replay.
    s.counter = null;
    return { damage, charge: Math.round(fraction * 100) };
  }
  function view() {
    const r = s.counter;
    if (!r) return null;
    return {
      stage: r.stage,
      needsHold: r.needsHold,
      progress: r.elapsed / r.config.maxHold,
      ready: r.elapsed >= r.config.minHold,
      minSeconds: r.config.minHold * s.timing,
      maxSeconds: r.config.maxHold * s.timing
    };
  }
  return { arm, defend, suspend, hold, tick, release, cancel, view };
}
