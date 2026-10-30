// Решатель «двойного болвана»: сколько взяток возьмёт сторона при идеальной игре всех четырёх.
// Руки — битовые маски по мастям (бит r-2 для ранга r). Работает и в основном потоке, и в Web Worker.
(function (root) {
  const popc = x => { let n = 0; while (x) { x &= x - 1; n++; } return n; };

  // hands: массив из 4 рук [{s,r}], trump: 0..3 или null, leader: место ходящего,
  // played: уже лежащие во взятке карты [{seat, card}] (текущая незаконченная взятка)
  function makeState(hands, trump, leader, trick) {
    const m = hands.map(h => { const a = [0, 0, 0, 0]; h.forEach(c => { a[c.s] |= 1 << (c.r - 2); }); return a; });
    return { m, trump: trump === null || trump === undefined ? -1 : trump, leader, trick: (trick || []).map(t => ({ seat: t.seat, s: t.card.s, r: t.card.r })) };
  }

  // Ходы с учётом «равноценных» карт: из подряд идущих (среди оставшихся) берём одну
  function moves(st, seat, ledSuit) {
    const out = [], mh = st.m[seat];
    let suits = [0, 1, 2, 3];
    if (ledSuit >= 0 && mh[ledSuit]) suits = [ledSuit];
    for (const s of suits) {
      let x = mh[s]; if (!x) continue;
      // «Чужие» карты масти: у других игроков и уже лежащие в текущей взятке. Сыгранные раньше — прозрачны.
      let opaque = (st.m[0][s] | st.m[1][s] | st.m[2][s] | st.m[3][s]) & ~x;
      for (const t of st.trick) if (t.s === s) opaque |= 1 << (t.r - 2);
      let r = 12;
      while (r >= 0) {
        if (x & (1 << r)) {
          out.push({ s, r: r + 2 });
          // пропускаем равноценные: следующие карты этого же игрока без чужих карт между ними
          let q = r - 1;
          while (q >= 0 && !(opaque & (1 << q))) q--;
          r = q;
          continue;
        }
        r--;
      }
    }
    return out;
  }
  function winnerOf(trick, trump) {
    let b = trick[0];
    for (let i = 1; i < trick.length; i++) { const t = trick[i]; if (t.s === b.s ? t.r > b.r : t.s === trump) b = t; }
    return b.seat;
  }

  function solveTricks(hands, trump, leader, side, trickSoFar, opts) {
    // side: 0 — СЮ, 1 — ВЗ. Возвращает максимум взяток стороны side из оставшихся.
    const st = makeState(hands, trump, leader, trickSoFar);
    const tt = new Map();
    const deadline = opts && opts.deadline ? opts.deadline : Infinity;
    let nodes = 0, aborted = false;
    // Ключ по относительным рангам: важно только, у кого старшая, вторая, третья... из оставшихся карт масти
    const key = () => {
      let k = '' + st.leader;
      for (let s = 0; s < 4; s++) {
        const a = st.m[0][s], b = st.m[1][s], c = st.m[2][s], d = st.m[3][s];
        let code = 1;
        for (let r = 12; r >= 0; r--) {
          const bit = 1 << r;
          if (a & bit) code = code * 4; else if (b & bit) code = code * 4 + 1; else if (c & bit) code = code * 4 + 2; else if (d & bit) code = code * 4 + 3;
        }
        k += ',' + code;
      }
      return k;
    };
    const cnt = a => popc(a[0]) + popc(a[1]) + popc(a[2]) + popc(a[3]);
    const remaining = () => Math.max(cnt(st.m[0]), cnt(st.m[1]), cnt(st.m[2]), cnt(st.m[3]));

    // Может ли side взять ещё ≥ need взяток с текущей позиции
    function canGet(need) {
      if (need <= 0) return true;
      if (aborted) return false;
      if (++nodes % 20000 === 0 && Date.now() > deadline) { aborted = true; return false; }
      const tl = st.trick.length;
      const seat = tl ? (st.trick[0].seat + tl) % 4 : st.leader;
      if (tl === 0) {
        const left = cnt(st.m[seat]);
        if (need > left) return false;
        // Быстрые взятки ведущего: старшие подряд, которые можно снять сразу
        const qt = quick(seat);
        if (seat % 2 === side) { if (qt >= need) return true; } else if (need > left - qt) return false;
        const k = key(), b = tt.get(k);
        if (b) { if (b[0] >= need) return true; if (b[1] < need) return false; }
        // быстрые взятки ведущего: тузы/старшие в масти без козырей у остальных — простая оценка снизу
        const res = trySeat(seat, need, -1);
        const nb = b || [0, left];
        if (res) nb[0] = Math.max(nb[0], need); else nb[1] = Math.min(nb[1], need - 1);
        tt.set(k, nb);
        return res;
      }
      return trySeat(seat, need, st.trick[0].s);
    }
    function trySeat(seat, need, led) {
      const mv = order(seat, moves(st, seat, led));
      const mine = seat % 2 === side;
      for (const c of mv) {
        st.m[seat][c.s] &= ~(1 << (c.r - 2));
        st.trick.push({ seat, s: c.s, r: c.r });
        let ok;
        if (st.trick.length === 4) {
          const w = winnerOf(st.trick, st.trump), saved = st.trick, sl = st.leader;
          st.trick = []; st.leader = w;
          ok = canGet(need - (w % 2 === side ? 1 : 0));
          st.trick = saved; st.leader = sl;
        } else ok = canGet(need);
        st.trick.pop();
        st.m[seat][c.s] |= 1 << (c.r - 2);
        if (aborted) return false;
        if (mine && ok) return true;
        if (!mine && !ok) return false;
      }
      return !mine;
    }
    function quick(seat) {
      const T = st.trump, opp1 = (seat + 1) % 4, opp2 = (seat + 3) % 4;
      const oppTrumps = T >= 0 && (st.m[opp1][T] | st.m[opp2][T]);
      let q = 0;
      for (let s = 0; s < 4; s++) {
        if (oppTrumps && s !== T) continue;
        const mine = st.m[seat][s], all = st.m[0][s] | st.m[1][s] | st.m[2][s] | st.m[3][s];
        for (let r = 12; r >= 0; r--) {
          const bit = 1 << r;
          if (!(all & bit)) continue;
          if (mine & bit) q++; else break;
        }
      }
      return q;
    }
    // Порядок перебора: сначала самые перспективные ходы — так отсечения срабатывают раньше
    function order(seat, mv) {
      if (mv.length < 2) return mv;
      const tr = st.trick, T = st.trump;
      const others = s => (st.m[0][s] | st.m[1][s] | st.m[2][s] | st.m[3][s]) & ~st.m[seat][s];
      const isTop = c => (others(c.s) >> (c.r - 2)) === 0;
      let sc;
      if (!tr.length) {
        // ведущий: старшие (мастера) сначала, затем мелкие из длинных мастей
        sc = c => (isTop(c) ? 100 + c.r : 0) + popc(st.m[seat][c.s]) * 2 - c.r / 20 + (c.s === T ? -5 : 0);
      } else {
        const w = winnerOf(tr, T), wc = tr.find(t => t.seat === w), partnerWins = w % 2 === seat % 2;
        const beats = c => (c.s === wc.s ? c.r > wc.r : c.s === T && wc.s !== T);
        sc = c => {
          if (partnerWins) return -c.r - (c.s === T ? 30 : 0);
          if (beats(c)) return 50 - c.r - (c.s === T && tr[0].s !== T ? 10 : 0);
          return -c.r - (c.s === T ? 30 : 0);
        };
      }
      return mv.map(c => [sc(c), c]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
    }
    // Бинарный поиск по числу взяток
    let lo = 0, hi = remaining();
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (canGet(mid)) lo = mid; else hi = mid - 1;
      if (aborted) return { tricks: null, nodes, aborted: true };
    }
    return { tricks: lo, nodes };
  }

  // Оценка каждого допустимого хода текущего игрока: сколько взяток возьмёт его сторона
  function scoreMoves(hands, trump, leader, trickSoFar, opts) {
    const tl = trickSoFar.length, seat = tl ? (trickSoFar[0].seat + tl) % 4 : leader;
    const led = tl ? trickSoFar[0].card.s : -1;
    const h = hands[seat];
    let legal = led >= 0 && h.some(c => c.s === led) ? h.filter(c => c.s === led) : h;
    const res = [];
    for (const c of legal) {
      const hs = hands.map((x, i) => (i === seat ? x.filter(y => y !== c) : x));
      const t = trickSoFar.concat([{ seat, card: c }]);
      let r, bonus = 0;
      if (t.length === 4) {
        const w = winnerOf(t.map(x => ({ seat: x.seat, s: x.card.s, r: x.card.r })), trump === null ? -1 : trump);
        bonus = w % 2 === seat % 2 ? 1 : 0;
        r = solveTricks(hs, trump, w, seat % 2, [], opts);
      } else r = solveTricks(hs, trump, leader, seat % 2, t, opts);
      if (r.aborted) return null;
      res.push({ card: c, tricks: r.tricks + bonus });
    }
    return { seat, res };
  }

  const api = { solveTricks, scoreMoves };
  root.DD = api;
  // Web Worker: принимает {id, fn, args}
  if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.onmessage = e => {
      const { id, fn, args } = e.data;
      const opts = { deadline: Date.now() + (e.data.ms || 20000) };
      let out; try { out = api[fn](...args, opts); } catch (err) { out = { error: String(err) }; }
      self.postMessage({ id, out });
    };
  }
})(typeof self !== 'undefined' ? self : this);
