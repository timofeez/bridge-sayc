// История сдач: сохранение торговли и розыгрыша, список и просмотр по ходам.
const HIST_MAX = 100;
const histAll = () => store.get('history', []);
function saveDeal(rec) {
  const all = histAll();
  rec.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  rec.ts = Date.now();
  rec.hands = rec.hands.map(h => h.map(c => ({ s: c.s, r: c.r })));
  all.unshift(rec); store.set('history', all.slice(0, HIST_MAX));
  return rec.id;
}
function updateDeal(id, patch) {
  const all = histAll(), r = all.find(x => x.id === id);
  if (!r) return;
  Object.assign(r, patch); store.set('history', all);
}
const callRu = b => (b === 'P' ? 'Пас' : b === 'X' || b === 'XX' ? b : bidRu(b));
function auctionGrid(auc, dealer, vul) {
  const cells = [0, 1, 2, 3].map(s => `<b class="${vul && isVul(vul, s) ? 'vulh' : ''}">${SEATS[s]}</b>`);
  for (let i = 0; i < dealer; i++) cells.push('<span></span>');
  auc.forEach(a => cells.push(`<span class="bt ${a.bid === 'P' ? 'bp' : a.bid === 'X' ? 'bx' : a.bid === 'XX' ? 'bxx' : 'bl'}">${callRu(a.bid)}</span>`));
  return `<div class="auction">${cells.join('')}</div>`;
}
function resultText(r) {
  if (!r.bid) return 'Все пас';
  const c = `${bidRu(r.bid)}${r.dbl ? ' ' + r.dbl : ''} ${SEAT_SHORT[r.decl]}`;
  if (r.got === undefined) return c + ' · не разыграно';
  const need = 6 + lvlOf(r.bid), d = r.got - need;
  return `${c} ${d === 0 ? '=' : d > 0 ? '+' + d : d}`;
}

// ---------- Список ----------
function historyPage() {
  const all = histAll();
  const fmt = ts => new Date(ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  render(`<div class="hero hist-hero"><div class="big">📜</div><h2>Мои сдачи</h2><p>${all.length ? `Сохранено ${all.length}. Нажмите, чтобы посмотреть торговлю и розыгрыш по ходам.` : 'Пока пусто. Сыграйте сдачу в «Полной игре», «Торговле с роботом» или «Сыграть сдачу».'}</p></div>
  <div class="hlist">${all.map((r, i) => `<a href="#" class="hrow" data-id="${r.id}" style="--i:${Math.min(i, 12)}">
    ${boardHtml(r.board || 1)}
    <div class="hmid"><b>${resultText(r)}</b><small>${fmt(r.ts)} · ${r.mode === 'full' ? 'Полная игра' : r.mode === 'quiet' ? 'Торговля с роботом' : r.mode === 'shared' ? 'По ссылке' : 'Розыгрыш'}${r.mistakes ? ` · ошибок: ${r.mistakes}` : ''}</small>${r.plays && r.plays.length && r.bid ? '<span class="hbadge">🧠 можно разобрать</span>' : ''}</div>
    ${r.score !== undefined ? `<span class="hscore ${r.score >= 0 ? 'pos' : 'neg'}">${r.score > 0 ? '+' : ''}${r.score}</span>` : '<span class="hscore">—</span>'}
  </a>`).join('')}</div>
  ${all.length ? '<button class="btn ghost block" id="hclear">🗑 Очистить историю</button>' : ''}`, 'Мои сдачи', gamesHub);
  $app.querySelectorAll('.hrow').forEach(a => a.onclick = e => { e.preventDefault(); replay(a.dataset.id); });
  if (all.length) $('hclear').onclick = () => { if (confirm('Удалить все сохранённые сдачи?')) { store.set('history', []); historyPage(); } };
}

// ---------- Просмотр ----------
function replay(id, auto) {
  const r = histAll().find(x => x.id === id);
  if (!r) return historyPage();
  const plays = r.plays || [], trump = r.bid && strainOf(r.bid) < 4 ? strainOf(r.bid) : null;
  let k = plays.length, timer = null;
  const pos = ['n', 'e', 's', 'w'];
  const sideText = h => `<div class="mini side-mini">${[3, 2, 1, 0].map(s => `${SUITS[s]} ${h.filter(c => c.s === s).map(c => rankName(c.r)).join(' ') || '—'}`).join('<br>')}</div>`;
  const fan = h => fanHtml(h).replace('class="fan', 'class="fan static');
  const draw = () => {
    const gone = new Set(plays.slice(0, k).map(p => p.card.s * 100 + p.card.r));
    const hands = r.hands.map(h => sortHand(h.filter(c => !gone.has(c.s * 100 + c.r))));
    const start = k ? Math.floor((k - 1) / 4) * 4 : 0, trick = plays.slice(start, k);
    let tr = [0, 0];
    for (let t = 0; t + 4 <= k; t += 4) tr[trickWinner(plays.slice(t, t + 4), trump) % 2]++;
    const lbl = s => `<div class="plabel ${s === r.decl ? 'turn' : ''}">${seatName(s)}${s === r.decl ? ' · разыгр.' : ''}</div>`;
    $('rtable').innerHTML = red(`<div>
      <div class="pn">${lbl(0)}${fan(hands[0])}</div><div class="pw">${lbl(3)}${sideText(hands[3])}</div>
      <div class="trick">${trick.map((p, i) => `<div class="tc ${pos[p.seat]}${suitCls(p.card.s)}${i === trick.length - 1 ? ' new' : ''}">${cardStr(p.card)}</div>`).join('')}</div>
      <div class="pe">${lbl(1)}${sideText(hands[1])}</div><div class="ps">${lbl(2)}${fan(hands[2])}</div></div>`).replace(/^<div>|<\/div>$/g, '');
    $('rinfo').innerHTML = plays.length ? `Ход ${k} из ${plays.length} · взятки СЮ ${tr[0]} · ВЗ ${tr[1]}` : 'Сдача не разыгрывалась';
    if ($('rslider')) $('rslider').value = k;
    if ($('rplay')) $('rplay').textContent = timer ? '⏸' : '▶';
  };
  const stop = () => { clearInterval(timer); timer = null; };
  render(`${r.bid && plays.length ? `<button class="analyzecta" id="ranalyze"><span class="ac-ico">🧠</span><div><b>Разобрать мои ошибки</b><small>Идеальный розыгрыш и ход, где вы потеряли взятки</small></div><i>›</i></button><div id="ddout"></div>` : ''}
  <div class="card">${boardInfo(r.board || 1)}
    <h2 style="margin:12px 0 4px">${resultText(r)}</h2>
    ${r.score !== undefined ? `<p class="muted" style="margin:0">Запись для СЮ: <b class="${r.score >= 0 ? 'pos' : 'neg'}">${r.score > 0 ? '+' : ''}${r.score}</b></p>` : ''}
    <h3>Торговля</h3>${auctionGrid(r.auction || [], dealerOf(r.board || 1), vulOf(r.board || 1))}</div>
  <div class="ptable" id="rtable"></div>
  <div class="rinfo" id="rinfo"></div>
  ${plays.length ? `<input type="range" id="rslider" min="0" max="${plays.length}" value="${k}" class="rslider">
  <div class="rctl"><button id="r0">⏮</button><button id="rb">‹</button><button id="rplay" class="main">▶</button><button id="rf">›</button><button id="rend">⏭</button></div>` : ''}
  ${r.bid ? '<button class="btn ghost block" id="rreplay">🃏 Разыграть эту сдачу заново</button>' : ''}
  <div class="sharerow"><button class="btn ghost" id="rshare">🔗 Поделиться</button><button class="btn ghost" id="rpbn">⬇ PBN</button><a class="btn ghost" id="rbbo" target="_blank" rel="noopener">BBO ↗</a></div>`, 'Просмотр сдачи', () => { stop(); historyPage(); });
  if (plays.length) {
    const go = n => { k = Math.max(0, Math.min(plays.length, n)); sfx('card'); draw(); };
    $('r0').onclick = () => { stop(); go(0); };
    $('rb').onclick = () => { stop(); go(k - 1); };
    $('rf').onclick = () => { stop(); go(k + 1); };
    $('rend').onclick = () => { stop(); go(plays.length); };
    $('rslider').oninput = e => { stop(); k = +e.target.value; draw(); };
    $('rplay').onclick = () => {
      if (timer) { stop(); return draw(); }
      if (k >= plays.length) k = 0;
      timer = setInterval(() => { if (!$('rtable')) return stop(); if (k >= plays.length) { stop(); return draw(); } go(k + 1); }, 650);
      draw();
    };
  }
  if ($('ranalyze')) $('ranalyze').onclick = () => { $('ranalyze').remove(); sfx('ok'); analyzeDeal(r, $('ddout'), i => { stop(); k = i; draw(); window.scrollTo({ top: $('rtable').offsetTop - 80, behavior: 'smooth' }); }); };
  $('rshare').onclick = () => shareDeal(r); $('rpbn').onclick = () => downloadPBN(r); $('rbbo').href = bboLink(r);
  if (r.bid) $('rreplay').onclick = () => { stop(); startPlay(r.hands.map(h => h.map(c => ({ ...c }))), r.bid, r.decl, r.dbl || '', r.auction, historyPage, r.board); };
  draw();
  if (auto && $('ranalyze')) $('ranalyze').click();
}
