// Лаборатория сдач: выбрать сыгранную, импортировать или собрать с нуля и сыграть по правилам.
// А также «зажми и смотри» для всех графиков.

// ---------- Подсказка на графиках ----------
(function chartScrub() {
  let tip = null, active = null, hideT = null;
  const nearest = (svg, clientX) => {
    let best = null, bd = Infinity;
    svg.querySelectorAll('circle[data-v]').forEach(c => { const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - clientX); if (d < bd) { bd = d; best = c; } });
    return best;
  };
  const show = (svg, e) => {
    const c = nearest(svg, e.clientX); if (!c) return;
    svg.querySelectorAll('circle.hot').forEach(x => x.classList.remove('hot')); c.classList.add('hot');
    let xh = svg.querySelector('line.xh');
    if (!xh) { xh = document.createElementNS('http://www.w3.org/2000/svg', 'line'); xh.setAttribute('class', 'xh'); svg.insertBefore(xh, svg.firstChild); }
    const vb = svg.viewBox.baseVal;
    xh.setAttribute('x1', c.getAttribute('cx')); xh.setAttribute('x2', c.getAttribute('cx')); xh.setAttribute('y1', 0); xh.setAttribute('y2', vb.height);
    if (!tip) { tip = document.createElement('div'); tip.className = 'charttip'; document.body.appendChild(tip); }
    tip.innerHTML = `<b>${c.dataset.v}</b><small>${c.dataset.l}</small>`;
    const r = c.getBoundingClientRect();
    tip.style.left = Math.min(innerWidth - 90, Math.max(10, r.left + r.width / 2 - 40)) + 'px';
    tip.style.top = Math.max(70, r.top - 52) + 'px';
    tip.classList.add('on');
    if (navigator.vibrate && navigator.userActivation?.hasBeenActive && c !== active) navigator.vibrate(5);
    active = c;
  };
  const end = () => { clearTimeout(hideT); hideT = setTimeout(() => { tip && tip.classList.remove('on'); document.querySelectorAll('circle.hot').forEach(x => x.classList.remove('hot')); document.querySelectorAll('line.xh').forEach(x => x.remove()); active = null; }, 1600); };
  document.addEventListener('pointerdown', e => {
    const svg = e.target.closest('svg.ttchart, svg.spark'); if (!svg) return;
    clearTimeout(hideT); show(svg, e);
    const mv = ev => show(svg, ev), up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); end(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
})();

// ---------- Лаборатория ----------
function dealLab(tab = 'mine') {
  const all = histAll().filter(r => r.bid);
  render(`<div class="lab-hero"><div class="lab-ico">🧠</div><div><h2>Разбор сдач</h2><p>Возьмите любую сдачу — свою, чужую или собранную с нуля, — сыграйте её по правилам и посмотрите идеальный розыгрыш.</p></div></div>
  ${seg('tab', [['mine', '📜 Мои'], ['import', '📥 Импорт'], ['new', '✏️ С нуля']], tab)}
  <div id="labbody"></div>`, 'Разбор сдач', gamesHub);
  wireSeg($app, () => labTab(segVal($app, 'tab')));
  labTab(tab);
}
function labTab(tab) {
  const box = $('labbody');
  if (tab === 'mine') {
    const all = histAll().filter(r => r.bid);
    box.innerHTML = red(`<div>${all.length ? `<div class="hlist">${all.slice(0, 40).map((r, i) => `<a href="#" class="hrow" data-id="${r.id}" style="--i:${Math.min(i, 12)}">${boardHtml(r.board || 1)}<div class="hmid"><b>${resultText(r)}</b><small>${new Date(r.ts).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${r.plays && r.plays.length ? ' · 🧠 можно разобрать' : ' · не разыграна'}</small></div><span class="hscore">›</span></a>`).join('')}</div>` : '<div class="fb">Сыгранных сдач пока нет. Импортируйте сдачу или соберите её с нуля.</div>'}</div>`);
    box.querySelectorAll('.hrow').forEach(a => a.onclick = e => { e.preventDefault(); const r = histAll().find(x => x.id === a.dataset.id); r.plays && r.plays.length ? replay(r.id, true) : labSetup(r.hands, r); });
  } else if (tab === 'import') {
    box.innerHTML = red(`<div class="card"><h3 style="margin-top:0">Вставьте сдачу</h3>
      <p class="muted">Подходит ссылка из кнопки «Поделиться» или текст PBN (строка <code>[Deal "N:…"]</code> из любой бриджевой программы или BBO).</p>
      <textarea id="imp" class="imparea" placeholder='https://…#deal=…  или  [Deal "N:AKQ.J9.T876.543 …"]'></textarea>
      <button class="btn block" id="impgo">Загрузить</button><div id="impfb"></div></div>`);
    $('impgo').onclick = () => {
      const t = $('imp').value.trim();
      try {
        const m = t.match(/#deal=([\w-]+)/);
        if (m) { const r = decodeDeal(m[1]); return labSetup(r.hands, r); }
        const r = parsePBN(t);
        if (r) return labSetup(r.hands, r);
        throw 0;
      } catch { $('impfb').innerHTML = red('<div><div class="fb bad">Не получилось распознать. Нужна ссылка «#deal=…» или строка [Deal "N:…"] с 52 картами.</div></div>'); oops(); }
    };
  } else labEditor();
}
// PBN: [Deal "N:s.h.d.c s.h.d.c s.h.d.c s.h.d.c"], а также Contract/Declarer/Board
function parsePBN(t) {
  const m = t.match(/\[Deal\s+"([NESW]):([^"]+)"\]/i) || t.match(/^([NESW]):(\S+ \S+ \S+ \S+)$/i);
  if (!m) return null;
  const first = 'NESW'.indexOf(m[1].toUpperCase()), hands = [[], [], [], []];
  m[2].trim().split(/\s+/).forEach((hs, k) => {
    const seat = (first + k) % 4;
    hs.split('.').forEach((ranks, si) => { for (const ch of ranks.toUpperCase()) { if (ch === '-') continue; const r = 14 - 'AKQJT98765432'.indexOf(ch); if (r <= 14 && r >= 2) hands[seat].push({ s: 3 - si, r }); } });
  });
  if (hands.some(h => h.length !== 13)) return null;
  const rec = { hands: hands.map(sortHand) };
  const c = t.match(/\[Contract\s+"(\d)(NT|[SHDC])(X{0,2})"\]/i), d = t.match(/\[Declarer\s+"([NESW])"\]/i), b = t.match(/\[Board\s+"(\d+)"\]/i);
  if (c) { rec.bid = c[1] + (c[2].toUpperCase() === 'NT' ? 'N' : c[2].toUpperCase()); rec.dbl = c[3].toUpperCase(); }
  if (d) rec.decl = 'NESW'.indexOf(d[1].toUpperCase());
  if (b) rec.board = (+b[1] - 1) % 16 + 1;
  return rec;
}

// ---------- Редактор рук ----------
let LAB = null;
function labEditor() {
  LAB = LAB || { owner: {}, seat: 2 };
  const box = $('labbody');
  const cnt = s => Object.values(LAB.owner).filter(x => x === s).length;
  const draw = () => {
    let g = '<div class="grid52 labgrid">';
    for (let s = 3; s >= 0; s--) for (let r = 14; r >= 2; r--) { const k = s * 100 + r, o = LAB.owner[k]; g += `<button data-k="${k}" class="${o !== undefined ? 'own' + o : ''}">${SUITS[s]}${rankName(r)}${o !== undefined ? `<i>${SEAT_SHORT[o]}</i>` : ''}</button>`; }
    g += '</div>';
    box.innerHTML = red(`<div class="card"><h3 style="margin-top:0">Кому раздаём?</h3>
      <div class="seatpick">${[0, 1, 2, 3].map(s => `<button data-s="${s}" class="sp${s} ${LAB.seat === s ? 'on' : ''}">${SEATS[s]}<b>${cnt(s)}/13</b></button>`).join('')}</div>
      <p class="muted">Нажимайте карты — они уходят выбранному игроку. Повторное нажатие возвращает карту.</p>${g}
      <div class="labbtns"><button class="btn ghost" id="lrand">🎲 Добить случайно</button><button class="btn ghost" id="lclear">🧹 Очистить</button></div>
      <button class="btn block" id="lnext" ${[0, 1, 2, 3].every(s => cnt(s) === 13) ? '' : 'disabled'}>Дальше: контракт →</button></div>`);
    box.querySelectorAll('.seatpick button').forEach(b => b.onclick = () => { LAB.seat = +b.dataset.s; sfx('card'); draw(); });
    box.querySelectorAll('.labgrid button').forEach(b => b.onclick = () => {
      const k = +b.dataset.k;
      if (LAB.owner[k] !== undefined) delete LAB.owner[k];
      else if (cnt(LAB.seat) < 13) LAB.owner[k] = LAB.seat;
      else { oops(); return; }
      sfx('card');
      if (cnt(LAB.seat) === 13) { const nx = [0, 1, 2, 3].find(s => cnt(s) < 13); if (nx !== undefined) LAB.seat = nx; }
      draw();
    });
    $('lrand').onclick = () => {
      const free = shuffle(newDeck().filter(c => LAB.owner[c.s * 100 + c.r] === undefined));
      [0, 1, 2, 3].forEach(s => { while (cnt(s) < 13 && free.length) { const c = free.pop(); LAB.owner[c.s * 100 + c.r] = s; } });
      sfx('ok'); draw();
    };
    $('lclear').onclick = () => { LAB.owner = {}; LAB.seat = 2; draw(); };
    $('lnext').onclick = () => {
      const hands = [[], [], [], []];
      Object.entries(LAB.owner).forEach(([k, s]) => hands[s].push({ s: Math.floor(k / 100), r: k % 100 }));
      labSetup(hands.map(sortHand), {});
    };
  };
  draw();
}

// ---------- Контракт и старт ----------
function labSetup(hands, pre) {
  const st = { lvl: pre.bid ? lvlOf(pre.bid) : 4, strain: pre.bid ? strainOf(pre.bid) : 3, decl: pre.decl ?? 2, dbl: pre.dbl || '', board: pre.board || 1, mode: 'all' };
  const draw = () => {
    render(`<div class="card"><h3 style="margin-top:0">Руки</h3>
      ${handHtml(hands[0], 'Север')}<div class="labsides"><div>${handHtml(hands[3], 'Запад')}</div><div>${handHtml(hands[1], 'Восток')}</div></div>${handHtml(hands[2], 'Юг')}
      <p class="muted">Очки: С ${evalHand(hands[0]).hcp} · В ${evalHand(hands[1]).hcp} · Ю ${evalHand(hands[2]).hcp} · З ${evalHand(hands[3]).hcp}</p></div>
    <div class="card"><h3 style="margin-top:0">Контракт</h3>
      <div class="lvlrow">${[1, 2, 3, 4, 5, 6, 7].map(l => `<button data-l="${l}" class="${st.lvl === l ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="lvlrow">${[0, 1, 2, 3, 4].map(s => `<button data-st="${s}" class="${st.strain === s ? 'on' : ''}">${STR_RU[s]}</button>`).join('')}</div>
      ${seg('decl', [['0', 'Север'], ['1', 'Восток'], ['2', 'Юг'], ['3', 'Запад']], String(st.decl))}
      ${seg('dbl', [['', 'Без контры'], ['X', 'Контра'], ['XX', 'Реконтра']], st.dbl)}
      <p class="muted" style="margin:6px 0">Разыгрывает ${SEATS[st.decl]}: <b>${st.lvl}${STR_RU[st.strain]}${st.dbl ? ' ' + st.dbl : ''}</b>. Первый ход — ${SEATS[(st.decl + 1) % 4]}.</p></div>
    <div class="card"><h3 style="margin-top:0">Кто играет</h3>
      ${seg('mode', [['all', '🙌 Я за всех четверых'], ['decl', '🤖 Я разыгрываю, защита — роботы']], st.mode)}
      <button class="btn block" id="lgo">▶ Играть</button>
      <button class="btn ghost block" id="ldd">🧠 Сразу посчитать идеальный результат</button><div id="lddres"></div></div>`, 'Разбор сдач', () => dealLab('new'));
    $app.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { st.lvl = +b.dataset.l; sfx('card'); draw(); });
    $app.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { st.strain = +b.dataset.st; sfx('card'); draw(); });
    wireSeg($app, () => { st.decl = +segVal($app, 'decl'); st.dbl = segVal($app, 'dbl'); st.mode = segVal($app, 'mode'); draw(); });
    $('lgo').onclick = () => {
      let h = hands.map(x => x.map(c => ({ ...c }))), decl = st.decl;
      // В режиме «роботы защищаются» вы всегда за линию Север–Юг: поворачиваем сдачу, если разыгрывает Восток/Запад
      if (st.mode === 'decl' && decl % 2 === 1) { h = [h[1], h[2], h[3], h[0]]; decl = (decl + 3) % 4; }
      startPlay(h, mk(st.lvl, st.strain), decl, st.dbl, [], () => dealLab('mine'), st.board, undefined, { all: st.mode === 'all' });
      P.onAgain = () => dealLab('mine');
    };
    $('ldd').onclick = async () => {
      $('lddres').innerHTML = '<div class="ddbox small"><div class="ddspin"></div>Считаю… до 25 секунд</div>';
      const r = await ddCall('analysis', 'solveTricks', [plainHands(hands), st.strain < 4 ? st.strain : null, (st.decl + 1) % 4, st.decl % 2, []], 25000);
      if (!$('lddres')) return;
      const need = 6 + st.lvl;
      $('lddres').innerHTML = red(r && r.tricks !== null ? `<div><div class="ddpar"><span>${r.tricks}</span><div><b>взяток у ${SEATS[st.decl]} при идеальной игре</b><small>${st.lvl}${STR_RU[st.strain]} ${r.tricks >= need ? (r.tricks > need ? 'выполняется +' + (r.tricks - need) : 'выполняется ровно') : 'без ' + (need - r.tricks)}</small></div></div></div>` : '<div><div class="fb">Слишком сложная сдача — не успел за 25 секунд. Сыграйте её и разберите по ходам.</div></div>');
    };
  };
  draw();
}
