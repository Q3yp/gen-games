import { link, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { GameError, requireValue as check } from './errors.js';
import { registerCodeGame } from './registry.js';

/** Allocate source, not a campaign. Existing directories and game IDs are never replaced. */
export async function scaffoldCodeGame(engine, { gameId, title }) {
  check(typeof gameId === 'string' && gameId.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameId),
    'INVALID_GAME_ID', 'Use 1–80 lowercase letters/numbers, separated by single hyphens (for example, moon-garden).');
  check(title === undefined || typeof title === 'string' && title.trim() && title.length <= 120,
    'INVALID_TITLE', 'Title must contain 1–120 characters.');
  const host = engine.codeRuntime;
  check(host, 'CODE_RUNTIME_UNAVAILABLE', 'Code runtime must be configured before allocating source.');
  const editablePath = `games/${gameId}/`;
  const duplicate = () => new GameError('GAME_SOURCE_EXISTS', `${editablePath} or game ID ${gameId} already exists; nothing was overwritten.`,
    'Use library list to find a registered game, register an authored pack, or choose a new gameId. After a timeout, inspect the source before retrying.');
  if (engine.games.has(gameId)) throw duplicate();

  // Read templates before reserving the ID so a missing installation cannot leave a partial pack.
  const names = ['main.js'];
  const files = await Promise.all(names.map(async name => [name,
    await readFile(new URL(`../scaffolds/code/${name}`, import.meta.url), 'utf8')]));
  const directory = resolve(host.directory, gameId);
  try {
    // mkdir is the cross-request/process reservation. Never rename over or reuse a directory.
    await mkdir(directory);
  } catch (error) {
    if (error.code === 'EEXIST') throw duplicate();
    throw new GameError('SOURCE_ALLOCATION_FAILED', `Could not allocate ${editablePath} (${error.code || 'I/O error'}).`,
      'Check that the configured games directory exists and is writable. No existing source was changed.');
  }

  let complete = false;
  try {
    for (const [name, contents] of files) await writeFile(resolve(directory, name), contents, { flag: 'wx' });
    const pack = { id: gameId, title: title?.trim() || gameId, description: 'Independent game source scaffold; author gameplay before sharing.',
      version: '0.1.0', runtime: 'code', entry: './main.js', saveVersion: 1, initial: {} };
    // Startup/registration cannot see a half-written manifest. A crash before this step leaves
    // an unregistered directory, not a broken game in the running registry.
    const temporary = resolve(directory, `.game-${randomUUID()}.json`);
    await writeFile(temporary, `${JSON.stringify(pack, null, 2)}\n`, { flag: 'wx' });
    // Linking exposes the complete file atomically and refuses to replace a manifest
    // a concurrent local author may have written after we reserved the directory.
    await link(temporary, resolve(directory, 'game.json'));
    complete = true;
    await unlink(temporary).catch(() => {}); // An ignored dotfile cannot affect the pack.
    const result = await registerCodeGame(engine, gameId);
    return { ...result, editablePath, files: ['game.json', ...names] };
  } catch (error) {
    // Preserve authored work and evidence on failure. Do not recursively delete a directory
    // another local author may already have started editing.
    throw new GameError(complete ? 'SOURCE_REGISTRATION_FAILED' : 'SOURCE_SCAFFOLD_INCOMPLETE',
      `${editablePath} was allocated but ${complete ? 'registration' : 'source creation'} failed (${error.code || 'I/O error'}). No campaign was created.`,
      complete ? `Source was retained. Fix the reported cause, then use library register with gameId ${gameId}.`
        : `Partial source was retained. Inspect and finish ${editablePath} and its game.json, then use library register; scaffold will not overwrite it.`,
      { gameId, editablePath, complete, cause: { code: error.code || 'INTERNAL_ERROR', message: error.message } });
  }
}
