// Торговля с вмешательством противников (SAYC, упрощённо).
// auc: [{seat, bid}] в порядке заявок; bid: '1C'..'7N', 'P', 'X', 'XX'.
const isLevel = b => b !== 'P' && b !== 'X' && b !== 'XX';
function lastLevel(auc) { for (let i = auc.length - 1; i >= 0; i--) if (isLevel(auc[i].bid)) return auc[i].bid; return 'P'; }
function lastCall(auc) { for (let i = auc.length - 1; i >= 0; i--) if (auc[i].bid !== 'P') return auc[i]; return null; }
const canDouble = (auc, seat) => { const c = lastCall(auc); return !!c && isLevel(c.bid) && c.seat % 2 !== seat % 2; };
const canRedouble = (auc, seat) => { const c = lastCall(auc); return !!c && c.bid === 'X' && c.seat % 2 !== seat % 2; };
function legalCall(b, auc, seat) {
  if (b === 'P') return true;
  if (b === 'X') return canDouble(auc, seat);
  if (b === 'XX') return canRedouble(auc, seat);
  return bidVal(b) > bidVal(lastLevel(auc));
}
// Держка в масти противника: A, Kx, Qxx, Jxxx
function hasStop(h, s) {
  const n = h.filter(c => c.s === s).length;
  return hasCard(h, s, 14) || (hasCard(h, s, 13) && n >= 2) || (hasCard(h, s, 12) && n >= 3) || (hasCard(h, s, 11) && n >= 4);
}

function suggestFull(h, auc, seat) {
  const res = suggestFullRaw(h, auc, seat);
  if (!res) return null;
  if (!legalCall(res.bid, auc, seat)) return null;
  res.alts = res.alts.filter(b => legalCall(b, auc, seat));
  return res;
}
function suggestFullRaw(h, auc, seat) {
  const pt = (seat + 2) % 4, ours = s => s % 2 === seat % 2;
  const calls = auc.filter(a => a.bid !== 'P');
  if (!calls.length) return opening(h);
  const theirs = calls.filter(a => !ours(a.seat));
  if (!theirs.length) return suggest(h, calls.map(a => ({ who: a.seat === seat ? 'me' : 'pt', bid: a.bid })));
  const last = lastLevel(auc), opener = calls[0];
  const mine = calls.filter(a => a.seat === seat), ptc = calls.filter(a => a.seat === pt);
  const theirSuits = theirs.filter(a => isLevel(a.bid) && strainOf(a.bid) < 4).map(a => strainOf(a.bid));
  if (ours(opener.seat)) {
    if (opener.seat === pt && mine.length === 0) return respondComp(h, opener.bid, auc, last, theirSuits);
    if (opener.seat === seat && mine.length === 1) {
      if (!ptc.length) return R('P', 'Партнёр пасовал, противники торгуются — без дополнительной силы пас.');
      return rebidComp(h, opener.bid, ptc[0].bid, auc, last, theirSuits);
    }
    return null;
  }
  if (!mine.length && !ptc.length) return overcall(h, auc, seat, last, theirSuits, theirs);
  if (!mine.length && ptc.length === 1) return advance(h, ptc[0].bid, auc, last, theirSuits);
  return null;
}

// Партнёр открыл, противник вмешался
function respondComp(h, open, auc, last, ts) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const rho = auc[auc.length - 1].bid;
  if (!isLevel(open) || lvlOf(open) > 1) return null;
  const os = strainOf(open);
  if (rho === 'X') {
    if (os < 4 && os >= 2 && L[os] >= 3 && hcp >= 10) return R('2N', 'После контры противника: 2БК (Джордан) — поддержка и 10+, инвит или сильнее.');
    if (hcp >= 10) return R('XX', `${hcp} HCP после контры противника → реконтра (10+).`);
    if (os < 4 && L[os] >= 4 && hcp <= 9 && os >= 2) return R(mk(3, os), 'После контры прыжковое поднятие — блокирующее: 4+ козыря, слабая рука.', [mk(2, os)]);
    if (os < 4 && L[os] >= 3 && os >= 2 && hcp >= 6) return R(mk(2, os), 'Простое поднятие 6–9.');
    const r = respond(h, open); return r && legalCall(r.bid, auc, -1) ? r : R('P', 'Пас.');
  }
  const t = ts[ts.length - 1], tl = lvlOf(lastLevel(auc));
  if (os === 4) {
    if (hcp >= 10 && t !== undefined && hasStop(h, t)) return R('3N', `${hcp} HCP и держка в ${SUITS[t]} → 3БК.`);
    for (let s = 3; s >= 0; s--) if (s !== t && L[s] >= 5 && lvlOf(cheapest(s, last)) === 2) return R(cheapest(s, last), `Пятёрка ${SUITS[s]} → играть.`);
    return R('P', 'Нет хорошей заявки после вмешательства → пас.');
  }
  const p = hcp + shortPts(e, os);
  const fit = os >= 2 ? L[os] >= 3 : L[os] >= 5;
  if (fit) {
    if (p >= 13 && os >= 2) return R(mk(4, os), `${p} очков с поддержкой → гейм.`);
    if (p >= 10 && t !== undefined) return R(cheapest(t, last), `${p} очков и поддержка → кью-бид в масти противника (инвит+ в масть партнёра).`, [cheapest(os, last)]);
    if (p >= 6 && lvlOf(cheapest(os, last)) <= 2) return R(cheapest(os, last), `${p} очков, поддержка → простое поднятие.`);
    if (p >= 6 && L[os] >= 4 && lvlOf(cheapest(os, last)) === 3) return R(cheapest(os, last), 'Поддержка 4+ → поднимаем, несмотря на вмешательство.', ['P']);
  }
  if (tl <= 2 && t !== undefined && bidVal(lastLevel(auc)) <= bidVal('2S')) {
    const unbid = [2, 3].filter(s => s !== os && s !== t);
    const M = unbid.find(s => L[s] >= 4);
    if (M !== undefined && hcp >= (tl === 1 ? 6 : 8)) {
      if (L[M] >= 5 && lvlOf(cheapest(M, last)) === 1) return R(cheapest(M, last), `Пятёрка ${SUITS[M]} на уровне 1 → называем масть (контра показала бы четвёрку).`, ['X']);
      return R('X', `Негативная контра: четыре ${SUITS[M]}, ${hcp} HCP.`);
    }
  }
  for (let s = 3; s >= 0; s--) if (s !== os && s !== t && L[s] >= 5) {
    const b = cheapest(s, last), l = lvlOf(b);
    if ((l === 1 && hcp >= 6) || (l === 2 && hcp >= 10)) return R(b, `Пятёрка ${SUITS[s]}, ${hcp} HCP → новая масть.`);
  }
  if (t !== undefined && hasStop(h, t) && e.balanced) {
    if (hcp >= 13) return R('3N', `${hcp} HCP, держка в ${SUITS[t]} → 3БК.`);
    if (hcp >= 11 && bidVal('2N') > bidVal(last)) return R('2N', `11–12 HCP с держкой → инвит 2БК.`);
    if (hcp >= 8 && bidVal('1N') > bidVal(last)) return R('1N', `8–10 HCP с держкой в ${SUITS[t]} → 1БК.`);
  }
  if (hcp >= 10) for (let s = 3; s >= 0; s--) if (s !== os && s !== t && L[s] >= 4 && lvlOf(cheapest(s, last)) <= 2) return R(cheapest(s, last), `${hcp} HCP, четвёрка ${SUITS[s]} → новая масть.`, ['X']);
  return R('P', `${hcp} HCP — подходящей заявки после вмешательства нет → пас.`);
}

// Я открыл, партнёр что-то сказал, противники торгуются
function rebidComp(h, open, pb, auc, last, ts) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  if (!isLevel(open)) return null;
  const os = strainOf(open), t = ts[ts.length - 1];
  if (pb === 'XX') return R('P', 'Партнёр сделал реконтру — пас, ждём его следующую заявку.');
  if (pb === 'X') {
    const M = [3, 2].find(s => s !== os && s !== t && L[s] >= 4);
    if (M !== undefined) { const b = cheapest(M, last); return hcp >= 16 && lvlOf(b) < 4 ? R(mk(lvlOf(b) + 1, M), 'Четыре карты в показанном мажоре, 16+ → прыжок.') : R(b, `Партнёр показал четвёрку мажора — у нас тоже ${L[M]} ${SUITS[M]}.`); }
    if (t !== undefined && hasStop(h, t)) { const b = cheapest(4, last); if (lvlOf(b) <= 2) return R(b, 'Держка в масти противника → БК.'); }
    if (L[os] >= 6) return R(cheapest(os, last), 'Повтор шестикартной масти.');
    return R(cheapest(os, last), 'Повтор своей масти.');
  }
  if (!isLevel(pb)) return null;
  const ps = strainOf(pb);
  if (t !== undefined && ps === t && os < 4) {
    const tp = hcp + (L[os] > 5 ? L[os] - 5 : 0);
    return os >= 2 && tp >= 14 ? R(mk(4, os), 'Кью-бид партнёра = инвит+ с поддержкой; не минимум → гейм.') : R(cheapest(os, last), 'Кью-бид партнёра; минимум → масть на минимальном уровне.');
  }
  const r = openerRebid(h, open, pb);
  if (r && legalCall(r.bid, auc, -1)) return r;
  return R('P', 'Пас.');
}

// Противники открыли — входим в торговлю?
function overcall(h, auc, seat, last, ts, theirs) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const t = ts[0], openB = theirs[0].bid;
  const ll = lvlOf(last);
  if (!isLevel(openB)) return R('P', 'Пас.');
  if (strainOf(openB) === 4) {
    for (let s = 3; s >= 0; s--) if (L[s] >= 5 && hcp >= 10 && lvlOf(cheapest(s, last)) <= 2 && honorsIn(h, s) >= 2) return R(cheapest(s, last), `Противник открыл БК — вход натуральной пятёркой ${SUITS[s]}, ${hcp} HCP.`);
    return R('P', 'Против 1БК без хорошей длинной масти — пас.');
  }
  const unbid = [0, 1, 2, 3].filter(s => !ts.includes(s));
  const okX = (hcp >= 12 && ts.every(x => L[x] <= 2) && unbid.every(s => L[s] >= 3)) || hcp >= 17;
  if (ll >= 3) return okX && hcp >= 14 ? R('X', 'Контра на вылет на высоком уровне.') : R('P', 'Высоко и без сильной руки → пас.');
  if (e.balanced && hcp >= 15 && hcp <= 18 && ts.every(x => hasStop(h, x)) && cheapest(4, last) === '1N') return R('1N', `${hcp} HCP, ровная, держка в ${ts.map(x => SUITS[x]).join('')} → оверколл 1БК (15–18).`);
  if (ts.length === 1 && ll === 1 && hcp >= 8 && hcp <= 16) {
    if (t < 2 && L[2] >= 5 && L[3] >= 5) return R(mk(2, t), `Майклс: кью-бид ${bidRu(mk(2, t))} = обе мажорные пятёрки.`);
    if (t >= 2 && L[5 - t] >= 5 && (L[0] >= 5 || L[1] >= 5)) return R(mk(2, t), `Майклс: кью-бид ${bidRu(mk(2, t))} = пятёрка ${SUITS[5 - t]} и пятёрка минора.`);
    const low = unbid.slice(0, 2);
    if (L[low[0]] >= 5 && L[low[1]] >= 5) return R('2N', `Необычные 2БК: две младшие неназванные масти (${SUITS[low[0]]} и ${SUITS[low[1]]}).`);
  }
  if (hcp >= 17 && okX) return R('X', `${hcp} HCP — сильная рука: начинаем с контры.`);
  let best = -1;
  for (let s = 3; s >= 0; s--) if (!ts.includes(s) && L[s] >= 5 && honorsIn(h, s) >= 2 && (best < 0 || L[s] > L[best])) best = s;
  if (best >= 0) {
    const b = cheapest(best, last), l = lvlOf(b);
    if (L[best] >= 6 && hcp >= 5 && hcp <= 10 && ts.length === 1 && l <= 2 && ll === 1) return R(mk(l + 1, best), `Слабый прыжковый оверколл: шестёрка ${SUITS[best]}, ${hcp} HCP.`);
    if (l === 1 && hcp >= 8 && hcp <= 16) return R(b, `Оверколл: хорошая пятёрка ${SUITS[best]}, ${hcp} HCP (8–16).`);
    if (l === 2 && hcp >= 10 && hcp <= 16) return R(b, `Оверколл на уровне 2: хорошая пятёрка ${SUITS[best]}, ${hcp} HCP.`);
  }
  if (okX) return R('X', `Контра на вылет: ${hcp} HCP, короткость в ${ts.map(x => SUITS[x]).join('')}, остальные масти есть.`);
  return R('P', `${hcp} HCP — для входа в торговлю нет ни масти, ни контры → пас.`);
}

// Партнёр вошёл в торговлю — мой ответ
function advance(h, pb, auc, last, ts) {
  const e = evalHand(h), L = e.len, hcp = e.hcp;
  const t = ts[0], rhoPassed = auc[auc.length - 1].bid === 'P';
  if (pb === 'X') {
    if (!rhoPassed && hcp < 6) return R('P', 'Противник перебил контру партнёра — со слабой рукой можно пасовать.');
    if (hcp >= 12 && t !== undefined && lvlOf(cheapest(t, last)) <= 3) return R(cheapest(t, last), `${hcp} HCP → кью-бид в масти противника (12+).`);
    const unbid = [3, 2, 1, 0].filter(s => !ts.includes(s));
    let s = unbid.find(x => x >= 2 && L[x] >= 4);
    if (s === undefined) {
      if (t !== undefined && hasStop(h, t) && e.balanced && hcp >= 6 && hcp <= 10 && lvlOf(cheapest(4, last)) === 1) return R(cheapest(4, last), 'Нет мажора, держка в масти противника → 1БК (6–10).');
      s = unbid.reduce((a, b) => (L[b] > L[a] ? b : a), unbid[0]);
    }
    const b = cheapest(s, last);
    if (hcp >= 9 && lvlOf(b) < 4) return R(mk(lvlOf(b) + 1, s), `${hcp} HCP (9–11) → прыжок в ${SUITS[s]}.`);
    return R(b, `Ответ на контру: ${SUITS[s]} на минимальном уровне (0–8).`);
  }
  if (!isLevel(pb)) return null;
  const ps = strainOf(pb), pl = lvlOf(pb);
  if (pb === '1N' && rhoPassed) { const r = respond(h, '1N'); return r && legalCall(r.bid, auc, -1) ? r : R('P', 'Пас.'); }
  if (t !== undefined && ps === t && pl === 2) {
    const ms = t < 2 ? [2, 3] : [5 - t];
    const M = ms.reduce((a, b) => (L[b] > L[a] ? b : a), ms[0]);
    if (L[M] >= 3) return hcp >= 10 ? R(mk(4, M), `Майклс партнёра, фит в ${SUITS[M]}, 10+ → гейм.`) : R(cheapest(M, last), `Майклс партнёра → выбираем ${SUITS[M]}.`);
    return R(cheapest(L[0] >= L[1] ? 0 : 1, last), 'Нет фита в мажоре — выбираем минор.');
  }
  if (pb === '2N' && pl === 2) {
    const two = [0, 1, 2, 3].filter(s => !ts.includes(s)).slice(0, 2);
    const s = L[two[1]] >= L[two[0]] ? two[1] : two[0];
    return R(cheapest(s, last), `Необычные 2БК партнёра → выбираем более длинную из его мастей (${SUITS[s]}).`);
  }
  if (ps < 4) {
    if (L[ps] >= 3) {
      const p = hcp + shortPts(e, ps);
      if (p >= 10 && t !== undefined && lvlOf(cheapest(t, last)) <= 3) return R(cheapest(t, last), `Поддержка и ${p} очков → кью-бид (инвит+).`, ps >= 2 && p >= 13 ? [mk(4, ps)] : []);
      if (p >= 6 && lvlOf(cheapest(ps, last)) <= 3) return R(cheapest(ps, last), `Поддержка ${L[ps]} карты, ${p} очков → поднятие.`);
    }
    for (let s = 3; s >= 0; s--) if (s !== ps && !ts.includes(s) && L[s] >= 5 && hcp >= 8 && lvlOf(cheapest(s, last)) <= 2) return R(cheapest(s, last), `Своя пятёрка ${SUITS[s]} → натурально.`);
    if (t !== undefined && hasStop(h, t)) {
      if (hcp >= 12 && bidVal('3N') > bidVal(last)) return R('3N', 'Держка и 12+ → 3БК.');
      if (hcp >= 8 && lvlOf(cheapest(4, last)) <= 2) return R(cheapest(4, last), 'Держка в масти противника, 8–11 → БК.');
    }
    return R('P', 'Нет поддержки и своей масти → пас.');
  }
  return null;
}
