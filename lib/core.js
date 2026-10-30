/* Shared data + scheduling. Loaded by the service worker (importScripts), popup and reminder page. */
(function (root) {
  'use strict';

  const TYPES = [
    { id: 'bell', label: 'Reminder', emoji: '🔔', keywords: [], sub: '' },
    { id: 'water', label: 'Drink water', emoji: '💧', keywords: ['water', 'drink', 'hydrat', 'sip', 'bottle'],
      sub: 'A glass now keeps the afternoon slump away.' },
    { id: 'stretch', label: 'Stretch', emoji: '🙆', keywords: ['stretch', 'posture', 'yoga', 'back', 'neck', 'shoulder'],
      sub: 'Reach up, lean left, lean right. Your back will thank you.' },
    { id: 'eyes', label: 'Eye break', emoji: '👀', keywords: ['eye', 'screen', '20-20', 'look away', 'blink'],
      sub: 'Look at something 20 feet away for 20 seconds.' },
    { id: 'breathe', label: 'Breathe', emoji: '🌬️', keywords: ['breath', 'calm', 'meditat', 'relax', 'stress', 'mindful'],
      sub: 'Follow the circle: breathe in as it grows, out as it shrinks.' },
    { id: 'walk', label: 'Move', emoji: '🚶', keywords: ['walk', 'stand', 'move', 'steps', 'stairs', 'exercise'],
      sub: 'Stand up and take a short walk. Even two minutes helps.' },
    { id: 'coffee', label: 'Take a break', emoji: '☕', keywords: ['coffee', 'tea', 'break', 'lunch', 'snack', 'rest'],
      sub: 'Step away from the screen for a few minutes.' }
  ];

  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
  const WEEKDAYS = [1, 2, 3, 4, 5];
  const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const PRESETS = [
    { text: 'Plan your day', type: 'bell', description: 'Pick the three things that matter most today.',
      schedule: { kind: 'daily', time: '09:00', days: WEEKDAYS } },
    { text: 'Drink a glass of water', type: 'water',
      schedule: { kind: 'interval', minutes: 45, useHours: true, start: '09:00', end: '18:00', days: WEEKDAYS } },
    { text: 'Stretch your back and shoulders', type: 'stretch',
      schedule: { kind: 'interval', minutes: 60, useHours: true, start: '09:00', end: '18:00', days: WEEKDAYS } },
    { text: '20-20-20 eye break', type: 'eyes',
      schedule: { kind: 'interval', minutes: 20, useHours: true, start: '09:00', end: '18:00', days: WEEKDAYS } },
    { text: 'Take a minute to breathe', type: 'breathe',
      schedule: { kind: 'daily', time: '15:00', days: WEEKDAYS } },
    { text: 'Stand up and walk around', type: 'walk',
      schedule: { kind: 'interval', minutes: 90, useHours: true, start: '09:00', end: '18:00', days: WEEKDAYS } }
  ];

  // ---- Helpers ----------------------------------------------------------------
  const uid = () => 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const typeById = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

  function suggestType(text) {
    const s = (text || '').toLowerCase();
    for (const t of TYPES) if (t.keywords.some((k) => s.includes(k))) return t.id;
    return 'bell';
  }

  const hm = (str) => { const [h, m] = (str || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const pad = (n) => String(n).padStart(2, '0');
  const fmtHM = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());

  function dayKey(d = new Date()) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // ---- Scheduling -------------------------------------------------------------
  /** Push a timestamp forward into the allowed days/hours window. */
  function fitWindow(t, s) {
    const days = s.days && s.days.length ? s.days : ALL_DAYS;
    const start = s.useHours ? hm(s.start) : 0;
    const end = s.useHours ? hm(s.end) : 24 * 60;
    for (let i = 0; i < 9; i++) {
      const d = new Date(t);
      d.setDate(d.getDate() + i);
      if (!days.includes(d.getDay())) continue;
      d.setHours(0, 0, 0, 0);
      const ws = d.getTime() + start * 60000;
      const we = d.getTime() + end * 60000;
      if (i === 0) {
        if (t < ws) return ws;
        if (t <= we) return t;
        continue;
      }
      return ws;
    }
    return null;
  }

  /** Next time this reminder should fire after `now`, or null. */
  function nextFire(r, now = Date.now()) {
    const s = r.schedule || {};
    if (s.kind === 'once') return s.at > now ? s.at : null;
    if (s.kind === 'interval') return fitWindow(now + Math.max(1, s.minutes) * 60000, s);
    if (s.kind === 'daily') {
      const days = s.days && s.days.length ? s.days : ALL_DAYS;
      const [h, m] = (s.time || '09:00').split(':').map(Number);
      for (let i = 0; i < 9; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        d.setHours(h, m, 0, 0);
        if (d.getTime() > now && days.includes(d.getDay())) return d.getTime();
      }
    }
    return null;
  }

  function describeDays(days) {
    const d = (days && days.length ? days : ALL_DAYS).slice().sort();
    if (d.length === 7) return '';
    if (d.join() === WEEKDAYS.join()) return 'Weekdays';
    if (d.join() === '0,6') return 'Weekends';
    return d.map((x) => DAY_SHORT[x]).join(', ');
  }

  function describeSchedule(s) {
    if (!s) return '';
    if (s.kind === 'interval') {
      const every = s.minutes % 60 === 0 && s.minutes >= 60
        ? 'Every ' + (s.minutes / 60) + ' h'
        : 'Every ' + s.minutes + ' min';
      return [every, s.useHours ? s.start + '–' + s.end : '', describeDays(s.days)].filter(Boolean).join(' · ');
    }
    if (s.kind === 'daily') {
      const days = describeDays(s.days);
      return (days ? days + ' at ' : 'Daily at ') + s.time;
    }
    if (s.kind === 'once') {
      const d = new Date(s.at);
      return 'Once · ' + DAY_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' +
        d.toLocaleString(undefined, { month: 'short' }) + ', ' + fmtHM(d);
    }
    return '';
  }

  function relTime(ts, now = Date.now()) {
    if (!ts) return '';
    const mins = Math.round((ts - now) / 60000);
    if (mins < 1) return 'any moment';
    if (mins < 60) return 'in ' + mins + ' min';
    const d = new Date(ts);
    const today = new Date(now);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    if (mins < 6 * 60 && d.getDate() === today.getDate()) {
      const h = Math.floor(mins / 60), m = mins % 60;
      return 'in ' + h + ' h' + (m ? ' ' + m + ' min' : '');
    }
    if (d.toDateString() === today.toDateString()) return 'today ' + fmtHM(d);
    if (d.toDateString() === tomorrow.toDateString()) return 'tomorrow ' + fmtHM(d);
    return DAY_SHORT[d.getDay()] + ' ' + fmtHM(d);
  }

  // ---- Storage ----------------------------------------------------------------
  const get = (k) => chrome.storage.local.get(k);
  const set = (o) => chrome.storage.local.set(o);

  async function getReminders() {
    const { reminders = [] } = await get('reminders');
    return reminders;
  }
  const saveReminders = (list) => set({ reminders: list });

  /** Create or update. Returns the saved reminder. */
  async function upsertReminder(input) {
    const r = Object.assign({}, input);
    if (!r.id) r.id = uid(); // never store a reminder without an id
    const list = await getReminders();
    const i = list.findIndex((x) => x.id === r.id);
    let saved;
    if (i >= 0) {
      saved = Object.assign({}, list[i], r);
      list[i] = saved;
    } else {
      saved = Object.assign({ createdAt: Date.now() }, r);
      list.push(saved);
    }
    await saveReminders(list);
    return saved;
  }

  /** Internal update used by the service worker for scheduling bookkeeping. */
  async function patchReminder(id, patch) {
    const list = await getReminders();
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return null;
    list[i] = Object.assign({}, list[i], patch);
    await saveReminders(list);
    return list[i];
  }

  async function deleteReminder(id) {
    await saveReminders((await getReminders()).filter((x) => x.id !== id));
  }

  /** Scheduling bookkeeping, written only by the service worker: { [id]: { nextAt, sig } } */
  async function getMeta() {
    const { meta = {} } = await get('meta');
    return meta;
  }
  const saveMeta = (meta) => set({ meta });

  // ---- Stats ------------------------------------------------------------------
  async function recordDone(type) {
    const { stats = {} } = await get('stats');
    const k = dayKey();
    stats[k] = stats[k] || {};
    stats[k][type] = (stats[k][type] || 0) + 1;
    const keys = Object.keys(stats).sort();
    while (keys.length > 60) delete stats[keys.shift()]; // keep ~2 months
    await set({ stats });
  }

  async function getTodayStats() {
    const { stats = {} } = await get('stats');
    return stats[dayKey()] || {};
  }

  // ---- Settings -----------------------------------------------------------------
  async function getSettings() {
    const { settings = {} } = await get('settings');
    return Object.assign({ sound: true, notify: true, snooze: 10 }, settings);
  }
  async function saveSettings(patch) {
    const s = Object.assign(await getSettings(), patch);
    await set({ settings: s });
    return s;
  }

  root.Core = {
    TYPES, PRESETS, ALL_DAYS, WEEKDAYS, DAY_SHORT,
    uid, typeById, suggestType, hm, fmtHM, dayKey,
    fitWindow, nextFire, describeSchedule, describeDays, relTime,
    getReminders, saveReminders, getMeta, saveMeta, upsertReminder, patchReminder, deleteReminder,
    recordDone, getTodayStats, getSettings, saveSettings
  };
})(typeof self !== 'undefined' ? self : window);
