// 🛰 Спутник-стандарт: движок для тренажёров и страницы модуля.

// ---------- Открытие по Спутнику ----------
const suitHcp = (h, s) => h.filter(c => c.s === s).reduce((t, c) => t + Math.max(0, c.r - 10), 0);
function spOpening(h) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const noM5 = L[2] < 5 && L[3] < 5;
  if (hcp >= 22) return R('2C', `${hcp} очков → 2♣ (22+, форсинг гейм).`);
  if (e.balanced && noM5 && hcp >= 20 && hcp <= 21) return R('2N', `${hcp}, равномер без 5-карт мажора → 2БК (20–21).`);
  if (e.balanced && noM5 && hcp >= 15 && hcp <= 17) return R('1N', `${hcp}, равномер без 5-карт мажора → 1БК (15–17).`);
  if (hcp >= 12) {
    if (L[3] >= 5) return R('1S', `${hcp} очков, ${L[3]} пик → 1♠.`);
    if (L[2] >= 5) return R('1H', `${hcp} очков, ${L[2]} червей и нет 5 пик → 1♥.`);
    const c = L[0], d = L[1];
    if (c > d) return R('1C', `Нет 5-карт мажора, трефы длиннее бубен → 1♣.`);
    if (d > c) return R('1D', d === 3 ? 'Расклад 4♠4♥3♦2♣ — единственный случай 3-карт 1♦.' : `Нет 5-карт мажора, бубны длиннее треф → 1♦.`);
    if (c === 3) return R('1C', 'Миноры 3-3 → 1♣.');
    const pc = suitHcp(h, 0), pd = suitHcp(h, 1);
    if (pc > pd) return R('1C', `Миноры ${c}-${d}, в трефе больше очков (${pc} против ${pd}) → 1♣.`);
    if (pd > pc) return R('1D', `Миноры ${c}-${d}, в бубне больше очков (${pd} против ${pc}) → 1♦.`);
    return R('1D', `Миноры ${c}-${d} и очков поровну — система не уточняет; подойдёт любой минор.`, ['1C']);
  }
  // Блоки: почти все очки в масти
  for (let s = 3; s >= 0; s--) {
    const sh = suitHcp(h, s), most = sh >= hcp * 0.7;
    if (L[s] >= 8 && hcp >= 5 && hcp <= 9 && most) return R(mk(4, s), `8 карт ${SUITS[s]}, ${hcp} очков, почти все в масти → блок 4${SUITS[s]}.`);
    if (L[s] === 7 && hcp >= 5 && hcp <= 9 && most) return R(mk(3, s), `7 карт ${SUITS[s]}, ${hcp} очков, почти все в масти → блок 3${SUITS[s]}.`);
    if (s >= 1 && L[s] === 6 && hcp >= 5 && hcp <= 10 && sh * 2 >= hcp) return R(mk(2, s), `6 карт ${SUITS[s]}, ${hcp} очков, в масти ${sh} — не меньше половины → слабые 2${SUITS[s]}.`);
  }
  return R('P', `${hcp} очков — для открытия 1 в масти нужно 12+, для блока не подходит → пас.`);
}

// ---------- Ответ партнёру по Спутнику (null — ситуация не описана в системе) ----------
function spRespond(h, o) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  if (o === '1N') {
    if (L[2] >= 5 || L[3] >= 5) { const M = L[3] >= L[2] ? 3 : 2; return R(M === 2 ? '2D' : '2H', `${L[M]} карт ${SUITS[M]} → трансфер ${M === 2 ? '2♦' : '2♥'} (0+ очков).`); }
    if ((L[2] === 4 || L[3] === 4) && hcp >= 8) return R('2C', `${hcp} очков и 4-карт мажор → Стейман 2♣ (8+).`);
    if (hcp <= 7) return R('P', `${hcp} очков: вместе меньше 24 → пас.`);
    if (hcp <= 9) return R('2N', `${hcp} очков, нет мажоров → 2БК, инвит (8–9).`);
    if (hcp <= 15) return R('3N', `${hcp} очков, нет 4-карт мажоров → 3БК (10–15).`);
    return null;
  }
  if (o === '1C' || o === '1D') {
    if (hcp < 6) return R('P', `${hcp} очков — меньше 6 → пас.`);
    if (L[2] >= 5 && L[3] >= 5) return R('1S', 'С 5♥ и 5♠ отвечаем 1♠.');
    if (L[2] >= 4 && L[3] < 5) return R('1H', L[3] === 4 ? 'С 4♥ и 4♠ отвечаем 1♥.' : `${L[2]} червей, 6+ очков → 1♥ (Ф1).`);
    if (L[3] >= 4) return R('1S', `${L[3]} пик, 6+ очков → 1♠ (Ф1).`);
    if (e.balanced) {
      if (hcp <= 9) return R('1N', `${hcp}, равномер, нет 4-карт мажора → 1БК (6–9).`);
      if (hcp <= 11) return R('2N', `${hcp}, равномер, нет 4-карт мажора → 2БК, инвит (10–11).`);
      if (hcp <= 15) return R('3N', `${hcp}, равномер, нет 4-карт мажора → 3БК (12–15).`);
    }
    return null;
  }
  if (o === '1H' || o === '1S') {
    const M = o === '1H' ? 2 : 3, sup = L[M];
    if (hcp < 6) return R('P', `${hcp} очков — меньше 6 → пас.`);
    if (sup >= 3) {
      if (hcp <= 9) return R(mk(2, M), `Фит (${sup} карты), 6–9 → 2${SUITS[M]}.`);
      if (hcp <= 11) return R(mk(3, M), `Фит, 10–11 → инвит 3${SUITS[M]}.`);
      const alts = []; if (L[1] >= 5) alts.push('2D'); if (L[1] < 5 && (M === 3 ? L[2] < 5 : true)) alts.push('2C'); if (M === 3 && L[2] >= 5) alts.push('2H');
      return R(mk(4, M), `Фит и ${hcp} очков → гейм 4${SUITS[M]} (12+). Можно начать и с 2-на-1.`, alts);
    }
    if (M === 2 && L[3] >= 4 && hcp <= 11) return R('1S', `${L[3]} пик, ${hcp} очков → 1♠ (Ф1).`);
    if (hcp <= 9) return R('1N', `${hcp}, нет фита${M === 2 ? ' и 4♠' : ''} → 1БК (6–9, НФ).`);
    if (hcp <= 11) return M === 2 && L[3] >= 4 ? null : R('2N', `${hcp}, нет фита${M === 2 ? ', нет 4♠' : ''} → 2БК, инвит (10–11).`);
    // 12+: 2-на-1
    if (M === 3 && L[2] >= 5) return R('2H', `12+, ${L[2]} червей → 2♥ (ФГ).`);
    if (M === 2 && L[3] >= 6) return R('2S', `12+, ${L[3]} пик → 2♠ (ФГ).`);
    if (M === 2 && L[3] >= 4) return R('1S', `12+, но пик ${L[3]} (для 2♠ нужно 6) → 1♠, Ф1.`);
    if (e.balanced && hcp <= 15 && L[2] < 4 && L[3] < 4) return R('3N', `${hcp}, равномер, нет фита и 4-карт мажора → 3БК (12–15).`, ['2C']);
    if (L[1] >= 5) return R('2D', `12+, ${L[1]} бубен → 2♦ (ФГ).`);
    return R('2C', `12+, нет 5 карт в ♦/♥ → 2♣ (ФГ).`);
  }
  return null;
}

// ---------- Страницы ----------
const spCardsBy = cat => SP_CARDS.filter(c => !cat || c[0] === cat);
const spBox = () => store.get('leitner', {});
function spLearned() { const b = spBox(); return SP_CARDS.filter(c => (b['sp:' + c[1]] || 0) >= 2).length; }

function spHome() {
  const n = spLearned(), tot = SP_CARDS.length;
  const so = store.get('st_sp_open', { ok: 0, n: 0 }), sr = store.get('st_sp_resp', { ok: 0, n: 0 });
  render(`<div class="sp-hero"><div class="sp-orbit"><span>🛰</span></div>
    <h2>Спутник-стандарт</h2><p>Натуральная система 5533, 2-на-1 ФГ. Учим быстро: сначала отличия от SAYC, потом карточки и раздачи.</p>
    <div class="progress"><i style="width:${100 * n / tot}%"></i></div><small>Выучено карточек: ${n} из ${tot}</small></div>
  <h3 class="gsec">1 · Понять (10 минут)</h3>
  <div class="ggrid">
    <a href="#" class="gcard c3" id="sp_key" style="--i:0"><span class="gem">⚡</span><b>Главное за 5 минут</b><small>12 опорных фактов</small></a>
    <a href="#" class="gcard c4" id="sp_diff" style="--i:1"><span class="gem">🔀</span><b>Отличия от SAYC</b><small>Что переучить</small></a>
    <a href="#" class="gcard c6" id="sp_sheet" style="--i:2"><span class="gem">📋</span><b>Шпаргалка</b><small>Вся система по разделам</small></a>
  </div>
  <h3 class="gsec">2 · Запомнить</h3>
  <div class="ggrid">
    <a href="#" class="gcard c10" id="sp_flash" style="--i:0"><span class="gem">🗂</span><b>Карточки</b><small>Интервальное повторение</small></a>
    <a href="#" class="gcard c8" id="sp_quiz" style="--i:1"><span class="gem">❓</span><b>Быстрый тест</b><small>4 варианта, на скорость</small></a>
  </div>
  <h3 class="gsec">3 · Применить на раздачах</h3>
  <div class="ggrid">
    <a href="#" class="gcard c1" id="sp_open" style="--i:0"><span class="gem">🚀</span><b>Открытие</b><small>По Спутнику · ${so.ok}/${so.n}</small></a>
    <a href="#" class="gcard c2" id="sp_resp" style="--i:1"><span class="gem">💬</span><b>Ответ партнёру</b><small>1БК, миноры, мажоры · ${sr.ok}/${sr.n}</small></a>
  </div>
  <p class="muted" style="margin-top:14px">Источник: «Система торговли Спутник-стандарт», клуб-школа бриджа «Спутник» (bridgeonline.ru).</p>`, 'Спутник-стандарт', gamesHub);
  on('sp_key', spKey); on('sp_diff', spDiff); on('sp_sheet', spSheet); on('sp_flash', () => spCatPick('flash')); on('sp_quiz', () => spCatPick('quiz'));
  on('sp_open', spDrillOpen); on('sp_resp', spDrillResp);
}
function spKey() {
  render(`<div class="card"><h2 style="margin-top:0">⚡ Главное за 5 минут</h2>${SP_KEY.map(([e, t], i) => `<div class="spkey" style="--i:${i}"><span>${e}</span><p>${t}</p></div>`).join('')}</div>
  <button class="btn block" id="nx">Дальше: отличия от SAYC →</button>`, 'Главное', spHome);
  $('nx').onclick = spDiff;
}
function spDiff() {
  render(`<div class="card"><h2 style="margin-top:0">🔀 Отличия от SAYC</h2><p class="muted">Слева — как вы учили в SAYC, справа — как в Спутнике. Нажмите на строку, чтобы отметить «запомнил».</p>
  <div class="spdiff"><div class="sdh"><span>Ситуация</span><span>SAYC</span><span>Спутник</span></div>
  ${SP_DIFF.map(([s, a, b], i) => `<div class="sdr ${store.get('spdiff', {})[i] ? 'done' : ''}" data-i="${i}" style="--i:${i}"><span>${s}</span><span class="old">${a}</span><span class="new">${b}</span></div>`).join('')}</div></div>
  <button class="btn block" id="nx">Закрепить в тесте →</button>`, 'Отличия от SAYC', spHome);
  $app.querySelectorAll('.sdr').forEach(r => r.onclick = () => { const d = store.get('spdiff', {}); d[r.dataset.i] = !d[r.dataset.i]; store.set('spdiff', d); r.classList.toggle('done'); sfx('card'); });
  $('nx').onclick = () => spQuiz(null);
}
function spSheet() {
  render(`<div class="cnav" id="spnav">${SP_SHEET.map((s, i) => `<button data-i="${i}">${s.t.split('. ')[0]}. ${s.t.split('. ')[1].split(' ')[0]}</button>`).join('')}</div>
  ${SP_SHEET.map((s, i) => `<div class="card spsec" id="sps${i}"><h3 style="margin-top:0">${s.t}</h3>${s.rows.map(([k, v]) => `<div class="sprow"><b>${k}</b><span>${v}</span></div>`).join('')}</div>`).join('')}`, 'Шпаргалка', spHome);
  $app.querySelectorAll('#spnav button').forEach(b => b.onclick = () => window.scrollTo({ top: $('sps' + b.dataset.i).offsetTop - 110, behavior: 'smooth' }));
}
function spCatPick(mode) {
  const b = spBox();
  render(`<div class="card"><h2 style="margin-top:0">${mode === 'flash' ? '🗂 Карточки' : '❓ Быстрый тест'}</h2><p class="muted">Выберите тему или учите всё вперемешку.</p>
  <div class="tiles">${tile('spc_all', '🔀', 'Все темы', SP_CARDS.length + ' карточек', 0)}
  ${Object.entries(SP_CAT).map(([k, t], i) => { const cs = spCardsBy(k), l = cs.filter(c => (b['sp:' + c[1]] || 0) >= 2).length; return tile('spc_' + k, t.split(' ')[0], t.split(' ').slice(1).join(' '), `${l}/${cs.length} выучено`, i + 1); }).join('')}</div></div>`, mode === 'flash' ? 'Карточки' : 'Тест', spHome);
  const go = cat => mode === 'flash' ? spFlash(cat) : spQuiz(cat);
  on('spc_all', () => go(null));
  Object.keys(SP_CAT).forEach(k => on('spc_' + k, () => go(k)));
}
// Карточки — тот же переворот и Лейтнер, что во «Флеш-карточках», с отдельными ключами
function spFlash(cat) {
  const items = spCardsBy(cat), box = spBox();
  const key = it => 'sp:' + it[1];
  const w = it => Math.pow(2, 3 - (box[key(it)] || 0));
  let x = Math.random() * items.reduce((t, it) => t + w(it), 0), it = items[0];
  for (const c of items) { x -= w(c); if (x <= 0) { it = c; break; } }
  const lvl = box[key(it)] || 0;
  render(`<p style="text-align:center"><span class="pill">${SP_CAT[it[0]]}</span><span class="pill">${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}</span></p>
  <div class="flip" id="fl"><div class="in"><div class="f"><h2>${it[1]}</h2></div><div class="b"><h2>${it[2]}</h2></div></div></div>
  <p class="muted" style="text-align:center" id="hint">Вспомните ответ и нажмите на карточку</p>
  <div id="rate" style="display:none;text-align:center"><button class="btn ghost" id="no">Не помнил</button><button class="btn" id="yes">Помнил</button></div>`, 'Карточки', () => spCatPick('flash'));
  $('fl').onclick = () => { $('fl').classList.toggle('on'); $('rate').style.display = 'block'; $('hint').style.display = 'none'; };
  const go = up => { if (up) { sfx('ok'); addXP(3); } box[key(it)] = up ? Math.min(3, lvl + 1) : 0; store.set('leitner', box); spFlash(cat); };
  $('no').onclick = () => go(false); $('yes').onclick = () => go(true);
}
// Быстрый тест: 4 варианта из той же темы
function spQuiz(cat, st = { n: 0, ok: 0, streak: 0 }) {
  const items = spCardsBy(cat), box = spBox();
  const it = items[Math.floor(Math.random() * items.length)];
  const same = SP_CARDS.filter(c => c[0] === it[0] && c[2] !== it[2]);
  const opts = shuffle([it[2], ...shuffle(same).slice(0, 3).map(c => c[2])]);
  render(`<div class="card"><span class="pill">${SP_CAT[it[0]]}</span><span class="pill">✓ ${st.ok}/${st.n}</span>${st.streak >= 3 ? `<span class="pill">🔥 ${st.streak}</span>` : ''}
  <h2 style="margin:12px 0">${it[1]}</h2><div class="opts">${opts.map((o, i) => `<button class="opt" style="--i:${i}" data-o="${i}">${o}</button>`).join('')}</div><div id="fb"></div></div>`, 'Быстрый тест', () => spCatPick('quiz'));
  $app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const ok = opts[+b.dataset.o] === it[2];
    $app.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (opts[+x.dataset.o] === it[2]) x.classList.add('ok'); });
    const k = 'sp:' + it[1], l = box[k] || 0; box[k] = ok ? Math.min(3, l + 1) : 0; store.set('leitner', box);
    if (ok) reward(4, b); else { b.classList.add('bad'); oops(); }
    const nst = { n: st.n + 1, ok: st.ok + (ok ? 1 : 0), streak: ok ? st.streak + 1 : 0 };
    setTimeout(() => spQuiz(cat, nst), ok ? 650 : 1500);
  });
}
// Раздачи
function spVerdict(ok, b, rec, saycBid) {
  const diff = saycBid && saycBid !== rec.bid && !rec.alts.includes(saycBid);
  return `<div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✅ Верно!' : '❌ Не так.'} Ваша заявка: <b>${bidRu(b)}</b>. По Спутнику: <b>${bidRu(rec.bid)}</b>${rec.alts.length ? ' (можно ' + rec.alts.map(bidRu).join(', ') + ')' : ''}.<br>${rec.why}</div>
  ${diff ? `<div class="fb spnote">🔀 В SAYC здесь было бы <b>${bidRu(saycBid)}</b> — это одно из отличий систем.</div>` : ''}`;
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
