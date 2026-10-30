const $app = document.getElementById('app');
const $title = document.getElementById('title');
const $back = document.getElementById('back');
const SEATS = ['Север', 'Восток', 'Юг', 'Запад'];

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
// Красим ♥ и ♦ в красный (только в тексте, не в атрибутах)
const red = html => html.replace(/>([^<]*)</g, (m, t) => '>' + t.replace(/[♥♦]/g, '<span class="r">$&</span>') + '<');
function render(html, title, backTo, quiet) {
  $app.innerHTML = red(`<div class="${quiet ? '' : 'page'}">` + html + '</div>');
  $title.textContent = title;
  $back.hidden = !backTo;
  $back.onclick = backTo || null;
  if (!quiet) window.scrollTo(0, 0);
}
const $ = id => document.getElementById(id);
const srcHtml = keys => `<div class="src">Источники: ${keys.map(k => `<a href="${SOURCES[k].url}" target="_blank" rel="noopener">${SOURCES[k].name}</a>`).join('; ')}</div>`;
const cardStr = c => SUITS[c.s] + rankName(c.r);

// Нарисованная рука веером
function fanHtml(h) {
  let prev = null;
  return `<div class="fan">${h.map((c, i) => {
    const gap = prev !== null && prev !== c.s ? ' gap' : ''; prev = c.s;
    return `<div class="pc${c.s === 1 || c.s === 2 ? ' rs' : ''}${gap}" style="--i:${i}"><b>${rankName(c.r)}</b><i>${SUITS[c.s]}</i><em>${SUITS[c.s]}</em></div>`;
  }).join('')}</div>`;
}
const handHtml = (h, label) => `<div class="table-felt">${label ? `<div class="hand-label">${label}</div>` : ''}${fanHtml(h)}</div>`;
const miniHand = h => `<div class="mini">${[3, 2, 1, 0].map(s => `${SUITS[s]} ${h.filter(c => c.s === s).map(c => rankName(c.r)).join(' ') || '—'}`).join('<br>')}</div>`;
// 'AK532 K4 Q72 J3' → карты
function parseHand(str) {
  const out = []; str.split(' ').forEach((p, i) => {
    const s = 3 - i; if (p === '-') return;
    for (let k = 0; k < p.length; k++) {
      let ch = p[k]; if (ch === '1' && p[k + 1] === '0') { ch = 'T'; k++; }
      out.push({ s, r: { A: 14, K: 13, Q: 12, J: 11, T: 10 }[ch] || +ch });
    }
  });
  return out;
}
// Праздничный «взрыв» мастей
function burst(el) {
  const r = (el || $app).getBoundingClientRect(); const x = r.left + r.width / 2, y = Math.min(r.top + 30, innerHeight - 80);
  for (let i = 0; i < 14; i++) {
    const sp = document.createElement('span'); sp.className = 'burst'; sp.textContent = SUITS[i % 4];
    if (i % 4 === 1 || i % 4 === 2) sp.style.color = '#d23a3f'; else sp.style.color = '#0f6b43';
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
    sp.style.left = x + 'px'; sp.style.top = y + 'px';
    sp.style.setProperty('--dx', Math.cos(a) * d + 'px'); sp.style.setProperty('--dy', Math.sin(a) * d - 40 + 'px'); sp.style.setProperty('--rot', (Math.random() * 360) + 'deg');
    document.body.appendChild(sp); setTimeout(() => sp.remove(), 1000);
  }
}
const tile = (id, em, title, sub, i, extra = '') => `<a href="#" class="tile" id="${id}" style="--i:${i}"><div class="em">${em}</div><div><b>${title}</b><small>${sub}</small></div>${extra}</a>`;
const on = (id, f) => $(id).onclick = e => { e.preventDefault(); f(); };

// ---------------- Торговля ----------------
function bidBox(last, onBid, dbl = {}) {
  let html = '<div class="bidbox">';
  for (let l = 1; l <= 7; l++) for (let s = 0; s < 5; s++) { const b = mk(l, s); html += `<button data-b="${b}" ${bidVal(b) <= bidVal(last) ? 'disabled' : ''}>${l}${STR_RU[s]}</button>`; }
  html += `<button class="wide" style="grid-column:span 3" data-b="P">Пас</button><button class="dbl" data-b="X" ${dbl.x ? '' : 'disabled'}>Контра</button><button class="dbl" data-b="XX" ${dbl.xx ? '' : 'disabled'}>Рекон.</button></div>`;
  const div = document.createElement('div'); div.innerHTML = red('<div>' + html + '</div>');
  div.querySelectorAll('button').forEach(b => b.onclick = () => onBid(b.dataset.b));
  return div;
}
const okBid = (rec, b) => rec && (rec.bid === b || rec.alts.includes(b));
const stats = (k, ok) => { const s = store.get(k, { ok: 0, n: 0 }); s.n++; if (ok) s.ok++; store.set(k, s); return s; };
const verdict = (ok, b, rec) => `<div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✅ Верно!' : '❌ Не совсем.'} Ваша заявка: <b>${bidRu(b)}</b>. По SAYC: <b>${bidRu(rec.bid)}</b>${rec.alts.length ? ' (тоже можно: ' + rec.alts.map(bidRu).join(', ') + ')' : ''}.<br>${rec.why}</div>`;

function bidMenu() {
  const a = store.get('st_open', { ok: 0, n: 0 }), b = store.get('st_resp', { ok: 0, n: 0 }), g = store.get('st_game', { ok: 0, n: 0 }), f = store.get('st_full', { ok: 0, n: 0 });
  render(`<div class="hero"><h2>Тренажёр торговли</h2><p>Каждая сдача тасуется случайно — одинаковых не будет.</p><div class="big">🤖</div></div>
  <a href="#" class="blitzcta" id="m0"><span>⚡</span><div><b>Блиц · 60 секунд</b><small>Аркада на скорость: комбо, множитель, рекорд</small></div><i>›</i></a>
  <div class="tiles">${tile('m1', '🚀', 'Открытие', `Что открыть с этой рукой? · ${a.ok}/${a.n}`, 0)}
  ${tile('m2', '💬', 'Ответ партнёру', `Партнёр открылся — ваш ответ · ${b.ok}/${b.n}`, 1)}
  ${tile('m3', '🤝', 'Торговля с роботом', `Противники всегда пасуют — чистая торговля пары · ${g.ok}/${g.n}`, 2)}
  ${tile('m4', '⚔️', 'Полная игра', `Противники-роботы торгуются: открывают, входят, контрят. Потом — розыгрыш · ${f.ok}/${f.n}`, 3)}
  ${tile('m5', '🃏', 'Сыграть сдачу', 'Роботы торгуются, вы разыгрываете контракт картами', 4)}
  ${tile('m6', '🧩', 'Конструктор руки', 'Соберите из колоды руку под заданное открытие', 5)}</div>
  <p class="muted">Робот оценивает ваши первые заявки по SAYC (открытие, ответ, повторная заявка, вход в торговлю, ответ на вход партнёра). В более глубоких ситуациях заявки не оцениваются.</p>`, 'Торговля');
  on('m0', blitzStart); on('m1', drillOpen); on('m2', drillResp); on('m3', () => gameStart('quiet')); on('m4', () => gameStart('full')); on('m5', playRandom); on('m6', buildHand);
}
function drillOpen() {
  let h; do { h = deal()[0]; } while (evalHand(h).hcp < 8 && Math.random() < .7);
  const rec = opening(h);
  render(`<div class="card"><h3 style="margin-top:0">Вы сдающий. Что откроете?</h3>${handHtml(h, 'Ваша рука')}<div id="bb"></div><div id="fb"></div></div>`, 'Открытие', bidMenu);
  $('bb').appendChild(bidBox('P', b => {
    const ok = okBid(rec, b), s = stats('st_open', ok);
    $('bb').innerHTML = ''; if (ok) reward(15); else oops();
    $('fb').innerHTML = red(`<div>${verdict(ok, b, rec)}<p class="muted">Очков в руке: ${evalHand(h).hcp}. Счёт: ${s.ok}/${s.n}</p><button class="btn block" id="nx">Следующая рука</button></div>`);
    $('nx').onclick = drillOpen;
  }));
}
function drillResp() {
  let hs, o;
  do { hs = deal(); o = opening(hs[0]).bid; } while (o === 'P' || o === '3N' || lvlOf(o) >= 3);
  const h = hs[2], rec = respond(h, o);
  render(`<div class="card"><div class="auction"><b>Север</b><b>Восток</b><b>Юг</b><b>Запад</b><span>${bidRu(o)}</span><span>Пас</span><span class="me">?</span><span></span></div>
  <h3>Партнёр открыл ${bidRu(o)}. Ваш ответ?</h3>${handHtml(h, 'Ваша рука')}<div id="bb"></div><div id="fb"></div></div>`, 'Ответ партнёру', bidMenu);
  $('bb').appendChild(bidBox(o, b => {
    const ok = okBid(rec, b), s = stats('st_resp', ok);
    $('bb').innerHTML = ''; if (ok) reward(15); else oops();
    $('fb').innerHTML = red(`<div>${verdict(ok, b, rec)}<details><summary>Рука партнёра</summary>${handHtml(hs[0])}</details><p class="muted">Счёт: ${s.ok}/${s.n}</p><button class="btn block" id="nx">Следующая</button></div>`);
    $('nx').onclick = drillResp;
  }));
}

// ---------------- Игра с роботами ----------------
let G;
function gameStart(mode = G ? G.mode : 'quiet') { G = { mode, hands: deal(), dealer: Math.floor(Math.random() * 4), auction: [], log: [], expl: [] }; gameStep(); }
const lastBid = () => lastLevel(G.auction);
// Рекомендация движка для места seat в текущем режиме
function recFor(seat) {
  if (G.mode === 'full') return suggestFull(G.hands[seat], G.auction, seat);
  const r = suggest(G.hands[seat], pairFor(seat));
  return r && legalCall(r.bid, G.auction, seat) ? r : null;
}
function pairFor(seat) { return G.auction.filter(a => a.bid !== 'P' && a.seat % 2 === seat % 2).map(a => ({ who: a.seat === seat ? 'me' : 'pt', bid: a.bid })); }
const ended = () => { const a = G.auction; if (a.length >= 4 && a.every(x => x.bid === 'P')) return true; return a.length >= 4 && a.slice(-3).every(x => x.bid === 'P') && a.some(x => x.bid !== 'P'); };
const seatToAct = () => (G.dealer + G.auction.length) % 4;
function gameStep() {
  while (!ended() && seatToAct() !== 2) {
    const s = seatToAct(); let b = 'P';
    let why = 'Противники в этом режиме пасуют.';
    if (s === 0 || G.mode === 'full') { const r = recFor(s); if (r) { b = r.bid; why = r.why; } else why = 'Ситуация вне упрощённого движка → пас.'; }
    G.auction.push({ seat: s, bid: b }); G.expl.push(`<b>${SEATS[s]} — ${bidRu(b)}:</b> ${why}`);
  }
  if (ended()) return gameEnd();
  gameRender();
}
function auctionHtml() {
  const cells = ['<b>Север</b>', '<b>Восток</b>', '<b>Юг</b>', '<b>Запад</b>'];
  for (let i = 0; i < G.dealer; i++) cells.push('<span></span>');
  G.auction.forEach(a => cells.push(`<span class="${a.seat === 2 ? 'me' : a.seat % 2 ? 'opp' : ''}">${a.bid === 'X' || a.bid === 'XX' ? a.bid : bidRu(a.bid)}</span>`));
  return `<div class="auction">${cells.join('')}</div>`;
}
function gameRender(fb = '') {
  const ex = G.expl.filter(x => !x.startsWith('<b>Юг')).slice(-4);
  render(`<div class="card"><p class="muted" style="margin:0">${G.mode === 'full' ? '⚔️ Полная игра' : '🤝 Противники пасуют'} · сдающий: ${SEATS[G.dealer]}. Вы — Юг, партнёр — Север.</p>${auctionHtml()}
  ${ex.length ? `<details class="expl"><summary>Что означают заявки роботов</summary>${ex.map(x => `<p>${x}</p>`).join('')}</details>` : ''}
  ${handHtml(G.hands[2], 'Ваша рука')}<div id="fb">${fb}</div><div id="bb"></div></div>`, G.mode === 'full' ? 'Полная игра' : 'Торговля с роботом', bidMenu);
  if (!fb) $('bb').appendChild(bidBox(lastBid(), userBid, { x: canDouble(G.auction, 2), xx: canRedouble(G.auction, 2) }));
}
function userBid(b) {
  sfx('card');
  const rec = recFor(2);
  const commit = bid => { G.auction.push({ seat: 2, bid }); G.expl.push(`<b>Юг — ${bidRu(bid)}</b>`); G.log.push({ graded: !!rec, ok: !rec || okBid(rec, bid) }); gameStep(); };
  if (!rec) return commit(b);
  const ok = okBid(rec, b); stats(G.mode === 'full' ? 'st_full' : 'st_game', ok);
  if (ok) return commit(b);
  gameRender(`${verdict(false, b, rec)}<button class="btn" id="take">Заявить ${bidRu(rec.bid)}</button><button class="btn ghost" id="keep">Оставить ${bidRu(b)}</button>`);
  $('take').onclick = () => commit(rec.bid);
  $('keep').onclick = () => commit(b);
}
function gameEnd() {
  const li = G.auction.map(a => isLevel(a.bid)).lastIndexOf(true), lb = li >= 0 ? G.auction[li] : null;
  let dbl = ''; if (lb) { const after = G.auction.slice(li + 1).map(a => a.bid); dbl = after.includes('XX') ? ' XX (реконтра)' : after.includes('X') ? ' X (контра)' : ''; }
  // разыгрывающий — первый из пары, назвавший эту деноминацию
  const decl = lb ? G.auction.find(a => isLevel(a.bid) && a.seat % 2 === lb.seat % 2 && strainOf(a.bid) === strainOf(lb.bid)).seat : 0;
  const graded = G.log.filter(x => x.graded).length;
  const n = evalHand(G.hands[0]), s = evalHand(G.hands[2]), tot = n.hcp + s.hcp;
  let fit = -1; for (let x = 3; x >= 0; x--) if (n.len[x] + s.len[x] >= 8 && (fit < 0 || n.len[x] + s.len[x] > n.len[fit] + s.len[fit])) fit = x;
  const majFit = [3, 2].find(x => n.len[x] + s.len[x] >= 8);
  const target = tot >= 33 ? 'шлем' : tot >= 25 ? (majFit !== undefined ? '4' + SUITS[majFit] : '3БК (или минорный гейм)') : 'частичная запись';
  const mistakes = G.log.filter(x => !x.ok).length;
  render(`<div class="hero"><h2>${lb ? 'Контракт: ' + bidRu(lb.bid) + dbl : 'Все пас'}</h2><p>${lb ? 'Играет ' + SEATS[decl] + '. ' : ''}${mistakes ? 'Ошибок по SAYC: ' + mistakes : 'Без ошибок! 🎉'} Оценено заявок: ${graded}.</p><div class="big">🏁</div></div>
  <div class="card">${auctionHtml()}<p>У вашей пары <b>${tot} очков</b>${fit >= 0 ? `, лучший фит — ${n.len[fit] + s.len[fit]} карт в ${SUITS[fit]}` : ', фита из 8 карт нет'}. Ориентир: <b>${target}</b>.</p>
  ${handHtml(G.hands[0], `Север · ${n.hcp}`)}${handHtml(G.hands[2], `Юг (вы) · ${s.hcp}`)}
  <details class="expl"><summary>Пояснения ко всем заявкам</summary>${G.expl.map(x => `<p>${x}</p>`).join('')}</details>
  <details><summary>Руки противников</summary>${handHtml(G.hands[3], `Запад · ${evalHand(G.hands[3]).hcp}`)}${handHtml(G.hands[1], `Восток · ${evalHand(G.hands[1]).hcp}`)}</details></div>
  ${lb ? '<button class="btn block" id="pl">▶ Разыграть эту сдачу</button>' : ''}<button class="btn ghost block" id="nx">Новая сдача</button>`, 'Торговля с роботом', bidMenu);
  if (lb) $('pl').onclick = () => { const mode = G.mode; startPlay(G.hands, lb.bid, decl, dbl.trim().split(' ')[0], G.auction, bidMenu); P.onAgain = () => gameStart(mode); };
  if (!mistakes && graded) { reward(30); if (G.mode === 'full') unlock('game'); }
  $('nx').onclick = () => gameStart(G.mode);
}

// ---------------- Память ----------------
function memMenu() {
  render(`<div class="hero"><h2>Тренировка памяти</h2><p>Каждый раз — новые случайные карты.</p><div class="big">🧠</div></div>
  <div class="tiles">${tile('a1', '👀', 'Запомни руку', '13 карт на несколько секунд — потом восстановите их', 0)}
  ${tile('a2', '🧮', 'Счёт вышедших карт', 'Карты выходят по одной, как в розыгрыше. Сколько вышло в каждой масти?', 1)}
  ${tile('a3', '⚡', 'Быстрый подсчёт очков', 'Сколько очков в руке? На время', 2)}</div>`, 'Память');
  on('a1', memHandSetup); on('a2', countSetup); on('a3', hcpDrill);
}
function memHandSetup() {
  const sec = store.get('memSec', 10);
  render(`<div class="card"><h2>👀 Запомни руку</h2><p>Время показа: <b id="sv">${sec}</b> с</p><input type="range" id="sr" min="3" max="30" value="${sec}"><button class="btn block" id="go">Начать</button></div>`, 'Запомни руку', memMenu);
  const sr = $('sr'); sr.oninput = () => $('sv').textContent = sr.value;
  $('go').onclick = () => { store.set('memSec', +sr.value); memHand(+sr.value); };
}
function memHand(sec) {
  const h = deal()[0]; let left = sec;
  render(`<div class="card"><h3 style="margin-top:0">Запоминайте! <span class="pill" id="t">${left}</span></h3>${handHtml(h)}<div class="qbar"><i id="tb" style="width:100%;transition:width 1s linear"></i></div></div>`, 'Запомни руку', memMenu);
  const iv = setInterval(() => { left--; if (!$('t')) return clearInterval(iv); $('t').textContent = left; $('tb').style.width = 100 * left / sec + '%'; if (left <= 0) { clearInterval(iv); pick(); } }, 1000);
  function pick() {
    const sel = new Set();
    let g = '<div class="grid52">';
    for (let s = 3; s >= 0; s--) for (let r = 14; r >= 2; r--) g += `<button data-c="${s}-${r}">${SUITS[s]}${rankName(r)}</button>`;
    render(`<div class="card"><p>Отметьте 13 карт, которые были в руке. Выбрано: <b id="cnt">0</b></p>${g}</div></div><button class="btn block" id="chk">Проверить</button>`, 'Запомни руку', memMenu);
    $app.querySelectorAll('.grid52 button').forEach(b => b.onclick = () => { const k = b.dataset.c; sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle('sel'); $('cnt').textContent = sel.size; });
    $('chk').onclick = () => {
      const want = new Set(h.map(c => c.s + '-' + c.r)); let hit = 0;
      $app.querySelectorAll('.grid52 button').forEach(b => { const k = b.dataset.c; b.disabled = true; b.classList.remove('sel'); if (want.has(k) && sel.has(k)) { b.classList.add('ok'); hit++; } else if (want.has(k)) b.classList.add('miss'); else if (sel.has(k)) b.classList.add('bad'); });
      const chk = $('chk'); if (hit === 13) { reward(25); unlock('memory'); } else if (hit >= 9) addXP(8);
      chk.insertAdjacentHTML('beforebegin', `<div class="fb ${hit >= 11 ? 'ok' : ''}">Угадано <b>${hit} из 13</b>, лишних: ${[...sel].filter(k => !want.has(k)).length}. <span class="muted">Зелёные — верно, обведённые — пропущены, красные — лишние.</span></div>`);
      chk.textContent = 'Ещё раз'; chk.onclick = () => memHand(sec);
    };
  }
}
function countSetup() {
  const o = store.get('cntOpt', { n: 16, ms: 1500 });
  render(`<div class="card"><h2>🧮 Счёт вышедших карт</h2>
  <p>Сколько карт: <select id="n">${[8, 12, 16, 20, 28, 40].map(x => `<option ${x === o.n ? 'selected' : ''}>${x}</option>`).join('')}</select></p>
  <p>Скорость: <select id="ms">${[[2500, 'медленно'], [1500, 'средне'], [800, 'быстро']].map(([v, t]) => `<option value="${v}" ${v === o.ms ? 'selected' : ''}>${t}</option>`).join('')}</select></p>
  <button class="btn block" id="go">Начать</button></div>`, 'Счёт карт', memMenu);
  $('go').onclick = () => { const v = { n: +$('n').value, ms: +$('ms').value }; store.set('cntOpt', v); countRun(v); };
}
function countRun({ n, ms }) {
  const cards = shuffle(newDeck()).slice(0, n); let i = 0;
  render(`<div class="card" style="text-align:center"><p class="muted">Карта <b id="k">1</b> из ${n}</p><div class="table-felt" style="padding:20px"><div id="big"></div></div></div>`, 'Счёт карт', memMenu);
  const show = () => { const c = cards[i]; $('k').textContent = i + 1; $('big').innerHTML = `<div class="bigcard${c.s === 1 || c.s === 2 ? ' rs' : ''}">${cardStr(c)}</div>`; };
  show();
  const iv = setInterval(() => { i++; if (!$('big')) return clearInterval(iv); if (i >= n) { clearInterval(iv); ask(); } else show(); }, ms);
  function ask() {
    const cnt = [0, 0, 0, 0]; cards.forEach(c => cnt[c.s]++);
    const qs = Math.floor(Math.random() * 4);
    const out = [14, 13, 12, 11].filter(r => !cards.some(c => c.s === qs && c.r === r));
    render(`<div class="card"><h3 style="margin-top:0">Сколько карт вышло в каждой масти?</h3>
    ${[3, 2, 1, 0].map(s => `<p style="font-size:20px">${SUITS[s]} <input type="number" min="0" max="13" id="s${s}" style="width:80px"></p>`).join('')}
    <h3>Какие старшие ${SUITS[qs]} ещё НЕ вышли?</h3>
    <div class="chips">${[14, 13, 12, 11].map(r => `<label><span><input type="checkbox" value="${r}"> ${rankName(r)}</span></label>`).join('')}</div>
    <button class="btn block" id="chk" style="margin-top:14px">Проверить</button><div id="fb"></div></div>`, 'Счёт карт', memMenu);
    $('chk').onclick = () => {
      let good = 0;
      const lines = [3, 2, 1, 0].map(s => { const v = +$('s' + s).value; if (v === cnt[s]) good++; return `${SUITS[s]}: ${v === cnt[s] ? '✅' : '❌'} ${cnt[s]}`; });
      const got = [...$app.querySelectorAll('input[type=checkbox]:checked')].map(x => +x.value).sort().join();
      const okH = got === out.slice().sort().join();
      if (good === 4 && okH) reward(20); else oops();
      $('fb').innerHTML = red(`<div><div class="fb ${good === 4 && okH ? 'ok' : ''}">${lines.join('<br>')}<br>Не вышли из ${SUITS[qs]}: ${out.map(rankName).join(' ') || 'все вышли'} ${okH ? '✅' : '❌'}<br><span class="muted">Все карты: ${cards.map(cardStr).join(' ')}</span></div><button class="btn block" id="re">Ещё раз</button></div>`);
      $('re').onclick = () => countRun({ n, ms });
    };
  }
}
function hcpDrill() {
  const h = deal()[0], e = evalHand(h), t0 = Date.now();
  render(`<div class="card"><h3 style="margin-top:0">Сколько очков (HCP)?</h3>${handHtml(h)}
  <p><input type="number" id="v" style="width:90px" placeholder="?"> <button class="btn" id="chk">Проверить</button></p><div id="fb"></div></div>`, 'Подсчёт очков', memMenu);
  const v = $('v'); v.focus();
  const check = () => {
    const ok = +v.value === e.hcp, t = ((Date.now() - t0) / 1000).toFixed(1); if (ok) reward(8); else oops();
    $('fb').innerHTML = red(`<div><div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✅' : '❌'} ${e.hcp} очков, расклад ${e.len.slice().reverse().join('-')} (♠-♥-♦-♣)${e.balanced ? ', ровная' : ''}. Время: ${t} с.</div><button class="btn block" id="nx">Дальше</button></div>`);
    $('nx').onclick = hcpDrill;
  };
  $('chk').onclick = check;
  v.onkeydown = ev => { if (ev.key === 'Enter') check(); };
}

// ---------------- Флеш-карты ----------------
function factsMenu() {
  render(`<div class="hero"><h2>Флеш-карточки</h2><p>Вспомните ответ, переверните карточку и честно оцените себя. Что не помните — будет попадаться чаще.</p><div class="big">🃏</div></div>
  <div class="tiles">${FACTS.map((g, i) => tile('g' + i, ['🎲', '📝', '🔑'][i] || '🃏', g.group, g.items.length + ' карточек', i)).join('')}
  ${tile('gall', '🔀', 'Все вперемешку', 'Все карточки сразу', FACTS.length)}</div>
  <details class="card"><summary>Все факты списком</summary>${FACTS.map(g => `<h3>${g.group}</h3><table>${g.items.map(([q, a]) => `<tr><td>${q}</td><td><b>${a}</b></td></tr>`).join('')}</table>${srcHtml([g.src])}`).join('')}</details>`, 'Карточки', () => gamesHub());
  FACTS.forEach((g, i) => on('g' + i, () => flash(g.items)));
  on('gall', () => flash(FACTS.flatMap(g => g.items)));
}
function flash(items) {
  const box = store.get('leitner', {});
  const w = it => Math.pow(2, 3 - (box[it[0]] || 0));
  const total = items.reduce((t, it) => t + w(it), 0);
  let x = Math.random() * total, it = items[0];
  for (const c of items) { x -= w(c); if (x <= 0) { it = c; break; } }
  const lvl = box[it[0]] || 0;
  render(`<p style="text-align:center"><span class="pill">${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}</span></p>
  <div class="flip" id="fl"><div class="in"><div class="f"><h2>${it[0]}</h2></div><div class="b"><h2>${it[1]}</h2></div></div></div>
  <p class="muted" style="text-align:center" id="hint">Нажмите на карточку, чтобы перевернуть</p><div id="rate" style="display:none;text-align:center"><button class="btn ghost" id="no">Не помнил</button><button class="btn" id="yes">Помнил</button></div>`, 'Карточки', factsMenu);
  $('fl').onclick = () => { $('fl').classList.toggle('on'); $('rate').style.display = 'block'; $('hint').style.display = 'none'; };
  const go = up => { if (up) { sfx('ok'); addXP(3); } box[it[0]] = up ? Math.min(3, lvl + 1) : 0; store.set('leitner', box); flash(items); };
  $('no').onclick = () => go(false);
  $('yes').onclick = () => go(true);
}

