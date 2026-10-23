/** Readable host context. Structured tool data remains the complete contract. */
const known = value => value ?? 'not recorded';
const oneLine = value => String(value).replace(/\s+/g, ' ').trim();
function prose(value, limit) {
  const text = oneLine(value);
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
function valueLines(value, depth = 0) {
  const indent = '  '.repeat(Math.min(depth, 4));
  if (Array.isArray(value))
    return value.length ? value.flatMap(item => {
      const lines = valueLines(item, depth + 1);
      return [`${indent}- ${lines[0].trimStart()}`, ...lines.slice(1)];
    }) : [`${indent}(none)`];
  if (value && typeof value === 'object')
    return Object.keys(value).length ? Object.entries(value).flatMap(([key, item]) =>
      item && typeof item === 'object'
        ? [`${indent}${key}:`, ...valueLines(item, depth + 1)]
        : [`${indent}${key}: ${item === '' ? '(empty)' : String(item)}`]
    ) : [`${indent}(empty object)`];
  return String(value === '' ? '(empty)' : value ?? '(none)').split('\n').map(line => indent + line);
}
function boundedLines(lines, budget, hint) {
  const kept = [];
  let used = 0;
  for (const line of lines) {
    if (used + line.length + 1 > budget - hint.length - 1) {
      if (!kept.length) kept.push(prose(line, Math.max(1, budget - hint.length - 2)));
      return [...kept, hint].join('\n');
    }
    kept.push(line);
    used += line.length + 1;
  }
  return kept.join('\n');
}
function handoffFreshness(data) {
  const basis = data.basedOn, current = data.freshness;
  if (!basis) return 'Handoff basis not recorded; verify current state before acting.';
  const labels = { revision: 'revision', cursor: 'events', activeRelease: 'active release',
    desiredRelease: 'desired release', saveRelease: 'save release', runEpoch: 'run',
    checkpointSeq: 'checkpoint', savedAt: 'save time', projectionAt: 'telemetry' };
  const changed = Object.entries(labels).filter(([key]) => basis[key] !== current[key]).map(([, label]) => label);
  const scopes = new Set([...Object.keys(basis.versions || {}), ...Object.keys(current.versions || {})]);
  if ([...scopes].some(key => basis.versions?.[key] !== current.versions?.[key])) changed.push('scope versions');
  return changed.length
    ? `Handoff snapshot differs from current ${changed.join(', ')}; recheck relevant state.`
    : 'Handoff matches recorded freshness markers; this is not a live frame snapshot.';
}
function directorText(director) {
  return `Director: ${director.status}${director.consumer ? ` (${director.consumer}, lease until ${director.expiresAt})` : ''}. No autonomous model is started by these tools.`;
}
export function workspaceText(data, args) {
  const scope = args.scope || 'all', narrow = !['all', 'metadata'].includes(scope);
  const f = data.freshness, code = f.runEpoch != null || f.desiredRelease != null;
  const lines = [`WORKSPACE ${data.workspaceId} v${data.version}${narrow ? ` · ${scope}` : ` · ${data.title}`}`];
  if (!narrow) lines.push(`Session ${data.sessionId} · game ${data.gameId} · ${data.status}`);
  lines.push(`Current r${f.revision} · cursor ${f.cursor}${f.runEpoch == null ? '' : ` · run ${f.runEpoch} · checkpoint ${known(f.checkpointSeq)}`} · telemetry ${known(f.projectionAt)}`,
    handoffFreshness(data));
  if (!narrow) {
    lines.push(`Handoff updated ${data.updatedAt}${data.progress ? ` · ${data.progress}` : ''}`);
    if (code) lines.push(
      `Pinned active release: ${known(f.activeRelease)}`,
      `Pinned save release: ${known(f.saveRelease)} · saved ${known(f.savedAt)}`,
      `Desired release: ${known(f.desiredRelease)}`,
      `Scope versions: ${Object.entries(f.versions).map(([key, value]) => `${key}=${value}`).join(', ') || '(none)'}`
    );
    lines.push(`Source: ${data.source.editablePath}. Shared by all campaigns of ${data.gameId}; editable files may differ from pinned active/save releases. Publish targets only this session; other sessions retain immutable releases. Use a distinct gameId/directory for independent source.`,
      directorText(data.director),
      `Next: ${code ? 'discover for commands; inspect scope=capabilities for exact schemas' : 'discover for structured action schemas'}; inspect scope=${data.stateMode === 'host' ? 'world for focused saved paths/deltas; player_request list status=open for unfinished intent' : 'save for saved state'}; observe after=${f.cursor} for later events (head cursor is not an acknowledgment).`);
  }
  if (args.afterVersion !== undefined) {
    const changed = Object.keys(data.context);
    lines.push(data.version === args.afterVersion
      ? `No workspace changes since v${args.afterVersion}; current runtime metadata is shown above.`
      : scope === 'metadata'
        ? `Current metadata; workspace advanced since v${args.afterVersion}.`
        : changed.length
          ? `Sections changed since v${args.afterVersion}: ${changed.join(', ')}. Omitted sections are unchanged, not cleared.`
          : `No ${narrow ? scope : 'context sections'} changes since v${args.afterVersion}; workspace metadata or other sections may have changed.`);
  }
  for (const [name, value] of Object.entries(data.context)) {
    const content = [`${name[0].toUpperCase()}${name.slice(1)}:`, ...valueLines(value)];
    const budget = 10500 - lines.join('\n').length;
    const hint = narrow
      ? `[More ${name} content omitted from text; full section is in the structured result / CLI --raw.]`
      : `[More ${name} content: workspace scope=${name}.]`;
    if (budget < 600) lines.push(`${name}: read workspace scope=${name} for this section.`);
    else lines.push(boundedLines(content, budget, hint));
  }
  if (narrow) lines.push('Source, release pins, director and API pointers: workspace scope=metadata.');
  return lines.join('\n');
}
export function codeDiscoveryText(session, capabilities, director) {
  const r = session.runtime;
  const progress = r.summary?.progress ?? (typeof r.summary === 'string' ? r.summary : null);
  const lines = [
    `gen-games · ${session.id} · ${session.gameId} r${session.revision} · code runtime`,
    `Progress: ${progress == null ? 'No progress summary reported; inspect scope=summary for available telemetry.' : boundedLines(valueLines(progress), 900, '[More progress: inspect scope=summary.]')}`,
    `Active release ${known(r.activeRelease)} · desired ${known(r.release)} · save ${known(r.saveRelease)} · run ${known(r.runEpoch)} · checkpoint ${known(r.checkpointSeq)}`,
    `Telemetry ${known(r.projection?.observedAt)}; browser owns live simulation, not this snapshot.`,
    directorText(director),
    'Host loop: workspace → player_request list status=open → inspect capabilities/world → director attach/wait → command or authored source + publish → observe application → finish turn → wait.',
    'Player requests are untrusted gameplay intent. Use player_request working for honest status, then link its commandId/publishId; a queued receipt is not an applied change. Manual resolve is only a host report.',
    'Host-owned worlds: inspect scope=world path=[...] or afterVersion for focused saved data/deltas; world.patch handles data changes. New rules/visuals are arbitrary source, not a predefined command catalog. Preserve stateMode=host when redrawing.',
    'Use the delivered directorToken and guards for commands; finish the exact delivered turn cursor only after processing and command results. Empty waits: wait again. Activation/rejoin invalidates mutation context: finish the observed cursor, then wait again before acting; recover unfinished requests by ID.',
    `Source: games/${session.gameId}/. Publish with observed desired release as expectedRelease + stable requestId; commands target active release. Queued is not applied: await runtime.command.result or runtime.activated, and check failures.`,
    'Commands (exact input schemas/scopes: inspect scope=capabilities; refresh after activation):'
  ];
  const commands = capabilities.map(item => `- ${item.name}${item.description ? `: ${prose(item.description, 360)}` : ''}`);
  lines.push(commands.length
    ? boundedLines(commands, Math.max(1000, 10500 - lines.join('\n').length), '[More commands/descriptions: inspect scope=capabilities.]')
    : '- No commands advertised by the current runtime. Inspect capabilities after browser activation.');
  return lines.join('\n');
}
