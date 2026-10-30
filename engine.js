// Упрощённый движок торговли SAYC (без вмешательства противников).
// Масти: 0 ♣, 1 ♦, 2 ♥, 3 ♠; деноминация 4 = БК.
const SUITS = ['♣', '♦', '♥', '♠'];
const STR = ['C', 'D', 'H', 'S', 'N'];
const STR_RU = ['♣', '♦', '♥', '♠', 'БК'];
const RANKS = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: '10' };
const rankName = r => RANKS[r] || String(r);

function newDeck() { const d = []; for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ s, r }); return d; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sortHand(h) { return h.slice().sort((a, b) => b.s - a.s || b.r - a.r); }
function deal() { const d = shuffle(newDeck()); return [0, 1, 2, 3].map(i => sortHand(d.slice(i * 13, i * 13 + 13))); }

function evalHand(h) {
  const len = [0, 0, 0, 0]; let hcp = 0;
  for (const c of h) { len[c.s]++; if (c.r > 10) hcp += c.r - 10; }
  const shape = len.slice().sort((a, b) => b - a).join('');
  const balanced = ['4333', '4432', '5332'].includes(shape);
  const top2 = len.slice().sort((a, b) => b - a);
  const lp = hcp + len.reduce((t, l) => t + Math.max(0, l - 4), 0);
  return { len, hcp, balanced, shape, rule20: hcp + top2[0] + top2[1], lp };
}
const honorsIn = (h, s, min = 10) => h.filter(c => c.s === s && c.r >= min).length;
const hasCard = (h, s, r) => h.some(c => c.s === s && c.r === r);
function shortPts(e, trump) { let p = 0; e.len.forEach((l, s) => { if (s === trump) return; if (l === 0) p += 5; else if (l === 1) p += 3; else if (l === 2) p += 1; }); return p; }

// Заявки: '1C' ... '7N', 'P'
const bidVal = b => (b === 'P' || b === 'X' || b === 'XX' ? -1 : (+b[0]) * 5 + STR.indexOf(b[1]));
const mk = (lvl, st) => lvl + STR[st];
const strainOf = b => STR.indexOf(b[1]);
const lvlOf = b => +b[0];
function cheapest(st, last) { for (let l = 1; l <= 7; l++) { const b = mk(l, st); if (bidVal(b) > bidVal(last || 'P')) return b; } return 'P'; }
function bidRu(b) { if (b === 'P') return 'Пас'; if (b === 'X') return 'Контра'; if (b === 'XX') return 'Реконтра'; return b[0] + STR_RU[strainOf(b)]; }
const R = (bid, why, alts = []) => ({ bid, why, alts });

// ---------- Открытие ----------
function opening(h) {
  const e = evalHand(h), L = e.len;
  if (e.balanced && e.hcp >= 25 && e.hcp <= 27) return R('3N', `${e.hcp} HCP, сбалансированная → 3БК (25–27).`);
  if (e.hcp >= 22) return R('2C', `${e.hcp} HCP → сильное искусственное 2♣ (22+).`);
  if (e.balanced && e.hcp >= 20) return R('2N', `${e.hcp} HCP, сбалансированная → 2БК (20–21).`);
  if (e.balanced && e.hcp >= 15 && e.hcp <= 17) return R('1N', `${e.hcp} HCP, сбалансированная (${e.shape.split('').join('-')}) → 1БК (15–17).`);
  if (e.hcp >= 12 || (e.hcp >= 10 && e.rule20 >= 20)) {
    const extra = e.hcp < 12 ? ` (правило 20: ${e.hcp}+${e.rule20 - e.hcp} = ${e.rule20})` : '';
    let best = -1;
    for (let s = 3; s >= 0; s--) if (L[s] >= 5 && (best < 0 || L[s] > L[best])) best = s;
    if (best >= 0) return R(mk(1, best), `${e.hcp} HCP${extra}. Самая длинная масть — ${L[best]} ${SUITS[best]}${best >= 2 ? '' : ', пятикартного мажора нет'}; при равной длине открываем старшую.`);
    if (L[1] > L[0]) return R('1D', `${e.hcp} HCP${extra}. Нет пятикартного мажора — открываем более длинный минор: 1♦.`);
    if (L[0] > L[1]) return R('1C', `${e.hcp} HCP${extra}. Нет пятикартного мажора — открываем более длинный минор: 1♣.`);
    return L[0] >= 4 ? R('1D', `${e.hcp} HCP${extra}. Миноры 4-4 → 1♦.`) : R('1C', `${e.hcp} HCP${extra}. Миноры 3-3 → 1♣.`);
  }
  for (let s = 3; s >= 0; s--) {
    if (L[s] >= 7 && e.hcp >= 5 && e.hcp <= 10) return R(s >= 2 && L[s] >= 8 ? mk(4, s) : mk(3, s), `${e.hcp} HCP и ${L[s]} карт в ${SUITS[s]} → блок.`, [mk(3, s), mk(4, s)]);
    if (s >= 1 && L[s] === 6 && e.hcp >= 5 && e.hcp <= 11 && honorsIn(h, s) >= 2)
      return R(mk(2, s), `${e.hcp} HCP, хорошая шестикартная ${SUITS[s]} → слабые два.`);
  }
  return R('P', `${e.hcp} HCP — для открытия мало (нужно 12+ или правило 20; для слабых двух — хорошая шестикартная масть).`);
}

// ---------- Ответ партнёру ----------
function respond(h, o) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  if (o === '1N') {
    const M = L[3] >= 5 && L[3] >= L[2] ? 3 : L[2] >= 5 ? 2 : -1;
    if (M >= 0) return R(M === 2 ? '2D' : '2H', `${L[M]} карт в ${SUITS[M]} → трансфер Якоби (${M === 2 ? '2♦ → черви' : '2♥ → пики'}), при любой силе.`, hcp >= 8 && (L[2] === 4 || L[3] === 4) ? ['2C'] : []);
    if ((L[2] === 4 || L[3] === 4) && hcp >= 8) return R('2C', `${hcp} HCP и четырёхкартный мажор → Стейман 2♣.`);
    if (hcp <= 7) return R('P', `${hcp} HCP — шансов на гейм нет (0–7) → пас.`);
    if (hcp <= 9) return R('2N', `${hcp} HCP → инвит 2БК (8–9).`);
    if (hcp <= 15) return R('3N', `${hcp} HCP → 3БК (10–15).`);
    if (hcp <= 17) return R('4N', `${hcp} HCP → количественные 4БК (инвит в шлем).`);
    return R('6N', `${hcp} HCP → малый шлем 6БК.`);
  }
  if (o === '2N') {
    const M = L[3] >= 5 && L[3] >= L[2] ? 3 : L[2] >= 5 ? 2 : -1;
    if (M >= 0 && hcp >= 0) return R(M === 2 ? '3D' : '3H', `Пятикартный мажор → трансфер на уровне 3.`);
    if ((L[2] === 4 || L[3] === 4) && hcp >= 4) return R('3C', `Четырёхкартный мажор и 4+ HCP → Стейман 3♣.`);
    if (hcp >= 4 && hcp <= 10) return R('3N', `${hcp} HCP (4–10) → 3БК.`);
    if (hcp > 10) return R('6N', `${hcp} HCP + 20–21 у партнёра ≈ 33 → 6БК.`, ['4N']);
    return R('P', `${hcp} HCP — пас.`);
  }
  if (o === '2C') {
    for (let s = 3; s >= 0; s--) if (L[s] >= 5 && hcp >= 8 && (hasCard(h, s, 14) + hasCard(h, s, 13) + hasCard(h, s, 12)) >= 2)
      return R(s >= 2 ? mk(2, s) : mk(3, s), `8+ HCP и хорошая пятикартная масть → позитивный ответ.`, ['2D']);
    if (hcp >= 8 && e.balanced) return R('2N', `${hcp} HCP, сбалансированная → позитив 2БК.`, ['2D']);
    return R('2D', `Нет позитива → ждущий 2♦.`);
  }
  const os = strainOf(o), lvl = lvlOf(o);
  if (lvl >= 4) return R('P', 'Партнёр открыл гейм-блоком → пас.');
  if (lvl >= 3) {
    if (os >= 2 && L[os] >= 2 && hcp >= 16) return R(mk(4, os), `${hcp} HCP и поддержка → гейм.`);
    if (os < 2 && hcp >= 16 && e.balanced) return R('3N', `${hcp} HCP с держками → 3БК.`);
    return R('P', `После блока партнёра без сильной руки — пас.`);
  }
  if (lvl === 2) { // слабые два
    if (L[os] >= 3 && hcp >= 16 && os >= 2) return R(mk(4, os), `${hcp} HCP и фит → гейм.`, ['2N']);
    if (hcp >= 15) return R('2N', `${hcp} HCP → 2БК, спрос фичи.`);
    if (L[os] >= 3) return R(mk(3, os), `Фит 3+ карты, слабая рука → блокирующее поднятие.`, ['P']);
    return R('P', `Без фита и без силы — пас.`);
  }
  // 1 в масти
  if (os >= 2) {
    const sup = L[os], pts = hcp + (sup >= 3 ? shortPts(e, os) : 0);
    if (hcp < 6 && !(sup >= 5)) return R('P', `${hcp} HCP — меньше 6 → пас.`);
    if (sup >= 4 && hcp >= 13) return R('2N', `${hcp} HCP и ${sup} карты поддержки → Якоби 2БК (форсинг до гейма).`);
    if (sup >= 5 && hcp <= 9) return R(mk(4, os), `${sup} карт поддержки, слабая рука → блокирующее 4${SUITS[os]}.`, [mk(2, os)]);
    if (sup >= 3 && pts >= 10 && pts <= 12) return R(mk(3, os), `${pts} очков с учётом короткостей и ${sup} козыря → limit raise 3${SUITS[os]} (10–12).`, pts === 10 ? [mk(2, os)] : []);
    if (sup >= 3 && pts >= 6 && pts <= 9) return R(mk(2, os), `${pts} очков, ${sup} козыря → простое поднятие 2${SUITS[os]} (6–10).`);
    if (os === 2 && L[3] >= 4) return R('1S', `4+ пики, ${hcp} HCP → 1♠ (форсинг на круг).`);
    if (hcp >= 10) {
      let t = -1;
      for (let s = os - 1; s >= 0; s--) if (L[s] >= (s === 2 ? 5 : 4) && (t < 0 || L[s] > L[t])) t = s;
      if (t >= 0) return R(mk(2, t), `${hcp} HCP, ${L[t]} карт в ${SUITS[t]} → 2 над 1 (10+, форсинг).`);
      if (hcp <= 12) return R('2C', `${hcp} HCP без подходящей длинной масти — 2♣ (может быть 3 карты).`, ['1N']);
    }
    return R('1N', `${hcp} HCP (6–10), нет поддержки${os === 2 ? ' и четырёх пик' : ''} → 1БК.`);
  }
  // 1♣ / 1♦
  if (hcp < 6) return R('P', `${hcp} HCP — меньше 6 → пас.`);
  if (L[2] >= 4 || L[3] >= 4) {
    const s = L[3] > L[2] ? 3 : L[2] > L[3] ? 2 : (L[2] >= 5 ? 3 : 2);
    const alts = os === 0 && L[1] >= 5 && L[1] > L[s] && hcp >= 11 ? ['1D'] : [];
    return R(mk(1, s), `Четырёхкартный+ мажор → ${bidRu(mk(1, s))}. ${L[2] === 4 && L[3] === 4 ? 'С 4-4 называем снизу вверх: 1♥.' : ''}`, alts);
  }
  if (os === 0 && L[1] >= 4) return R('1D', `4+ бубны, нет мажора → 1♦.`);
  if (e.balanced && hcp >= 13 && hcp <= 15) return R('2N', `${hcp} HCP, сбалансированная → 2БК (13–15).`);
  if (e.balanced && hcp >= 16 && hcp <= 18) return R('3N', `${hcp} HCP, сбалансированная → 3БК (16–18).`);
  const need = os === 1 ? 4 : 5;
  if (L[os] >= need && hcp <= 10) return R(mk(2, os), `${L[os]} карт поддержки, ${hcp} очков → простое поднятие.`, ['1N']);
  if (L[os] >= need && hcp <= 12) return R(mk(3, os), `${L[os]} карт поддержки, ${hcp} очков → инвит 3${SUITS[os]} (10–12).`);
  if (hcp <= 10) return R('1N', `${hcp} HCP, нет мажора → 1БК (6–10).`);
  if (os === 1 && L[0] >= 4) return R('2C', `${hcp} HCP, 4+ трефы → 2♣ (10+).`);
  return R(mk(2, os === 1 ? 0 : 1), `${hcp} HCP — новая масть на уровне 2 (10+).`, ['2N']);
}

// ---------- Повторная заявка открывшего ----------
function openerRebid(h, o, r) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const os = strainOf(o), rs = r === 'P' ? -1 : strainOf(r), rl = r === 'P' ? 0 : lvlOf(r);
  if (r === 'P') return null;
  if (o === '1N') {
    if (r === '2C') return L[2] >= 4 ? R('2H', 'Есть четыре черви → 2♥.') : L[3] >= 4 ? R('2S', 'Четыре пики (без четырёх червей) → 2♠.') : R('2D', 'Нет четырёхкартного мажора → 2♦.');
    if (r === '2D' || r === '2H') { const M = r === '2D' ? 2 : 3; return hcp === 17 && L[M] >= 4 ? R(mk(3, M), 'Максимум и 4 козыря → супер-акцепт.', [mk(2, M)]) : R(mk(2, M), `Выполняем трансфер → 2${SUITS[M]}.`); }
    if (r === '2S') return R('3C', '2♠ просит сказать 3♣.');
    if (r === '2N') return hcp >= 16 ? R('3N', `${hcp} HCP — не минимум → 3БК.`) : R('P', `${hcp} HCP — минимум → пас.`);
    if (r === '4C') { const a = h.filter(c => c.r === 14).length; return R(['4D', '4H', '4S', '4N', '4D'][a], `Гербер: ${a} туз(а).`); }
    if (r === '4N') return hcp === 17 ? R('6N', 'Максимум → 6БК.') : R('P', 'Не максимум → пас.');
    return R('P', 'Партнёр поставил контракт → пас.');
  }
  if (o === '2N') {
    if (r === '3C') return L[2] >= 4 ? R('3H', '4 червы.') : L[3] >= 4 ? R('3S', '4 пики.') : R('3D', 'Нет мажора.');
    if (r === '3D') return R('3H', 'Трансфер → 3♥.');
    if (r === '3H') return R('3S', 'Трансфер → 3♠.');
    return R('P', 'Пас.');
  }
  if (o === '2C') {
    if (e.balanced && hcp <= 24) return R(cheapest(4, r), `22–24, сбалансированная → БК.`);
    if (e.balanced) return R('3N', '25–27 → 3БК.');
    let s = L.indexOf(Math.max(...L)); return R(cheapest(s, r), `Называем длинную масть ${SUITS[s]}.`);
  }
  if (lvlOf(o) >= 2) { // слабые два / блок
    if (r === '2N') {
      if (hcp <= 8) return R(mk(3, os), 'Минимум → повтор масти на уровне 3.');
      for (let s = 0; s < 4; s++) if (s !== os && (hasCard(h, s, 14) || hasCard(h, s, 13))) { const b = cheapest(s, r); if (lvlOf(b) === 3) return R(b, `Максимум, «фича» (туз/король) в ${SUITS[s]}.`); }
      return R(mk(3, os), 'Максимум без фичи → повтор масти.');
    }
    if (rs !== os && rs < 4 && rl <= 3) return L[rs] >= 3 ? R(cheapest(rs, r), 'Новая масть — форсинг; с поддержкой поднимаем.') : R(cheapest(os, r), 'Новая масть — форсинг; без поддержки повторяем свою.');
    return R('P', 'Пас.');
  }
  // открытие на уровне 1 в масти
  const major = os >= 2;
  const tp = hcp + (L[os] > 5 ? L[os] - 5 : 0);
  if (rs === os && rl === 2) return major ? (tp >= 19 ? R(mk(4, os), `${tp} очков → гейм.`) : tp >= 16 ? R(mk(3, os), `${tp} очков → инвит 3${SUITS[os]}.`) : R('P', `${tp} очков, минимум → пас.`)) : (hcp >= 18 && e.balanced ? R('3N', '18+ → 3БК.') : R('P', 'Минимум → пас.'));
  if (rs === os && rl === 3) return major ? (tp >= 14 ? R(mk(4, os), `${tp} очков — принимаем инвит.`) : R('P', 'Минимум — пас.')) : (hcp >= 14 ? R('3N', 'Принимаем инвит → 3БК.') : R('P', 'Пас.'));
  if (rs === os && rl >= 4) return R('P', 'Гейм поставлен → пас.');
  if (r === '2N' && major) {
    for (let s = 0; s < 4; s++) if (s !== os && L[s] <= 1) return R(mk(3, s), `Якоби: синглет/ренонс в ${SUITS[s]}.`);
    if (hcp >= 18) return R(mk(3, os), 'Якоби: 18+ без короткостей.');
    if (hcp >= 15) return R('3N', 'Якоби: 15–17 без короткостей.');
    return R(mk(4, os), 'Якоби: минимум без короткостей.');
  }
  if (r === '2N') return R('3N', 'Партнёр показал 13–15 → 3БК.');
  if (r === '3N' || rl >= 4) return R('P', 'Партнёр поставил контракт → пас.');
  if (r === '1N') {
    if (e.balanced) return hcp >= 19 ? R('3N', '18–19 + 6–10 → 3БК.') : hcp >= 18 ? R('2N', '18 → инвит 2БК.') : R('P', 'Сбалансированный минимум → пас.');
    if (L[os] >= 6) return hcp >= 16 ? R(mk(3, os), '16–18 и шестикартная → прыжок.') : R(mk(2, os), 'Шестикартная масть → повтор на 2.');
    for (let s = os - 1; s >= 0; s--) if (L[s] >= 4) return R(mk(2, s), `Вторая масть ${SUITS[s]} (ниже первой) → не реверс.`);
    for (let s = 3; s > os; s--) if (L[s] >= 4 && hcp >= 17) return R(mk(2, s), `17+ → реверс в ${SUITS[s]}.`);
    return R(mk(2, os), 'Повтор масти.', ['P']);
  }
  // партнёр назвал новую масть
  if (rs < 4 && rs !== os) {
    if (rs >= 2 && L[rs] >= 4) {
      const p = hcp + shortPts(e, rs);
      const b = cheapest(rs, r);
      if (p >= 19) return R(mk(4, rs), `${p} очков и 4 козыря → гейм.`);
      if (p >= 16) return R(mk(lvlOf(b) + 1, rs), `${p} очков и 4 козыря → прыжковое поднятие.`);
      return R(b, `Минимум и 4 карты поддержки → простое поднятие.`);
    }
    if (rl === 2 && rs >= 2 && L[rs] >= 3) return R(cheapest(rs, r), 'Поддержка 3 карты в мажоре партнёра (он показал 5) → поднятие.');
    if (e.balanced && rl === 1) return hcp <= 14 ? R('1N', '12–14, сбалансированная → 1БК.') : hcp >= 18 ? R('2N', '18–19, сбалансированная → 2БК прыжком.') : R(L[os] >= 5 ? mk(2, os) : '1N', 'Повтор.');
    if (rl === 1) for (let s = 3; s > rs; s--) if (s !== os && L[s] >= 4) return R(mk(1, s), `Четыре ${SUITS[s]} → называем на уровне 1.`);
    if (L[os] >= 6) { const b = cheapest(os, r); return hcp >= 16 ? R(mk(lvlOf(b) + 1, os), '16–18 и шестикартная → прыжок.') : R(b, 'Шестикартная → повтор масти.'); }
    for (let s = os - 1; s >= 0; s--) if (s !== rs && L[s] >= 4) { const b = cheapest(s, r); if (lvlOf(b) <= 2) return R(b, `Вторая масть ${SUITS[s]} → без реверса.`); }
    for (let s = 3; s > os; s--) if (s !== rs && L[s] >= 4 && hcp >= 17) { const b = cheapest(s, r); if (lvlOf(b) <= 2) return R(b, '17+ → реверс.'); }
    if (e.balanced && rl === 2) return hcp >= 15 ? R('3N', 'Сбалансированная 15+ → 3БК.') : R('2N', 'Сбалансированная минимальная → 2БК.');
    if (L[rs] >= 3 && rs < 2) return R(cheapest(rs, r), 'Поддержка минора партнёра.');
    if (rl === 1 && hcp <= 14 && L[os] < 6) return R('1N', 'Минимум без второй масти → 1БК.');
    return R(cheapest(os, r), 'Повтор своей масти.');
  }
  return null;
}

// ---------- Вторая заявка отвечающего (упрощённо) ----------
function responderRebid(h, o, r, o2) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  if (o2 === 'P') return null;
  const last = o2, os = strainOf(o), s2 = strainOf(o2);
  if (lvlOf(o2) >= 4 && s2 !== 4 || o2 === '3N' || o2 === '6N') return R('P', 'Открывший поставил контракт → пас.');
  if (o === '1N') {
    if (r === '2C') {
      const fit = (o2 === '2H' && L[2] >= 4) ? 2 : (o2 === '2S' && L[3] >= 4) ? 3 : -1;
      if (fit >= 0) return hcp >= 10 ? R(mk(4, fit), 'Фит в мажоре, 10+ → гейм.') : R(mk(3, fit), 'Фит в мажоре, 8–9 → инвит.');
      return hcp >= 10 ? R('3N', 'Фита нет, 10+ → 3БК.') : R('2N', 'Фита нет, 8–9 → 2БК.');
    }
    if (r === '2D' || r === '2H') {
      const M = r === '2D' ? 2 : 3;
      if (lvlOf(o2) === 3) return hcp >= 6 ? R(mk(4, M), 'После супер-акцепта → гейм.') : R('P', 'Пас.');
      if (hcp <= 7) return R('P', 'Слабая рука → играем 2 в мажоре.');
      if (hcp <= 9) return L[M] >= 6 ? R(mk(3, M), 'Шестикартная, 8–9 → инвит 3.') : R('2N', 'Пятикартная, 8–9 → 2БК.');
      return L[M] >= 6 ? R(mk(4, M), 'Шестикартная, 10+ → гейм.') : R('3N', 'Пятикартная, 10+ → 3БК (открывший выберет).');
    }
    if (r === '2S') return L[0] >= 6 ? R('P', 'Играем 3♣.') : R('3D', 'Сайн-офф 3♦.');
    return R('P', 'Пас.');
  }
  if (o === '2N') {
    if (r === '3D' || r === '3H') { const M = r === '3D' ? 2 : 3; return hcp >= 4 ? (L[M] >= 6 ? R(mk(4, M), 'Гейм.') : R('3N', '3БК — выбор за открывшим.')) : R('P', 'Пас.'); }
    if (r === '3C') { const fit = (o2 === '3H' && L[2] >= 4) ? 2 : (o2 === '3S' && L[3] >= 4) ? 3 : -1; return fit >= 0 ? R(mk(4, fit), 'Фит → гейм.') : R('3N', '3БК.'); }
    return R('P', 'Пас.');
  }
  if (o === '2C') {
    if (s2 < 4 && L[s2] >= 3) return s2 >= 2 ? R(mk(4, s2), 'Поддержка в мажоре → гейм.') : R('3N', '3БК.');
    if (s2 === 4) return hcp >= 3 ? R(cheapest(4, last).startsWith('3') ? '3N' : 'P', '3БК с 3+ HCP.') : R('P', 'Пас.');
    return R(cheapest(4, last), 'Без фита — БК.');
  }
  if (lvlOf(o) >= 2) {
    if (r === '2N') return lvlOf(o2) === 3 && s2 === os ? R('P', 'Открывший с минимумом → пас.') : (os >= 2 ? R(mk(4, os), 'Максимум у партнёра → гейм.') : R('3N', '3БК.'));
    return R('P', 'Пас.');
  }
  // Открытие 1 в масти. Ориентир силы открывшего по повторной заявке
  if (r === '2N' && os >= 2) return R(mk(4, os), 'После ответа на Якоби — гейм в мажоре (шлемовые исследования — отдельная тема).');
  const rs = strainOf(r);
  let est = 13; const jumped = lvlOf(o2) > lvlOf(cheapest(s2, r));
  if (jumped) est = 17; if (o2 === '2N' && lvlOf(r) === 1) est = 18; if (o2 === '1N') est = 13;
  if (o2 === '2N' && lvlOf(r) === 2) est = 13;
  if (s2 > os && s2 < 4 && lvlOf(o2) === 2 && lvlOf(r) === 1 && s2 !== rs) est = 17; // реверс
  const tot = hcp + est;
  const myFit = (s2 === rs && rs < 4) ? rs : (os >= 2 && L[os] >= 3) ? os : (s2 >= 2 && s2 < 4 && L[s2] >= 4) ? s2 : -1;
  const hint = ` (у партнёра ≈${est}, вместе ≈${tot})`;
  if (myFit >= 2) {
    if (tot >= 25) return bidVal(mk(4, myFit)) > bidVal(last) ? R(mk(4, myFit), `Фит в ${SUITS[myFit]}${hint} → гейм.`) : R('P', 'Гейм уже заявлен → пас.');
    if (tot >= 23 && bidVal(mk(3, myFit)) > bidVal(last)) return R(mk(3, myFit), `Фит в ${SUITS[myFit]}${hint} → инвит.`);
    if (s2 === myFit) return R('P', `Фит найден${hint} → пас.`);
    const b = cheapest(myFit, last); return lvlOf(b) <= 2 ? R(b, `Фит${hint} → преференция.`) : R('P', 'Пас.');
  }
  if (tot >= 25) return bidVal('3N') > bidVal(last) ? R('3N', `Фита в мажоре нет${hint} → 3БК.`) : R('P', 'Пас.');
  if (tot >= 23 && bidVal('2N') > bidVal(last)) return R('2N', `Фита нет${hint} → инвит 2БК.`);
  if (s2 !== os && s2 < 4 && L[os] > L[s2] && lvlOf(cheapest(os, last)) === 2) return R(cheapest(os, last), `Преференция в первую масть партнёра${hint}.`);
  return R('P', `Совместно меньше 25${hint} → пас.`);
}

// Рекомендация по ходу торговли. pair: список не-пасовых заявок нашей линии [{who:'me'|'pt', bid}]
function suggest(h, pair) {
  const n = pair.length;
  if (n === 0) return opening(h);
  const w = pair.map(x => x.who).join(',');
  if (w === 'pt') return respond(h, pair[0].bid);
  if (w === 'me,pt') return openerRebid(h, pair[0].bid, pair[1].bid);
  if (w === 'pt,me,pt') return responderRebid(h, pair[0].bid, pair[1].bid, pair[2].bid);
  return null;
}
