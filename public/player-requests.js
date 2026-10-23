/** Engine-owned, optional request surface. Games keep their own interaction. */
import { $, state, request } from './shared.js';

export function bindPlayerRequests() {
  const style = document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/player-requests.css'; document.head.append(style);
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'shell-control'; button.id = 'host-request-toggle';
  button.innerHTML = '<span aria-hidden="true">✎</span><span class="shell-tip">Ask host</span>';
  button.setAttribute('aria-label', 'Ask host'); button.title = 'Ask host · change anything'; button.setAttribute('aria-haspopup', 'dialog');
  $('.player-toolbar').append(button);
  const badge = document.createElement('span');
  badge.className = 'host-request-status'; badge.setAttribute('role', 'status'); badge.hidden = true;
  $('.player-toolbar').append(badge);
  const dialog = document.createElement('dialog');
  dialog.className = 'host-request-dialog'; dialog.setAttribute('aria-labelledby', 'host-request-title');
  dialog.innerHTML = '<form><div class="host-request-heading"><h2 id="host-request-title">Ask the host</h2><button type="button" class="button" data-request-close aria-label="Close request">Close</button></div><p>Ask for anything you want to change or add. Keep playing while the host works.</p><label for="host-request-text">What would you like?</label><textarea id="host-request-text" maxlength="4000" rows="3" required placeholder="Describe your idea…"></textarea><p class="host-connection"></p><p class="host-request-error" role="alert"></p><button type="submit" class="button">Send request</button><details><summary>Recent requests</summary><ol class="host-request-history"></ol></details></form>';
  document.body.append(dialog);
  const input = $('textarea', dialog), error = $('.host-request-error', dialog), submit = $('[type=submit]', dialog);
  let sessionId = null, cursor = 0, records = new Map(), busy = false, pending = null, host = null;
  let lastNoticeKey = null, noticeUntil = 0;
  const labels = { queued: 'Queued', working: 'Working', applied: 'Update applied', failed: 'Failed', reported: 'Host reports ready' };
  function storageKey() { return `gen-games.host-request.${sessionId}`; }
  function storeDraft() { try { localStorage.setItem(storageKey(), JSON.stringify({ text: input.value, pending })); } catch { /* Server receipts remain durable. */ } }
  function syncSession() {
    const id = state.session?.id;
    button.disabled = !id;
    if (id === sessionId) return;
    dialog.close(); lastNoticeKey = null; noticeUntil = 0; sessionId = id; cursor = 0; records = new Map(); host = null; pending = null; input.value = ''; error.textContent = ''; badge.hidden = true;
    if (id) try { const saved = JSON.parse(localStorage.getItem(storageKey()) || '{}'); input.value = saved.text || ''; pending = saved.pending || null; } catch { /* Ignore corrupt draft. */ }
  }
  function render() {
    const list = [...records.values()].sort((a,b) => b.cursor - a.cursor);
    const active = list.find(row => ['queued','working'].includes(row.status));
    const latest = active || list[0];
    const noticeKey = latest ? `${latest.id}:${latest.status}` : '';
    if (lastNoticeKey !== null && noticeKey !== lastNoticeKey) noticeUntil = Date.now() + 6500;
    lastNoticeKey = noticeKey;
    const persistent = active || latest?.status === 'failed';
    badge.hidden = !latest || (!persistent && Date.now() > noticeUntil);
    button.dataset.requestState = active ? 'active' : latest?.status === 'failed' ? 'failed' : 'idle';
    badge.textContent = latest ? `${labels[latest.status]}${active && host?.status === 'offline' ? ' · host offline' : ''}` : '';
    $('.host-connection', dialog).textContent = host?.status === 'offline' ? 'The host is offline. Requests are saved until it returns.' : 'Keep playing. Changes appear here when they are ready.';
    const history = $('.host-request-history', dialog); history.replaceChildren();
    for (const row of list.slice(0, 10)) {
      const li = document.createElement('li'), title = document.createElement('strong'), text = document.createElement('p');
      title.textContent = labels[row.status]; text.textContent = row.text; li.append(title, text);
      if (row.note) { const note = document.createElement('small'); note.textContent = row.note; li.append(note); }
      history.append(li);
    }
  }
  async function poll() {
    syncSession();
    if (!sessionId || busy || document.hidden) return;
    busy = true; const id = sessionId;
    try {
      const data = await request(`/api/sessions/${encodeURIComponent(id)}/requests?after=${cursor}&limit=30`);
      if (id !== state.session?.id || id !== sessionId) return;
      for (const row of data.requests) records.set(row.id, row);
      cursor = data.nextCursor; host = data.host; render();
      if (data.hasMore) setTimeout(poll, 0);
    } catch { if (id === sessionId) $('.host-connection', dialog).textContent = 'Status is unavailable. Saved requests are retained; reconnect to check progress.'; }
    finally { busy = false; }
  }
  button.addEventListener('click', () => { syncSession(); render(); dialog.showModal(); input.focus(); void poll(); });
  $('[data-request-close]', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => button.focus({ preventScroll: true }));
  // Do not leak typing or Escape to arbitrary game key handlers.
  dialog.addEventListener('keydown', event => event.stopPropagation());
  input.addEventListener('input', () => { if (pending && pending.text !== input.value.trim()) pending = null; storeDraft(); });
  $('form', dialog).addEventListener('submit', async event => {
    event.preventDefault(); const text = input.value.trim(); if (!text || submit.disabled) return;
    const id = sessionId;
    pending ||= { id: crypto.randomUUID(), text }; storeDraft();
    const payload = { ...pending }; submit.disabled = true; error.textContent = '';
    try {
      const result = await request(`/api/sessions/${encodeURIComponent(id)}/requests`, { method: 'POST', body: JSON.stringify(payload) });
      if (id !== state.session?.id || id !== sessionId) return;
      records.set(result.request.id, result.request); pending = null; input.value = ''; storeDraft(); render(); dialog.close();
    } catch (failure) { if (id === sessionId) error.textContent = `${failure.message} You can retry; the same request will not be added twice.`; }
    finally { submit.disabled = false; }
  });
  setInterval(() => void poll(), 2000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void poll(); });
  void poll();
}
