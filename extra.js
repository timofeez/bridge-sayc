// Сдача дня, задачи на первый ход, обмен сдачами (ссылка, PBN, BBO) и статистика.

// ---------- Детерминированная раздача по зерну ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dealSeeded(seed) {
  const r = rng(seed), d = newDeck();
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return [0, 1, 2, 3].map(i => sortHand(d.slice(i * 13, i * 13 + 13)));
}
const strHash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// Роботы торгуются за всех четверых
function robotAuction(hands, dealer) {
  const auc = [];
  while (true) {
    const s = (dealer + auc.length) % 4, r = suggestFull(hands[s], auc, s);
    auc.push({ seat: s, bid: r ? r.bid : 'P' });
    if (auc.length >= 4 && auc.slice(-3).every(x => x.bid === 'P')) break;
    if (auc.length > 40) break;
  }
  const li = auc.map(a => isLevel(a.bid)).lastIndexOf(true);
  if (li < 0) return { auc };
  const lb = auc[li];
  const decl = auc.find(a => isLevel(a.bid) && a.seat % 2 === lb.seat % 2 && strainOf(a.bid) === strainOf(lb.bid)).seat;
  const after = auc.slice(li + 1).map(a => a.bid);
  return { auc, bid: lb.bid, decl, dbl: after.includes('XX') ? 'XX' : after.includes('X') ? 'X' : '' };
}

// ---------- Сдача дня ----------
function dailySetup() {
  const day = today(), base = strHash('bridge-' + day);
  const board = Math.floor(Date.parse(day) / 864e5) % 16 + 1;
  for (let v = 0; v < 200; v++) {
    const hands = dealSeeded(base + v), a = robotAuction(hands, dealerOf(board));
    if (a.bid && a.decl % 2 === 0 && lvlOf(a.bid) >= 2) return { day, board, hands, ...a };
  }
  return null;
}
function dailyPlay() {
  const d = dailySetup(); if (!d) return gamesHub();
  startPlay(d.hands, d.bid, d.decl, d.dbl, d.auc, gamesHub, d.board);
  P.onAgain = gamesHub;
  P.onEnd = (got, score) => {
    const all = store.get('daily', {}); const prev = all[d.day];
    if (!prev || score > prev.score) all[d.day] = { got, score, bid: d.bid };
    store.set('daily', all);
    if (got >= 6 + lvlOf(d.bid)) unlock('daily');
    const days = Object.keys(all).sort(); let st = 0; const dd = new Date();
    while (all[dd.toISOString().slice(0, 10)]) { st++; dd.setDate(dd.getDate() - 1); }
    if (st >= 3) unlock('daily3');
  };
  playRender(`<div class="fb">📅 Сдача дня ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}: одна и та же для всех. Торговля роботов: ${d.auc.map(a => SEAT_SHORT[a.seat] + ' ' + callRu(a.bid)).join(' · ')}</div>`);
}
const dailyStatus = () => store.get('daily', {})[today()];

// ---------- Задачи на первый ход ----------
const keyOf = c => c.s * 100 + c.r;
// Рекомендация первого хода по учебным правилам (SAYC: старшая из секвенции, 4-я сверху)
function leadAdvice(hand, strain, partnerSuit, oppSuits) {
  const T = strain < 4 ? strain : -1;
  const bySuit = s => hand.filter(c => c.s === s).sort((a, b) => b.r - a.r);
  const seqTop = cs => { // старшая из секвенции из 2+ (с онёром) или «ломаной» KQ10/QJ9
    if (cs.length >= 2 && cs[0].r >= 11 && cs[0].r - cs[1].r === 1) return cs[0];
    if (cs.length >= 3 && cs[0].r >= 12 && cs[0].r - cs[1].r === 1 && cs[1].r - cs[2].r === 2) return cs[0];
    return null;
  };
  const cardFrom = cs => {
    const top = seqTop(cs); if (top) return { card: top, how: 'старшая из секвенции' };
    if (cs.length === 1) return { card: cs[0], how: 'синглет' };
    if (cs.length === 2) return { card: cs[0], how: 'старшая из дублета' };
    if (cs.length === 3 && cs[0].r < 11) return { card: cs[0], how: 'старшая из трёх мелких' };
    if (cs.length >= 4) return { card: cs[3], how: 'четвёртая сверху' };
    return { card: cs[cs.length - 1], how: 'младшая из трёх с онёром' };
  };
  let suit, why;
  if (partnerSuit !== undefined && bySuit(partnerSuit).length) { suit = partnerSuit; why = 'Партнёр называл эту масть — ходим в неё.'; }
  else if (T < 0) {
    const cand = [0, 1, 2, 3].filter(s => !oppSuits.includes(s) && bySuit(s).length);
    const pool = cand.length ? cand : [0, 1, 2, 3].filter(s => bySuit(s).length);
    suit = pool.reduce((a, b) => { const la = bySuit(a).length, lb = bySuit(b).length; return lb > la || (lb === la && honorsIn(hand, b) > honorsIn(hand, a)) ? b : a; });
    why = 'Против БК — из самой длинной (неназванной) масти, чтобы развить её.';
  } else {
    const side = [0, 1, 2, 3].filter(s => s !== T && bySuit(s).length);
    const withSeq = side.find(s => seqTop(bySuit(s)) && !oppSuits.includes(s));
    const single = side.find(s => bySuit(s).length === 1 && bySuit(s)[0].r < 14 && bySuit(T).length >= 1 && bySuit(T).length <= 3);
    const noAce = side.filter(s => !oppSuits.includes(s) && !(bySuit(s)[0].r === 14 && !(bySuit(s)[1] && bySuit(s)[1].r === 13)));
    if (withSeq !== undefined) { suit = withSeq; why = 'Против масти — из секвенции старших карт: безопасно и строит взятки.'; }
    else if (single !== undefined) { suit = single; why = 'Синглет в боковой масти: надеемся подрезать, пока есть козыри.'; }
    else if (noAce.length) { suit = noAce.reduce((a, b) => (bySuit(b).length > bySuit(a).length ? b : a)); why = 'Неназванная масть; не ходим из-под туза против мастевого контракта.'; }
    else { suit = bySuit(T).length ? T : side[0]; why = 'Остальные ходы опасны — пассивный ход.'; }
  }
  const { card, how } = cardFrom(bySuit(suit));
  return { suit, card, why: `${why} Карта — ${how}.` };
}
function leadProblem() {
  let set = null;
  for (let k = 0; k < 120 && !set; k++) {
    const hands = deal(), board = Math.floor(Math.random() * 16) + 1, a = robotAuction(hands, dealerOf(board));
    if (!a.bid || a.decl % 2 === 0) continue;
    if (a.decl !== 1) continue; // ходит Юг — значит, разыгрывает Восток
    set = { hands, board, ...a };
  }
  if (!set) return gamesHub();
  const strain = strainOf(set.bid);
  const ptSuit = set.auc.find(x => x.seat === 0 && isLevel(x.bid) && strainOf(x.bid) < 4);
  const opp = [...new Set(set.auc.filter(x => x.seat % 2 === 1 && isLevel(x.bid) && strainOf(x.bid) < 4).map(x => strainOf(x.bid)))];
  const adv = leadAdvice(set.hands[2], strain, ptSuit ? strainOf(ptSuit.bid) : undefined, opp);
  const dealer = dealerOf(set.board);
  render(`<div class="card">${boardInfo(set.board)}<h3>Торговля</h3>${auctionGrid(set.auc, dealer, vulOf(set.board))}
  <h3>Контракт ${bidRu(set.bid)}${set.dbl ? ' ' + set.dbl : ''}, разыгрывает Восток. Ваш первый ход:</h3>
  <div class="table-felt">${fanHtml(set.hands[2]).replace('class="fan', 'class="fan leadfan')}</div><div id="fb"></div></div>`, 'Первый ход', gamesHub);
  $app.querySelectorAll('.leadfan .pc').forEach((el, i) => { el.classList.add('can'); el.onclick = () => {
    const c = set.hands[2][i], ok = keyOf(c) === keyOf(adv.card), suitOk = c.s === adv.suit;
    const s = stats('st_lead', ok || suitOk); if (s.ok >= 5) unlock('lead');
    $app.querySelectorAll('.leadfan .pc').forEach((x, j) => { x.classList.remove('can'); x.onclick = null; if (keyOf(set.hands[2][j]) === keyOf(adv.card)) x.classList.add('glow'); });
    ok ? reward(12, el) : suitOk ? (sfx('ok'), addXP(6, el)) : oops();
    $('fb').innerHTML = red(`<div><div class="fb ${ok || suitOk ? 'ok' : 'bad'}">${ok ? '✅ Точно по учебнику!' : suitOk ? '👍 Масть верная, но по правилам лучше ' + cardStr(adv.card) + '.' : '❌ По учебнику: ' + cardStr(adv.card) + '.'} ${adv.why}</div>
    <details><summary>Все руки</summary>${handHtml(set.hands[0], 'Север')}${handHtml(set.hands[1], 'Восток')}${handHtml(set.hands[3], 'Запад')}</details>
    <p class="muted">Оценка — по учебным правилам первого хода, а не идеальным анализом. Счёт: ${s.ok}/${s.n}</p><button class="btn block" id="nx">Следующая задача</button></div>`);
    $('nx').onclick = leadProblem;
  }; });
}

// ---------- Обмен сдачами ----------
const RK = 'AKQJT98765432';
const rankCh = r => RK[14 - r];
function handStr(h, sep) { return [3, 2, 1, 0].map(s => h.filter(c => c.s === s).sort((a, b) => b.r - a.r).map(c => rankCh(c.r)).join('')).join(sep); }
function encodeDeal(r) {
  const owner = Array(52).fill('0');
  r.hands.forEach((h, seat) => h.forEach(c => { owner[c.s * 13 + c.r - 2] = seat; }));
  const o = { b: r.board, h: owner.join(''), a: (r.auction || []).map(x => x.bid).join(','), c: r.bid || '', d: r.decl, x: r.dbl || '', p: (r.plays || []).map(p => (p.card.s * 13 + p.card.r - 2).toString(36).padStart(2, '0')).join('') };
  return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeDeal(str) {
  const o = JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))));
  const hands = [[], [], [], []];
  o.h.split('').forEach((s, i) => hands[+s].push({ s: Math.floor(i / 13), r: i % 13 + 2 }));
  const dealer = dealerOf(o.b), bids = o.a ? o.a.split(',') : [];
  const auction = bids.map((b, i) => ({ seat: (dealer + i) % 4, bid: b }));
  const plays = [];
  if (o.p) {
    let leader = (o.d + 1) % 4, trick = [];
    for (let i = 0; i < o.p.length; i += 2) {
      const n = parseInt(o.p.slice(i, i + 2), 36), card = { s: Math.floor(n / 13), r: n % 13 + 2 };
      const seat = trick.length ? (trick[0].seat + trick.length) % 4 : leader;
      plays.push({ seat, card }); trick.push({ seat, card });
      if (trick.length === 4) { leader = trickWinner(trick, o.c && strainOf(o.c) < 4 ? strainOf(o.c) : null); trick = []; }
    }
  }
  return { mode: 'shared', board: o.b, hands: hands.map(sortHand), auction, bid: o.c || null, decl: o.d, dbl: o.x, plays };
}
function shareDeal(r) {
  const url = location.origin + location.pathname + '#deal=' + encodeDeal(r);
  if (navigator.share) navigator.share({ title: 'Сдача ' + r.board, text: 'Посмотри сдачу: ' + resultText(r), url }).catch(() => {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('🔗 Ссылка скопирована'));
  else prompt('Ссылка на сдачу:', url);
}
const VUL_PBN = { '-': 'None', NS: 'NS', EW: 'EW', ALL: 'All' };
function pbnOf(r) {
  const D = 'NESW', dealer = dealerOf(r.board), callP = b => (b === 'P' ? 'Pass' : b === 'X' ? 'X' : b === 'XX' ? 'XX' : b[0] + (b[1] === 'N' ? 'NT' : b[1]));
  const lines = [`[Event "Бридж SAYC — тренажёр"]`, `[Date "${new Date(r.ts || Date.now()).toISOString().slice(0, 10).replace(/-/g, '.')}"]`, `[Board "${r.board}"]`,
    `[Dealer "${D[dealer]}"]`, `[Vulnerable "${VUL_PBN[vulOf(r.board)]}"]`, `[Deal "N:${r.hands.map(h => handStr(h, '.')).join(' ')}"]`];
  if (r.bid) lines.push(`[Declarer "${D[r.decl]}"]`, `[Contract "${r.bid[0]}${r.bid[1] === 'N' ? 'NT' : r.bid[1]}${r.dbl || ''}"]`);
  if (r.got !== undefined) lines.push(`[Result "${r.got}"]`);
  lines.push(`[Auction "${D[dealer]}"]`);
  const calls = (r.auction || []).map(a => callP(a.bid));
  for (let i = 0; i < calls.length; i += 4) lines.push(calls.slice(i, i + 4).join(' '));
  return lines.join('\n') + '\n';
}
function downloadPBN(r) {
  const blob = new Blob([pbnOf(r)], { type: 'text/plain' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `sdacha-${r.board}.pbn`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// Ссылка на просмотрщик BBO (формат LIN)
function bboLink(r) {
  const dealerCode = [3, 4, 1, 2][dealerOf(r.board)]; // LIN: 1=S 2=W 3=N 4=E
  const linHand = h => [3, 2, 1, 0].map(s => 'SHDC'[3 - s] + h.filter(c => c.s === s).sort((a, b) => b.r - a.r).map(c => rankCh(c.r)).join('')).join('');
  const sv = { '-': 'o', NS: 'n', EW: 'e', ALL: 'b' }[vulOf(r.board)];
  const mb = (r.auction || []).map(a => 'mb|' + (a.bid === 'P' ? 'p' : a.bid === 'X' ? 'd' : a.bid === 'XX' ? 'r' : a.bid) + '|').join('');
  const pc = (r.plays || []).map(p => 'pc|' + 'CDHS'[p.card.s] + rankCh(p.card.r) + '|').join('');
  const lin = `pn|South,West,North,East|md|${dealerCode}${linHand(r.hands[2])},${linHand(r.hands[3])},${linHand(r.hands[0])},${linHand(r.hands[1])}|sv|${sv}|ah|Board ${r.board}|${mb}${pc}`;
  return 'https://www.bridgebase.com/tools/handviewer.html?lin=' + encodeURIComponent(lin);
}
function checkHashImport() {
  const m = location.hash.match(/^#deal=(.+)$/);
  if (!m) return false;
  try {
    const rec = decodeDeal(m[1]);
    history.replaceState(null, '', location.pathname);
    const id = saveDeal(rec); toast('📥 Сдача добавлена в «Мои сдачи»'); replay(id); return true;
  } catch { return false; }
}

// ---------- Статистика ----------
function statsPage() {
  const cats = [['st_open', '🚀 Открытия'], ['st_resp', '💬 Ответы'], ['st_game', '🤝 Торговля'], ['st_full', '⚔️ Полная игра'], ['st_lead', '🎯 Первый ход']]
    .map(([k, t]) => { const s = store.get(k, { ok: 0, n: 0 }); return { t, ok: s.ok, n: s.n, p: s.n ? Math.round(100 * s.ok / s.n) : null }; });
  const hist = histAll().filter(r => r.got !== undefined && r.bid);
  const made = hist.filter(r => r.got >= 6 + lvlOf(r.bid) && r.decl % 2 === 0).length, declN = hist.filter(r => r.decl % 2 === 0).length;
  const scores = hist.slice(0, 20).reverse().map(r => r.score || 0);
  const p = prof(), read = Object.keys(store.get('read', {})).length;
  const weakest = cats.filter(c => c.n >= 3).sort((a, b) => a.p - b.p)[0];
  // линия очков
  let spark = '<p class="muted">Сыграйте несколько сдач — здесь появится график.</p>';
  if (scores.length >= 2) {
    const W = 300, H = 90, mx = Math.max(...scores.map(Math.abs), 50);
    const pts = scores.map((v, i) => [i * W / (scores.length - 1), H / 2 - v / mx * (H / 2 - 6)]);
    spark = `<svg viewBox="0 0 ${W} ${H}" class="spark"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" class="zero"/><polyline points="${pts.map(p => p.join(',')).join(' ')}" class="ln"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="${scores[i] >= 0 ? 'pt pos' : 'pt neg'}"/>`).join('')}</svg>`;
  }
  const pct = declN ? Math.round(100 * made / declN) : 0;
  render(`<div class="hero stats-hero"><div class="big">📊</div><h2>Статистика</h2><p>${weakest ? `Слабое место: <b>${weakest.t}</b> (${weakest.p}%). Потренируйте!` : 'Играйте больше — появятся выводы.'}</p></div>
  <div class="statgrid">
    <div class="stat"><b data-count="${p.xp}">0</b><small>опыта</small></div>
    <div class="stat"><b data-count="${histAll().length}">0</b><small>сдач сыграно</small></div>
    <div class="stat"><b data-count="${p.best}">0</b><small>рекорд блица</small></div>
    <div class="stat"><b data-count="${read}">0</b><small>глав прочитано</small></div>
  </div>
  <div class="card"><h3 style="margin-top:0">Точность по темам</h3>${cats.map((c, i) => `<div class="bar"><span>${c.t}</span><div><i style="--w:${c.p || 0}%;--i:${i}" class="${c.p === null ? '' : c.p >= 75 ? 'g' : c.p >= 50 ? 'y' : 'r'}"></i></div><b>${c.p === null ? '—' : c.p + '%'}</b><small>${c.ok}/${c.n}</small></div>`).join('')}</div>
  <div class="card"><h3 style="margin-top:0">Выполнено контрактов</h3><div class="donutrow"><div class="donut" style="--p:${pct}"><b>${pct}%</b></div><p>Вы разыгрывали ${declN} ${declN === 1 ? 'контракт' : 'контрактов'}, выполнили ${made}.</p></div></div>
  <div class="card"><h3 style="margin-top:0">Запись за последние сдачи</h3>${spark}</div>`, 'Статистика', gamesHub);
}
