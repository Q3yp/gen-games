/** Shared HTTP transport. No runtime state, policy, retries, or game logic live here. */
export const DEFAULT_URL = 'http://127.0.0.1:3000';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_TEXT_BUDGET = 12_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

export class AgentError extends Error {
  constructor(code, message, hint, details) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.hint = hint;
    if (details !== undefined) this.details = details;
  }
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function toolEndpoint(value = process.env.GEN_GAMES_URL || DEFAULT_URL) {
  let url;
  try { url = new URL(value); }
  catch { throw new AgentError('INVALID_URL', 'GEN_GAMES_URL must be an absolute HTTP(S) URL.', `Example: ${DEFAULT_URL}`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new AgentError('INVALID_URL', 'Use an HTTP(S) server URL without embedded credentials.', `Example: ${DEFAULT_URL}`);
  }
  url.pathname = `${url.pathname.replace(/\/$/, '').replace(/\/api\/tools$/, '')}/api/tools`;
  url.search = '';
  url.hash = '';
  return url;
}

export function timeoutValue(value = process.env.GEN_GAMES_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > 2_147_483_647) {
    throw new AgentError('INVALID_TIMEOUT', 'The HTTP timeout must be a positive integer in milliseconds.', 'Set GEN_GAMES_TIMEOUT_MS or --timeout to a positive integer below 2147483648.');
  }
  return n;
}

export function errorEnvelope(error) {
  const code = error.code || 'CLIENT_ERROR';
  const message = error.message || 'The request failed.';
  const hint = error.hint || 'Review the arguments and try again.';
  return {
    ok: false,
    text: `${code}: ${message}\nHint: ${hint}`,
    error: { code, message, hint, ...(error.details === undefined ? {} : { details: error.details }) },
  };
}

export function boundedText(result, maxChars = DEFAULT_TEXT_BUDGET) {
  const budget = Number.isSafeInteger(maxChars) ? Math.max(256, Math.min(maxChars, DEFAULT_TEXT_BUDGET)) : DEFAULT_TEXT_BUDGET;
  let text = typeof result.text === 'string' ? result.text : '';
  if (!result.ok && result.error) {
    const { code, message, hint } = result.error;
    if (!text) text = `${code || 'TOOL_ERROR'}: ${message || 'The tool failed.'}`;
    if (code && !text.includes(code)) text = `${code}: ${text}`;
    if (hint && !text.includes(hint)) text += `\nHint: ${hint}`;
  }
  if (!text) text = JSON.stringify(result.data ?? result, null, 2);
  // Strip terminal control characters from world-authored text; keep line breaks and tabs.
  text = text.replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');
  if (text.length <= budget) return text;
  const suffix = '\n[Text truncated; narrow inspect/observe, or use the structured result / CLI --raw.]';
  return text.slice(0, Math.max(0, budget - suffix.length)) + suffix;
}

async function readBody(response) {
  let bytes = 0;
  const chunks = [];
  if (!response.body) return '';
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      throw new AgentError('RESPONSE_TOO_LARGE', 'The server response exceeds the 8 MiB transport limit.', 'Use a narrower inspect scope or a smaller observation page.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function callTool(tool, args = {}, options = {}) {
  if (!isObject(args)) throw new AgentError('INVALID_ARGUMENTS', 'Tool arguments must be a JSON object.', 'Use --json \'{"sessionId":"…"}\' or an object-valued MCP arguments field.');
  const endpoint = toolEndpoint(options.url);
  const configuredTimeout = timeoutValue(options.timeoutMs);
  // A requested long poll must have time to complete, plus a small transport margin.
  const waitMs = Number.isSafeInteger(args.waitMs) && args.waitMs > 0 ? args.waitMs : 0;
  const timeoutMs = Math.min(2_147_483_647, Math.max(configuredTimeout, waitMs + 5_000));
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  let response;
  let raw;
  try {
    response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json',
        ...(process.env.GEN_GAMES_TOKEN ? { Authorization: `Bearer ${process.env.GEN_GAMES_TOKEN}` } : {}),
      },
      body: JSON.stringify({ tool, args }), signal, redirect: 'error',
    });
    raw = await readBody(response);
  } catch (error) {
    if (error instanceof AgentError) throw error;
    const cancelled = options.signal?.aborted;
    const timedOut = deadline.aborted;
    throw new AgentError(
      cancelled ? 'REQUEST_CANCELLED' : timedOut ? 'REQUEST_TIMEOUT' : 'TRANSPORT_ERROR',
      cancelled ? 'The local wait was cancelled.' : timedOut ? `No complete response arrived within ${timeoutMs} ms.` : `Could not complete the HTTP request to ${endpoint.origin}${endpoint.pathname}.`,
      'Check that npm start is running and GEN_GAMES_URL is correct. A mutation may already have applied: inspect before retrying and preserve the same requestId.',
    );
  }
  let result;
  try { result = JSON.parse(raw); }
  catch {
    throw new AgentError('INVALID_RESPONSE', `The server returned non-JSON content (HTTP ${response.status}).`, 'Check the server URL and logs. Do not blindly repeat a mutation.');
  }
  if (!isObject(result) || typeof result.ok !== 'boolean') {
    throw new AgentError('INVALID_RESPONSE', `The server response is missing its tool result envelope (HTTP ${response.status}).`, 'Use the gen-games server /api/tools endpoint.');
  }
  if (!response.ok && result.ok) {
    throw new AgentError('HTTP_ERROR', `The server returned HTTP ${response.status} with an inconsistent success result.`, 'Check server logs and inspect state before retrying a mutation.');
  }
  return result;
}
