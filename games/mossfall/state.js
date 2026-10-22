/** Small shared state queries used by combat and persistent interactions. */
export function message(w, text) {
  w.log.push(text);
  w.log = w.log.slice(-5);
}
export function enemies(w) {
  return w.areas[w.area].enemies.filter((e) => e.hp > 0);
}
