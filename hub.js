// Две главные страницы: длинная интерактивная теория и витрина мини-игр.

// ================= ТЕОРИЯ =================
const WIDGET = { start: 'order', points: 'hcp', open: 'dealOpen', 'resp-major': 'major', 'resp-minor': 'dealMinor', nt: 'nt', 'two-clubs': 'dealOpen', 'weak-two': 'dealOpen', rebids: 'zones', compet: 'dealOver', slam: 'aces', defense: 'r11' };
const BID_POOL = ['Пас', '1♣', '1♦', '1♥', '1♠', '1БК', '2♣', '2♦', '2♥', '2♠', '2БК', '3БК'];
function exOptions(a) {
  if (a === 'Да' || a === 'Нет') return ['Да', 'Нет'];
  if (/^\d+$/.test(a)) { const n = +a; return shuffle([n, n + 1, n - 1, n + 2].map(String)); }
  return shuffle([a, ...shuffle(BID_POOL.filter(b => b !== a)).slice(0, 3)]);
}

function theoryPage() {
  const read = store.get('read', {});
  const secs = THEORY.map((t, i) => `
  <section class="sec" id="s_${t.id}" data-id="${t.id}">
    <div class="chap"><span class="cn">${String(i + 1).padStart(2, '0')}</span><span class="ce">${t.emoji}</span>${read[t.id] ? '<span class="cdone">✓ прочитано</span>' : ''}</div>
    <h2>${t.title}</h2>
    <div class="idea">${t.idea}</div>
    ${t.body}
    ${WIDGET[t.id] ? `<div class="widget" data-w="${WIDGET[t.id]}"></div>` : ''}
    ${(t.ex || []).map((e, k) => `<div class="exq" data-a="${e.a}"><div class="exhead">🎯 Задачка</div><b>${e.q}</b>${e.hand ? handHtml(parseHand(e.hand)) : ''}
      <div class="exopts">${exOptions(e.a).map(o => `<button>${o}</button>`).join('')}</div><div class="exwhy">${e.why}</div></div>`).join('')}
    ${t.more ? `<details><summary>Таблица целиком</summary>${t.more}</details>` : ''}
    ${srcHtml(t.src)}
  </section>`).join('');
  render(`<div class="tprog"><i id="tpbar"></i></div>
  <div class="cnav" id="cnav">${THEORY.map(t => `<button data-go="${t.id}">${t.emoji} ${t.title.split(':')[0]}</button>`).join('')}</div>
  <div class="hero theory-hero"><div class="suits-float"><span>♠</span><span>♥</span><span>♦</span><span>♣</span></div>
    <h2>Торговля SAYC<br>от нуля до шлема</h2><p>Одна страница, ${THEORY.length} глав. Листайте, нажимайте, двигайте ползунки — всё живое.</p></div>
  ${secs}
  <div class="finish"><div style="font-size:54px">🏁</div><h2>Вы дошли до конца!</h2><p>Теперь закрепите в играх.</p><button class="btn block" id="toGames">🎮 К играм</button></div>`, 'Теория');
  $('toGames').onclick = () => document.querySelector('[data-tab=games]').click();
  $app.querySelectorAll('.flow>div').forEach((d, k) => d.style.setProperty('--i', k));
  $app.querySelectorAll('.cnav button').forEach(b => b.onclick = () => { const el = $('s_' + b.dataset.go); window.scrollTo({ top: el.offsetTop - 110, behavior: 'smooth' }); });
  $app.querySelectorAll('.exq').forEach(q => q.querySelectorAll('.exopts button').forEach(b => b.onclick = () => {
    if (q.classList.contains('done')) return;
    const ok = b.textContent === q.dataset.a;
    b.classList.add(ok ? 'ok' : 'bad');
    if (ok) { q.classList.add('done'); reward(5, b); } else { oops(); setTimeout(() => b.classList.remove('bad'), 600); q.classList.add('tried'); }
  }));
  $app.querySelectorAll('.widget').forEach(w => WIDGETS[w.dataset.w](w));
  // Появление глав, отметка прочитанного, активная глава
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    const id = e.target.dataset.id; if (!id) return;
    $app.querySelectorAll('.cnav button').forEach(b => b.classList.toggle('on', b.dataset.go === id));
    const on = $app.querySelector(`.cnav button[data-go="${id}"]`), nav = $('cnav'); if (on && nav) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
    const r = store.get('read', {});
    if (!r[id]) { r[id] = 1; store.set('read', r); setTimeout(() => addXP(20), 300); if (THEORY.every(x => r[x.id])) unlock('theory'); }
  }), { threshold: 0.25 });
  $app.querySelectorAll('.sec,.finish').forEach(s => io.observe(s));
  const onScroll = () => { const bar = $('tpbar'); if (!bar) return window.removeEventListener('scroll', onScroll); const h = document.documentElement; bar.style.width = 100 * h.scrollTop / (h.scrollHeight - h.clientHeight) + '%'; };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ---------- Живые виджеты внутри теории ----------
const seg = (name, opts, cur) => `<div class="seg" data-n="${name}">${opts.map(([v, t]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${t}</button>`).join('')}</div>`;
function wireSeg(w, f) { w.querySelectorAll('.seg').forEach(s => s.querySelectorAll('button').forEach(b => b.onclick = () => { s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); sfx('card'); f(); })); }
const segVal = (w, n) => w.querySelector(`.seg[data-n="${n}"] .on`).dataset.v;
function bigAnswer(el, bid, why) { el.innerHTML = red(`<div class="bigbid">${bid}</div><div class="bigwhy">${why}</div>`); }

const WIDGETS = {
  // Порядок мастей: нажмите от младшей к старшей
  order(w) {
    const right = ['♣', '♦', '♥', '♠', 'БК']; let pos = 0;
    w.innerHTML = red(`<div class="wtitle">🕹 Мини-игра: нажмите масти от младшей к старшей</div><div class="orderbox">${shuffle(right.slice()).map(s => `<button>${s}</button>`).join('')}</div><div class="wres"></div>`);
    w.querySelectorAll('.orderbox button').forEach(b => b.onclick = () => {
      if (b.textContent === right[pos]) { b.classList.add('ok'); b.disabled = true; b.style.order = pos; pos++; sfx('card'); if (pos === 5) { w.querySelector('.wres').innerHTML = red('<div class="fb ok">Верно: ♣ → ♦ → ♥ → ♠ → БК</div>'); reward(10, b); } }
      else { b.classList.add('bad'); oops(); setTimeout(() => b.classList.remove('bad'), 400); }
    });
  },
  // Подсчёт очков: угадай HCP
  hcp(w) {
    const h = deal()[0], e = evalHand(h);
    const opts = shuffle([e.hcp, e.hcp + 1, e.hcp - 1, e.hcp + 2].filter(x => x >= 0));
    w.innerHTML = red(`<div class="wtitle">🕹 Сколько очков в этой руке?</div>${handHtml(h)}<div class="exopts">${opts.map(o => `<button>${o}</button>`).join('')}</div><div class="wres"></div><button class="btn ghost wnew">🔄 Другая рука</button>`);
    w.querySelectorAll('.exopts button').forEach(b => b.onclick = () => {
      const ok = +b.textContent === e.hcp; b.classList.add(ok ? 'ok' : 'bad');
      w.querySelectorAll('.pc').forEach((pc, i) => { const r = h[i].r; if (r > 10) { pc.classList.add('glow'); pc.insertAdjacentHTML('beforeend', `<s class="badge">${r - 10}</s>`); } });
      w.querySelector('.wres').innerHTML = red(`<div class="fb ${ok ? 'ok' : 'bad'}">${ok ? 'Точно!' : 'Нет.'} ${e.hcp} очков — старшие карты подсвечены.</div>`);
      w.querySelectorAll('.exopts button').forEach(x => x.disabled = true); ok ? reward(5, b) : oops();
    });
    w.querySelector('.wnew').onclick = () => WIDGETS.hcp(w);
  },
  // Раздача + выбор заявки
  dealOpen(w) { dealQuiz(w, 'Вы первый. Что откроете?', () => { let h; do { h = deal()[0]; } while (evalHand(h).hcp < 9 && Math.random() < .7); return { h, rec: opening(h), last: 'P' }; }, 'dealOpen'); },
  dealMinor(w) { const o = Math.random() < .5 ? '1C' : '1D'; dealQuiz(w, `Партнёр открыл ${bidRu(o)}. Ваш ответ?`, () => { const h = deal()[0]; return { h, rec: respond(h, o), last: o }; }, 'dealMinor'); },
  dealOver(w) { const o = shuffle(['1C', '1D', '1H', '1S'])[0]; dealQuiz(w, `Противник справа открыл ${bidRu(o)}. Ваша заявка?`, () => { let h, r; do { h = deal()[0]; r = suggestFull(h, [{ seat: 1, bid: o }], 2); } while (!r || (r.bid === 'P' && Math.random() < .6)); return { h, rec: r, last: o }; }, 'dealOver', true); },
  // Ответ на 1БК: ползунок
  nt(w) {
    w.innerHTML = red(`<div class="wtitle">🎚 Партнёр открыл 1БК. Подвигайте ползунок</div>
    <div class="slider"><input type="range" min="0" max="18" value="9" id="ntv"><div class="sval"><b id="ntn">9</b> очков</div></div>
    ${seg('m', [['0', 'Нет мажора'], ['4', '4 карты мажора'], ['5', '5+ карт мажора']], '0')}<div class="wres"></div>`);
    const upd = () => {
      const v = +w.querySelector('#ntv').value, m = +segVal(w, 'm'); w.querySelector('#ntn').textContent = v;
      let b, y;
      if (m === 5) { b = '2♦ / 2♥'; y = 'Трансфер: называйте масть на одну ниже своей. При любой силе!'; }
      else if (m === 4 && v >= 8) { b = '2♣'; y = 'Стейман: «партнёр, есть четвёрка мажора?»'; }
      else if (v <= 7) { b = 'Пас'; y = '15–17 + 0–7 < 25 — гейма нет.'; }
      else if (v <= 9) { b = '2БК'; y = 'Приглашение: с максимумом партнёр скажет 3БК.'; }
      else if (v <= 15) { b = '3БК'; y = 'Вместе 25+ — гейм!'; }
      else { b = '4БК'; y = 'Приглашение в шлем (вместе около 33).'; }
      bigAnswer(w.querySelector('.wres'), b, y);
    };
    w.querySelector('#ntv').oninput = upd; wireSeg(w, upd); upd();
  },
  // Ответ на 1♥: ползунок + поддержка
  major(w) {
    w.innerHTML = red(`<div class="wtitle">🎚 Партнёр открыл 1♥. Сколько у вас очков и червей?</div>
    <div class="slider"><input type="range" min="0" max="18" value="8" id="mjv"><div class="sval"><b id="mjn">8</b> очков</div></div>
    ${seg('s', [['0', '0–2 ♥'], ['3', '3 ♥'], ['4', '4+ ♥']], '3')}<div class="wres"></div>`);
    const upd = () => {
      const v = +w.querySelector('#mjv').value, s = +segVal(w, 's'); w.querySelector('#mjn').textContent = v;
      let b, y;
      if (v < 6) { b = 'Пас'; y = 'Меньше 6 очков — пас.'; }
      else if (s >= 3 && v <= 9) { b = '2♥'; y = 'Фит есть (5+3), сила 6–10 → простое поднятие.'; }
      else if (s >= 3 && v <= 12) { b = '3♥'; y = 'Фит и 10–12 → приглашение в гейм.'; }
      else if (s === 4) { b = '2БК'; y = 'Якоби: 13+ и четыре червы → гейм точно, ищем шлем.'; }
      else if (s === 3) { b = '2♣ / 2♦ → потом 4♥'; y = '13+ с тремя червами: сначала своя масть (2 над 1), потом гейм в червах.'; }
      else if (v <= 10) { b = '1♠ или 1БК'; y = 'Без фита: с четырьмя пиками — 1♠, иначе 1БК (6–10).'; }
      else { b = '2 в своей масти'; y = 'Без фита и 10+ → «2 над 1»: назовите свою длинную масть.'; }
      bigAnswer(w.querySelector('.wres'), b, y);
    };
    w.querySelector('#mjv').oninput = upd; wireSeg(w, upd); upd();
  },
  // Светофор силы открывшего
  zones(w) {
    w.innerHTML = red(`<div class="wtitle">🚦 Сколько очков у открывшего?</div>
    <div class="slider"><input type="range" min="12" max="21" value="13" id="zv"><div class="sval"><b id="zn">13</b> очков</div></div>
    <div class="lights live"><div class="g"><b>12–15</b> минимум</div><div class="y"><b>16–18</b> средняя</div><div class="rd"><b>19–21</b> максимум</div></div><div class="wres"></div>`);
    const upd = () => {
      const v = +w.querySelector('#zv').value; w.querySelector('#zn').textContent = v;
      const z = v <= 15 ? 0 : v <= 18 ? 1 : 2;
      w.querySelectorAll('.lights.live>div').forEach((d, i) => d.classList.toggle('lit', i === z));
      bigAnswer(w.querySelector('.wres'), ['1♦–1♠–2♠', '1♦–1♠–3♠', '1♦–1♠–4♠'][z], ['С четырьмя пиками и минимумом — поднять на один уровень.', 'Средняя рука — прыжок, приглашение.', 'Максимум — сразу гейм.'][z]);
    };
    w.querySelector('#zv').oninput = upd; upd();
  },
  // Блэквуд / Гербер
  aces(w) {
    w.innerHTML = red(`<div class="wtitle">👑 Нажмите на тузы, которые есть у вас</div><div class="acerow">${[3, 2, 1, 0].map(s => `<div class="pc big${suitCls(s)}" data-s="${s}"><b>A</b><i>${SUITS[s]}</i><em>${SUITS[s]}</em></div>`).join('')}</div><div class="wres"></div>`);
    const upd = () => {
      const n = w.querySelectorAll('.acerow .on').length;
      bigAnswer(w.querySelector('.wres'), `${['5♣', '5♦', '5♥', '5♠', '5♣'][n]} <small>Блэквуд</small> · ${['4♦', '4♥', '4♠', '4БК', '4♦'][n]} <small>Гербер</small>`, `${n} ${n === 1 ? 'туз' : n >= 2 && n <= 4 ? 'туза' : 'тузов'}${n === 0 || n === 4 ? ' — 0 и 4 показываются одинаково, партнёр поймёт по торговле' : ''}`);
    };
    w.querySelectorAll('.acerow .pc').forEach(c => c.onclick = () => { c.classList.toggle('on'); sfx('card'); upd(); });
    upd();
  },
  // Правило 11
  r11(w) {
    w.innerHTML = red(`<div class="wtitle">🎯 Партнёр зашёл картой… (нажмите)</div><div class="r11">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => `<button>${r}</button>`).join('')}</div><div class="wres"></div>`);
    w.querySelectorAll('.r11 button').forEach(b => b.onclick = () => {
      w.querySelectorAll('.r11 button').forEach(x => x.classList.toggle('on', x === b)); sfx('card');
      const r = +b.textContent; bigAnswer(w.querySelector('.wres'), `11 − ${r} = ${11 - r}`, `Столько карт старше ${r} у болвана, у вас и у разыгрывающего вместе.`);
    });
  },
};
function dealQuiz(w, ctx, gen, key, full) {
  const q = gen();
  const opts = new Set([q.rec.bid]);
  const pool = shuffle(['P', '1C', '1D', '1H', '1S', '1N', '2C', '2D', '2H', '2S', '2N', '3N', 'X'].filter(b => b === 'P' || (b === 'X' ? full : bidVal(b) > bidVal(q.last))));
  for (const b of pool) { if (opts.size >= 4) break; if (!q.rec.alts.includes(b)) opts.add(b); }
  w.innerHTML = red(`<div class="wtitle">🃏 ${ctx}</div>${handHtml(q.h)}<div class="exopts">${shuffle([...opts]).map(b => `<button data-b="${b}">${bidRu(b)}</button>`).join('')}</div><div class="wres"></div><button class="btn ghost wnew">🔄 Новая раздача</button>`);
  w.querySelectorAll('.exopts button').forEach(b => b.onclick = () => {
    const ok = b.dataset.b === q.rec.bid || q.rec.alts.includes(b.dataset.b);
    b.classList.add(ok ? 'ok' : 'bad'); w.querySelector(`.exopts [data-b="${q.rec.bid}"]`).classList.add('ok');
    w.querySelectorAll('.exopts button').forEach(x => x.disabled = true);
    w.querySelector('.wres').innerHTML = red(`<div class="fb ${ok ? 'ok' : 'bad'}">${q.rec.why}</div>`);
    ok ? reward(5, b) : oops();
  });
  w.querySelector('.wnew').onclick = () => WIDGETS[key](w);
}

Object.assign(WIDGETS, EXTRA_WIDGETS); Object.assign(WIDGET, EXTRA_WIDGET);

// ================= ИГРЫ =================
const GAMES = [
  { sec: '🗣 Торговля', items: [
    ['g_open', '🚀', 'Открытие', 'Что открыть с этой рукой?', 'c1', () => drillOpen()],
    ['g_resp', '💬', 'Ответ партнёру', 'Партнёр открылся — ваш ход', 'c2', () => drillResp()],
    ['g_quiet', '🤝', 'Торговля с роботом', 'Противники молчат', 'c3', () => gameStart('quiet')],
    ['g_full', '⚔️', 'Полная игра', 'Противники торгуются + розыгрыш', 'c4', () => gameStart('full')],
    ['g_build', '🧩', 'Конструктор руки', 'Соберите руку под открытие', 'c5', () => buildHand()],
  ]},
  { sec: '🃏 Розыгрыш и защита', items: [
    ['g_play', '♠️', 'Сыграть сдачу', 'Возьмите свои взятки. Роботы в концовке играют идеально', 'c6', () => playRandom()],
    ['g_lead', '🎯', 'Первый ход', 'Какой картой выйти против контракта', 'c11', () => leadProblem()],
    ['g_stats', '📊', 'Статистика', 'Точность по темам, графики', 'c12', () => statsPage()],
  ]},
  { sec: '🧠 Память', items: [
    ['g_mem', '👀', 'Запомни руку', '13 карт за секунды', 'c7', () => memHandSetup()],
    ['g_cnt', '🧮', 'Счёт карт', 'Следите за вышедшими', 'c8', () => countSetup()],
    ['g_hcp', '⚡', 'Подсчёт очков', 'На время', 'c9', () => hcpDrill()],
    ['g_flash', '🗂', 'Флеш-карточки', 'Вероятности, запись, цифры', 'c10', () => factsMenu()],
  ]},
];
function gamesHub() {
  const p = prof(), dl = dailyStatus();
  render(`<a href="#" class="dailycard" id="g_daily"><div class="dc-cal"><small>${new Date().toLocaleDateString('ru-RU', { month: 'short' })}</small><b>${new Date().getDate()}</b></div><div><b>Сдача дня</b><small>${dl ? `Сыграно: ${bidRu(dl.bid)}, взято ${dl.got} · ${dl.score > 0 ? '+' : ''}${dl.score}` : 'Одна сдача для всех — сыграйте сегодня!'}</small></div><i>${dl ? '✓' : '›'}</i></a>
  <a href="#" class="wscta" id="g_ws"><span class="cardback" data-b="${look().back}"></span><span class="cardback" data-b="${look().back}"></span><div><b>🎨 Мастерская</b><small>Рубашки, сукно, колода, аватар</small></div><i>›</i></a>
  <a href="#" class="histcta" id="g_hist"><span>📜</span><div><b>Мои сдачи</b><small>${histAll().length ? `Сохранено: ${histAll().length}. Посмотреть торговлю и розыгрыш` : 'Здесь появятся сыгранные сдачи'}</small></div><i>›</i></a>
  <a href="#" class="blitzcard" id="g_blitz"><div class="bz-bg">⚡</div><div class="bz-tag">ХИТ</div><h2>Блиц<br>60 секунд</h2><p>Заявки на скорость. Комбо, множитель, рекорд.</p><div class="bz-best">🏆 ${p.best}</div></a>
  ${GAMES.map(g => `<h3 class="gsec">${g.sec}</h3><div class="ggrid">${g.items.map(([id, em, t, d, c], i) => `<a href="#" class="gcard ${c}" id="${id}" style="--i:${i}"><span class="gem">${em}</span><b>${t}</b><small>${d}</small></a>`).join('')}</div>`).join('')}`, 'Игры');
  on('g_blitz', blitzStart); on('g_ws', workshop); on('g_hist', historyPage); on('g_daily', dailyPlay);
  GAMES.forEach(g => g.items.forEach(([id, , , , , f]) => on(id, f)));
  // Наклон карточек за пальцем/мышью
  $app.querySelectorAll('.gcard,.blitzcard').forEach(c => {
    c.onpointermove = e => { const r = c.getBoundingClientRect(); c.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg'); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 10 + 'deg'); };
    c.onpointerleave = () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); };
  });
}
// Старые меню теперь ведут в витрину игр
bidMenu = gamesHub; memMenu = gamesHub;

// ================= Навигация =================
const TABS = { theory: theoryPage, games: gamesHub };
document.querySelectorAll('nav.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelector('nav.tabs').dataset.on = b.dataset.tab;
  store.set('tab', b.dataset.tab); TABS[b.dataset.tab]();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
meChip(); $('mechip').onclick = profilePage;
const startTab = TABS[store.get('tab', 'theory')] ? store.get('tab', 'theory') : 'theory';
if (!checkHashImport()) document.querySelector(`nav.tabs button[data-tab="${startTab}"]`).click();
