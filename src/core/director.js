import { randomUUID } from 'node:crypto';
import { requireValue as check } from './errors.js';
import { observe } from './context.js';

// An attached external agent drives this protocol. The server does not run an LLM.
// Connections deliberately do not survive server restart; consumer cursors do.
const registries = new WeakMap();
export function directorFor(engine) {
  if (!registries.has(engine)) registries.set(engine, new Director(engine));
  return registries.get(engine);
}
export function validateDirectorToken(engine, sessionId, token) {
  return directorFor(engine).validateToken(sessionId, token);
}
export class Director {
  constructor(engine) {
    this.engine = engine;
    this.connections = new Map();
  }
  current(id) {
    const connection = this.connections.get(id);
    return connection && connection.until > Date.now() ? connection : null;
  }
  status(id) {
    this.engine.session(id);
    const c = this.current(id);
    return c
      ? {
          status: c.waiting ? 'listening' : c.turn ? 'thinking' : 'attached',
          consumer: c.consumer,
          expiresAt: new Date(c.until).toISOString(),
          cursor: this.engine.store.consumer(id, c.consumer).ack,
          autonomous: false
        }
      : { status: 'offline', autonomous: false };
  }
  connection(id, token) {
    const c = this.current(id);
    check(
      c && c.token === token,
      'DIRECTOR_LEASE_LOST',
      'Attach again; this director connection expired or was replaced.'
    );
    return c;
  }
  validateTurn(id, token) {
    const c = this.current(id);
    check(
      c && c.turn && c.turn.token === token,
      'STALE_DIRECTOR_TURN',
      'Only the current unexpired director turn can act or finish.'
    );
    return c.turn;
  }
  validateToken(id, token) {
    const turn = this.validateTurn(id, token);
    const runtime = this.engine.session(id).runtime;
    check(
      turn.runEpoch === runtime?.runEpoch &&
        turn.release === runtime?.activeRelease,
      'STALE_DIRECTOR_CONTEXT',
      'Run or release changed. Finish the delivered cursor, then wait for fresh context before acting. Unfinished requests remain durable.'
    );
    return turn;
  }
  async call(args) {
    const id = this.engine.session(args.sessionId).id;
    if (args.op === 'status') return this.result(id);
    if (args.op === 'attach') {
      check(
        typeof args.consumer === 'string' &&
          /^[\w.:-]{1,80}$/.test(args.consumer),
        'INVALID_CONSUMER',
        'Attach with a stable consumer name (1–80 simple characters).'
      );
      check(
        !this.current(id),
        'DIRECTOR_BUSY',
        'A director is attached; detach it or wait for lease expiry.'
      );
      const leaseMs = args.leaseMs ?? 90000;
      check(
        Number.isInteger(leaseMs) && leaseMs >= 35000 && leaseMs <= 300000,
        'INVALID_LEASE',
        'leaseMs must be 35000–300000.'
      );
      const c = {
        token: randomUUID(),
        consumer: `director:${args.consumer}`,
        leaseMs,
        until: Date.now() + leaseMs,
        waiting: false,
        turn: null
      };
      this.connections.set(id, c);
      return this.result(id, {
        token: c.token,
        nextCursor: this.engine.store.consumer(id, c.consumer).ack
      });
    }
    const c = this.connection(id, args.token);
    if (args.op === 'detach') {
      this.connections.delete(id);
      return this.result(id);
    }
    if (args.op === 'finish') {
      // Acknowledgment retires an observed cursor, not authority to mutate.
      const turn = this.validateTurn(id, args.directorToken);
      check(
        !this.engine
          .session(id)
          .runtime?.commands?.some(
            (command) =>
              command.status === 'pending' &&
              command.directorToken === args.directorToken
          ),
        'COMMANDS_PENDING',
        'Observe command acknowledgements before finishing this turn; its token must remain valid until browser application.'
      );
      check(
        args.cursor === turn.cursor,
        'INVALID_ACK',
        'Finish must acknowledge the exact cursor delivered with this turn token.'
      );
      const consumer = this.engine.store.consumer(id, c.consumer);
      consumer.ack = Math.max(consumer.ack, turn.cursor);
      this.engine.store.saveConsumer(id, consumer);
      c.turn = null;
      c.until = Date.now() + c.leaseMs;
      return this.result(id, { nextCursor: consumer.ack });
    }
    check(
      args.op === 'wait',
      'INVALID_DIRECTOR_OPERATION',
      'Use attach, wait, finish, status, or detach.'
    );
    check(
      !c.waiting && !c.turn,
      'DIRECTOR_TURN_PENDING',
      'Finish the current turn before waiting again; concurrent waits are not allowed.'
    );
    c.waiting = true;
    c.until = Date.now() + c.leaseMs;
    try {
      const observed = await observe(this.engine, {
        sessionId: id,
        consumer: c.consumer,
        waitMs: args.waitMs ?? 25000,
        limit: args.limit,
        maxChars: args.maxChars
      });
      this.connection(id, args.token);
      c.until = Date.now() + c.leaseMs;
      // Empty timeouts do not create artificial thinking turns.
      if (
        observed.data.nextCursor >
        this.engine.store.consumer(id, c.consumer).ack
      ) {
        // Capture the exact metadata delivered by observe, not a newer runtime read.
        // A turn is immutable even if player input advances scopes after delivery.
        const versions = Object.freeze(
          structuredClone(observed.data.versions || {})
        );
        c.turn = Object.freeze({
          token: randomUUID(),
          cursor: observed.data.nextCursor,
          runEpoch: observed.data.runEpoch,
          release: observed.data.release,
          guardSnapshot: Object.freeze({
            runEpoch: observed.data.runEpoch,
            release: observed.data.release,
            versions
          })
        });
      }
      c.waiting = false;
      return {
        text: `${observed.text}\nDirector ${this.status(id).status}. ${c.turn ? 'Act using directorToken, finish this cursor, then wait again.' : 'Call wait again to keep listening.'}`,
        data: {
          ...observed.data,
          ...this.status(id),
          directorToken: c.turn?.token ?? null
        }
      };
    } finally {
      c.waiting = false;
    }
  }
  result(id, extra = {}) {
    const value = { ...this.status(id), ...extra };
    return {
      text: `DIRECTOR ${value.status}. External agent must continuously call wait → act → finish → wait; no model is started by this tool.`,
      data: value
    };
  }
}
