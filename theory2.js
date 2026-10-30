// Дополнительные главы теории (добавляются в конец THEORY) и их виджеты.
// Источники: брошюра ACBL «SAYC System Booklet»; статьи о законе общих взяток (Larry Cohen),
// Losing Trick Count, правиле 2-3-4 и правиле 15 (Wikipedia / ACBL).
Object.assign(SOURCES, {
  lott: { name: 'Wikipedia — Law of total tricks', url: 'https://en.wikipedia.org/wiki/Law_of_total_tricks' },
  ltc: { name: 'Wikipedia — Losing-Trick Count', url: 'https://en.wikipedia.org/wiki/Losing-Trick_Count' },
  pre: { name: 'Wikipedia — Preemptive bid', url: 'https://en.wikipedia.org/wiki/Preemptive_bid' },
  r15: { name: 'Wikipedia — Pearson points (правило 15)', url: 'https://en.wikipedia.org/wiki/Hand_evaluation#Pearson_points' },
  finesse: { name: 'Wikipedia — Finesse', url: 'https://en.wikipedia.org/wiki/Finesse' },
  holdup: { name: 'Wikipedia — Hold up (bridge)', url: 'https://en.wikipedia.org/wiki/Hold_up_(bridge)' },
  bal: { name: 'Wikipedia — Balancing (bridge)', url: 'https://en.wikipedia.org/wiki/Balancing_(bridge)' },
});

THEORY.push(
  { id: 'invites', emoji: '🤝', title: 'Инвиты: приглашение в гейм', sub: 'Как пригласить и как ответить', src: ['acbl'],
    idea: 'Инвит — это «партнёр, если у тебя верх диапазона — играем гейм, если низ — остановимся». Решает тот, кто знает силу второго.',
    body: `
<h3>Главные инвиты в SAYC</h3>
<div class="steps">
<div><b>1♥ – 3♥</b> (limit raise): 10–12 очков и поддержка. Открывший с 14+ ставит 4♥, с минимумом пасует.</div>
<div><b>1БК – 2БК</b>: 8–9 очков. Открывший с 16–17 говорит 3БК, с 15 — пас.</div>
<div><b>1♠ – 2♠ – 3♠</b>: открывший показал 16–18 и спрашивает: «у тебя верх простого поднятия (8–10)?» Да — 4♠, нет — пас.</div>
<div><b>1♣ – 1♠ – 1БК – 2БК</b>: отвечающий с 11–12 приглашает. Открывший с 14 — 3БК.</div>
</div>
<h3>Гейм-трай в новой масти</h3>
<p>После <b>1♠ – 2♠</b> открывший с 16–18 может сказать новую масть: <b>1♠ – 2♠ – 3♦</b> = «помоги мне в бубнах, там у меня проигрывающие карты». Партнёр ставит гейм, если у него в бубнах туз, король, дама или короткость, и пасует / говорит 3♠, если бубны пустые.</p>
<div class="tip">💡 Правило: принимайте инвит, когда вы в верхней половине обещанного диапазона.</div>`,
    ex: [
      { q: 'Вы открыли 1♥ (у вас 14 очков). Партнёр: 3♥. Ваша заявка?', hand: 'K4 AQ963 QJ5 Q72', a: '4♥', why: '14 + 10–12 = 24–26 — принимаем: 4♥.' },
      { q: 'Вы открыли 1БК (15). Партнёр: 2БК. Ваша заявка?', hand: 'KQ4 A73 Q852 KJ4', a: 'Пас', why: '15 — минимум: 15 + 8–9 < 25, пас.' },
    ] },

  { id: 'preempts2', emoji: '🧱', title: 'Блоки и «полублоки» подробно', sub: 'Правило 2-3-4, позиция, слабые прыжки', src: ['acbl', 'pre', 'r15'],
    idea: 'Блок забирает у противников пространство. Насколько «переторговаться» — зависит от зоны, а насколько смело — от позиции.',
    body: `
<h3>Правило 2-3-4</h3>
<p>Заявляйте блок так, чтобы <b>без контракта вы были не больше чем на</b>:</p>
<div class="ladder"><div><b>2</b> взятки — вы в зоне, противники нет (неблагоприятная)</div><div><b>3</b> взятки — зона одинаковая</div><div><b>4</b> взятки — вы до зоны, противники в зоне (благоприятная)</div></div>
<h3>Позиция</h3>
<div class="steps">
<div><b>1-я и 2-я рука</b> — дисциплинированно: хорошая масть, не обманывайте партнёра.</div>
<div><b>3-я рука</b> (партнёр спасовал) — можно смелее и легче: партнёру уже не нужно ничего решать.</div>
<div><b>4-я рука</b> — блок не нужен (все спасовали). Открывайтесь только с нормальной рукой. <b>Правило 15</b>: HCP + число пик ≥ 15 → открываться.</div>
</div>
<h3>«Полублоки» — слабые прыжковые вмешательства</h3>
<p>В SAYC прыжок в своей масти после открытия противника — <b>слабый</b>: <b>1♣ – (2♠)</b> = шестёрка пик и 6–10 очков, как слабые два. Это и есть «полублок»: мешаем, но невысоко.</p>
<h3>Как отвечать на блок партнёра</h3>
<div class="steps">
<div><b>Поднятие</b> — продолжение блока, не инвит (партнёр пасует).</div>
<div><b>Новая масть</b> — форсинг на один круг.</div>
<div><b>3БК</b> — играть.</div>
<div><b>2БК на слабые два</b> — спрос силы и «фичи».</div>
</div>`,
    ex: [
      { q: 'Противник открыл 1♦. Ваша заявка? (SAYC)', hand: 'KQJ1094 73 852 43', a: '2♠', why: 'Шестёрка пик и 6 очков → слабый прыжковый оверколл 2♠.' },
      { q: '4-я рука, все спасовали. Открываться? (правило 15)', hand: 'K4 AQ963 KJ5 Q72', a: 'Да', why: '15 HCP + 2 пики = 17 ≥ 15 → открываемся 1♥.' },
    ] },

  { id: 'lott', emoji: '⚖️', title: 'Закон общих взяток', sub: 'Сколько козырей — на таком уровне и торгуйтесь', src: ['lott'],
    idea: 'В борьбе за частичную запись торгуйтесь до уровня, равного числу ваших общих козырей: 8 козырей → уровень 2, 9 → уровень 3.',
    body: `
<div class="ladder"><div><b>8</b> козырей → до 2-го уровня</div><div><b>9</b> козырей → до 3-го уровня</div><div><b>10</b> козырей → до 4-го уровня</div></div>
<p>Почему работает: чем больше у вас козырей, тем больше их и у противников в своей масти, и тем меньше вы теряете, даже если сядете.</p>
<div class="tip">💡 Например: партнёр открыл 1♥, противник вмешался. У вас 4 червы → вместе 9 → можно сразу 3♥ блоком, даже со слабой рукой.</div>
<p class="muted">Закон — ориентир для конкурентной торговли, а не правило для гейма и шлема: там важнее очки.</p>` },

  { id: 'ltc', emoji: '📉', title: 'Оценка руки: проигрывающие карты', sub: 'Losing Trick Count', src: ['ltc'],
    idea: 'Посчитайте проигрывающие карты в первых трёх картах каждой масти. Сумма проигрывающих у пары, вычтенная из 24, ≈ сколько взяток вы возьмёте.',
    body: `
<h3>Как считать (только при найденном фите)</h3>
<div class="steps">
<div>В каждой масти смотрите максимум на <b>три старшие</b> карты.</div>
<div>Каждый отсутствующий <b>туз, король, дама</b> среди них — проигрывающая карта.</div>
<div>Ренонс — 0. Синглет: туз — 0, иначе 1. Дублет: AK — 0, Ax или Kx — 1, остальное — 2.</div>
<div>Обычное открытие — около <b>7</b> проигрывающих.</div>
</div>
<div class="ladder"><div><b>24 − (Л1 + Л2)</b> ≈ взяток у пары</div></div>
<p>Пример: у вас 7 проигрывающих, у партнёра 8 → 24 − 15 = 9 взяток → контракт на уровне 3.</p>
<h3>Когда переоценить руку</h3>
<div class="steps">
<div><b>Вверх</b>: онёры в длинных мастях, хорошие промежуточные (10, 9), короткость при фите.</div>
<div><b>Вниз</b>: расклад 4-3-3-3, одинокие дамы и валеты (Qx, J), онёры в коротких мастях противника.</div>
</div>` },

  { id: 'advanced', emoji: '🔀', title: 'Реверсы, сплинтеры, четвёртая масть', sub: 'Сильные и искусственные заявки', src: ['acbl'],
    idea: 'Эти заявки показывают силу или короткость, не тратя место. Их важно узнавать с первого взгляда.',
    body: `
<h3>Реверс</h3>
<p>Открывший называет на уровне 2 масть <b>старше первой</b>: <b>1♦ – 1♠ – 2♥</b>. Партнёру для возврата в первую масть придётся идти на уровень 3, поэтому реверс обещает <b>17+</b>, причём первая масть длиннее второй. Форсинг на круг.</p>
<h3>Сплинтер</h3>
<p>Двойной прыжок в новую масть с поддержкой: <b>1♠ – 4♣</b> = четыре пики, сила на гейм и <b>синглет или ренонс в трефах</b>. Помогает понять, совпадают ли карты для шлема: туз против синглета — хорошо, KQJ против синглета — потрачено зря.</p>
<h3>Четвёртая масть — форсинг</h3>
<p>Если названы три масти, а отвечающий называет четвёртую (<b>1♦ – 1♥ – 1♠ – 2♣</b>), это искусственная заявка: «у меня сила на гейм, но непонятно куда, расскажи ещё». Держки в этой масти она не обещает.</p>`,
    ex: [
      { q: '1♦ – 1♠ – ? Вы открыли, у вас 19 очков. Ваша заявка?', hand: 'A4 AQ73 KQJ84 K3', a: '2♥', why: 'Ниже пик четвёрка червей и 17+ → реверс 2♥.' },
    ] },

  { id: 'balance', emoji: '🪂', title: 'Балансирование в 4-й руке', sub: 'Не дайте противникам сыграть дёшево', src: ['bal'],
    idea: 'Если противник открылся, а после этого два паса — вы в «балансирующей» позиции. Здесь можно вступать с меньшей силой: партнёр, скорее всего, тоже что-то имеет.',
    body: `
<div class="steps">
<div>Ситуация: <b>1♥ – пас – пас – ?</b> Вы последний. Если спасуете — противники сыграют 1♥.</div>
<div>Вступайте примерно на <b>3 очка слабее</b> обычного: «одалживаем короля у партнёра».</div>
<div>Своя пятёрка — с 7–8 очков. Контра — с 9–10 и короткостью в их масти. 1БК в этой позиции часто играют как 11–14.</div>
<div>Партнёр, помни: твой балансирующий партнёр мог «одолжить» твои очки — не завышай ответ.</div>
</div>
<p class="muted">Точные границы — договорённость пары; SAYC здесь отдельных правил не задаёт.</p>` },

  { id: 'play', emoji: '🎯', title: 'Розыгрыш: план, импас, хольдап', sub: 'Как брать свои взятки', src: ['finesse', 'holdup'],
    idea: 'Перед первой картой из болвана — остановитесь и составьте план: сколько взяток есть сразу и где взять недостающие.',
    body: `
<h3>План</h3>
<div class="steps">
<div><b>В БК</b>: посчитайте <b>верные взятки</b> (тузы, короли за тузами…). Не хватает — ищите, где разыграть длинную масть или импас.</div>
<div><b>В масти</b>: посчитайте <b>проигрывающие</b> в длинной руке. Слишком много — избавляйтесь: сбросы, импас, ruff (подрезка) в короткой руке.</div>
</div>
<h3>Импас</h3>
<p>Есть <b>AQ</b> в болване, мелкая на руке. Ходите <b>к</b> AQ: если король у противника слева (он ходит перед болваном), кладёте даму — она берёт. Шанс ≈ 50%.</p>
<p><b>«8 ever, 9 never»</b>: без дамы с 8 картами — импасируйте, с 9 — бейте сверху (A и K), надеясь, что дама упадёт.</p>
<h3>Хольдап (пропуск) в БК</h3>
<p>Противник вышел в длинную масть, у вас A x x. Не берите сразу — пропустите один-два раза. Тогда у его партнёра кончатся карты этой масти, и когда тот войдёт во взятку, он не сможет вернуть её.</p>
<h3>Козыри</h3>
<p>Обычно снимайте козыри противников сразу, чтобы они не подрезали ваши взятки. Исключение — когда нужна подрезка в короткой (болванной) руке: сначала подрежьте.</p>` },
);

// Какие виджеты показать в новых главах
const EXTRA_WIDGET = { invites: 'invite', preempts2: 'rule234', lott: 'lottw', ltc: 'ltcw', play: 'winners' };

// Подсчёт проигрывающих карт (LTC) по масти
function ltcSuit(cards) {
  const n = cards.length; if (!n) return 0;
  const top = cards.map(c => c.r).sort((a, b) => b - a).slice(0, 3), has = r => top.includes(r);
  if (n === 1) return has(14) ? 0 : 1;
  if (n === 2) return (has(14) ? 0 : 1) + (has(13) ? 0 : 1);
  return (has(14) ? 0 : 1) + (has(13) ? 0 : 1) + (has(12) ? 0 : 1);
}
const ltcHand = h => [0, 1, 2, 3].reduce((t, s) => t + ltcSuit(h.filter(c => c.s === s)), 0);

const EXTRA_WIDGETS = {
  invite(w) {
    w.innerHTML = red(`<div class="wtitle">🎚 Принять инвит?</div>
    ${seg('sc', [['lim', '1♥–3♥'], ['nt', '1БК–2БК'], ['raise', '1♠–2♠ (вы)']], 'lim')}
    <div class="slider"><input type="range" min="12" max="21" value="14" id="ivv"><div class="sval"><b id="ivn">14</b> у вас</div></div><div class="wres"></div>`);
    const upd = () => {
      const sc = segVal(w, 'sc'), inp = w.querySelector('#ivv');
      if (sc === 'nt') { inp.min = 15; inp.max = 17; } else { inp.min = 12; inp.max = 21; }
      const v = +inp.value; w.querySelector('#ivn').textContent = v;
      let b, y;
      if (sc === 'lim') { b = v >= 14 ? '4♥' : 'Пас'; y = `Партнёр 10–12. Вместе ${v + 10}–${v + 12}. ${v >= 14 ? 'Хватает на гейм.' : 'Минимум — останавливаемся в 3♥.'}`; }
      else if (sc === 'nt') { b = v >= 16 ? '3БК' : 'Пас'; y = `Партнёр 8–9. Вместе ${v + 8}–${v + 9}. ${v >= 16 ? 'Не минимум — гейм.' : 'Минимум — пас.'}`; }
      else { b = v >= 19 ? '4♠' : v >= 16 ? '3♠ или гейм-трай' : 'Пас'; y = `Партнёр 6–10. ${v >= 19 ? 'Гейм без вопросов.' : v >= 16 ? 'Приглашаем: партнёр с 8–10 скажет 4♠.' : 'Гейма почти нет — пас.'}`; }
      bigAnswer(w.querySelector('.wres'), b, y);
    };
    w.querySelector('#ivv').oninput = upd; wireSeg(w, upd); upd();
  },
  rule234(w) {
    w.innerHTML = red(`<div class="wtitle">🧱 Правило 2-3-4: до какого уровня блокировать?</div>
    ${seg('v', [['2', 'Мы в зоне, они нет'], ['3', 'Зона равная'], ['4', 'Мы до зоны, они в зоне']], '3')}
    <div class="slider"><input type="range" min="4" max="8" value="6" id="rv"><div class="sval"><b id="rn">6</b> взяток</div></div>
    <p class="muted" style="margin:4px 0">Сколько взяток рука возьмёт сама в своей масти</p><div class="wres"></div>`);
    const upd = () => {
      const o = +segVal(w, 'v'), t = +w.querySelector('#rv').value; w.querySelector('#rn').textContent = t;
      const lvl = Math.min(5, t + o - 6);
      bigAnswer(w.querySelector('.wres'), lvl >= 1 ? `до уровня ${lvl}` : 'не блокировать', `${t} взяток + ${o} «в долг» = ${t + o} → контракт на ${t + o} взяток = уровень ${t + o - 6}.`);
    };
    w.querySelector('#rv').oninput = upd; wireSeg(w, upd); upd();
  },
  lottw(w) {
    w.innerHTML = red(`<div class="wtitle">⚖️ Сколько у нас козырей?</div>
    ${seg('p', [['5', 'Партнёр: 1♥ (5+)'], ['6', 'Партнёр: 2♥ слабые (6)'], ['4', 'Партнёр: поддержал (4)']], '5')}
    <div class="slider"><input type="range" min="2" max="6" value="3" id="lv"><div class="sval"><b id="ln">3</b> у вас</div></div><div class="wres"></div>`);
    const upd = () => {
      const p = +segVal(w, 'p'), m = +w.querySelector('#lv').value; w.querySelector('#ln').textContent = m;
      const t = p + m;
      bigAnswer(w.querySelector('.wres'), t >= 8 ? `${t} козырей → уровень ${Math.min(t - 6, 5)}` : `${t} козырей — фита нет`, t >= 8 ? `В конкурентной торговле можно бороться до ${Math.min(t - 6, 5)}-го уровня.` : 'Без 8 козырей бороться в этой масти рискованно.');
    };
    w.querySelector('#lv').oninput = upd; wireSeg(w, upd); upd();
  },
  ltcw(w) {
    const h = deal()[0], L = ltcHand(h);
    const opts = shuffle([L, L + 1, L - 1, L + 2].filter(x => x >= 0 && x <= 12));
    w.innerHTML = red(`<div class="wtitle">📉 Сколько проигрывающих карт?</div>${handHtml(h)}<div class="exopts">${opts.map(o => `<button>${o}</button>`).join('')}</div><div class="wres"></div><button class="btn ghost wnew">🔄 Другая рука</button>`);
    w.querySelectorAll('.exopts button').forEach(b => b.onclick = () => {
      const ok = +b.textContent === L; b.classList.add(ok ? 'ok' : 'bad'); w.querySelectorAll('.exopts button').forEach(x => x.disabled = true);
      const per = [3, 2, 1, 0].map(s => `${SUITS[s]} ${ltcSuit(h.filter(c => c.s === s))}`).join(' · ');
      w.querySelector('.wres').innerHTML = red(`<div class="fb ${ok ? 'ok' : 'bad'}">${L} проигрывающих: ${per}</div>`);
      ok ? reward(5, b) : oops();
    });
    w.querySelector('.wnew').onclick = () => EXTRA_WIDGETS.ltcw(w);
  },
  // Верные взятки в масти: N и S держат карты одной масти
  winners(w) {
    const s = Math.floor(Math.random() * 4);
    let n, sh;
    do {
      const cards = shuffle([...Array(13)].map((_, i) => i + 2)).slice(0, 4 + Math.floor(Math.random() * 4));
      n = cards.slice(0, Math.ceil(cards.length / 2)).sort((a, b) => b - a); sh = cards.slice(Math.ceil(cards.length / 2)).sort((a, b) => b - a);
    } while (!n.concat(sh).includes(14));
    const ours = new Set(n.concat(sh));
    let top = 0; for (let r = 14; r >= 2 && ours.has(r); r--) top++;
    const sure = Math.min(top, Math.max(n.length, sh.length));
    const opts = shuffle([...new Set([sure, sure + 1, Math.max(0, sure - 1), sure + 2])]);
    const row = a => a.map(r => rankName(r)).join(' ');
    w.innerHTML = red(`<div class="wtitle">🎯 Сколько верных взяток в этой масти (без импасов)?</div>
    <div class="suitq"><div>Север: <b>${SUITS[s]} ${row(n)}</b></div><div>Юг: <b>${SUITS[s]} ${row(sh)}</b></div></div>
    <div class="exopts">${opts.map(o => `<button>${o}</button>`).join('')}</div><div class="wres"></div><button class="btn ghost wnew">🔄 Другая масть</button>`);
    w.querySelectorAll('.exopts button').forEach(b => b.onclick = () => {
      const ok = +b.textContent === sure; b.classList.add(ok ? 'ok' : 'bad'); w.querySelectorAll('.exopts button').forEach(x => x.disabled = true);
      w.querySelector('.wres').innerHTML = red(`<div class="fb ${ok ? 'ok' : 'bad'}">Старших подряд у пары: ${top}, но взяток не больше длины длинной руки (${Math.max(n.length, sh.length)}) → ${sure}.</div>`);
      ok ? reward(5, b) : oops();
    });
    w.querySelector('.wnew').onclick = () => EXTRA_WIDGETS.winners(w);
  },
};
