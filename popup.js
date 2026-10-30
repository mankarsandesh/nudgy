/* Toolbar popup: list, create and edit reminders. User text always goes through textContent. */
(function () {
  'use strict';
  const C = Core;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const $ = (id) => document.getElementById(id);
  const sync = () => chrome.runtime.sendMessage({ type: 'SYNC' }).catch(() => {});

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  const SHORT = { water: 'Water', stretch: 'Stretch', eyes: 'Eyes', breathe: 'Breathe', walk: 'Move', coffee: 'Break', bell: 'General' };
  const TRASH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';
  const state = { view: 'list', reminders: [], meta: {}, stats: {}, settings: {}, draft: null, confirmDel: null };

  async function load() {
    const [reminders, meta, stats, settings, ui] = await Promise.all([
      C.getReminders(), C.getMeta(), C.getTodayStats(), C.getSettings(), chrome.storage.local.get('ui')
    ]);
    Object.assign(state, { reminders, meta, stats, settings });
    const saved = ui.ui;
    if (saved && saved.view === 'form' && saved.draft && Date.now() - saved.at < 10 * 60000) {
      state.view = 'form';
      state.draft = saved.draft;
    }
  }
  const saveUi = () => chrome.storage.local.set({ ui: { view: state.view, draft: state.draft, at: Date.now() } });
  const clearUi = () => chrome.storage.local.remove('ui');

  // ---- render ---------------------------------------------------------------------
  function render() {
    const app = $('app');
    app.replaceChildren(
      state.view === 'form' ? renderForm() : state.view === 'settings' ? renderSettings() : renderList()
    );
  }
  function go(view) { state.view = view; state.confirmDel = null; if (view !== 'form') clearUi(); render(); }

  function todayChips() {
    const entries = C.TYPES.filter((t) => state.stats[t.id]).map((t) => h('span', { class: 'chip' }, t.emoji + ' ' + state.stats[t.id]));
    if (!entries.length) return null;
    return h('div', { class: 'today' }, h('span', { class: 'label' }, 'Done today'), entries);
  }

  // Delete takes two clicks: the first arms the button for a few seconds, the second deletes.
  function armDelete(id) {
    state.confirmDel = id;
    render();
    clearTimeout(armDelete._t);
    armDelete._t = setTimeout(() => { if (state.confirmDel === id) { state.confirmDel = null; render(); } }, 3000);
  }
  async function removeReminder(id) {
    await C.deleteReminder(id);
    state.draft = null;
    await sync(); await load(); go('list'); toast('Reminder deleted');
  }

  function renderList() {
    const next = (r) => (state.meta[r.id] && state.meta[r.id].nextAt) || 9e15;
    const list = state.reminders.slice().sort((a, b) => (b.enabled - a.enabled) || (next(a) - next(b)));
    const wrap = h('div', null, todayChips());

    if (!list.length) {
      wrap.append(
        h('div', { class: 'empty' },
          h('h2', null, 'No reminders yet'),
          h('p', null, 'Pick a quick start below or create your own.'),
          h('button', { class: 'btn primary', onclick: () => newDraft() }, '+ New reminder')),
        h('div', { class: 'section-title' }, 'Quick start'),
        presetList()
      );
    } else {
      wrap.append(h('div', { class: 'list' }, list.map(item)));
      wrap.append(h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn primary block', onclick: () => newDraft() }, '+ New reminder')));
      if (list.length < 3) wrap.append(h('div', { class: 'section-title' }, 'Ideas'), presetList(3));
    }
    const active = state.reminders.filter((r) => r.enabled).length;
    wrap.append(h('div', { class: 'foot' },
      active + ' active reminder' + (active === 1 ? '' : 's'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn ghost', onclick: () => go('settings') }, 'Settings')));
    return wrap;
  }

  function presetList(max) {
    const have = new Set(state.reminders.map((r) => r.text));
    return h('div', { class: 'presets' },
      C.PRESETS.filter((p) => !have.has(p.text)).slice(0, max || 99).map((p) => {
        const t = C.typeById(p.type);
        return h('button', { class: 'preset', onclick: () => addPreset(p) },
          h('span', { class: 'e' }, t.emoji),
          h('span', null, p.text, h('small', null, C.describeSchedule(p.schedule))));
      }));
  }

  async function addPreset(p) {
    await C.upsertReminder({ text: p.text, description: p.description || '', type: p.type,
      schedule: JSON.parse(JSON.stringify(p.schedule)), enabled: true, sound: true });
    await sync(); await load(); render(); toast('Reminder added');
  }

  function item(r) {
    const t = C.typeById(r.type);
    const toggle = h('input', { type: 'checkbox', checked: !!r.enabled, 'aria-label': 'Turn reminder on or off',
      onchange: async (e) => {
        await C.upsertReminder({ id: r.id, enabled: e.target.checked });
        await sync(); await load(); render();
      } });
    const armed = state.confirmDel === r.id;
    const del = h('button', { class: 'icon-btn' + (armed ? ' armed' : ''), type: 'button',
      title: armed ? 'Click again to delete' : 'Delete reminder', 'aria-label': armed ? 'Confirm delete' : 'Delete reminder',
      onclick: () => (armed ? removeReminder(r.id) : armDelete(r.id)) }, armed ? 'Delete' : null);
    if (!armed) del.innerHTML = TRASH;
    return h('div', { class: 'item' + (r.enabled ? '' : ' off') },
      h('div', { class: 'badge b-' + t.id }, t.emoji),
      h('div', { class: 'txt', onclick: () => editDraft(r), title: 'Edit' },
        h('div', { class: 't' }, r.text),
        r.description ? h('div', { class: 'd' }, r.description) : null,
        h('div', { class: 's' }, C.describeSchedule(r.schedule)),
        r.enabled && state.meta[r.id] && state.meta[r.id].nextAt ? h('div', { class: 'n' }, 'Next ' + C.relTime(state.meta[r.id].nextAt)) : null),
      h('label', { class: 'switch' }, toggle, h('span')),
      del);
  }

  // ---- form -------------------------------------------------------------------------
  function blankSchedule() {
    return { kind: 'interval', value: 30, unit: 'min', useHours: false, start: '09:00', end: '18:00', days: C.ALL_DAYS.slice(),
      time: '09:00', onceMode: 'in', inMinutes: 15, atLocal: '' };
  }
  function newDraft() {
    state.draft = { text: '', description: '', type: 'bell', typeAuto: true, enabled: true, sound: true, schedule: blankSchedule() };
    state.view = 'form'; state.confirmDel = null; saveUi(); render();
    setTimeout(() => { const i = document.querySelector('#rtext'); if (i) i.focus(); }, 0);
  }
  function editDraft(r) {
    const s = Object.assign(blankSchedule(), JSON.parse(JSON.stringify(r.schedule)));
    if (s.kind === 'interval') {
      if (s.minutes >= 60 && s.minutes % 60 === 0) { s.unit = 'h'; s.value = s.minutes / 60; } else { s.unit = 'min'; s.value = s.minutes; }
    }
    if (s.kind === 'once' && s.at) {
      const d = new Date(s.at); s.onceMode = 'at';
      s.atLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    state.draft = { id: r.id, text: r.text, description: r.description || '', type: r.type, typeAuto: false,
      enabled: r.enabled, sound: r.sound !== false, schedule: s };
    state.view = 'form'; state.confirmDel = null; saveUi(); render();
  }

  function renderForm() {
    const d = state.draft;
    const s = d.schedule;
    const rerender = () => { saveUi(); render(); };

    const text = h('input', { id: 'rtext', type: 'text', value: d.text, maxLength: 80, placeholder: 'e.g. Send the weekly report',
      oninput: (e) => {
        d.text = e.target.value;
        if (d.typeAuto) {
          const sug = C.suggestType(d.text);
          if (sug !== d.type) { d.type = sug; document.querySelectorAll('.type').forEach((b) => b.classList.toggle('on', b.dataset.type === sug)); }
        }
        saveUi();
      } });

    const desc = h('textarea', { id: 'rdesc', value: d.description || '', maxLength: 200, rows: 2,
      placeholder: 'Add details or notes (optional)',
      oninput: (e) => { d.description = e.target.value; saveUi(); } });

    const types = h('div', { class: 'types' }, C.TYPES.map((t) =>
      h('button', { class: 'type' + (d.type === t.id ? ' on' : ''), 'data-type': t.id, type: 'button',
        onclick: () => { d.type = t.id; d.typeAuto = false; rerender(); } },
        h('span', { class: 'e' }, t.emoji), SHORT[t.id])),
      h('button', { class: 'type', type: 'button', title: 'Preview the animation',
        onclick: () => { saveUi(); chrome.runtime.sendMessage({ type: 'PREVIEW', rtype: d.type, text: d.text || C.typeById(d.type).label, desc: d.description || '' }); } },
        h('span', { class: 'e' }, '▶'), 'Preview'));

    const seg = h('div', { class: 'seg' }, [['interval', 'Repeat'], ['daily', 'Daily at'], ['once', 'Once']].map(([k, l]) =>
      h('button', { type: 'button', class: s.kind === k ? 'on' : '', onclick: () => { s.kind = k; rerender(); } }, l)));

    const daysPicker = () => h('div', { class: 'days' }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((l, i) =>
      h('button', { type: 'button', class: s.days.includes(i) ? 'on' : '', title: C.DAY_SHORT[i],
        onclick: () => {
          s.days = s.days.includes(i) ? s.days.filter((x) => x !== i) : s.days.concat(i).sort();
          if (!s.days.length) s.days = [i];
          rerender();
        } }, l)));

    let sched;
    if (s.kind === 'interval') {
      sched = [
        h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Every'),
          h('div', { class: 'inline' },
            h('input', { type: 'number', min: 1, max: 720, value: s.value, oninput: (e) => { s.value = Number(e.target.value); saveUi(); } }),
            h('select', { onchange: (e) => { s.unit = e.target.value; saveUi(); } },
              h('option', { value: 'min', selected: s.unit === 'min' }, 'minutes'),
              h('option', { value: 'h', selected: s.unit === 'h' }, 'hours')))),
        h('div', { class: 'field' },
          h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: s.useHours, onchange: (e) => { s.useHours = e.target.checked; rerender(); } }),
            'Only between certain hours'),
          s.useHours && h('div', { class: 'inline' },
            h('input', { type: 'time', value: s.start, onchange: (e) => { s.start = e.target.value; saveUi(); } }),
            h('input', { type: 'time', value: s.end, onchange: (e) => { s.end = e.target.value; saveUi(); } }))),
        h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'On these days'), daysPicker())
      ];
    } else if (s.kind === 'daily') {
      sched = [
        h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Time'),
          h('input', { type: 'time', value: s.time, onchange: (e) => { s.time = e.target.value; saveUi(); } })),
        h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'On these days'), daysPicker())
      ];
    } else {
      sched = [
        h('div', { class: 'field' },
          h('div', { class: 'seg', style: 'grid-template-columns:1fr 1fr' },
            h('button', { type: 'button', class: s.onceMode === 'in' ? 'on' : '', onclick: () => { s.onceMode = 'in'; rerender(); } }, 'In…'),
            h('button', { type: 'button', class: s.onceMode === 'at' ? 'on' : '', onclick: () => { s.onceMode = 'at'; rerender(); } }, 'At a time')),
          s.onceMode === 'in'
            ? h('div', { class: 'inline' },
                h('input', { type: 'number', min: 1, max: 1440, value: s.inMinutes, oninput: (e) => { s.inMinutes = Number(e.target.value); saveUi(); } }),
                h('div', { class: 'hint', style: 'align-self:center' }, 'minutes from now'))
            : h('input', { type: 'datetime-local', value: s.atLocal, onchange: (e) => { s.atLocal = e.target.value; saveUi(); } }))
      ];
    }

    return h('div', null,
      h('div', { class: 'row', style: 'margin-bottom:10px' },
        h('button', { class: 'btn ghost', style: 'padding-left:0', onclick: () => { state.draft = null; go('list'); } }, '← Back'),
        h('span', { class: 'spacer' }),
        h('b', null, d.id ? 'Edit reminder' : 'New reminder')),
      h('div', { class: 'field' }, h('label', { for: 'rtext' }, 'Remind me to'), text),
      h('div', { class: 'field' }, h('label', { for: 'rdesc' }, 'Description'), desc),
      h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Animation'), types),
      h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'When'), seg),
      sched,
      h('label', { class: 'check', style: 'margin-bottom:14px' },
        h('input', { type: 'checkbox', checked: d.sound, onchange: (e) => { d.sound = e.target.checked; saveUi(); } }), 'Play a sound'),
      h('div', { class: 'row', style: 'margin-top:12px' },
        h('button', { class: 'btn primary', onclick: saveDraft }, d.id ? 'Save changes' : 'Create reminder'),
        h('span', { class: 'spacer' }),
        d.id && (state.confirmDel === d.id
          ? h('button', { class: 'btn danger armed', onclick: () => removeReminder(d.id) }, 'Click again to delete')
          : h('button', { class: 'btn ghost danger', onclick: () => armDelete(d.id) }, 'Delete')))
    );
  }

  async function saveDraft() {
    const d = state.draft;
    const s = d.schedule;
    if (!d.text.trim()) { toast('Add what to remind you about'); return; }
    let schedule;
    if (s.kind === 'interval') {
      const minutes = Math.round((s.unit === 'h' ? 60 : 1) * Math.max(1, Number(s.value) || 0));
      if (!minutes) { toast('Choose how often'); return; }
      schedule = { kind: 'interval', minutes, useHours: s.useHours, start: s.start, end: s.end, days: s.days };
      if (s.useHours && C.hm(s.start) >= C.hm(s.end)) { toast('End time must be after start time'); return; }
    } else if (s.kind === 'daily') {
      schedule = { kind: 'daily', time: s.time || '09:00', days: s.days };
    } else {
      const at = s.onceMode === 'in' ? Date.now() + Math.max(1, Number(s.inMinutes) || 0) * 60000 : new Date(s.atLocal).getTime();
      if (!at || at <= Date.now()) { toast('Pick a time in the future'); return; }
      schedule = { kind: 'once', at };
    }
    const saved = await C.upsertReminder({ id: d.id, text: d.text.trim(), description: (d.description || '').trim(),
      type: d.type, sound: d.sound, enabled: true, schedule });
    state.draft = null;
    await clearUi();
    await sync();
    await load();
    go('list');
    const m = state.meta[saved.id];
    toast(m && m.nextAt ? 'Saved — next ' + C.relTime(m.nextAt) : 'Saved');
  }

  // ---- settings ------------------------------------------------------------------------
  function renderSettings() {
    const st = state.settings;
    const save = async (patch) => { state.settings = await C.saveSettings(patch); toast('Saved'); };
    return h('div', null,
      h('div', { class: 'row', style: 'margin-bottom:10px' },
        h('button', { class: 'btn ghost', style: 'padding-left:0', onclick: () => go('list') }, '← Back'),
        h('span', { class: 'spacer' }), h('b', null, 'Settings')),
      h('div', { class: 'field' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.sound, onchange: (e) => save({ sound: e.target.checked }) }), 'Play sounds'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.notify, onchange: (e) => save({ notify: e.target.checked }) }),
          'Also show a system notification')),
      h('div', { class: 'field' }, h('div', { class: 'lbl' }, 'Snooze length'),
        h('select', { onchange: (e) => save({ snooze: Number(e.target.value) }) },
          [5, 10, 15, 30].map((m) => h('option', { value: m, selected: st.snooze === m }, m + ' minutes')))),
      h('p', { class: 'hint', style: 'margin-top:14px' }, 'Nudgy is free, with unlimited reminders. Your reminders are stored only in this browser.')
    );
  }

  load().then(() => { sync(); render(); });
  chrome.storage.onChanged.addListener(async (c) => {
    if ((c.reminders || c.meta || c.stats) && state.view === 'list') { await load(); if (state.view === 'list') render(); }
  });
})();
