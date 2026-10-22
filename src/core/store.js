import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, revision INTEGER NOT NULL, type TEXT NOT NULL, text TEXT NOT NULL, data TEXT NOT NULL, at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS event_sessions ON events(session_id, seq);
      CREATE TABLE IF NOT EXISTS requests (session_id TEXT NOT NULL, request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(session_id,request_id));
      CREATE TABLE IF NOT EXISTS consumers (session_id TEXT NOT NULL,name TEXT NOT NULL,ack INTEGER NOT NULL DEFAULT 0,delivered INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(session_id,name));
      CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY,session_id TEXT NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS checkpoints (session_id TEXT NOT NULL,name TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(session_id,name));`);
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  session(id) { const row = this.db.prepare('SELECT body FROM sessions WHERE id=?').get(id); return row && JSON.parse(row.body); }
  sessions() { return this.db.prepare('SELECT body FROM sessions ORDER BY rowid DESC').all().map(row => JSON.parse(row.body)); }
  save(session) { this.db.prepare('INSERT OR REPLACE INTO sessions(id,body) VALUES(?,?)').run(session.id, JSON.stringify(session)); }
  head(id) { return Number(this.db.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM events WHERE session_id=?').get(id).seq); }
  append(session, event) {
    const at = new Date().toISOString();
    const result = this.db.prepare('INSERT INTO events(session_id,revision,type,text,data,at) VALUES(?,?,?,?,?,?)').run(session.id, session.revision, event.type, event.text, JSON.stringify(event.data ?? {}), at);
    return { ...event, data: event.data ?? {}, seq: Number(result.lastInsertRowid), sessionId: session.id, revision: session.revision, at };
  }
  events(id, after, limit = 100) {
    return this.db.prepare('SELECT * FROM events WHERE session_id=? AND seq>? ORDER BY seq LIMIT ?').all(id, after, limit).map(row => ({ seq: row.seq, sessionId: row.session_id, revision: row.revision, type: row.type, text: row.text, data: JSON.parse(row.data), at: row.at }));
  }
  lastDiagnostic(id) { const row = this.db.prepare("SELECT type,data FROM events WHERE session_id=? AND type IN ('ui.failed','ui.recovered') ORDER BY seq DESC LIMIT 1").get(id); return row && { type: row.type, data: JSON.parse(row.data) }; }
  request(id, requestId) {
    const row = this.db.prepare('SELECT * FROM requests WHERE session_id=? AND request_id=?').get(id, requestId);
    return row && { fingerprint: row.fingerprint, result: JSON.parse(row.result) };
  }
  remember(id, requestId, fingerprint, result) { this.db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(id, requestId, fingerprint, JSON.stringify(result)); }
  updateRequestResult(id, requestId, result) { this.db.prepare('UPDATE requests SET result=? WHERE session_id=? AND request_id=?').run(JSON.stringify(result), id, requestId); }
  consumer(id, name) { return this.db.prepare('SELECT name,ack,delivered FROM consumers WHERE session_id=? AND name=?').get(id, name) || { name, ack: 0, delivered: 0 }; }
  consumers(id) { return this.db.prepare('SELECT name,ack,delivered FROM consumers WHERE session_id=?').all(id); }
  saveConsumer(id, consumer) { this.db.prepare('INSERT INTO consumers VALUES(?,?,?,?) ON CONFLICT(session_id,name) DO UPDATE SET ack=MAX(ack,excluded.ack),delivered=MAX(delivered,excluded.delivered)').run(id, consumer.name, consumer.ack, consumer.delivered); }
  jobs(id) { return this.db.prepare('SELECT body FROM jobs WHERE session_id=? ORDER BY rowid DESC').all(id).map(row => JSON.parse(row.body)); }
  job(id) { const row = this.db.prepare('SELECT body FROM jobs WHERE id=?').get(id); return row && JSON.parse(row.body); }
  saveJob(job) { this.db.prepare('INSERT OR REPLACE INTO jobs VALUES(?,?,?)').run(job.id, job.sessionId, JSON.stringify(job)); }
  checkpoint(id, name) { const row = this.db.prepare('SELECT body FROM checkpoints WHERE session_id=? AND name=?').get(id, name); return row && JSON.parse(row.body); }
  checkpoints(id) { return this.db.prepare('SELECT name,created_at AS createdAt FROM checkpoints WHERE session_id=? ORDER BY created_at DESC').all(id); }
  saveCheckpoint(session, name) { this.db.prepare('INSERT OR REPLACE INTO checkpoints VALUES(?,?,?,?)').run(session.id, name, JSON.stringify(session), new Date().toISOString()); }
  close() { this.db.close(); }
}
