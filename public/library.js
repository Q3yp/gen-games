const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let nextOffset = null;
async function tool(name, args) {
  const response = await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: name, args }) });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error?.message || 'Could not reach the runtime.');
  return result.data;
}
function progressText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : item}`).join(' · ');
  return '';
}
function card(item) {
  const date = new Date(item.lastPlayedAt).toLocaleString();
  return `<article><div class="card-top"><span class="eyebrow">${escape(item.gameTitle)}</span><span class="status">${escape(item.status || 'saved')}</span></div><h3>${escape(item.title)}</h3><p class="progress">${escape(progressText(item.gameProgress) || item.progress || 'Ready to continue. Your game owns its progress and character data.')}</p>${item.progress && item.gameProgress ? `<p class="host-note">Host note: ${escape(item.progress)}</p>` : ''}<p class="last-played">Last saved play · ${escape(date)}</p><div class="card-bottom">${item.available ? `<a class="resume" href="${escape(item.url)}">Continue campaign ↗</a>` : '<span>Game source unavailable</span>'}<button class="copy" data-workspace="${escape(item.workspaceId)}">Copy host ID</button></div><details><summary>Campaign & host identity</summary><dl><dt>Workspace</dt><dd>${escape(item.workspaceId)}</dd><dt>Campaign / save</dt><dd>${escape(item.sessionId)}</dd><dt>Game / source</dt><dd>games/${escape(item.gameId)}/</dd><dt>Save freshness</dt><dd>revision ${item.revision} · run ${item.runEpoch ?? 'structured'} · checkpoint ${item.checkpointSeq ?? 'n/a'}</dd></dl><p>Give the workspace ID to a fresh agent. It can read the handoff and attach without replaying history or resetting your save.</p></details></article>`;
}
async function load(append = false) {
  const data = await tool('library', { op: 'list', offset: append ? nextOffset : 0, limit: 30 });
  if (!append) {
    $('#campaigns').replaceChildren();
    const selected = $('#game').value;
    $('#game').innerHTML = data.games.map(game => `<option value="${escape(game.gameId)}">${escape(game.title)}</option>`).join('');
    if (data.games.some(g => g.gameId === selected)) $('#game').value = selected;
  }
  $('#campaigns').insertAdjacentHTML('beforeend', data.entries.map(card).join(''));
  nextOffset = data.nextOffset; $('#more').hidden = nextOffset === null;
  $('#notice').textContent = data.total ? `${data.total} saved campaign${data.total === 1 ? '' : 's'}. Continue any one without starting over.` : 'Your library is empty. Choose a game above to begin.';
}
function failed(error) { $('#notice').textContent = error.message; }
$('#refresh').addEventListener('click', () => load().catch(failed));
$('#more').addEventListener('click', () => load(true).catch(failed));
$('#new-campaign').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try { const data = await tool('library', { op: 'create', gameId: $('#game').value, ...($('#title').value.trim() ? { title: $('#title').value.trim() } : {}) }); location.href = data.url; }
  catch (error) { failed(error); button.disabled = false; }
});
$('#campaigns').addEventListener('click', async event => {
  const button = event.target.closest('[data-workspace]'); if (!button) return;
  try { await navigator.clipboard.writeText(button.dataset.workspace); button.textContent = 'Copied'; }
  catch { $('#notice').textContent = `Host workspace ID: ${button.dataset.workspace}`; }
});
void load().catch(failed);
