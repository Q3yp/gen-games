import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { requireValue as check } from './errors.js';
import { validateJSONState, validateEnvelope } from './validate.js';

/** Immutable whole-pack snapshots preserve relative ESM imports across live releases. */
export async function snapshotRelease(directory, output, gameId) {
  const base = resolve(directory, gameId), files = [];
  async function walk(dir) {
    for (const item of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const path = resolve(dir, item.name);
      check(!item.isSymbolicLink(), 'INVALID_RELEASE', 'Release files cannot be symbolic links.');
      if (item.isDirectory()) await walk(path);
      else if (item.isFile()) files.push([relative(base, path).split(sep).join('/'), await readFile(path)]);
    }
  }
  await walk(base);
  check(files.reduce((n,[,data]) => n + data.length, 0) <= 30_000_000, 'RELEASE_TOO_LARGE', 'Keep a local code release below 30 MB.');
  const pack = JSON.parse(files.find(([name]) => name === 'game.json')?.[1].toString() || '{}');
  check(pack.id === gameId && pack.runtime === 'code', 'INVALID_PACK', 'Publish requires a matching code-game manifest.');
  const entry = String(pack.entry || './main.js').replace(/^\.\//, '');
  check(!entry.startsWith('/') && !entry.split('/').includes('..') && entry.endsWith('.js') && files.some(([name]) => name === entry), 'INVALID_ENTRY', 'entry must identify a JavaScript module inside this pack.');
  check(Number.isInteger(pack.saveVersion) && pack.saveVersion >= 1, 'INVALID_SAVE_VERSION', 'Code packs need a positive integer saveVersion.');
  validateJSONState(pack.initial);
  const hash = createHash('sha256');
  for (const [name,data] of files) hash.update(name).update('\0').update(data).update('\0');
  const release = hash.digest('hex').slice(0,24), destination = resolve(output, gameId, release);
  const temporary = `${destination}.${randomUUID()}`;
  await mkdir(temporary, { recursive:true });
  for (const [name,data] of files) { const target = resolve(temporary,name); await mkdir(resolve(target,'..'),{recursive:true}); await writeFile(target,data); }
  try { await rename(temporary,destination); } catch(error) { await rm(temporary,{recursive:true,force:true}); if (!['EEXIST','ENOTEMPTY'].includes(error.code)) throw error; }
  return { release, entry:`/releases/${gameId}/${release}/${entry}`, saveVersion:pack.saveVersion, pack };
}

export class CodeRuntime {
  constructor(engine, directory, output) { this.engine=engine; this.directory=directory; this.output=output; this.leases=new Map(); }
  event(session,type,text,data={}) { const event=this.engine.store.append(session,{type,text,data}); const message={sessionId:session.id,revision:session.revision,patches:[],events:[event],cursor:event.seq}; if(this.pending) this.pending.push(message); else this.engine.emit('commit',message); return event; }
  session(id) { const session=this.engine.session(id); check(session.runtime,'NOT_CODE_GAME','This operation requires a code game.'); return session; }
  fence(session,input) {
    const lease=this.leases.get(session.id);
    check(lease && lease.clientId===input.clientId && lease.until>Date.now(), 'RUNTIME_LEASE_LOST','This browser no longer owns the live game. Reconnect before saving.');
    check(input.runEpoch===session.runtime.runEpoch,'STALE_RUN','The run changed; reconnect and load the current save.');
    lease.until=Date.now()+15000;
  }
  browser(id,input) { return this.atomic(()=>this.browserOperation(id,input)); }
  atomic(operation) {
    this.pending=[];
    try { const result=this.engine.store.transaction(operation); const messages=this.pending; this.pending=null; for(const message of messages) this.engine.emit('commit',message); return result; }
    catch(error) { this.pending=null; throw error; }
  }
  browserOperation(id,input) {
    const session=this.session(id), runtime=session.runtime, store=this.engine.store;
    if(input.op==='connect') {
      check(typeof input.clientId==='string' && input.clientId.length<=120,'INVALID_CLIENT','Provide a browser clientId.');
      const old=this.leases.get(id);
      check(!old || old.until<=Date.now() || old.clientId===input.clientId,'RUNTIME_BUSY','Another browser owns this game. Close it or wait 15 seconds.');
      if(!old || old.clientId!==input.clientId || old.until<=Date.now()) runtime.runEpoch++;
      for (const command of runtime.commands || []) if(command.status==='pending' && command.runEpoch!==runtime.runEpoch) { command.status='canceled'; command.error='Run ownership changed before acknowledgement.'; }
      this.leases.set(id,{clientId:input.clientId,until:Date.now()+15000});
      store.save(session);
      return {ok:true,session,cursor:store.head(id)};
    }
    this.fence(session,input);
    if(input.op==='applied') {
      check(input.release===runtime.release,'STALE_RELEASE','A newer release is pending; do not activate stale code.');
      if(input.save!==undefined) { validateJSONState(input.save); session.state=input.save; runtime.saveRelease=input.release; runtime.saveEntry=runtime.entry; }
      runtime.activeRelease=input.release; runtime.activeEntry=runtime.entry; runtime.activeSaveVersion=runtime.saveVersion; runtime.activatedAt=new Date().toISOString();
      if(input.summary!==undefined) runtime.summary=this.summary(input.summary);
      for (const command of runtime.commands || []) if(command.status==='pending' && command.release!==input.release) { command.status='canceled'; command.error='The active release changed before acknowledgement.'; }
      store.save(session);
      const event=this.event(session,'runtime.activated',`Release ${input.release} is playing.`,{release:input.release,runEpoch:runtime.runEpoch});
      return {ok:true,cursor:event.seq,checkpointSeq:runtime.checkpointSeq};
    }
    check(input.release===runtime.activeRelease,'STALE_RELEASE','Save or event belongs to a different active release.');
    if(input.op==='checkpoint') {
      check(Number.isInteger(input.checkpointSeq) && input.checkpointSeq>runtime.checkpointSeq,'STALE_CHECKPOINT','checkpointSeq must increase; older saves cannot overwrite newer play.');
      validateJSONState(input.save); session.state=input.save; runtime.checkpointSeq=input.checkpointSeq; runtime.saveRelease=input.release; runtime.saveEntry=runtime.activeEntry;
      if(input.summary!==undefined) runtime.summary=this.summary(input.summary);
      runtime.savedAt=new Date().toISOString(); store.save(session);
    } else if(input.op==='result') {
      const command=runtime.commands?.find(item=>item.id===input.commandId);
      check(command && command.status==='pending' && command.runEpoch===runtime.runEpoch && command.release===input.release,'COMMAND_NOT_PENDING','Command is unknown or already acknowledged.');
      command.status=input.error?'failed':'applied'; command.result=this.summary(input.result??null); command.error=input.error?String(input.error).slice(0,1000):null;
      store.save(session); this.event(session,'runtime.command.result',`${command.name}: ${command.status}`,{commandId:command.id,...command});
    } else check(input.op==='events' || input.op==='status','INVALID_RUNTIME_OPERATION','Use connect, checkpoint, events, applied, result, or status.');
    this.events(session,input.events||[]);
    return {ok:true,checkpointSeq:runtime.checkpointSeq,cursor:store.head(id),runtime};
  }
  summary(value) { check(Buffer.byteLength(JSON.stringify(value))<=12000,'SUMMARY_TOO_LARGE','Keep inspect summaries below 12 KB; return focused gameplay facts.'); return value; }
  events(session,events) {
    check(Array.isArray(events) && events.length<=30,'EVENT_LIMIT','Batch at most 30 semantic events.');
    for(const item of events) { check(typeof item.type==='string' && item.type.length<=100 && !item.type.startsWith('runtime.') && item.type!=='state.changed','INVALID_EVENT','Use a game-specific semantic event type.'); check(typeof item.text==='string' && item.text.length<=2000,'INVALID_EVENT','Use event text up to 2000 characters.'); this.summary(item.data??{}); this.event(session,item.type,item.text,{...item.data,source:'browser',untrusted:true}); }
  }
  async publish(args) {
    validateEnvelope(args);
    let session=this.session(args.sessionId);
    const existing=this.engine.store.request(session.id,args.requestId);
    if(existing) { check(existing.fingerprint===JSON.stringify(args),'IDEMPOTENCY_CONFLICT','Request ID was used for different publish arguments.'); return existing.result; }
    check(args.expectedRelease===session.runtime.release,'STALE_RELEASE','Read inspect runtime, then publish against the observed release.');
    const release=await snapshotRelease(this.directory,this.output,session.gameId);
    session=this.session(args.sessionId);
    const replay=this.engine.store.request(session.id,args.requestId);
    if(replay) { check(replay.fingerprint===JSON.stringify(args),'IDEMPOTENCY_CONFLICT','Request ID was used for different publish arguments.'); return replay.result; }
    check(args.expectedRelease===session.runtime.release,'STALE_RELEASE','Another publication won while files were loading. Inspect before publishing again.');
    const previousRelease=session.runtime.release;
    Object.assign(session.runtime,{release:release.release,entry:release.entry,saveVersion:release.saveVersion}); session.revision++;
    const result={text:`PENDING ${release.release}: source published; waiting for browser activation.`,data:{release:release.release,previousRelease,entry:release.entry,status:'pending'}};
    this.atomic(()=>{ this.engine.store.save(session); this.engine.store.remember(session.id,args.requestId,JSON.stringify(args),result); this.event(session,'runtime.release',`Release ${release.release} ready; browser activation pending.`,{release:release.release,entry:release.entry,saveVersion:release.saveVersion,previousRelease}); });
    Object.assign(this.engine.game(session.gameId), { pack: release.pack, release });
    return result;
  }
  command(args) {
    validateEnvelope(args); const session=this.session(args.sessionId);
    const request=this.engine.store.request(session.id,args.requestId);
    if(request) { check(request.fingerprint===JSON.stringify(args),'IDEMPOTENCY_CONFLICT','Request ID was already used for different arguments.'); const current=session.runtime.commands?.find(command=>command.id===args.requestId); return current ? {text:`${current.status.toUpperCase()} ${current.id}`,data:current} : request.result; }
    check(args.expectedRelease===session.runtime.activeRelease,'STALE_RELEASE','Command must target the active release.');
    const old=session.runtime.commands?.find(command=>command.id===args.requestId);
    if(old) { check(old.name===args.name && JSON.stringify(old.args)===JSON.stringify(args.args||{}),'IDEMPOTENCY_CONFLICT','Command ID was used with different arguments.'); return {text:`${old.status.toUpperCase()} ${old.id}`,data:old}; }
    check(typeof args.name==='string' && args.name.length<=100,'INVALID_COMMAND','Provide a command name implemented by the game.'); this.summary(args.args||{});
    const command={id:args.requestId,name:args.name,args:args.args||{},status:'pending',runEpoch:session.runtime.runEpoch,release:session.runtime.activeRelease};
    const retained=(session.runtime.commands||[]).filter(item=>item.status==='pending');
    check(retained.length<30,'COMMAND_QUEUE_FULL','The browser has 30 pending commands. Wait for acknowledgement before queuing more.');
    const recent=(session.runtime.commands||[]).filter(item=>item.status!=='pending').slice(-(29-retained.length));
    session.runtime.commands=[...retained,...(retained.length===29?[]:recent),command];
    const result={text:`PENDING ${command.id}: waiting for the playing browser.`,data:command};
    this.atomic(()=>{ this.engine.store.save(session); this.engine.store.remember(session.id,args.requestId,JSON.stringify(args),result); this.event(session,'runtime.command',`Command ${args.name} queued; not yet applied.`,{...command,commandId:command.id}); });
    return result;
  }
}
