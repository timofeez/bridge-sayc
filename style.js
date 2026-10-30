// Номера сдач, дилер и зональность (как в спортивном бридже / на BBO) + кастомизация внешнего вида.

// ---------- Сдачи ----------
// Зональность по номеру сдачи 1–16: '-' никто, 'NS', 'EW', 'ALL'
const VUL_TABLE = ['-', 'NS', 'EW', 'ALL', 'NS', 'EW', 'ALL', '-', 'EW', 'ALL', '-', 'NS', 'ALL', '-', 'NS', 'EW'];
const VUL_RU = { '-': 'Все до зоны', NS: 'СЮ в зоне', EW: 'ВЗ в зоне', ALL: 'Все в зоне' };
function nextBoard() { const b = store.get('board', 0) % 16 + 1; store.set('board', b); return b; }
const dealerOf = b => (b - 1) % 4; // 1 — Север, 2 — Восток, 3 — Юг, 4 — Запад
const vulOf = b => VUL_TABLE[(b - 1) % 16];
const isVul = (vul, seat) => vul === 'ALL' || (vul === 'NS' && seat % 2 === 0) || (vul === 'EW' && seat % 2 === 1);
// Компас-индикатор сдачи: красные стороны — в зоне, «Д» — дилер
function boardHtml(b) {
  const v = vulOf(b), d = dealerOf(b), L = ['С', 'В', 'Ю', 'З'], pos = ['bn', 'be', 'bs', 'bw'];
  return `<div class="board" title="${VUL_RU[v]}">${[0, 1, 2, 3].map(s => `<span class="${pos[s]}${isVul(v, s) ? ' vul' : ''}">${L[s]}${s === d ? '<i>Д</i>' : ''}</span>`).join('')}<b>${b}</b></div>`;
}
const boardInfo = b => `<div class="boardinfo">${boardHtml(b)}<div><b>Сдача ${b}</b><small>Дилер: ${SEATS[dealerOf(b)]}<br>${VUL_RU[vulOf(b)]}</small></div></div>`;

// ---------- Кастомизация ----------
const BACKS = [
  ['classic', 'Классика', 1], ['blue', 'Морская', 1], ['dots', 'Клубная', 2], ['gold', 'Золото', 3],
  ['check', 'Шахматы', 4], ['neon', 'Неон', 5], ['galaxy', 'Галактика', 6], ['royal', 'Королевская', 8],
];
const FELTS = [['green', 'Клубное сукно', '#1a7a4c'], ['blue', 'Океан', '#2a6fb0'], ['wine', 'Бордо', '#9b2c3a'], ['graphite', 'Графит', '#4a4f55'], ['purple', 'Аметист', '#6d3fb0']];
const AVATARS = ['🦉', '🦊', '🐼', '🐯', '🐸', '🦁', '🐙', '🦄', '🐧', '🐨', '🤠', '😎', '🧙', '👑'];
const look = () => store.get('look', { back: 'classic', felt: 'green', four: false, theme: 'auto', avatar: '😎', nick: 'Вы' });
function applyLook() {
  const l = look(), r = document.documentElement;
  r.dataset.back = l.back; r.dataset.felt = l.felt; r.dataset.four = l.four ? '1' : '';
  if (l.theme === 'auto') delete r.dataset.theme; else r.dataset.theme = l.theme;
}
const seatName = s => s === 2 ? `${look().avatar} ${look().nick}` : SEATS[s];
applyLook();

function workshop() {
  const l = look(), lv = levelOf(prof().xp);
  const card = (k, t, need) => `<button class="backopt ${l.back === k ? 'on' : ''} ${lv < need ? 'locked' : ''}" data-k="${k}" ${lv < need ? 'disabled' : ''}>
    <span class="cardback" data-b="${k}"></span><small>${lv < need ? `🔒 ур. ${need}` : t}</small></button>`;
  render(`<div class="hero workshop-hero"><div class="ws-fan"><span class="cardback" data-b="${l.back}"></span><span class="cardback" data-b="${l.back}"></span><span class="pcbig rs s2">A<i>♥</i></span></div>
    <h2>Мастерская</h2><p>Настройте стол под себя. Новые рубашки открываются с уровнем.</p></div>
  <div class="card"><h3 style="margin-top:0">🂠 Рубашка карт</h3><div class="backs-grid">${BACKS.map(([k, t, n]) => card(k, t, n)).join('')}</div></div>
  <div class="card"><h3 style="margin-top:0">🟩 Сукно</h3><div class="felts">${FELTS.map(([k, t, c]) => `<button class="feltopt ${l.felt === k ? 'on' : ''}" data-k="${k}" style="--c:${c}"><i></i><small>${t}</small></button>`).join('')}</div></div>
  <div class="card"><h3 style="margin-top:0">🎨 Колода</h3>
    <label class="switch"><input type="checkbox" id="four" ${l.four ? 'checked' : ''}><span></span> Четырёхцветная (как на BBO): ♣ зелёные, ♦ оранжевые</label>
    <div class="table-felt" style="margin-top:10px">${fanHtml(sortHand([{ s: 3, r: 14 }, { s: 3, r: 12 }, { s: 2, r: 13 }, { s: 2, r: 10 }, { s: 1, r: 14 }, { s: 1, r: 9 }, { s: 0, r: 13 }, { s: 0, r: 5 }]))}</div></div>
  <div class="card"><h3 style="margin-top:0">🌗 Тема</h3>${seg('theme', [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']], l.theme)}</div>
  <div class="card"><h3 style="margin-top:0">🙂 Ваш аватар</h3><div class="avatars">${AVATARS.map(a => `<button class="${l.avatar === a ? 'on' : ''}">${a}</button>`).join('')}</div>
    <p><input id="nick" maxlength="14" value="${l.nick.replace(/"/g, '')}" placeholder="Ваше имя" class="nickin"></p>
    </div>
  <div class="card"><label class="switch"><input type="checkbox" id="fxs" ${l.fx === false ? '' : 'checked'}><span></span> Плывущие масти на фоне</label></div>`, 'Мастерская', () => document.querySelector('nav.tabs button.on') ? document.querySelector('nav.tabs button.on').click() : gamesHub());
  const save = patch => { store.set('look', Object.assign(look(), patch)); applyLook(); sfx('card'); };
  $app.querySelectorAll('.backopt').forEach(b => b.onclick = () => { save({ back: b.dataset.k }); workshop(); });
  $app.querySelectorAll('.feltopt').forEach(b => b.onclick = () => { save({ felt: b.dataset.k }); workshop(); });
  $('four').onchange = e => save({ four: e.target.checked });
  wireSeg($app, () => save({ theme: segVal($app, 'theme') }));
  $app.querySelectorAll('.avatars button').forEach(b => b.onclick = () => { save({ avatar: b.textContent }); workshop(); });
  $('fxs').onchange = e => { save({ fx: e.target.checked }); bgParticles(); };
  $('nick').onchange = e => save({ nick: e.target.value.trim() || 'Вы' });
}
