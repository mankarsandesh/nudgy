/* Animated scenes for each reminder type. All markup here is static (no user text). */
(function () {
  'use strict';

  const svg = (inner) =>
    '<svg viewBox="0 0 240 260" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';

  const Anim = {};

  // ---- 💧 Water: a glass fills up while drops fall in --------------------------------
  Anim.water = (stage) => {
    let wave = 'M-200 10';
    for (let x = -200; x < 340; x += 50) wave += ' Q' + (x + 25) + ' ' + (x % 100 === 0 ? 0 : 20) + ' ' + (x + 50) + ' 10';
    wave += ' V320 H-200 Z';
    const glass = 'M58 40 L182 40 L166 226 Q165 236 154 236 L86 236 Q75 236 74 226 Z';
    const bubbles = [[100, 220, 4, 0], [132, 228, 3, .7], [116, 232, 5, 1.4], [146, 222, 3, 2.1], [92, 230, 3, 1.1]]
      .map(([x, y, r, d]) => `<circle class="bubble" cx="${x}" cy="${y}" r="${r}" fill="rgba(255,255,255,.75)" style="animation-delay:${d}s"/>`).join('');
    stage.innerHTML = svg(`
      <defs>
        <clipPath id="glassClip"><path d="${glass}"/></clipPath>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7DD3FC"/><stop offset="1" stop-color="#0369A1"/>
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="244" rx="70" ry="8" fill="rgba(12,74,110,.12)"/>
      <path d="${glass}" fill="rgba(255,255,255,.45)"/>
      <g clip-path="url(#glassClip)">
        <g class="fill">
          <path class="wave w2" d="${wave}" fill="#38BDF8" opacity=".55"/>
          <path class="wave" d="${wave}" fill="url(#wg)" transform="translate(0 6)"/>
        </g>
        ${bubbles}
      </g>
      <path d="${glass}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
      <path d="M72 56 L84 214" stroke="url(#shine)" stroke-width="9" stroke-linecap="round"/>
      <ellipse class="ripple" cx="120" cy="104" rx="26" ry="5" fill="none" stroke="#fff" stroke-width="2.5"/>
      <circle class="splash" cx="114" cy="102" r="3" fill="#7DD3FC" style="--dx:-14px"/>
      <circle class="splash" cx="126" cy="102" r="3" fill="#7DD3FC" style="--dx:14px"/>
      <path class="drop" d="M120 4 C120 4 107 22 107 30 a13 13 0 0 0 26 0 C133 22 120 4 120 4 Z" fill="#0EA5E9" stroke="#fff" stroke-width="2"/>
    `);
  };

  // ---- 🙆 Stretch: a figure reaches up and leans side to side -------------------------
  Anim.stretch = (stage) => {
    const ink = '#7C2D12';
    const sparks = [[78, 18, 0], [162, 18, .1], [120, 6, .05]]
      .map(([x, y, d]) => `<g class="spark" style="transform-origin:${x}px ${y}px;animation-delay:${d}s">
         <path d="M${x} ${y - 8} V${y + 8} M${x - 8} ${y} H${x + 8}" stroke="#EA580C" stroke-width="3" stroke-linecap="round"/></g>`).join('');
    stage.innerHTML = svg(`
      <ellipse cx="120" cy="242" rx="84" ry="10" fill="rgba(234,88,12,.15)"/>
      <rect x="44" y="232" width="152" height="10" rx="5" fill="#FDBA74"/>
      <g stroke="${ink}" stroke-width="11" stroke-linecap="round" fill="none">
        <path d="M120 168 L98 234"/><path d="M120 168 L142 234"/>
      </g>
      <g class="upper">
        <g stroke="${ink}" stroke-width="11" stroke-linecap="round" fill="none">
          <path d="M120 96 L120 168"/>
          <g class="arm-l"><path d="M110 96 L110 38"/></g>
          <g class="arm-r"><path d="M130 96 L130 38"/></g>
        </g>
        <circle cx="120" cy="64" r="18" fill="${ink}"/>
      </g>
      ${sparks}
    `);
  };

  // ---- 👀 Eyes: blinking eye looking far away + a 20-second countdown ----------------
  Anim.eyes = (stage, ctx) => {
    const R = 38, C = 2 * Math.PI * R;
    stage.innerHTML = svg(`
      <defs><clipPath id="eyeClip"><path d="M30 80 Q120 0 210 80 Q120 160 30 80 Z"/></clipPath>
        <radialGradient id="irisG"><stop offset="0" stop-color="#4ADE80"/><stop offset="1" stop-color="#166534"/></radialGradient></defs>
      <g stroke="#14532D" stroke-width="4" stroke-linecap="round">
        <path d="M58 44 L48 30"/><path d="M88 30 L82 14"/><path d="M120 26 L120 9"/><path d="M152 30 L158 14"/><path d="M182 44 L192 30"/>
      </g>
      <g clip-path="url(#eyeClip)">
        <rect x="20" y="0" width="200" height="160" fill="#fff"/>
        <g class="iris">
          <circle cx="120" cy="80" r="32" fill="url(#irisG)"/>
          <circle cx="120" cy="80" r="14" fill="#0B2E17"/>
          <circle cx="129" cy="70" r="6" fill="#fff" opacity=".9"/>
        </g>
        <rect class="lid" x="20" y="0" width="200" height="160" fill="#86EFAC" style="transform-origin:120px 0px"/>
      </g>
      <path d="M30 80 Q120 0 210 80 Q120 160 30 80 Z" fill="none" stroke="#14532D" stroke-width="5" stroke-linejoin="round"/>
      <circle class="ring-bg" cx="120" cy="205" r="${R}" fill="rgba(255,255,255,.6)" stroke-width="7"/>
      <circle class="ring" cx="120" cy="205" r="${R}" fill="none" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="0"/>
      <text class="count" x="120" y="210" text-anchor="middle">20</text>
      <text class="count-label" x="120" y="225" text-anchor="middle">SECONDS</text>
    `);
    const ring = stage.querySelector('.ring');
    const count = stage.querySelector('.count');
    let left = 20;
    const t = setInterval(() => {
      left -= 1;
      count.textContent = String(Math.max(0, left));
      ring.style.strokeDashoffset = String(C * (1 - left / 20));
      if (left <= 0) {
        clearInterval(t);
        count.textContent = '✓';
        ctx && ctx.onComplete && ctx.onComplete('Nice — your eyes thank you.');
      }
    }, 1000);
  };

  // ---- 🌬️ Breathe: a glowing orb grows and shrinks with a label --------------------
  Anim.breathe = (stage, ctx) => {
    stage.innerHTML = svg(`
      <defs>
        <radialGradient id="orbG" cx=".4" cy=".35"><stop offset="0" stop-color="#C4B5FD"/><stop offset="1" stop-color="#6D28D9"/></radialGradient>
      </defs>
      <circle class="halo2" cx="120" cy="120" r="118" fill="#A78BFA" opacity=".18"/>
      <circle class="halo" cx="120" cy="120" r="104" fill="#A78BFA" opacity=".28"/>
      <circle class="orb" cx="120" cy="120" r="88" fill="url(#orbG)"/>
      <g class="dot"><circle cx="120" cy="2" r="6" fill="#7C3AED"/></g>
      <text class="label" x="120" y="125" text-anchor="middle">Breathe in</text>
      <text x="120" y="252" text-anchor="middle" font-size="12" font-weight="600" fill="#5B3A86" class="cycles">Breath 1 of 3</text>
    `);
    const label = stage.querySelector('.label');
    const cycles = stage.querySelector('.cycles');
    let half = 0;
    const t = setInterval(() => {
      half += 1;
      label.textContent = half % 2 ? 'Breathe out' : 'Breathe in';
      const n = Math.floor(half / 2) + 1;
      if (half >= 6) {
        clearInterval(t);
        cycles.textContent = 'Lovely. Keep going if you like.';
        ctx && ctx.onComplete && ctx.onComplete('Three calm breaths done.');
      } else {
        cycles.textContent = 'Breath ' + n + ' of 3';
      }
    }, 4000);
  };

  // ---- 🚶 Walk: footprints step across the screen -----------------------------------
  Anim.walk = (stage) => {
    const foot = (x, y, rot, flip, d) => `
      <g class="print" style="animation-delay:${d}s">
        <g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip} 1)">
          <ellipse cx="0" cy="6" rx="10" ry="15" fill="#4D7C0F"/>
          <circle cx="-7" cy="-14" r="3.4" fill="#4D7C0F"/><circle cx="-1.5" cy="-16.5" r="3.6" fill="#4D7C0F"/>
          <circle cx="4.5" cy="-15" r="3.2" fill="#4D7C0F"/><circle cx="9" cy="-11" r="2.6" fill="#4D7C0F"/>
        </g>
      </g>`;
    let prints = '';
    for (let i = 0; i < 8; i++) {
      const y = 232 - i * 29;
      const x = 120 + Math.sin(i * 0.5) * 18 + (i % 2 ? 17 : -17);
      prints += foot(x, y, 8, i % 2 ? -1 : 1, (i * 0.42).toFixed(2));
    }
    stage.innerHTML = svg(`<rect x="72" y="4" width="96" height="250" rx="48" fill="rgba(77,124,15,.08)"/>${prints}`);
  };

  // ---- ☕ Coffee: a steaming cup -----------------------------------------------------
  Anim.coffee = (stage) => {
    const steam = (x, cls) => `<path class="steam ${cls}" d="M${x} 104 C${x - 12} 86 ${x + 12} 72 ${x} 54 S${x + 10} 24 ${x} 10"
       fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
    stage.innerHTML = svg(`
      ${steam(98, 's1')}${steam(122, 's2')}${steam(146, 's3')}
      <ellipse cx="120" cy="222" rx="86" ry="15" fill="#E7D3BC"/>
      <ellipse cx="120" cy="218" rx="86" ry="15" fill="#FFF7ED" stroke="#D6BFA6" stroke-width="2"/>
      <g class="cup">
        <path d="M186 140 c26 0 28 40 0 42" fill="none" stroke="#FFF7ED" stroke-width="12" stroke-linecap="round"/>
        <path d="M186 140 c26 0 28 40 0 42" fill="none" stroke="#D6BFA6" stroke-width="2"/>
        <path d="M58 118 L182 118 L170 196 Q168 212 150 212 L90 212 Q72 212 70 196 Z" fill="#FFF7ED" stroke="#D6BFA6" stroke-width="2"/>
        <path d="M66 150 L174 150" stroke="#92400E" stroke-width="10" opacity=".85"/>
        <ellipse cx="120" cy="120" rx="61" ry="11" fill="#6B3A1F"/>
        <g class="heart"><path d="M120 128 c-12 -6 -16 -14 -8 -16 c4 -1 7 1 8 4 c1 -3 4 -5 8 -4 c8 2 4 10 -8 16 Z" fill="#F5DEC3"/></g>
      </g>
    `);
    const heart = stage.querySelector('.heart');
    heart.style.transformOrigin = '120px 120px';
  };

  // ---- 🔔 Bell: general reminder ----------------------------------------------------
  Anim.bell = (stage) => {
    stage.innerHTML = svg(`
      <defs><linearGradient id="bellG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FCD34D"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>
      <g fill="none" stroke="#4338CA" stroke-width="6" stroke-linecap="round">
        <path class="wave l" d="M66 92 Q52 120 66 148"/><path class="wave l d2" d="M46 80 Q26 120 46 160"/>
        <path class="wave r" d="M174 92 Q188 120 174 148"/><path class="wave r d2" d="M194 80 Q214 120 194 160"/>
      </g>
      <g class="clapper"><path d="M120 60 L120 176" stroke="#B45309" stroke-width="4"/><circle cx="120" cy="184" r="14" fill="#B45309"/></g>
      <g class="bell-body">
        <circle cx="120" cy="44" r="10" fill="none" stroke="#B45309" stroke-width="6"/>
        <path d="M120 54 C86 54 78 86 78 118 L78 150 L62 172 L178 172 L162 150 L162 118 C162 86 154 54 120 54 Z" fill="url(#bellG)" stroke="#B45309" stroke-width="3" stroke-linejoin="round"/>
        <path d="M96 80 C90 92 88 106 88 122" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".6" fill="none"/>
      </g>
      <ellipse cx="120" cy="236" rx="60" ry="7" fill="rgba(67,56,202,.15)"/>
    `);
  };

  window.Anim = Anim;
})();
