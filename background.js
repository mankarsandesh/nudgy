/* Service worker: schedules alarms and opens the animated reminder window. */
importScripts('lib/core.js');

const WIN_W = 440;
const WIN_H = 600;

// ---- Scheduling ---------------------------------------------------------------
const sig = (r) => JSON.stringify([r.enabled, r.schedule]);

// All scheduling work runs one step at a time so writes never interleave.
let chain = Promise.resolve();
const queue = (fn) => (chain = chain.then(fn, fn));

/** Make sure every enabled reminder has an alarm. Keeps running timers whose schedule didn't change. */
const syncAll = () => queue(async () => {
  const list = await Core.getReminders();
  const meta = await Core.getMeta();
  const alarms = await chrome.alarms.getAll();
  const ids = new Set(list.map((r) => r.id));
  const nextMeta = {};
  const expired = [];

  for (const a of alarms) {
    if (!/^[rs]:/.test(a.name)) continue;
    if (!ids.has(a.name.slice(2))) await chrome.alarms.clear(a.name);
  }

  for (const r of list) {
    const name = 'r:' + r.id;
    if (!r.enabled) { await chrome.alarms.clear(name); continue; }
    const m = meta[r.id];
    const existing = alarms.find((a) => a.name === name);
    if (existing && m && m.sig === sig(r)) { nextMeta[r.id] = m; continue; }
    const t = Core.nextFire(r);
    if (t) chrome.alarms.create(name, { when: t });
    else { await chrome.alarms.clear(name); if (r.schedule.kind === 'once') expired.push(r.id); }
    nextMeta[r.id] = { nextAt: t, sig: sig(r) };
  }
  await Core.saveMeta(nextMeta);
  for (const id of expired) await Core.patchReminder(id, { enabled: false });
  await updateBadge();
});

async function updateBadge() {
  const list = await Core.getReminders();
  const on = list.filter((r) => r.enabled).length;
  await chrome.action.setBadgeBackgroundColor({ color: '#0EA5E9' });
  await chrome.action.setBadgeText({ text: on ? String(on) : '' });
}

let openCount = 0;
async function openReminderWindow(params) {
  const url = chrome.runtime.getURL('reminder.html?' + new URLSearchParams(params).toString());
  const opts = { url, type: 'popup', width: WIN_W, height: WIN_H, focused: true };
  try {
    const w = await chrome.windows.getLastFocused();
    if (w && w.width) {
      const offset = (openCount++ % 4) * 28; // cascade if several fire together
      opts.left = Math.max(0, Math.round(w.left + (w.width - WIN_W) / 2) + offset);
      opts.top = Math.max(0, Math.round(w.top + (w.height - WIN_H) / 2) + offset);
    }
  } catch (e) { /* no browser window open: let Chrome place it */ }
  try {
    await chrome.windows.create(opts);
  } catch (e) {
    delete opts.left; delete opts.top;
    await chrome.windows.create(opts);
  }
}

async function fire(id, snoozed) {
  const list = await Core.getReminders();
  const r = list.find((x) => x.id === id);
  if (!r) return;
  if (!snoozed && !r.enabled) return;

  await openReminderWindow({ id: r.id });

  const settings = await Core.getSettings();
  if (settings.notify) {
    const t = Core.typeById(r.type);
    chrome.notifications.create('n:' + r.id + ':' + Date.now(), {
      type: 'basic', iconUrl: 'icons/icon128.png',
      title: t.emoji + ' ' + (t.id === 'bell' ? 'Reminder' : t.label),
      message: r.description ? r.text + '\n' + r.description : r.text, priority: 2
    });
  }

  if (snoozed) return;
  // Schedule the next occurrence.
  await queue(async () => {
    const meta = await Core.getMeta();
    if (r.schedule.kind === 'once') {
      delete meta[r.id];
      await Core.saveMeta(meta);
      await Core.patchReminder(r.id, { enabled: false });
    } else {
      const t = Core.nextFire(r);
      if (t) chrome.alarms.create('r:' + r.id, { when: t });
      meta[r.id] = { nextAt: t, sig: sig(r) };
      await Core.saveMeta(meta);
    }
    await updateBadge();
  });
}

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name.startsWith('r:')) fire(a.name.slice(2), false);
  else if (a.name.startsWith('s:')) fire(a.name.slice(2), true);
});

chrome.notifications.onClicked.addListener((nid) => chrome.notifications.clear(nid));

chrome.runtime.onInstalled.addListener(async () => {
  // Leftovers from the old paid version.
  await chrome.alarms.clear('paid-check');
  await chrome.storage.local.remove('pro');
  syncAll();
});
chrome.runtime.onStartup.addListener(() => syncAll());

// ---- Messages -------------------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    switch (msg && msg.type) {
      case 'SYNC':
        await syncAll();
        reply({ ok: true });
        break;
      case 'PREVIEW':
        await openReminderWindow({ preview: '1', type: msg.rtype || 'bell', text: msg.text || '', desc: msg.desc || '' });
        reply({ ok: true });
        break;
      case 'SNOOZE':
        chrome.alarms.create('s:' + msg.id, { when: Date.now() + (msg.minutes || 10) * 60000 });
        reply({ ok: true });
        break;
      default:
        reply({ ok: false });
    }
  })();
  return true;
});
