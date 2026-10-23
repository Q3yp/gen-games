/** Focused saved-world reads. Values are durable checkpoint data, not a live frame. */
import { createWorld, isWorldSave } from '../../public/code-world.js';
import { requireValue as check } from './errors.js';
import { compact } from './context.js';
export function inspectWorld(session, args) {
  check(isWorldSave(session.state), 'WORLD_MODE_REQUIRED', 'This game uses legacy saves. Use inspect scope=save, or adopt stateMode="host" before using world tools.');
  const world = createWorld(session.state).api;
  const data = { worldVersion: world.version, savedAt: [session.runtime?.savedAt, session.runtime?.activatedAt].filter(Boolean).sort().at(-1) ?? null,
    release: session.runtime?.saveRelease ?? null, runEpoch: session.runtime?.runEpoch ?? null };
  const lines = [`WORLD v${world.version} · saved ${data.savedAt || 'at activation'} · run ${data.runEpoch}`,
    'Saved state, not a live frame. Use expectedVersions.$world when sending a world.patch command.'];
  if (args.afterVersion !== undefined) {
    const observed = world.observe(args.afterVersion);
    const unique = [...new Map(observed.changes.flatMap(change => change.paths).map(path => [JSON.stringify(path), path])).values()];
    const coarse = unique.some(path => !path.length) || unique.length > 32 || JSON.stringify(unique).length > 4096;
    data.delta = { version: observed.version, sinceVersion: observed.sinceVersion, resetRequired: observed.resetRequired,
      transactionCount: observed.changes.length, paths: coarse ? [[]] : unique,
      truncated: coarse || observed.changes.some(change => change.truncated) };
    lines.push(data.delta.resetRequired ? 'Change cursor expired; explicitly read the needed paths to resync.' :
      data.delta.transactionCount ? `Changed since v${args.afterVersion} (${data.delta.transactionCount} transactions, repeated paths coalesced): ${compact(data.delta.paths, 3000)}` : `No saved changes since v${args.afterVersion}.`);
  }
  if (args.path !== undefined) {
    const value = world.read(args.path);
    data.path = args.path; data.exists = value !== undefined; data.value = value ?? null;
    lines.push(`Path ${JSON.stringify(args.path)}: ${data.exists ? compact(value, 5000) : '(missing)'}`);
  } else if (args.afterVersion === undefined) {
    const keys = Object.keys(world.read());
    data.keys = keys.slice(0, 40).map(key => key.length <= 160 ? key : `${key.slice(0, 157)}…`);
    data.keysTruncated = keys.length > 40 || keys.some(key => key.length > 160);
    lines.push(`Top-level keys: ${data.keys.join(', ') || '(empty)'}. Read path=[...] for values; path=[] explicitly reads the whole world.`);
    if (data.keysTruncated) lines.push('Key listing shortened; an explicit root read includes exact keys.');
  }
  return { text: lines.join('\n'), data };
}
