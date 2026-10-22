export function effects(s) {
  function burst(x, y, color = '#ffd56a', count = 12, power = 160) {
    // Deterministic spread: simulation saves contain every visible particle.
    for (let i = 0; i < count; i++) {
      const a = i * 2.399963 + s.clock * 3, speed = power * (0.4 + (i % 5) * 0.13);
      const life = 0.3 + (i % 4) * 0.08;
      s.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        r: 2 + (i % 3), color, life, maxLife: life });
    }
    if (s.particles.length > 160) s.particles.splice(0, s.particles.length - 160);
  }
  function ring(x, y, color = '#fff0ad', maxR = 60, life = 0.35) {
    s.rings.push({ x, y, r: 6, maxR, life, maxLife: life, color });
  }
  function step(dt) {
    for (const p of s.particles) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-dt * 4); p.vy *= Math.exp(-dt * 4);
    }
    s.particles = s.particles.filter(p => p.life > 0);
    for (const r of s.rings) { r.life -= dt; r.r = r.maxR * (1 - r.life / r.maxLife); }
    s.rings = s.rings.filter(r => r.life > 0);
    for (const body of [s.player, s.orb]) {
      for (const t of body.trail) t.life -= dt;
      body.trail = body.trail.filter(t => t.life > 0).slice(-24);
    }
    s.shake = Math.max(0, s.shake - dt * 22);
    s.noticeLife = Math.max(0, s.noticeLife - dt);
  }
  return { burst, ring, step };
}
