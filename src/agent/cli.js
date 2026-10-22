#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { AgentError, boundedText, callTool, errorEnvelope, isObject } from './transport.js';
import { TOOL_NAMES } from './schemas.js';

const HELP = `gen-games agent: discover | session | observe | inspect | director | work | asset | publish | command | act | author | jobs | checkpoint
Usage: node src/agent/cli.js <tool> [options]

  --session ID       Session ID (or GEN_GAMES_SESSION)
  --game ID          Game ID for session create; --seed N deterministic seed
  --json OBJECT      Full tool arguments as JSON; --file PATH reads them from a file
  --args OBJECT      Nested action arguments; --operations ARRAY for author/job edits
  --after N          Observe strictly after cursor N
  --consumer NAME    Independent observation consumer; --ack N acknowledges delivery
  --bootstrap        Observe a concise baseline; --limit N bounds event count
  --chars N          Observe/display text budget (256–12000); --wait N long-polls in ms
  --action NAME      Action from discover; --revision N is expectedRevision
  --request ID       Stable mutation requestId; reuse it only for identical retries
  --scope NAME       Targeted inspect; --id ID or --path '["entities","hero"]'
  --op NAME          session: list/create/open; jobs: start/list/cancel/commit
                     checkpoint: save/list/restore
  --release ID       Observed active release for command; desired release for publish
  --run N            Observed run epoch; --versions OBJECT scope version guards
  --director-token T Current director turn token from wait
  --cursor N         Exact delivered cursor for director finish
  --lease N          Director lease duration in ms (35000–300000)
  --token TOKEN      Job commit token; --label TEXT job label; --name TEXT checkpoint
  --raw              Full JSON result envelope; default is bounded readable text
  --url URL          Server URL (or GEN_GAMES_URL; default http://127.0.0.1:3000)
  --timeout N        HTTP timeout in ms (or GEN_GAMES_TIMEOUT_MS; default 30000)
  -h, --help         Show this help; -h after a tool includes its JSON schema

Examples:
  node src/agent/cli.js discover
  node src/agent/cli.js session --op create --game GAME_ID
  node src/agent/cli.js observe --session SESSION --consumer coder --bootstrap
  node src/agent/cli.js act --session SESSION --revision 4 --request move-1 \\
    --action world.move --args '{"dx":1,"dy":0}'
  node src/agent/cli.js author --file edit.json --raw

--json/--file objects merge in order. Explicit flags override them.
--file - reads a JSON object from stdin. No automatic mutation retries.
Exit codes: 0 success/help, 1 server/transport failure, 2 invalid CLI input.
`;
const valueFlags = {
  session: 'sessionId', game: 'gameId', seed: 'seed', after: 'after', consumer: 'consumer', ack: 'ack', limit: 'limit',
  chars: 'maxChars', wait: 'waitMs', action: 'action', revision: 'expectedRevision',
  request: 'requestId', scope: 'scope', id: 'id', path: 'path', op: 'op', token: 'token',
  release: 'expectedRelease', run: 'expectedRunEpoch', versions: 'expectedVersions', 'director-token': 'directorToken', cursor: 'cursor', lease: 'leaseMs',
  label: 'label', name: 'name', args: 'args', operations: 'operations',
};
const numberFlags = new Set(['after', 'ack', 'limit', 'chars', 'wait', 'revision', 'seed', 'run', 'cursor', 'lease']);
const jsonFlags = new Set(['path', 'args', 'operations', 'versions']);

function usageError(message, hint = 'Run node src/agent/cli.js --help for supported options.') {
  return new AgentError('CLI_USAGE', message, hint);
}
function parseJSON(value, label, type = 'object') {
  let parsed;
  try { parsed = JSON.parse(value); }
  catch { throw usageError(`${label} must contain valid JSON.`, 'Quote JSON with single quotes in a shell, or use --file to avoid escaping.'); }
  if (type === 'object' && !isObject(parsed)) throw usageError(`${label} must be a JSON object, not an array or scalar.`);
  if (type === 'array' && !Array.isArray(parsed)) throw usageError(`${label} must be a JSON array.`);
  return parsed;
}
async function stdinText() {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

export async function parseArguments(argv, env = process.env) {
  let tool;
  const sources = [];
  const overrides = {};
  const options = {};
  let raw = false;
  let help = false;
  let stdinUsed = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '-h' || token === '--help') { help = true; continue; }
    if (token === '--raw') { raw = true; continue; }
    if (token === '--bootstrap') { overrides.bootstrap = true; continue; }
    if (token === '--no-bootstrap') { overrides.bootstrap = false; continue; }
    if (!token.startsWith('-')) {
      if (tool) throw usageError(`Unexpected positional argument: ${token}.`);
      tool = token;
      continue;
    }
    const equals = token.indexOf('=');
    const flag = token.slice(2, equals === -1 ? undefined : equals);
    if (!Object.hasOwn(valueFlags, flag) && !['json', 'file', 'url', 'timeout'].includes(flag)) {
      throw usageError(`Unknown option: ${token.split('=')[0]}.`, 'Use --json or --file for arbitrary tool arguments; use --args for action-specific fields.');
    }
    const value = equals === -1 ? argv[++i] : token.slice(equals + 1);
    if (value === undefined || value.startsWith('--')) throw usageError(`--${flag} needs a value.`);
    if (flag === 'json') { sources.push(parseJSON(value, '--json')); continue; }
    if (flag === 'file') {
      if (value === '-' && stdinUsed) throw usageError('Use --file - only once.');
      stdinUsed ||= value === '-';
      let contents;
      try { contents = value === '-' ? await stdinText() : await readFile(value, 'utf8'); }
      catch (error) { throw usageError(`Could not read argument file ${value}: ${error.code || error.message}.`); }
      sources.push(parseJSON(contents, `File ${value}`));
      continue;
    }
    if (flag === 'url') { options.url = value; continue; }
    if (flag === 'timeout') {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2_147_483_647) throw usageError('--timeout must be a positive integer below 2147483648.');
      options.timeoutMs = Number(value);
      continue;
    }
    let parsed = value;
    if (numberFlags.has(flag)) {
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw usageError(`--${flag} must be a non-negative safe integer.`);
      parsed = Number(value);
      if (flag === 'seed' && parsed > 4294967295) throw usageError('--seed must be a uint32 integer (0–4294967295).');
      if (flag === 'limit' && parsed === 0) throw usageError('--limit must be at least 1.');
      if (flag === 'chars' && (parsed < 256 || parsed > 12000)) throw usageError('--chars must be between 256 and 12000.');
    } else if (jsonFlags.has(flag)) {
      parsed = parseJSON(value, `--${flag}`, ['args', 'versions'].includes(flag) ? 'object' : 'array');
    }
    overrides[valueFlags[flag]] = parsed;
  }
  if (tool && !TOOL_NAMES.has(tool)) throw usageError(`Unknown tool: ${tool}.`);
  const base = env.GEN_GAMES_SESSION ? { sessionId: env.GEN_GAMES_SESSION } : {};
  const args = { ...sources.reduce((merged, source) => ({ ...merged, ...source }), base), ...overrides };
  return { tool, args, options, raw, help: help || !tool };
}

export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = await parseArguments(argv);
    if (parsed.help) {
      process.stdout.write(HELP);
      if (parsed.tool) {
        const { TOOL_DEFINITIONS } = await import('./schemas.js');
        const definition = TOOL_DEFINITIONS.find(({ name }) => name === parsed.tool);
        process.stdout.write(`\n${definition.name}: ${definition.description}\n${JSON.stringify(definition.inputSchema, null, 2)}\n`);
      }
      return 0;
    }
  } catch (error) {
    const result = errorEnvelope(error);
    if (argv.includes('--raw')) process.stdout.write(`${JSON.stringify(result)}\n`);
    else process.stderr.write(`${boundedText(result)}\n`);
    return 2;
  }
  let result;
  try { result = await callTool(parsed.tool, parsed.args, parsed.options); }
  catch (error) { result = errorEnvelope(error); }
  if (parsed.raw) process.stdout.write(`${JSON.stringify(result)}\n`);
  else (result.ok ? process.stdout : process.stderr).write(`${boundedText(result, parsed.args.maxChars)}\n`);
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
