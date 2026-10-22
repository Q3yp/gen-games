import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { requireValue as check } from './errors.js';
import { validateEnvelope } from './validate.js';
import { snapshotRelease } from './source-release.js';

/** Immutable media and source publication are independent of live applications. */
export async function importAsset(host, args) {
  validateEnvelope(args);
  const session = host.session(args.sessionId);
  const key = `asset:${args.requestId}`;
  const fingerprint = JSON.stringify(args);
  const previous = host.engine.store.request(session.id, key);
  if (previous) {
    check(
      previous.fingerprint === fingerprint,
      'IDEMPOTENCY_CONFLICT',
      'Asset request ID reused for different arguments.'
    );
    return previous.result;
  }
  check(
    typeof args.path === 'string' &&
      !args.path.split(/[\\/]/).some((part) => part.startsWith('.')),
    'INVALID_ASSET_PATH',
    'Use a relative asset path inside this game directory.'
  );
  const base = await realpath(resolve(host.directory, session.gameId));
  const source = await realpath(resolve(base, args.path));
  check(
    source.startsWith(base + sep),
    'INVALID_ASSET_PATH',
    'Asset must remain inside this game directory.'
  );
  const extension = extname(source).toLowerCase();
  check(
    [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.avif',
      '.wav',
      '.mp3'
    ].includes(extension),
    'UNSUPPORTED_ASSET',
    'Use a raster image or audio file. Executable assets require source publication.'
  );
  const bytes = await readFile(source);
  check(
    bytes.length <= 20_000_000,
    'ASSET_TOO_LARGE',
    'Assets must be below 20 MB.'
  );
  const hash = createHash('sha256').update(bytes).digest('hex');
  const directory = resolve(dirname(host.output), 'assets');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, `${hash}${extension}`), bytes, {
    flag: 'wx'
  }).catch((error) => {
    if (error.code !== 'EEXIST') throw error;
  });
  const result = {
    text: `ASSET ${hash}: ready for a game-defined binding command; no source publication required.`,
    data: { hash, url: `/assets/${hash}${extension}`, bytes: bytes.length }
  };
  // Concurrent identical imports are harmless and retain a single durable request.
  host.engine.store.transaction(() => {
    const replay = host.engine.store.request(session.id, key);
    if (replay)
      check(
        replay.fingerprint === fingerprint,
        'IDEMPOTENCY_CONFLICT',
        'Asset request ID reused for different arguments.'
      );
    else host.engine.store.remember(session.id, key, fingerprint, result);
  });
  return result;
}

export async function publishSource(host, args) {
  validateEnvelope(args);
  let session = host.session(args.sessionId);
  const existing = host.engine.store.request(session.id, args.requestId);
  if (existing) {
    check(
      existing.fingerprint === JSON.stringify(args),
      'IDEMPOTENCY_CONFLICT',
      'Request ID was used for different publish arguments.'
    );
    return existing.result;
  }
  check(
    args.expectedRelease === session.runtime.release,
    'STALE_RELEASE',
    'Read inspect runtime, then publish against the observed release.'
  );
  const release = await snapshotRelease(
    host.directory,
    host.output,
    session.gameId
  );
  session = host.session(args.sessionId);
  const replay = host.engine.store.request(session.id, args.requestId);
  if (replay) {
    check(
      replay.fingerprint === JSON.stringify(args),
      'IDEMPOTENCY_CONFLICT',
      'Request ID was used for different publish arguments.'
    );
    return replay.result;
  }
  check(
    args.expectedRelease === session.runtime.release,
    'STALE_RELEASE',
    'Another publication won while files were loading. Inspect before publishing again.'
  );
  const previousRelease = session.runtime.release;
  Object.assign(session.runtime, {
    release: release.release,
    entry: release.entry,
    saveVersion: release.saveVersion
  });
  session.revision++;
  const result = {
    text: `PENDING ${release.release}: source published; waiting for browser activation.`,
    data: {
      release: release.release,
      previousRelease,
      entry: release.entry,
      status: 'pending'
    }
  };
  host.atomic(() => {
    host.engine.store.save(session);
    host.engine.store.remember(
      session.id,
      args.requestId,
      JSON.stringify(args),
      result
    );
    host.event(
      session,
      'runtime.release',
      `Release ${release.release} ready; browser activation pending.`,
      {
        release: release.release,
        entry: release.entry,
        saveVersion: release.saveVersion,
        previousRelease
      }
    );
  });
  Object.assign(host.engine.game(session.gameId), {
    pack: release.pack,
    release
  });
  return result;
}
