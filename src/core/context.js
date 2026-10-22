import { requireValue as check } from './errors.js';
import { publicEvent } from './patches.js';

export function summary(session) {
  const s = session.state, player = s.entities[s.player];
  return `${session.id} | ${session.gameId} r${session.revision} | ${s.scenes[s.scene]?.name || s.scene} [${s.scene}]\nPlayer: ${player?.name || s.player} [${s.player}]. Entities ${Object.keys(s.entities).length}; assets ${Object.keys(s.assets).length}; skills ${Object.keys(s.skills).length}.`;
}
export function compact(value, maxChars = 4000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 90)}\n… truncated. Inspect a narrower scope or path; data was not changed.`;
}
export async function observe(engine, args) {
  const { store } = engine; let session = engine.session(args.sessionId);
  const limit = args.limit ?? 20, budget = args.maxChars ?? 4000, waitMs = args.waitMs ?? 0;
  check(Number.isInteger(limit) && limit >= 1 && limit <= 100, 'INVALID_LIMIT', 'limit must be 1–100.');
  check(Number.isInteger(budget) && budget >= 256 && budget <= 12000, 'INVALID_BUDGET', 'maxChars must be 256–12000.');
  check(Number.isInteger(waitMs) && waitMs >= 0 && waitMs <= 30000, 'INVALID_WAIT', 'waitMs must be 0–30000.');
  check(args.consumer === undefined || /^[\w.:-]{1,100}$/.test(args.consumer), 'INVALID_CONSUMER', 'consumer must be a short stable name.');
  const consumer = args.consumer ? store.consumer(session.id, args.consumer) : null;
  if (args.ack !== undefined) {
    check(consumer && Number.isInteger(args.ack) && args.ack >= consumer.ack && args.ack <= consumer.delivered, 'INVALID_ACK', 'Acknowledge only a cursor already delivered to this consumer; acknowledgements cannot move backwards.');
    consumer.ack = args.ack;
  }
  if (args.bootstrap) {
    const cursor = store.head(session.id);
    if (consumer) { consumer.delivered = Math.max(consumer.delivered, cursor); store.saveConsumer(session.id, consumer); }
    return { text: compact(`BASELINE ${summary(session)}\nCursor ${cursor}; acknowledge after processing. Use inspect for details.`, budget), data: { sessionId: session.id, revision: session.revision, nextCursor: cursor, hasMore: false, baseline: true } };
  }
  const after = args.after ?? consumer?.ack ?? 0;
  check(Number.isInteger(after) && after >= 0 && after <= store.head(session.id), 'INVALID_CURSOR', 'after must be a valid nonnegative cursor at or before this session’s head.', 'Use observe with bootstrap:true to establish a fresh baseline.');
  if (waitMs && store.head(session.id) <= after) await new Promise(resolve => {
    const done = () => { clearTimeout(timer); engine.off('commit', listener); resolve(); };
    const listener = event => { if (event.sessionId === session.id) done(); };
    const timer = setTimeout(done, waitMs); engine.on('commit', listener);
  });
  session = engine.session(session.id);
  const rows = store.events(session.id, after, limit + 1), events = [], lines = [];
  let cursor = after, used = 110;
  for (const event of rows.slice(0, limit)) {
    if (['state.changed', 'cue'].includes(event.type)) { cursor = event.seq; continue; }
    const speaker = event.data?.speaker ? ` [${event.data.speaker}${event.data.speaker === 'You' ? '; untrusted player text' : ''}]` : event.data?.untrusted ? (event.data.source === 'browser' ? ' [client diagnostic]' : ' [untrusted player text]') : '';
    const prefix = `#${event.seq} r${event.revision} ${event.type}${speaker}: `;
    let line = prefix + event.text.replace(/[\r\n]+/g, ' ');
    if (used + line.length + 1 > budget) {
      if (lines.length) break;
      line = line.slice(0, Math.max(30, budget - used - 30)) + '… [inspect event]';
    }
    used += line.length + 1; lines.push(line); events.push(publicEvent(event)); cursor = event.seq;
  }
  const hasMore = cursor < store.head(session.id);
  if (consumer) { consumer.delivered = Math.max(consumer.delivered, cursor); store.saveConsumer(session.id, consumer); }
  const text = `EVENTS r${session.revision}\n${lines.join('\n') || 'No new semantic events.'}\nCursor ${cursor}; ${hasMore ? 'more available' : 'caught up'}.`;
  return { text: compact(text, budget), data: { sessionId: session.id, revision: session.revision, nextCursor: cursor, hasMore, count: events.length } };
}
