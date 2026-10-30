// Визуальные эффекты: заставка, частицы на фоне, волна от нажатия, конфетти, бегущие числа.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Заставка ----------
(function splash() {
  if (reduceMotion || sessionStorage.getItem('splashed')) return;
  try { sessionStorage.setItem('splashed', '1'); } catch {}
  const s = document.createElement('div'); s.className = 'splash';
  s.innerHTML = `<div class="sp-suits"><span>♠</span><span class="r">♥</span><span class="r">♦</span><span>♣</span></div><div class="sp-title">Бридж SAYC</div>`;
  document.body.appendChild(s);
  setTimeout(() => s.classList.add('out'), 1300);
  setTimeout(() => s.remove(), 1900);
})();

// ---------- Плывущие масти на фоне ----------
function bgParticles() {
  document.querySelectorAll('.bgfx').forEach(x => x.remove());
  if (reduceMotion || look().fx === false) return;
  const box = document.createElement('div'); box.className = 'bgfx';
  for (let i = 0; i < 16; i++) {
    const sp = document.createElement('span'); sp.textContent = SUITS[i % 4];
    if (i % 4 === 1 || i % 4 === 2) sp.className = 'r';
    sp.style.left = Math.random() * 100 + '%';
    sp.style.fontSize = 18 + Math.random() * 40 + 'px';
    sp.style.animationDuration = 18 + Math.random() * 22 + 's';
    sp.style.animationDelay = -Math.random() * 40 + 's';
    box.appendChild(sp);
  }
  document.body.prepend(box);
}
bgParticles();

// ---------- Волна от нажатия ----------
const RIPPLE = '.btn,.opt,.tile,.gcard,.blitzcard,.wscta,.blitzcta,.bopt,.exopts button,.bidbox button,.seg button,.dcard,.backopt,.feltopt,nav.tabs button';
document.addEventListener('pointerdown', e => {
  const t = e.target.closest(RIPPLE);
  if (!t || t.disabled || reduceMotion) return;
  const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
  const w = document.createElement('span'); w.className = 'ripple';
  Object.assign(w.style, { width: d + 'px', height: d + 'px', left: e.clientX - r.left - d / 2 + 'px', top: e.clientY - r.top - d / 2 + 'px' });
  t.appendChild(w); setTimeout(() => w.remove(), 650);
}, { passive: true });

// ---------- Конфетти с физикой ----------
function confetti(n = 140) {
  if (reduceMotion) return;
  const c = document.createElement('canvas'); c.className = 'confetti';
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  document.body.appendChild(c);
  const g = c.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  const cols = ['#c9a24a', '#ffd76a', '#2fa36b', '#d64045', '#4facfe', '#c471f5', '#ffffff'];
  const ps = [...Array(n)].map(() => ({
    x: innerWidth / 2 + (Math.random() - .5) * 80, y: innerHeight * .45,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, col: cols[Math.floor(Math.random() * cols.length)],
    suit: Math.random() < .18 ? SUITS[Math.floor(Math.random() * 4)] : null,
  }));
  const t0 = performance.now();
  const frame = now => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    ps.forEach(p => {
      p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col;
      if (p.suit) { g.font = '800 20px Manrope,sans-serif'; g.fillText(p.suit, -7, 7); } else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      g.restore();
    });
    if (now - t0 < 3200) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

// ---------- Числа, которые «набегают» ----------
function countUp(el) {
  const to = +el.dataset.count, from = 0, t0 = performance.now(), dur = 900;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
    el.textContent = (el.dataset.plus && v > 0 ? '+' : '') + v;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
new MutationObserver(() => document.querySelectorAll('[data-count]:not([data-counted])').forEach(el => { el.dataset.counted = 1; countUp(el); }))
  .observe(document.getElementById('app'), { childList: true, subtree: true });
