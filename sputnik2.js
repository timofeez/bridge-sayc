// 🛰 Спутник-стандарт: движок для тренажёров (по полной версии системы) и страницы модуля.

// ---------- Открытие ----------
const suitHcp = (h, s) => h.filter(c => c.s === s).reduce((t, c) => t + Math.max(0, c.r - 10), 0);
const topHonors = (h, s) => h.filter(c => c.s === s && c.r >= 12).length; // A, K, Q
function spOpening(h) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const noM5 = L[2] < 5 && L[3] < 5;
  if (hcp >= 22) return R('2C', `${hcp} очков → 2♣ (22+, форсинг гейм).`);
  if (e.balanced && noM5 && hcp >= 20 && hcp <= 21) return R('2N', `${hcp}, равномер без 5-карт мажора → 2БК (20–21).`);
  if (e.balanced && noM5 && hcp >= 15 && hcp <= 17) return R('1N', `${hcp}, равномер без 5-карт мажора → 1БК (15–17).`);
  if (hcp >= 11 && (L[2] >= 5 || L[3] >= 5)) {
    const M = L[3] >= 5 ? 3 : 2, alts = hcp === 11 ? ['P'] : [];
    return R(mk(1, M), `${hcp} очков, ${L[M]} ${SUITS[M]}${M === 2 ? ', нет 5 пик' : ''} → 1${SUITS[M]}${hcp === 11 ? ' (с 11 — по желанию, «(11)12–21»)' : ''}.`, alts);
  }
  if (hcp >= 12) {
    const c = L[0], d = L[1];
    if (c > d) return R('1C', 'Нет 5-карт мажора, трефа длиннее бубны → 1♣.');
    if (d > c) return R('1D', d === 3 ? 'Расклад 4432 с 3 бубнами — единственный случай 3-карт 1♦.' : 'Нет 5-карт мажора, бубна длиннее трефы → 1♦.');
    if (c === 3) return R('1C', 'Миноры 3-3 → всегда 1♣.');
    return R('1D', `Миноры ${c}-${d} → всегда 1♦.`);
  }
  for (let s = 3; s >= 0; s--) {
    const sh = suitHcp(h, s), sideM = [2, 3].some(m => m !== s && L[m] >= 4);
    const shortAK = h.some(c => c.s !== s && c.r >= 13 && L[c.s] <= 2);
    if (L[s] === 7 && hcp >= 6 && hcp <= 10 && topHonors(h, s) + (h.some(c => c.s === s && c.r === 11) ? 1 : 0) >= 2 && !sideM && !shortAK)
      return R(mk(3, s), `7 карт ${SUITS[s]}, ${hcp} очков, две фигуры, нет 4 карт в мажоре и старших в коротких → блок 3${SUITS[s]}.`);
    if (s >= 1 && L[s] === 6 && hcp >= 6 && hcp <= 10 && sh * 2 >= hcp && !sideM)
      return R(mk(2, s), `6 карт ${SUITS[s]}, ${hcp} очков (в масти ${sh} — не меньше половины), нет 4 карт в другом мажоре → слабые 2${SUITS[s]}.`);
  }
  return R('P', `${hcp} очков — для открытия 1 в масти нужно 12+ (мажор — от 11), блок не подходит → пас.`);
}

// ---------- Ответ партнёру (null — ситуация не описана в системе) ----------
function spRespond(h, o) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const good6 = s => L[s] >= 6 && topHonors(h, s) >= 2 && [0, 1, 2, 3].every(x => x === s || L[x] < 4);
  if (o === '1N') {
    if (L[2] >= 5 || L[3] >= 5) { const M = L[3] >= L[2] ? 3 : 2; return R(M === 2 ? '2D' : '2H', `${L[M]} карт ${SUITS[M]} → трансфер ${M === 2 ? '2♦' : '2♥'} (0+).`); }
    if ((L[2] === 4 || L[3] === 4) && hcp >= 8) return R('2C', `${hcp} очков и 4-карт мажор → Стейман 2♣ (8+).`);
    if (hcp <= 7) return R('P', `${hcp} очков — на гейм не хватит → пас.`);
    if (hcp <= 9) return R('2N', `${hcp}, нет 4 карт в мажорах → 2БК, инвит (8–9).`);
    if (hcp <= 15) return R('3N', `${hcp}, нет 4 карт в мажорах → 3БК (10–15).`);
    return null;
  }
  if (o === '1C' || o === '1D') {
    if (hcp < 6) return R('P', `${hcp} — меньше 6 → пас.`);
    for (const s of o === '1C' ? [3, 2, 1] : [3, 2]) if (hcp >= 12 && good6(s)) return R(mk(2, s), `12+, хорошая ${L[s]}-карт ${SUITS[s]} с двумя фигурами, нет четвёрок сбоку → 2${SUITS[s]} (ФГ).`);
    if (L[2] >= 5 && L[3] >= 5) return R('1S', 'С 5-5 в мажорах — 1♠.');
    if (L[2] >= 4 || L[3] >= 4) {
      const s = L[2] === L[3] ? 2 : L[3] > L[2] ? 3 : 2;
      return R(mk(1, s), L[2] === 4 && L[3] === 4 ? 'С 4-4 в мажорах — 1♥.' : `${L[s]} ${SUITS[s]}, 6+ → 1${SUITS[s]} (Ф1). При 5-4 — длинный.`);
    }
    if (!e.balanced) return null;
    const [a, b, c] = o === '1C' ? [9, 11, 15] : [10, 12, 16];
    if (hcp <= a) return R('1N', `${hcp}, нет 4 карт в мажорах → 1БК (${o === '1C' ? '6–9' : '6–11'}).`, o === '1D' && hcp === 11 ? ['2N'] : []);
    if (hcp <= b) return R('2N', `${hcp}, нет 4 карт в мажорах → 2БК, инвит (${o === '1C' ? '10–11' : '11–12'}).`, o === '1D' && hcp === 11 ? ['1N'] : []);
    if (hcp <= c) return R('3N', `${hcp}, нет 4 карт в мажорах → 3БК (${o === '1C' ? '12–15' : '13–16'}).`);
    return null;
  }
  if (o === '1H' || o === '1S') {
    const M = o === '1H' ? 2 : 3, sup = L[M];
    if (hcp < 6) return R('P', `${hcp} — меньше 6 → пас.`);
    if (sup >= 3) {
      if (hcp <= 9) return R(mk(2, M), `Фит (${sup}), 6–9 → 2${SUITS[M]}.`);
      if (hcp <= 11) return R(mk(3, M), `Фит, 10–11 → 3${SUITS[M]}, инвит.`);
      return R(mk(4, M), `Фит и ${hcp} → 4${SUITS[M]} (12+). Можно и 2♣ — «фит» один из его вариантов.`, ['2C']);
    }
    if (M === 2 && L[3] >= 4 && !(hcp >= 12 && good6(3))) return R('1S', `${L[3]} пик, 6+ → 1♠ (Ф1).`);
    if (hcp <= 9) return R('1N', `${hcp}, нет фита${M === 2 ? ' и 4♠' : ''} → 1БК (6–9).`);
    if (hcp <= 11) return R('2N', `${hcp}, нет фита${M === 2 ? ' и 4♠' : ''} → 2БК, инвит (10–11).`);
    if (M === 2 && good6(3)) return R('2S', `12+, хорошая 6+♠ → 2♠ (ФГ).`);
    if (M === 3 && L[2] >= 5) return R('2H', `12+, ${L[2]} червей → 2♥ (ФГ).`);
    if (L[1] >= 5) return R('2D', `12+, ${L[1]} бубен → 2♦ (ФГ).`);
    if (e.balanced && hcp <= 15) return R('3N', `${hcp}, равномер, нет фита → 3БК (12–15).`, ['2C']);
    return R('2C', `12+: равномер, 5+♣ или фит → 2♣ (ФГ).`);
  }
  return null;
}

// ---------- Курс ----------
const tagHtml = t => t ? `<span class="sptag t-${{ 'НФ': 'nf', 'Ф1': 'f1', 'ФГ': 'fg', 'ИНВ': 'inv' }[t]}">${t}</span>` : '';
function spQuizFor(ch, k) {
  const pool = ch.rows.filter(r => !/^(НФ|Ф1|ФГ|ИНВ)$/.test(r[0]));
  if (pool.length < 3) return '';
  const it = shuffle(pool.slice())[0];
  const opts = shuffle([it[1], ...shuffle(pool.filter(r => r[1] !== it[1])).slice(0, 2).map(r => r[1])]);
  return `<div class="exq spq" data-a="${encodeURIComponent(it[1])}" id="spq_${ch.id}_${k}"><div class="exhead">🎯 Проверьте себя</div><b>${it[0]} — что это значит?</b>
    <div class="spopts">${opts.map(o => `<button data-v="${encodeURIComponent(o)}">${o}</button>`).join('')}</div></div>`;
}
function spCourse() {
  const read = store.get('spread', {});
  const done = SPC.filter(c => read[c.id]).length;
  render(`<div class="tprog"><i id="tpbar"></i></div>
  <div class="cnav" id="cnav">${SPC.map((c, i) => `<button data-go="${c.id}">${i + 1}. ${c.title.split(':')[0]}</button>`).join('')}</div>
  <div class="sp-hero"><div class="sp-orbit"><span>🛰</span></div><h2>Курс Спутника</h2>
    <p>${SPC.length} коротких глав по порядку. Читайте сверху вниз и отвечайте на вопросы в конце каждой главы.</p>
    <div class="progress"><i style="width:${100 * done / SPC.length}%"></i></div><small>Пройдено глав: ${done} из ${SPC.length}</small></div>
  ${SPC.map((c, i) => `<section class="sec spsec2" id="s_${c.id}" data-id="${c.id}">
    <div class="chap"><span class="cn">${String(i + 1).padStart(2, '0')}</span><span class="ce">${c.emoji}</span>${read[c.id] ? '<span class="cdone">✓ пройдено</span>' : ''}</div>
    <h2>${c.title}</h2><div class="idea">${c.idea}</div>${c.body || ''}
    <div class="sptable">${c.rows.map(([b, m, t]) => `<div class="sptr"><b>${b}</b><span>${m}</span>${tagHtml(t)}</div>`).join('')}</div>
    ${c.tip ? `<div class="tip">💡 ${c.tip}</div>` : ''}
    ${c.note ? `<div class="spconf">⚠️ <b>Другая версия документа:</b> ${c.note}</div>` : ''}
    ${c.widget ? `<div class="widget" data-w="${c.widget}"></div>` : ''}
    ${spQuizFor(c, 0)}${c.rows.length >= 8 ? spQuizFor(c, 1) : ''}
  </section>`).join('')}
  <div class="finish"><div style="font-size:54px">🛰</div><h2>Курс пройден!</h2><p>Закрепите в карточках и на раздачах.</p><button class="btn block" id="spToHome">К тренажёрам →</button></div>`, 'Курс Спутника', spHome);
  $('spToHome').onclick = spHome;
  $app.querySelectorAll('.flow>div').forEach((d, k) => d.style.setProperty('--i', k));
  $app.querySelectorAll('.cnav button').forEach(b => b.onclick = () => window.scrollTo({ top: $('s_' + b.dataset.go).offsetTop - 110, behavior: 'smooth' }));
  $app.querySelectorAll('.spq').forEach(q => q.querySelectorAll('button').forEach(b => b.onclick = () => {
    if (q.classList.contains('done')) return;
    const ok = b.dataset.v === q.dataset.a;
    b.classList.add(ok ? 'ok' : 'bad');
    if (ok) { q.classList.add('done'); reward(5, b); } else { oops(); setTimeout(() => b.classList.remove('bad'), 600); }
  }));
  $app.querySelectorAll('.widget').forEach(w => SPW[w.dataset.w](w));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    const id = e.target.dataset.id; if (!id) return;
    $app.querySelectorAll('.cnav button').forEach(b => b.classList.toggle('on', b.dataset.go === id));
    const on = $app.querySelector(`.cnav button[data-go="${id}"]`), nav = $('cnav'); if (on && nav) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
    const r = store.get('spread', {}); if (!r[id]) { r[id] = 1; store.set('spread', r); setTimeout(() => addXP(15), 300); }
  }), { threshold: 0.2 });
  $app.querySelectorAll('.sec,.finish').forEach(s => io.observe(s));
  const onScroll = () => { const bar = $('tpbar'); if (!bar) return window.removeEventListener('scroll', onScroll); const d = document.documentElement; bar.style.width = 100 * d.scrollTop / (d.scrollHeight - d.clientHeight) + '%'; };
  window.addEventListener('scroll', onScroll, { passive: true });
}
// Живые виджеты в курсе
const SPW = {
  spOpenW(w) {
    let h; do { h = deal()[0]; } while (evalHand(h).hcp < 9 && Math.random() < .7);
    const rec = spOpening(h);
    const opts = new Set([rec.bid]); for (const b of shuffle(['P', '1C', '1D', '1H', '1S', '1N', '2C', '2D', '2H', '2S', '2N'])) { if (opts.size >= 4) break; if (!rec.alts.includes(b)) opts.add(b); }
    w.innerHTML = red(`<div class="wtitle">🃏 Что откроете по Спутнику?</div>${handHtml(h)}<div class="exopts">${shuffle([...opts]).map(b => `<button data-b="${b}">${bidRu(b)}</button>`).join('')}</div><div class="wres"></div><button class="btn ghost wnew">🔄 Новая раздача</button>`);
    w.querySelectorAll('.exopts button').forEach(b => b.onclick = () => {
      const ok = b.dataset.b === rec.bid || rec.alts.includes(b.dataset.b);
      b.classList.add(ok ? 'ok' : 'bad'); const r = w.querySelector(`.exopts [data-b="${rec.bid}"]`); if (r) r.classList.add('ok');
      w.querySelectorAll('.exopts button').forEach(x => x.disabled = true);
      w.querySelector('.wres').innerHTML = red(`<div class="fb ${ok ? 'ok' : 'bad'}">${evalHand(h).hcp} очков. ${rec.why}</div>`); ok ? reward(5, b) : oops();
    });
    w.querySelector('.wnew').onclick = () => SPW.spOpenW(w);
  },
  spMajorW(w) {
    w.innerHTML = red(`<div class="wtitle">🎚 Партнёр открыл 1♥. Ваша рука?</div>
    <div class="slider"><input type="range" min="0" max="18" value="8" id="smv"><div class="sval"><b id="smn">8</b> очков</div></div>
    ${seg('s', [['0', '0–2 ♥'], ['3', '3+ ♥ (фит)']], '3')}${seg('p', [['0', 'Нет 4♠'], ['4', '4+♠']], '0')}<div class="wres"></div>`);
    const upd = () => {
      const v = +w.querySelector('#smv').value, f = +segVal(w, 's'), p = +segVal(w, 'p'); w.querySelector('#smn').textContent = v;
      let b, y;
      if (v < 6) { b = 'Пас'; y = 'Меньше 6 очков.'; }
      else if (f) { b = v <= 9 ? '2♥' : v <= 11 ? '3♥' : '4♥ (или 2♣)'; y = v <= 9 ? '6–9 с фитом, НФ.' : v <= 11 ? '10–11 с фитом — инвит.' : '12+ с фитом: гейм; 2♣ тоже обещает 12+ и фит как один из вариантов.'; }
      else if (p && v < 12) { b = '1♠'; y = '4+♠, 6+, форсинг на круг.'; }
      else if (v <= 9) { b = '1БК'; y = '6–9, нет фита и 4♠, НФ.'; }
      else if (v <= 11) { b = '2БК'; y = '10–11 без фита — инвит.'; }
      else { b = '2♣ / 2♦ / 3БК'; y = '12+ без фита: 2-над-1 (ФГ) — 2♦ с 5+♦, иначе 2♣; с равномером 12–15 можно 3БК.'; }
      bigAnswer(w.querySelector('.wres'), b, y);
    };
    w.querySelector('#smv').oninput = upd; wireSeg(w, upd); upd();
  },
  spBalW(w) {
    w.innerHTML = red(`<div class="wtitle">⚖️ Вы открыли 1♠. Что ответил партнёр?</div>
    ${seg('r', [['2', '2♠ (6–9)'], ['3', '3♠ (10–11)'], ['n', '2БК (10–11)']], '2')}
    <div class="slider"><input type="range" min="11" max="21" value="14" id="sbv"><div class="sval"><b id="sbn">14</b> у вас</div></div><div class="wres"></div>`);
    const upd = () => {
      const v = +w.querySelector('#sbv').value, r = segVal(w, 'r'); w.querySelector('#sbn').textContent = v;
      let b, y;
      if (r === '2') { b = v >= 18 ? '4♠' : v >= 15 ? '3♠' : 'Пас'; y = v >= 18 ? '18+ — гейм.' : v >= 15 ? '15–17: инвит, партнёру с 8–9 хватит.' : '12–14: на гейм не хватает.'; }
      else if (r === '3') { b = v >= 14 ? '4♠' : 'Пас'; y = v >= 14 ? '14+ и 10–11 партнёра — гейм.' : '12–13 — пас.'; }
      else { b = v >= 14 ? '3БК / 4♠' : '3 в масти'; y = v >= 14 ? '14+: 3БК, а с 6+ пик — 4♠.' : '12–13: 3 в своей масти с 6+ или в миноре с 4+ (не хочу БК).'; }
      bigAnswer(w.querySelector('.wres'), b, y);
    };
    w.querySelector('#sbv').oninput = upd; wireSeg(w, upd); upd();
  },
  spNtW(w) {
    w.innerHTML = red(`<div class="wtitle">🎚 Партнёр открыл 1БК</div>
    <div class="slider"><input type="range" min="0" max="15" value="9" id="snv"><div class="sval"><b id="snn">9</b> очков</div></div>
    ${seg('m', [['0', 'Нет мажора'], ['4', '4 карты мажора'], ['5', '5+ карт мажора']], '0')}<div class="wres"></div>`);
    const upd = () => {
      const v = +w.querySelector('#snv').value, m = +segVal(w, 'm'); w.querySelector('#snn').textContent = v;
      let b, y;
      if (m === 5) { b = '2♦ / 2♥'; y = 'Трансфер (0+): масть на одну ниже своей.'; }
      else if (m === 4 && v >= 8) { b = '2♣'; y = 'Стейман: ищем фит 4-4.'; }
      else if (v <= 7) { b = 'Пас'; y = 'На гейм не хватит.'; }
      else if (v <= 9) { b = '2БК'; y = '8–9 — инвит.'; }
      else { b = '3БК'; y = '10–15 — гейм.'; }
      bigAnswer(w.querySelector('.wres'), b, y);
    };
    w.querySelector('#snv').oninput = upd; wireSeg(w, upd); upd();
  },
};

// ---------- Главная модуля ----------
const spCardsBy = cat => SP_CARDS.filter(c => !cat || c[0] === cat);
const spBox = () => store.get('leitner', {});
function spLearned() { const b = spBox(); return SP_CARDS.filter(c => (b['sp:' + c[0] + ':' + c[1]] || 0) >= 2).length; }
function spHome() {
  const n = spLearned(), tot = SP_CARDS.length, rd = Object.keys(store.get('spread', {})).length;
  const so = store.get('st_sp_open', { ok: 0, n: 0 }), sr = store.get('st_sp_resp', { ok: 0, n: 0 });
  render(`<div class="sp-hero"><div class="sp-orbit"><span>🛰</span></div>
    <h2>Спутник-стандарт</h2><p>Натуральная система 5533, 2-над-1 ФГ. Три шага: прочитать курс → запомнить карточками → применить на раздачах.</p>
    <div class="progress"><i style="width:${100 * n / tot}%"></i></div><small>Глав пройдено: ${rd}/${SPC.length} · карточек выучено: ${n}/${tot}</small></div>
  <a href="#" class="spcta podcta" id="sp_pod"><span class="sp-ico">🎧</span><div><b>Подкаст «Спутник с нуля»</b><small>10 выпусков · ~40 минут · с самых основ</small></div><i>›</i></a>
  <a href="#" class="spcta" id="sp_course"><span class="sp-ico">📖</span><div><b>Курс по порядку</b><small>${SPC.length} простых глав с задачками</small></div><i>›</i></a>
  <div class="ggrid">
    <a href="#" class="gcard c3" id="sp_key" style="--i:0"><span class="gem">⚡</span><b>Главное за 5 минут</b><small>12 опорных фактов</small></a>
    <a href="#" class="gcard c4" id="sp_diff" style="--i:1"><span class="gem">🔀</span><b>Отличия от SAYC</b><small>Что переучить</small></a>
  </div>
  <h3 class="gsec">2 · Запомнить</h3>
  <div class="ggrid">
    <a href="#" class="gcard c10" id="sp_flash" style="--i:0"><span class="gem">🗂</span><b>Карточки</b><small>Интервальное повторение</small></a>
    <a href="#" class="gcard c8" id="sp_quiz" style="--i:1"><span class="gem">❓</span><b>Быстрый тест</b><small>3 варианта, на скорость</small></a>
    <a href="#" class="gcard c6" id="sp_sheet" style="--i:2"><span class="gem">📋</span><b>Шпаргалка</b><small>Все таблицы одним списком</small></a>
  </div>
  <h3 class="gsec">3 · Применить на раздачах</h3>
  <div class="ggrid">
    <a href="#" class="gcard c1" id="sp_open" style="--i:0"><span class="gem">🚀</span><b>Открытие</b><small>${so.ok}/${so.n}</small></a>
    <a href="#" class="gcard c2" id="sp_resp" style="--i:1"><span class="gem">💬</span><b>Ответ партнёру</b><small>${sr.ok}/${sr.n}</small></a>
  </div>
  <div class="spconf" style="margin-top:14px">⚠️ Курс — по полной версии системы (30.06.2020). В краткой версии (Ver1) несколько диапазонов и правила виста другие — они отмечены в главах.</div>
  <p class="muted">Источник: «Система торговли Спутник-стандарт», клуб-школа бриджа «Спутник» (bridgeonline.ru).</p>`, 'Спутник-стандарт', gamesHub);
  on('sp_course', spCourse); on('sp_pod', podcastPage); on('sp_key', spKey); on('sp_diff', spDiff); on('sp_sheet', spSheet);
  on('sp_flash', () => spCatPick('flash')); on('sp_quiz', () => spCatPick('quiz')); on('sp_open', spDrillOpen); on('sp_resp', spDrillResp);
}
function spKey() {
  render(`<div class="card"><h2 style="margin-top:0">⚡ Главное за 5 минут</h2>${SP_KEY.map(([e, t], i) => `<div class="spkey" style="--i:${i}"><span>${e}</span><p>${t}</p></div>`).join('')}</div>
  <button class="btn block" id="nx">Дальше: курс по порядку →</button>`, 'Главное', spHome);
  $('nx').onclick = spCourse;
}
function spDiff() {
  render(`<div class="card"><h2 style="margin-top:0">🔀 Отличия от SAYC</h2><p class="muted">Слева — как в SAYC, справа — как в Спутнике. Нажмите строку, чтобы отметить «запомнил».</p>
  <div class="spdiff"><div class="sdh"><span>Ситуация</span><span>SAYC</span><span>Спутник</span></div>
  ${SP_DIFF.map(([s, a, b], i) => `<div class="sdr ${store.get('spdiff', {})[i] ? 'done' : ''}" data-i="${i}" style="--i:${i}"><span>${s}</span><span class="old">${a}</span><span class="new">${b}</span></div>`).join('')}</div></div>
  <button class="btn block" id="nx">Закрепить в тесте →</button>`, 'Отличия от SAYC', spHome);
  $app.querySelectorAll('.sdr').forEach(r => r.onclick = () => { const d = store.get('spdiff', {}); d[r.dataset.i] = !d[r.dataset.i]; store.set('spdiff', d); r.classList.toggle('done'); sfx('card'); });
  $('nx').onclick = () => spQuiz(null);
}
function spSheet() {
  render(`<div class="cnav" id="spnav">${SPC.map((c, i) => `<button data-i="${i}">${i + 1}. ${c.title.split(':')[0]}</button>`).join('')}</div>
  ${SPC.map((c, i) => `<div class="card" id="sps${i}"><h3 style="margin-top:0">${c.emoji} ${c.title}</h3><div class="sptable">${c.rows.map(([b, m, t]) => `<div class="sptr"><b>${b}</b><span>${m}</span>${tagHtml(t)}</div>`).join('')}</div></div>`).join('')}`, 'Шпаргалка', spHome);
  $app.querySelectorAll('#spnav button').forEach(b => b.onclick = () => window.scrollTo({ top: $('sps' + b.dataset.i).offsetTop - 110, behavior: 'smooth' }));
}
function spCatPick(mode) {
  const b = spBox();
  render(`<div class="card"><h2 style="margin-top:0">${mode === 'flash' ? '🗂 Карточки' : '❓ Быстрый тест'}</h2><p class="muted">Выберите главу или учите всё вперемешку.</p>
  <div class="tiles">${tile('spc_all', '🔀', 'Все главы', SP_CARDS.length + ' карточек', 0)}
  ${SPC.map((c, i) => { const cs = spCardsBy(c.id), l = cs.filter(x => (b['sp:' + x[0] + ':' + x[1]] || 0) >= 2).length; return cs.length ? tile('spc_' + c.id, c.emoji, `${i + 1}. ${c.title}`, `${l}/${cs.length} выучено`, i + 1) : ''; }).join('')}</div></div>`, mode === 'flash' ? 'Карточки' : 'Тест', spHome);
  const go = cat => mode === 'flash' ? spFlash(cat) : spQuiz(cat);
  on('spc_all', () => go(null));
  SPC.forEach(c => { if ($('spc_' + c.id)) on('spc_' + c.id, () => go(c.id)); });
}
function spFlash(cat) {
  const items = spCardsBy(cat), box = spBox(), key = it => 'sp:' + it[0] + ':' + it[1];
  const w = it => Math.pow(2, 3 - (box[key(it)] || 0));
  let x = Math.random() * items.reduce((t, it) => t + w(it), 0), it = items[0];
  for (const c of items) { x -= w(c); if (x <= 0) { it = c; break; } }
  const lvl = box[key(it)] || 0;
  render(`<p style="text-align:center"><span class="pill">${SP_CAT[it[0]]}</span><span class="pill">${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}</span></p>
  <div class="flip" id="fl"><div class="in"><div class="f"><h2>${it[1]}</h2></div><div class="b"><h2 class="spback">${it[2]}</h2></div></div></div>
  <p class="muted" style="text-align:center" id="hint">Вспомните значение и нажмите на карточку</p>
  <div id="rate" style="display:none;text-align:center"><button class="btn ghost" id="no">Не помнил</button><button class="btn" id="yes">Помнил</button></div>`, 'Карточки', () => spCatPick('flash'));
  $('fl').onclick = () => { $('fl').classList.toggle('on'); $('rate').style.display = 'block'; $('hint').style.display = 'none'; };
  const go = up => { if (up) { sfx('ok'); addXP(3); } box[key(it)] = up ? Math.min(3, lvl + 1) : 0; store.set('leitner', box); spFlash(cat); };
  $('no').onclick = () => go(false); $('yes').onclick = () => go(true);
}
function spQuiz(cat, st = { n: 0, ok: 0, streak: 0 }) {
  const items = spCardsBy(cat), box = spBox();
  const it = items[Math.floor(Math.random() * items.length)];
  const same = SP_CARDS.filter(c => c[0] === it[0] && c[2] !== it[2]);
  const pool = same.length >= 2 ? same : SP_CARDS.filter(c => c[2] !== it[2]);
  const opts = shuffle([it[2], ...shuffle(pool).slice(0, 2).map(c => c[2])]);
  render(`<div class="card"><span class="pill">${SP_CAT[it[0]]}</span><span class="pill">✓ ${st.ok}/${st.n}</span>${st.streak >= 3 ? `<span class="pill">🔥 ${st.streak}</span>` : ''}
  <h2 style="margin:12px 0">${it[1]}</h2><div class="opts">${opts.map((o, i) => `<button class="opt" style="--i:${i}" data-o="${i}">${o}</button>`).join('')}</div></div>`, 'Быстрый тест', () => spCatPick('quiz'));
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const ok = opts[+b.dataset.o] === it[2];
    $app.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (opts[+x.dataset.o] === it[2]) x.classList.add('ok'); });
    const k = 'sp:' + it[0] + ':' + it[1], l = box[k] || 0; box[k] = ok ? Math.min(3, l + 1) : 0; store.set('leitner', box);
    if (ok) reward(4, b); else { b.classList.add('bad'); oops(); }
    setTimeout(() => spQuiz(cat, { n: st.n + 1, ok: st.ok + (ok ? 1 : 0), streak: ok ? st.streak + 1 : 0 }), ok ? 650 : 1600);
  });
}
// ---------- Тренажёры раздач ----------
function spVerdict(ok, b, rec, saycBid) {
  const diff = saycBid && saycBid !== rec.bid && !rec.alts.includes(saycBid);
  return `<div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✅ Верно!' : '❌ Не так.'} Ваша заявка: <b>${bidRu(b)}</b>. По Спутнику: <b>${bidRu(rec.bid)}</b>${rec.alts.length ? ' (можно ' + rec.alts.map(bidRu).join(', ') + ')' : ''}.<br>${rec.why}</div>
  ${diff ? `<div class="fb spnote">🔀 В SAYC здесь было бы <b>${bidRu(saycBid)}</b> — одно из отличий систем.</div>` : ''}`;
}
function spDrillOpen() {
  let h; do { h = deal()[0]; } while (evalHand(h).hcp < 8 && Math.random() < .7);
  const rec = spOpening(h), sayc = opening(h).bid;
  render(`<div class="card"><h3 style="margin-top:0">🛰 Вы первый. Что откроете по Спутнику?</h3>${handHtml(h, 'Ваша рука')}<div id="bb"></div><div id="fb"></div></div>`, 'Спутник: открытие', spHome);
  $('bb').appendChild(bidBox('P', b => {
    const ok = okBid(rec, b), s = stats('st_sp_open', ok);
    $('bb').innerHTML = ''; ok ? reward(15) : oops();
    $('fb').innerHTML = red(`<div>${spVerdict(ok, b, rec, sayc)}<p class="muted">Очков: ${evalHand(h).hcp}. Счёт: ${s.ok}/${s.n}</p><button class="btn block" id="nx">Следующая рука</button></div>`);
    $('nx').onclick = spDrillOpen;
  }));
}
function spDrillResp() {
  let o, h, rec;
  do { o = shuffle(['1N', '1C', '1D', '1H', '1S', '1H', '1S'])[0]; h = deal()[0]; rec = spRespond(h, o); } while (!rec || (rec.bid === 'P' && Math.random() < .7));
  const sayc = respond(h, o).bid;
  render(`<div class="card"><div class="auction"><b>Север</b><b>Восток</b><b>Юг</b><b>Запад</b><span class="bt bl">${bidRu(o)}</span><span class="bt bp">Пас</span><span>?</span><span></span></div>
  <h3>🛰 Партнёр открыл ${bidRu(o)}. Ваш ответ по Спутнику?</h3>${handHtml(h, 'Ваша рука')}<div id="bb"></div><div id="fb"></div></div>`, 'Спутник: ответ', spHome);
  $('bb').appendChild(bidBox(o, b => {
    const ok = okBid(rec, b), s = stats('st_sp_resp', ok);
    $('bb').innerHTML = ''; ok ? reward(15) : oops();
    $('fb').innerHTML = red(`<div>${spVerdict(ok, b, rec, sayc)}<p class="muted">Очков: ${evalHand(h).hcp}. Счёт: ${s.ok}/${s.n}</p><button class="btn block" id="nx">Следующая</button></div>`);
    $('nx').onclick = spDrillResp;
  }));
}
