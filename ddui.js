// Двойной болван в интерфейсе: фоновые вычисления, умные роботы в концовке, разбор ошибок.
function makeDDWorker() { try { return new Worker('dd.js'); } catch { return null; } }
const ddWorkers = { play: makeDDWorker(), analysis: makeDDWorker() };
const ddPending = {};
let ddSeq = 0;
Object.values(ddWorkers).forEach(w => w && (w.onmessage = e => { const f = ddPending[e.data.id]; delete ddPending[e.data.id]; if (f) f(e.data.out); }));
// Вызов решателя в фоне (если воркеры недоступны — в основном потоке)
function ddCall(kind, fn, args, ms) {
  return new Promise(res => {
    const w = ddWorkers[kind];
    if (!w) { try { res(DD[fn](...args, { deadline: Date.now() + ms })); } catch { res(null); } return; }
    const id = ++ddSeq; ddPending[id] = res; w.postMessage({ id, fn, args, ms });
  });
}
const plainHands = hs => hs.map(h => h.map(c => ({ s: c.s, r: c.r })));
const plainTrick = tr => tr.map(t => ({ seat: t.seat, card: { s: t.card.s, r: t.card.r } }));

// Робот: в концовке (≤ 9 карт) — идеальная игра, раньше — эвристика
async function robotChoose(seat) {
  const heur = robotCard(seat);
  if (P.hands[seat].length > 9) return heur;
  const leader = P.trick.length ? P.trick[0].seat : seat;
  const r = await ddCall('play', 'scoreMoves', [plainHands(P.hands), P.trump, leader, plainTrick(P.trick)], 1500);
  if (!r || !r.res) return heur;
  const best = Math.max(...r.res.map(x => x.tricks));
  const good = r.res.filter(x => x.tricks === best).map(x => x.card);
  if (good.some(c => c.s === heur.s && c.r === heur.r)) return heur;
  const pick = good.sort((a, b) => a.r - b.r)[0];
  return P.hands[seat].find(c => c.s === pick.s && c.r === pick.r) || heur;
}

// ---------- Разбор сдачи ----------
async function analyzeDeal(r, box, onJump) {
  const trump = r.bid && strainOf(r.bid) < 4 ? strainOf(r.bid) : null;
  const plays = r.plays || [], declSide = r.decl % 2;
  const userSeats = declSide === 0 ? [0, 2] : [2];
  box.innerHTML = '<div class="ddbox"><div class="ddspin"></div><b>Считаю идеальный розыгрыш…</b><small>До 25 секунд для полной сдачи</small></div>';
  const par = await ddCall('analysis', 'solveTricks', [plainHands(r.hands), trump, (r.decl + 1) % 4, declSide, []], 25000);
  const need = 6 + lvlOf(r.bid);
  let html = '<div class="ddres">';
  if (par && par.tricks !== null && par.tricks !== undefined) {
    const d = par.tricks - need;
    html += `<div class="ddpar"><span>${par.tricks}</span><div><b>взяток при идеальной игре</b><small>${bidRu(r.bid)} ${d >= 0 ? (d ? 'выполняется +' + d : 'выполняется ровно') : 'без ' + -d}${r.got !== undefined ? ` · вы взяли ${r.got}` : ''}</small></div></div>`;
  } else html += '<div class="ddpar"><span>?</span><div><b>Полная сдача слишком сложная</b><small>Не успел за 25 секунд — ниже разбор концовки</small></div></div>';
  box.innerHTML = html + '<div id="ddmoves"><div class="ddbox small"><div class="ddspin"></div>Ищу ошибки по ходам…</div></div></div>';
  // Разбор каждого вашего хода
  const found = [];
  let checked = 0, skipped = 0;
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    if (!userSeats.includes(p.seat)) continue;
    const gone = new Set(plays.slice(0, i).map(x => x.card.s * 100 + x.card.r));
    const hands = r.hands.map(h => h.filter(c => !gone.has(c.s * 100 + c.r)));
    const start = Math.floor(i / 4) * 4, trick = plays.slice(start, i);
    const leader = trick.length ? trick[0].seat : (i === 0 ? (r.decl + 1) % 4 : p.seat);
    const left = hands[p.seat].length;
    const res = await ddCall('analysis', 'scoreMoves', [hands, trump, leader, trick], left > 10 ? 4000 : 6000);
    if (!$('ddmoves')) return;
    if (!res || !res.res) { skipped++; continue; }
    checked++;
    const best = Math.max(...res.res.map(x => x.tricks));
    const mine = res.res.find(x => x.card.s === p.card.s && x.card.r === p.card.r);
    if (mine && mine.tricks < best) {
      const alts = res.res.filter(x => x.tricks === best).map(x => cardStr(x.card)).join(', ');
      found.push({ i, txt: `Взятка ${Math.floor(i / 4) + 1}: ${SEATS[p.seat]} сыграл <b>${cardStr(p.card)}</b>, лучше <b>${alts}</b> (−${best - mine.tricks})` });
    }
    $('ddmoves').innerHTML = red(`<div class="ddbox small"><div class="ddspin"></div>Проверено ходов: ${checked}…</div>`);
  }
  $('ddmoves').innerHTML = red(`<div>${found.length ? `<h3>Ошибки (${found.length})</h3>${found.map(f => `<a href="#" class="ddmiss" data-i="${f.i}">${f.txt}</a>`).join('')}` : `<div class="fb ok">🎉 Ошибок в проверенных ходах не найдено${checked ? '' : ''}.</div>`}
    <p class="muted">Проверено ваших ходов: ${checked}${skipped ? `, пропущено (слишком рано в сдаче): ${skipped}` : ''}. Нажмите на ошибку, чтобы перейти к этому ходу.</p></div>`);
  $app.querySelectorAll('.ddmiss').forEach(a => a.onclick = e => { e.preventDefault(); onJump(+a.dataset.i); });
}
