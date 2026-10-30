/* The animated reminder window. */
(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const preview = q.get('preview') === '1';

  let r = null;
  if (q.get('id')) r = (await Core.getReminders()).find((x) => x.id === q.get('id')) || null;

  const type = (r && r.type) || q.get('type') || 'bell';
  const text = (r && r.text) || q.get('text') || 'Time for your reminder';
  const desc = r ? r.description || '' : q.get('desc') || '';
  const T = Core.typeById(type);
  const settings = await Core.getSettings();

  document.body.className = 't-' + type;
  document.title = T.emoji + ' ' + text;
  $('kicker').textContent = T.emoji + '  ' + T.label;
  $('text').textContent = text;
  $('desc').textContent = desc;
  $('desc').hidden = !desc;
  document.body.classList.toggle('has-desc', !!desc);
  $('sub').textContent = T.sub;
  $('previewTag').hidden = !preview;
  $('snooze').textContent = 'Snooze ' + settings.snooze + ' min';
  if (preview || !r) $('snooze').title = 'Snooze is disabled in preview';

  if (type === 'water') {
    const s = await Core.getTodayStats();
    $('sub').textContent = 'Glass #' + ((s.water || 0) + 1) + ' today. ' + T.sub;
  }

  const ctx = {
    onComplete(msg) {
      $('sub').textContent = msg;
      $('done').classList.add('pulse');
    }
  };
  $('stage').classList.add(Anim[type] ? type : 'bell');
  (Anim[type] || Anim.bell)($('stage'), ctx);

  // ---- sound (Web Audio, no files) ------------------------------------------------
  function playSound() {
    let ac;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const now = () => ac.currentTime;
    const tone = (freq, start, dur, gain = 0.18, type = 'sine', slideTo) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now() + start);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now() + start + dur * 0.6);
      g.gain.setValueAtTime(0.0001, now() + start);
      g.gain.exponentialRampToValueAtTime(gain, now() + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + start + dur);
      o.connect(g).connect(ac.destination);
      o.start(now() + start); o.stop(now() + start + dur + 0.05);
    };
    const go = () => {
      if (type === 'water') { tone(900, 0, .25, .2, 'sine', 320); tone(1100, .32, .22, .15, 'sine', 380); tone(800, .62, .3, .12, 'sine', 300); }
      else if (type === 'bell') { [0, .5].forEach((s) => { tone(880, s, 1.4, .14); tone(1320, s, 1.1, .07); tone(2112, s, .7, .04); }); }
      else if (type === 'breathe') { tone(392, 0, 2.2, .1); tone(587, .1, 2.2, .06); }
      else { tone(659, 0, .5, .14); tone(988, .18, .7, .12); }
    };
    if (ac.state === 'suspended') {
      ac.resume().then(go).catch(() => {});
      // If autoplay is blocked, play on the first interaction instead.
      document.addEventListener('pointerdown', () => ac.resume().then(go), { once: true });
    } else go();
  }
  if (settings.sound && (!r || r.sound !== false)) playSound();

  // ---- actions --------------------------------------------------------------------------
  const close = () => window.close();
  $('done').addEventListener('click', async () => {
    if (!preview) await Core.recordDone(type);
    close();
  });
  $('snooze').addEventListener('click', async () => {
    if (!preview && r) await chrome.runtime.sendMessage({ type: 'SNOOZE', id: r.id, minutes: settings.snooze });
    close();
  });
  $('skip').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('done').click();
    if (e.key === 'Escape') close();
  });
  $('done').focus();
})();
