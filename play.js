// Розыгрыш сдачи: вы за Юг (и за болвана, если разыгрывает ваша линия), остальные — роботы.
const SEAT_SHORT = ['С', 'В', 'Ю', 'З'];
let P = null;

// ---------- Правила ----------
function trickWinner(trick, trump) {
  let best = trick[0];
  for (const t of trick.slice(1)) {
    const c = t.card, b = best.card;
    if (c.s === b.s ? c.r > b.r : c.s === trump) best = t;
  }
  return best.seat;
}
function legalCards(hand, trick) {
  if (!trick.length) return hand;
  const led = trick[0].card.s, f = hand.filter(c => c.s === led);
  return f.length ? f : hand;
}
// Очки за контракт (без зоны)
function contractScore(level, strain, dbl, tricks, vul = false) {
  const need = 6 + level, mult = dbl === 'XX' ? 4 : dbl === 'X' ? 2 : 1;
  if (tricks >= need) {
    const per = strain < 2 ? 20 : 30;
    let pts = (strain === 4 ? 40 + 30 * (level - 1) : per * level) * mult;
    let sc = pts + (pts >= 100 ? (vul ? 500 : 300) : 50);
    if (level === 6) sc += vul ? 750 : 500; if (level === 7) sc += vul ? 1500 : 1000;
    const over = tricks - need;
    sc += mult === 1 ? over * (strain < 2 ? 20 : 30) : over * (vul ? 100 : 50) * mult;
    if (mult > 1) sc += 25 * mult;
    return sc;
  }
  const d = need - tricks;
  if (mult === 1) return -(vul ? 100 : 50) * d;
  const pen = vul ? 200 + 300 * (d - 1) : d === 1 ? 100 : d === 2 ? 300 : 500 + 300 * (d - 3);
  return -pen * (mult / 2);
}

// ---------- Робот ----------
const isMaster = (c, played) => { for (let r = c.r + 1; r <= 14; r++) if (!played.has(c.s * 100 + r)) return false; return true; };
function robotCard(seat) {
  const hand = P.hands[seat], trick = P.trick, trump = P.trump, legal = legalCards(hand, trick);
  const low = arr => arr.reduce((a, b) => (b.r < a.r ? b : a));
  const high = arr => arr.reduce((a, b) => (b.r > a.r ? b : a));
  if (!trick.length) {
    // Первый ход сдачи
    if (!P.played.size) {
      let suits = [0, 1, 2, 3].filter(s => s !== trump && hand.some(c => c.s === s));
      if (!suits.length) suits = [trump];
      const ptBid = P.partnerSuit[seat];
      let s = ptBid !== undefined && hand.some(c => c.s === ptBid) ? ptBid : suits.reduce((a, b) => (hand.filter(c => c.s === b).length > hand.filter(c => c.s === a).length ? b : a));
      const cs = hand.filter(c => c.s === s).sort((a, b) => b.r - a.r);
      if (cs.length >= 2 && cs[0].r >= 11 && cs[0].r - cs[1].r === 1) return cs[0];
      if (s === ptBid) return cs.length >= 3 ? cs[cs.length - 1] : cs[0];
      return cs.length >= 4 ? cs[3] : cs[0];
    }
    const masters = hand.filter(c => isMaster(c, P.played) && c.s !== trump);
    if (masters.length) return masters[0];
    const nonT = hand.filter(c => c.s !== trump);
    const pool = nonT.length ? nonT : hand;
    const bySuit = {}; pool.forEach(c => (bySuit[c.s] = bySuit[c.s] || []).push(c));
    const s = Object.keys(bySuit).reduce((a, b) => (bySuit[b].length > bySuit[a].length ? b : a));
    return low(bySuit[s]);
  }
  const led = trick[0].card.s, curWin = trickWinner(trick, trump);
  const partnerWins = curWin % 2 === seat % 2;
  const beats = c => { const t = [...trick, { seat, card: c }]; return trickWinner(t, trump) === seat; };
  const followers = legal.filter(c => c.s === led);
  if (followers.length) {
    if (partnerWins) return low(followers);
    const w = followers.filter(beats);
    if (!w.length) return low(followers);
    if (trick.length === 1 && !w.some(c => isMaster(c, P.played))) return low(followers); // второй — низко
    return low(w);
  }
  if (!partnerWins && trump !== null) { const tr = legal.filter(c => c.s === trump && beats(c)); if (tr.length) return low(tr); }
  const nonT = legal.filter(c => c.s !== trump);
  return low(nonT.length ? nonT : legal);
}

// ---------- Старт ----------
function startPlay(hands, bid, decl, dbl, auction, onBack, board, recId) {
  // Каждая разыгранная сдача попадает в «Мои сдачи»
  if (!recId) recId = saveDeal({ mode: 'play', board, hands, auction: auction || [], bid, decl, dbl });
  const strain = strainOf(bid);
  const partnerSuit = {};
  (auction || []).forEach(a => { if (isLevel(a.bid) && strainOf(a.bid) < 4) [(a.seat + 2) % 4].forEach(p => { if (partnerSuit[p] === undefined) partnerSuit[p] = strainOf(a.bid); }); });
  P = {
    hands: hands.map(h => sortHand(h)), orig: hands.map(h => h.slice()), level: lvlOf(bid), strain, bid, dbl, decl,
    trump: strain === 4 ? null : strain, dummy: (decl + 2) % 4, turn: (decl + 1) % 4, trick: [], last: null,
    tricks: [0, 0], played: new Set(), partnerSuit, onBack, auction, busy: false, first: true, board, wins: [], recId, log: [],
  };
  P.userSide = decl % 2 === 0; // наша линия разыгрывает
  playRender(); playStep();
}
const controls = seat => seat === 2 || (P.userSide && seat === 0);
const visible = seat => seat === 2 || (P.userSide && seat === 0) || (P.played.size > 0 && seat === P.dummy) || P.done;

// ---------- Отрисовка ----------
function seatHtml(seat) {
  const h = P.hands[seat], name = seatName(seat) + (seat === P.decl ? ' · разыгр.' : seat === P.dummy ? ' · болван' : '');
  const lbl = `<div class="plabel ${P.turn === seat && !P.done ? 'turn' : ''}">${name}</div>`;
  if (!visible(seat)) return lbl + `<div class="backs">${'<i></i>'.repeat(Math.min(h.length, 13))}</div>`;
  if (seat === 1 || seat === 3) return lbl + `<div class="mini side-mini${P.done ? ' reveal' : ''}">${[3, 2, 1, 0].map(s => `${SUITS[s]} ${h.filter(c => c.s === s).map(c => rankName(c.r)).join(' ') || '—'}`).join('<br>')}</div>`;
  const canPlay = controls(seat) && P.turn === seat && !P.busy && P.trick.length < 4;
  const legal = canPlay ? legalCards(h, P.trick) : [];
  let prev = null;
  return lbl + `<div class="fan static">${h.map((c, i) => {
    const gap = prev !== null && prev !== c.s ? ' gap' : ''; prev = c.s;
    const cls = canPlay ? (legal.includes(c) ? ' can' : ' no') : '';
    return `<div class="pc${suitCls(c.s)}${gap}${cls}" data-seat="${seat}" data-i="${i}"><b>${rankName(c.r)}</b><i>${SUITS[c.s]}</i><em>${SUITS[c.s]}</em></div>`;
  }).join('')}</div>`;
}
let dragCleanup = null;
function playRender(msg = '') {
  if (dragCleanup) dragCleanup();
  document.querySelectorAll('.pc.ghost').forEach(g => g.remove());
  const pos = ['n', 'e', 's', 'w'];
  // Анимируем только что сыгранную карту; остальные уже лежат на столе
  const tr = P.trick.map((t, k) => {
    const anim = P.fresh && k === P.trick.length - 1 ? (P.dropped ? ' dropped' : ' new') : '';
    return `<div class="tc ${pos[t.seat]}${suitCls(t.card.s)}${anim}">${cardStr(t.card)}</div>`;
  }).join('');
  P.fresh = false; P.dropped = false;
  const ns = P.tricks[0], ew = P.tricks[1], need = 6 + P.level;
  const declT = P.tricks[P.decl % 2];
  render(`<div class="pbar">${P.board ? boardHtml(P.board) : ''}<span class="pill big">${bidRu(P.bid)}${P.dbl ? ' ' + P.dbl : ''} · ${SEAT_SHORT[P.decl]}</span>
    <span class="pill">СЮ ${ns}</span><span class="pill">ВЗ ${ew}</span><span class="pill">нужно ${need}, взято ${declT}</span></div>
  <div class="tdots">${[...Array(13)].map((_, k) => `<i class="${P.wins[k] === undefined ? '' : P.wins[k] % 2 === 0 ? 'ns' : 'ew'}"></i>`).join('')}</div>
  <div class="ptable">
    <div class="pn">${seatHtml(0)}</div>
    <div class="pw">${seatHtml(3)}</div>
    <div class="trick" id="trick">${tr}</div>
    <div class="pe">${seatHtml(1)}</div>
    <div class="ps">${seatHtml(2)}</div>
  </div>
  <div id="pmsg">${msg}</div>
  <div class="pbtns"><button class="btn ghost" id="hint">💡 Подсказка</button><button class="btn ghost" id="lastT" ${P.last ? '' : 'disabled'}>Последняя взятка</button><button class="btn ghost" id="restart">↺ Заново</button></div>`,
  'Розыгрыш', P.onBack, true);
  $app.querySelectorAll('.pc.can').forEach(enableDrag);
  $('hint').onclick = () => {
    if (!controls(P.turn) || P.done) return;
    const c = robotCard(P.turn);
    const el = $app.querySelector(`.pc[data-seat="${P.turn}"][data-i="${P.hands[P.turn].indexOf(c)}"]`);
    if (el) { el.classList.add('hinted'); }
  };
  $('lastT').onclick = () => { if (P.last) $('pmsg').innerHTML = red(`<div><div class="fb">Последняя взятка: ${P.last.map(t => `${SEAT_SHORT[t.seat]} ${cardStr(t.card)}`).join(' · ')} → ${SEATS[P.lastWin]}</div></div>`); };
  $('restart').onclick = () => { const again = P.onAgain; startPlay(P.orig, P.bid, P.decl, P.dbl, P.auction, P.onBack, P.board, P.recId); P.onAgain = again; };
}

// ---------- Ход игры ----------
function doPlay(seat, card) {
  sfx('card'); P.fresh = true; P.log.push({ seat, card: { s: card.s, r: card.r } });
  P.hands[seat] = P.hands[seat].filter(c => c !== card);
  P.trick.push({ seat, card }); P.played.add(card.s * 100 + card.r);
  P.turn = (seat + 1) % 4;
  playRender(); playStep();
}
// Перетаскивание карты на стол (нажатие тоже работает)
function enableDrag(el) {
  el.onpointerdown = e => {
    if (P.busy) return;
    e.preventDefault();
    if (dragCleanup) dragCleanup();
    const r = el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, trick = $('trick');
    let moved = false, over = false;
    const ghost = el.cloneNode(true);
    ghost.className = el.className.replace(' can', '') + ' ghost';
    Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 8) { moved = true; document.body.appendChild(ghost); el.style.visibility = 'hidden'; }
      if (!moved) return;
      ghost.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 25}deg) scale(1.15)`;
      const t = trick.getBoundingClientRect();
      over = ev.clientX > t.left && ev.clientX < t.right && ev.clientY > t.top - 30 && ev.clientY < t.bottom + 30;
      trick.classList.toggle('drop', over || dy < -90);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      trick.classList.remove('drop'); dragCleanup = null;
    };
    dragCleanup = () => { cleanup(); ghost.remove(); el.style.visibility = ''; };
    const up = ev => {
      cleanup();
      const dy = ev.clientY - sy;
      if (!moved) return userPlay(+el.dataset.seat, +el.dataset.i);
      if (over || dy < -90) { ghost.remove(); P.dropped = true; return userPlay(+el.dataset.seat, +el.dataset.i); }
      ghost.style.transition = 'transform .25s ease'; ghost.style.transform = 'none';
      setTimeout(() => { ghost.remove(); el.style.visibility = ''; }, 250);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
}
function userPlay(seat, i) {
  if (P.busy || P.turn !== seat) return;
  doPlay(seat, P.hands[seat][i]);
}
function playStep() {
  if (P.done) return;
  if (P.trick.length === 4) {
    P.busy = true;
    const w = trickWinner(P.trick, P.trump);
    setTimeout(() => {
      const t = $('trick');
      if (t) { t.classList.add('gone-' + ['n', 'e', 's', 'w'][w]); t.insertAdjacentHTML('beforeend', `<div class="plus1 ${['n', 'e', 's', 'w'][w]} ${w % 2 ? 'ew' : 'ns'}">+1</div>`); }
      setTimeout(() => {
        if (!P || !document.querySelector('.ptable')) return;
        P.tricks[w % 2]++; P.wins.push(w); P.last = P.trick; P.lastWin = w; P.trick = []; P.turn = w; P.busy = false;
        if (!P.hands[0].length) return playEnd();
        playRender(); playStep();
      }, 380);
    }, 900);
    return;
  }
  if (controls(P.turn)) return;
  const me = P;
  P.busy = true;
  const t0 = Date.now();
  robotChoose(P.turn).then(card => setTimeout(() => {
    if (P !== me || !document.querySelector('.ptable')) return;
    P.busy = false; doPlay(P.turn, card);
  }, Math.max(0, 550 - (Date.now() - t0))));
}
function playEnd() {
  P.done = true;
  const need = 6 + P.level, got = P.tricks[P.decl % 2];
  const vul = P.board ? isVul(vulOf(P.board), P.decl) : false;
  const sc = contractScore(P.level, P.strain, P.dbl, got, vul);
  const nsScore = P.decl % 2 === 0 ? sc : -sc;
  updateDeal(P.recId, { plays: P.log, got, score: nsScore });
  const made = got >= need;
  const word = made ? (got === need ? 'ровно' : `+${got - need}`) : `без ${need - got}`;
  playRender(`<div class="fb ${nsScore >= 0 ? 'ok' : 'bad'}"><b>${bidRu(P.bid)}${P.dbl ? ' ' + P.dbl : ''} ${word}</b> — ${SEATS[P.decl]} взял ${got} из 13.<br>Запись для СЮ: <b class="score" data-count="${nsScore}" data-plus="1">0</b> (${vul ? 'в зоне' : 'до зоны'}).</div>
  <button class="analyzecta" id="toAnalyze"><span class="ac-ico">🧠</span><div><b>Разобрать сдачу</b><small>Сколько можно было взять и где ошибка</small></div><i>›</i></button>
  <button class="btn block" id="again2">Новая сдача</button>`);
  $('toAnalyze').onclick = () => replay(P.recId, true);
  if (P.onEnd) P.onEnd(got, nsScore);
  if (nsScore > 0) { reward(made ? 40 : 15); if (made && P.decl % 2 === 0) unlock('made'); if (made && P.level >= 6 && P.decl % 2 === 0) unlock('slam'); } else oops();
  $('again2').onclick = () => P.onAgain ? P.onAgain() : P.onBack();
}

// Отдельный режим: роботы торгуются за всех, вы разыгрываете
function playRandom() {
  for (let k = 0; k < 60; k++) {
    const board = nextBoard(), hands = deal(), auc = [], dealer = dealerOf(board);
    while (true) {
      const s = (dealer + auc.length) % 4, r = suggestFull(hands[s], auc, s);
      auc.push({ seat: s, bid: r ? r.bid : 'P' });
      if (auc.length >= 4 && auc.slice(-3).every(x => x.bid === 'P')) break;
      if (auc.length > 40) break;
    }
    const li = auc.map(a => isLevel(a.bid)).lastIndexOf(true);
    if (li < 0) continue;
    const lb = auc[li];
    if (lb.seat % 2 !== 0) continue;
    const decl = auc.find(a => isLevel(a.bid) && a.seat % 2 === 0 && strainOf(a.bid) === strainOf(lb.bid)).seat;
    const after = auc.slice(li + 1).map(a => a.bid);
    const dbl = after.includes('XX') ? 'XX' : after.includes('X') ? 'X' : '';
    startPlay(hands, lb.bid, decl, dbl, auc, bidMenu, board);
    P.onAgain = playRandom;
    playRender(`<div class="fb">Роботы проторговались: ${auc.map(a => SEAT_SHORT[a.seat] + ' ' + (a.bid === 'X' || a.bid === 'XX' ? a.bid : bidRu(a.bid))).join(' · ')}.<br>Вы разыгрываете за Юг и Север. Нажимайте на карту, чтобы сыграть ею.</div>`);
    return;
  }
}

// ---------- Конструктор руки ----------
const BUILD_TASKS = ['1N', '2N', '2C', '1S', '1H', '1D', '1C', '2S', '2H', '2D', '3C', 'P'];
function buildHand() {
  const target = BUILD_TASKS[Math.floor(Math.random() * BUILD_TASKS.length)];
  const sel = [];
  let g = '<div class="grid52">';
  for (let s = 3; s >= 0; s--) for (let r = 14; r >= 2; r--) g += `<button data-c="${s}-${r}">${SUITS[s]}${rankName(r)}</button>`;
  g += '</div>';
  render(`<div class="card"><h3 style="margin-top:0">🧩 Соберите руку, с которой по SAYC открывают <span class="pill big">${bidRu(target)}</span></h3>
  <p class="muted">Нажимайте на карты, чтобы взять их в руку. Нужно ровно 13.</p>${g}
  <div class="table-felt"><div class="hand-label">Ваша рука · <span id="bc">0</span>/13 · <span id="bp">0</span> HCP</div><div id="bh" style="min-height:80px"></div></div>
  <button class="btn block" id="chk" disabled>Проверить</button><div id="fb"></div></div>`, 'Конструктор руки', bidMenu);
  const upd = () => {
    const h = sortHand(sel);
    $('bh').innerHTML = red('<div>' + fanHtml(h).replace('class="fan"', 'class="fan static"') + '</div>');
    $('bc').textContent = sel.length; $('bp').textContent = evalHand(sel).hcp; $('chk').disabled = sel.length !== 13;
  };
  $app.querySelectorAll('.grid52 button').forEach(b => b.onclick = () => {
    const [s, r] = b.dataset.c.split('-').map(Number), i = sel.findIndex(c => c.s === s && c.r === r);
    if (i >= 0) sel.splice(i, 1); else if (sel.length < 13) sel.push({ s, r }); else return;
    b.classList.toggle('sel'); sfx('card'); upd();
  });
  $('chk').onclick = () => {
    const r = opening(sel), ok = r.bid === target;
    if (ok) { reward(20); unlock('builder'); } else oops();
    $('fb').innerHTML = red(`<div><div class="fb ${ok ? 'ok' : 'bad'}">${ok ? '✅ Да! ' : `❌ С такой рукой открывают <b>${bidRu(r.bid)}</b>. `}${r.why}</div><button class="btn block" id="nx">${ok ? 'Новое задание' : 'Другое задание'}</button></div>`);
    $('nx').onclick = buildHand;
  };
}
