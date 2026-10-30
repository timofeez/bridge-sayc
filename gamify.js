// Прокачка: опыт, уровни, серия дней, достижения, звуки, блиц.
const TITLES = ['Новичок', 'Ученик', 'Любитель', 'Игрок клуба', 'Турнирный игрок', 'Эксперт', 'Мастер', 'Гроссмейстер', 'Легенда'];
const ACH = {
  first: { e: '🌱', t: 'Первый шаг', d: 'Получить первый опыт' },
  theory: { e: '📚', t: 'Теоретик', d: 'Прочитать все темы' },
  blitz10: { e: '⚡', t: 'Разогрев', d: '10 верных ответов в блице' },
  blitz25: { e: '🌪️', t: 'Молния', d: '25 верных ответов в блице' },
  combo10: { e: '🔥', t: 'В ударе', d: 'Комбо ×10 в блице' },
  streak3: { e: '📅', t: 'Привычка', d: 'Заниматься 3 дня подряд' },
  streak7: { e: '🏅', t: 'Неделя бриджа', d: 'Заниматься 7 дней подряд' },
  made: { e: '🃏', t: 'Разыгрывающий', d: 'Выполнить контракт в розыгрыше' },
  game: { e: '🎯', t: 'Сыгранная пара', d: 'Сдача в полной игре без ошибок' },
  slam: { e: '👑', t: 'Шлем!', d: 'Выполнить шлем' },
  memory: { e: '🧠', t: 'Фотопамять', d: 'Восстановить все 13 карт' },
  builder: { e: '🧩', t: 'Архитектор', d: 'Собрать руку в конструкторе' },
  lvl5: { e: '🚀', t: 'Турнирный уровень', d: 'Достичь 5-го уровня' },
};
const xpFor = l => 50 * l * (l - 1); // порог уровня l
const levelOf = xp => { let l = 1; while (xp >= xpFor(l + 1)) l++; return l; };
const prof = () => store.get('prof', { xp: 0, ach: {}, days: [], best: 0, sound: true });
const saveProf = p => store.set('prof', p);
const today = () => new Date().toISOString().slice(0, 10);
function streakOf(days) {
  let n = 0, d = new Date();
  if (!days.includes(today())) d.setDate(d.getDate() - 1);
  while (days.includes(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ---------- Звук и вибрация ----------
let actx;
function sfx(kind) {
  if (!prof().sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], bad: [220, 160], card: [520], level: [523, 659, 784, 1047], tick: [900] }[kind] || [440];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.09;
      o.type = kind === 'bad' ? 'sawtooth' : kind === 'card' ? 'triangle' : 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.05 : 0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'card' ? 0.08 : 0.22));
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.25);
    });
  } catch {}
  if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(kind === 'bad' ? [30, 40, 30] : kind === 'card' ? 8 : 15);
}

// ---------- Тосты ----------
function toast(html, cls = '') {
  const t = document.createElement('div'); t.className = 'toast ' + cls; t.innerHTML = red('<div>' + html + '</div>');
  document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
}
function floatXP(n, el) {
  const r = (el || document.getElementById('mechip')).getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'xpfloat'; f.textContent = `+${n} XP`;
  f.style.left = r.left + r.width / 2 + 'px'; f.style.top = r.top + 'px'; document.body.appendChild(f); setTimeout(() => f.remove(), 1200);
}

// ---------- Опыт ----------
function addXP(n, el) {
  const p = prof(), before = levelOf(p.xp);
  p.xp += n; if (!p.days.includes(today())) p.days.push(today()); p.days = p.days.slice(-60);
  saveProf(p); floatXP(n, el); meChip(true);
  unlock('first');
  const s = streakOf(p.days); if (s >= 3) unlock('streak3'); if (s >= 7) unlock('streak7');
  const after = levelOf(p.xp);
  if (after > before) {
    sfx('level'); if (after >= 5) unlock('lvl5');
    setTimeout(() => {
      const m = document.createElement('div'); m.className = 'lvlup';
      m.innerHTML = `<div class="lvlcard"><div class="lvlnum">${after}</div><h2>Новый уровень!</h2><p>${TITLES[Math.min(after - 1, TITLES.length - 1)]}</p><button class="btn block">Круто!</button></div>`;
      document.body.appendChild(m); burst(m.querySelector('.lvlcard')); burst(m.querySelector('.lvlcard'));
      m.querySelector('button').onclick = () => m.remove();
    }, 500);
  }
}
function unlock(id) {
  const p = prof(); if (p.ach[id]) return;
  p.ach[id] = today(); saveProf(p);
  const a = ACH[id]; setTimeout(() => toast(`<span class="te">${a.e}</span><div><b>Достижение!</b><br>${a.t}</div>`, 'ach'), 700);
}
function reward(n, el) { burst(el); sfx('ok'); addXP(n, el); }
function oops() { sfx('bad'); }

// Чип профиля в шапке
function meChip(bump) {
  const p = prof(), l = levelOf(p.xp), s = streakOf(p.days);
  const pct = Math.round(100 * (p.xp - xpFor(l)) / (xpFor(l + 1) - xpFor(l)));
  const c = document.getElementById('mechip');
  c.innerHTML = `<span class="ring" style="--p:${pct}"><b>${look().avatar}</b></span><span class="lvn">${l}</span>${s ? `<span class="fire">🔥${s}</span>` : ''}`;
  if (bump) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
}
function profilePage() {
  const p = prof(), l = levelOf(p.xp), s = streakOf(p.days);
  const pct = Math.round(100 * (p.xp - xpFor(l)) / (xpFor(l + 1) - xpFor(l)));
  const got = Object.keys(ACH).filter(k => p.ach[k]).length;
  const week = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = d.toISOString().slice(0, 10); return `<div class="day ${p.days.includes(k) ? 'on' : ''}"><i></i><small>${'ВсПнВтСрЧтПтСб'.substr(d.getDay() * 2, 2)}</small></div>`; }).join('');
  render(`<div class="hero prof"><div class="bigring" style="--p:${pct}"><div><b>${l}</b><small>уровень</small></div></div>
    <div><h2>${TITLES[Math.min(l - 1, TITLES.length - 1)]}</h2><p>${p.xp} XP · до следующего уровня ${xpFor(l + 1) - p.xp}</p><p>🔥 Серия: ${s} ${s === 1 ? 'день' : s >= 2 && s <= 4 ? 'дня' : 'дней'} · ⚡ Рекорд блица: ${p.best}</p></div></div>
  <div class="card"><h3 style="margin-top:0">Последние 7 дней</h3><div class="week">${week}</div></div>
  <div class="card"><h3 style="margin-top:0">Достижения · ${got}/${Object.keys(ACH).length}</h3><div class="achs">${Object.entries(ACH).map(([k, a], i) => `<div class="achv ${p.ach[k] ? 'on' : ''}" style="--i:${i}"><span>${a.e}</span><b>${a.t}</b><small>${a.d}</small></div>`).join('')}</div></div>
  <button class="btn block" id="toWs">🎨 Мастерская: рубашки, сукно, аватар</button>
  <div class="card"><label class="switch"><input type="checkbox" id="snd" ${p.sound ? 'checked' : ''}><span></span> Звук и вибрация</label></div>`, 'Профиль', () => document.querySelector('nav.tabs button.on').click());
  document.querySelectorAll('nav.tabs button').forEach(x => x.classList.remove('on'));
  $('toWs').onclick = workshop;
  $('snd').onchange = e => { const q = prof(); q.sound = e.target.checked; saveProf(q); if (q.sound) sfx('ok'); };
}

// ---------- Блиц ----------
const BLITZ_POOL = ['P', '1C', '1D', '1H', '1S', '1N', '2C', '2D', '2H', '2S', '2N', '3C', '3D', '3H', '3S', '3N', '4H', '4S'];
function blitzStart() {
  const p = prof();
  render(`<div class="hero blitz-hero"><div class="big">⚡</div><h2>Блиц · 60 секунд</h2><p>Отвечайте как можно быстрее. Подряд верные ответы дают комбо и множитель очков. Ошибка — минус 3 секунды.</p></div>
  <div class="card" style="text-align:center"><div class="muted">Ваш рекорд</div><div class="bignum">${p.best}</div>
  <button class="btn block pulse" id="go">Старт!</button></div>`, 'Блиц', bidMenu);
  $('go').onclick = () => { let n = 3; const t = () => { render(`<div class="countdown">${n || 'Вперёд!'}</div>`, 'Блиц', bidMenu); sfx('tick'); if (n-- > 0) setTimeout(t, 650); else setTimeout(blitzRun, 500); }; t(); };
}
function blitzQ() {
  if (Math.random() < 0.5) {
    let h; do { h = deal()[0]; } while (evalHand(h).hcp < 9 && Math.random() < .75);
    return { h, ctx: 'Вы первый. Открытие?', rec: opening(h), last: 'P' };
  }
  let hs, o; do { hs = deal(); o = opening(hs[0]).bid; } while (o === 'P' || lvlOf(o) !== 1);
  return { h: hs[2], ctx: `Партнёр открыл ${bidRu(o)}. Ответ?`, rec: respond(hs[2], o), last: o };
}
function blitzRun() {
  const B = { score: 0, ok: 0, combo: 0, maxCombo: 0, end: Date.now() + 60000 };
  const next = () => {
    const q = blitzQ();
    const opts = new Set([q.rec.bid]);
    const pool = shuffle(BLITZ_POOL.filter(b => b === 'P' || bidVal(b) > bidVal(q.last)));
    for (const b of pool) { if (opts.size >= 6) break; if (!q.rec.alts.includes(b)) opts.add(b); }
    const mult = 1 + Math.floor(B.combo / 3);
    render(`<div class="blitz">
      <div class="bhud"><div class="timer"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5"/><circle id="tr" cx="18" cy="18" r="15.5"/></svg><b id="tl">60</b></div>
      <div class="bscore"><b id="bs">${B.score}</b><small>очков</small></div>
      <div class="bcombo ${B.combo >= 3 ? 'hot' : ''}">×${mult}<small>комбо ${B.combo}</small></div></div>
      <div class="bctx">${q.ctx}</div>${handHtml(q.h)}
      <div class="bopts">${shuffle([...opts]).map((b, i) => `<button class="bopt" style="--i:${i}" data-b="${b}">${bidRu(b)}</button>`).join('')}</div></div>`, 'Блиц', () => { clearInterval(iv); bidMenu(); }, true);
    $app.querySelectorAll('.bopt').forEach(btn => btn.onclick = () => {
      const ok = btn.dataset.b === q.rec.bid || q.rec.alts.includes(btn.dataset.b);
      if (ok) {
        B.combo++; B.ok++; B.maxCombo = Math.max(B.maxCombo, B.combo); B.score += 10 * mult;
        btn.classList.add('ok'); sfx('ok'); burst(btn); if (B.combo >= 10) unlock('combo10');
        setTimeout(next, 280);
      } else {
        B.combo = 0; B.end -= 3000; btn.classList.add('bad'); oops();
        const right = $app.querySelector(`.bopt[data-b="${q.rec.bid}"]`); if (right) right.classList.add('ok');
        $app.querySelector('.blitz').insertAdjacentHTML('beforeend', red(`<div class="bwhy">${q.rec.why}</div>`));
        $app.querySelectorAll('.bopt').forEach(x => x.disabled = true);
        setTimeout(next, 1600);
      }
    });
    tick();
  };
  const tick = () => {
    const left = Math.max(0, B.end - Date.now()), tl = $('tl'), tr = $('tr');
    if (!tl && !$app.querySelector('.blitz')) { clearInterval(iv); return; } // ушли со страницы
    if (tl) { tl.textContent = Math.ceil(left / 1000); tr.style.strokeDashoffset = 97.4 * (1 - left / 60000); tl.parentNode.classList.toggle('low', left < 10000); }
    if (left <= 0) { clearInterval(iv); blitzEnd(B); }
  };
  const iv = setInterval(tick, 200);
  next();
}
function blitzEnd(B) {
  const p = prof(), rec = B.score > p.best;
  if (rec) { p.best = B.score; saveProf(p); }
  if (B.ok >= 10) unlock('blitz10'); if (B.ok >= 25) unlock('blitz25');
  render(`<div class="hero blitz-hero" style="text-align:center"><div style="font-size:56px">${rec ? '🏆' : '⏱️'}</div><h2>${rec ? 'Новый рекорд!' : 'Время вышло'}</h2>
  <div class="bignum" style="color:#fff">${B.score}</div><p>Верных ответов: ${B.ok} · лучшее комбо: ${B.maxCombo}</p></div>
  <button class="btn block pulse" id="again">Ещё раз</button><button class="btn ghost block" id="back2">К тренажёрам</button>`, 'Блиц', bidMenu);
  if (B.ok) reward(Math.max(5, Math.round(B.score / 4)));
  if (rec) { burst(); setTimeout(burst, 300); }
  $('again').onclick = blitzStart; $('back2').onclick = bidMenu;
}
