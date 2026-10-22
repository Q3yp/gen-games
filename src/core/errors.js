export class GameError extends Error {
  constructor(code, message, hint, details) {
    super(message); this.name = 'GameError'; this.code = code; this.hint = hint; this.details = details;
  }
}
export function requireValue(condition, code, message, hint, details) {
  if (!condition) throw new GameError(code, message, hint, details);
}
export function errorInfo(error) {
  return { code: error.code || 'INTERNAL_ERROR', message: error.message || 'Unexpected failure',
    ...(error.hint ? { hint: error.hint } : {}), ...(error.details ? { details: error.details } : {}) };
}
