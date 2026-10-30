// 📡 Татаркин-радар: шуточный раздел о выступлениях Ивана Татаркина.
// Данные собирает scripts/tatarkin.py (GitHub Actions по расписанию) с bridgesport.ru.
const TT_RAW = 'https://raw.githubusercontent.com/timofeez/bridge-sayc/main/data/tatarkin.json';
async function ttLoad() {
  for (const url of [TT_RAW + '?t=' + Math.floor(Date.now() / 3e5), 'data/tatarkin.json']) {
    try { const r = await fetch(url, { cache: 'no-cache' }); if (r.ok) return await r.json(); } catch {}
  }
  return null;
}
const ttDate = d => d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const medal = p => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '');
function ttComment(p) {
  if (p === 1) return 'ЗОЛОТО! Бридж-мир аплодирует стоя 👏';
  if (p === 2) return 'Серебро — в одном импе от вершины!';
  if (p === 3) return 'Бронза! Пьедестал снова под Иваном.';
  if (p && p <= 10) return 'Уверенно в десятке сильнейших.';
  return 'Копит опыт и коварные контры.';
}
// Комментатор прямого эфира
function ttLiveComment(L, track) {
  const prev = track.length >= 2 ? track[track.length - 2].place : null;
  if (L.finished) return L.place <= 3 ? `Финиш! ${L.place}-е место — пьедестал! 🎉` : `Турнир завершён: ${L.place}-е место. Ждём официальных итогов.`;
  if (prev && L.place < prev) return `📈 Рывок! С ${prev}-го на ${L.place}-е место. Соперники нервно пересчитывают импы.`;
  if (prev && L.place > prev) return `📉 Небольшая просадка (было ${prev}-е). Иван копит силы для камбэка.`;
  if (L.place === 1) return '👑 Лидирует! Остальные смотрят ему в спину.';
  if (L.place <= 3) return '🔥 В зоне призов! Держим кулаки.';
  if (L.of && L.place <= Math.ceil(L.of / 3)) return '💪 Уверенно в верхней трети. Всё решится в следующих турах.';
  return '🧠 Матч длинный — главное впереди.';
}
// Партнёры: «Команда» Ф.И.О., Ф.И.О. — считаем людей, кроме самого Ивана
function ttPartners(list) {
  const cnt = {};
  list.forEach(t => (t.partners || '').replace(/«[^»]*»/g, '').split(',').map(x => x.trim()).filter(x => x && !/^Татаркин И\.В\.?$/.test(x)).forEach(x => { cnt[x] = (cnt[x] || 0) + 1; }));
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]);
}
// Простой линейный график в SVG
function ttLine(points, opts = {}) {
  if (points.length < 2) return '<p class="muted">Пока мало точек — график появится по мере накопления данных.</p>';
  const W = 320, H = 140, pad = 26;
  const ys = points.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const X = i => pad + i * (W - pad * 2) / (points.length - 1);
  const Y = v => opts.invert ? pad / 2 + (v - lo) / span * (H - pad * 1.5) : H - pad + (lo - v) / span * (H - pad * 1.5);
  const pts = points.map((p, i) => [X(i), Y(p.y)]);
  const area = `M${pts[0][0]},${H - pad} ` + pts.map(p => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${H - pad} Z`;
  const step = Math.ceil(points.length / 5);
  return `<svg viewBox="0 0 ${W} ${H}" class="ttchart">
    <defs><linearGradient id="g${opts.id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${opts.color}" stop-opacity=".45"/><stop offset="1" stop-color="${opts.color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#g${opts.id})" class="ttarea"/>
    <polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${opts.color}" stroke-width="2.5" class="ttln"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 2.5}" fill="${opts.color}" class="${i === pts.length - 1 ? 'ttlast' : ''}"><title>${points[i].label}: ${points[i].y}</title></circle>`).join('')}
    ${points.map((p, i) => i % step === 0 || i === points.length - 1 ? `<text x="${X(i)}" y="${H - 6}" text-anchor="middle" class="ttax">${p.short}</text>` : '').join('')}
    <text x="4" y="${opts.invert ? H - pad : pad / 2 + 4}" class="ttax">${opts.invert ? hi : hi}</text><text x="4" y="${opts.invert ? pad / 2 + 4 : H - pad}" class="ttax">${lo}</text>
  </svg>`;
}

async function tatarkinPage() {
  render(`<div class="ttload"><div class="radar"><i></i></div><b>Ищу Ивана Татаркина на радарах…</b></div>`, 'Татаркин-радар', gamesHub);
  const d = await ttLoad();
  if (!$('app') || document.getElementById('title').textContent !== 'Татаркин-радар') return;
  if (!d) return render('<div class="fb bad">Не удалось загрузить данные. Проверьте интернет.</div>', 'Татаркин-радар', gamesHub);
  const I = d.info || {}, perf = (d.performances || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const last = perf[0];
  // Турнир «в эфире» показываем, пока он идёт и ещё сутки после
  const L = d.live && (!d.live.checked || Date.now() - new Date(d.live.checked) < 3 * 864e5) ? d.live : null;
  const track = L ? (d.live_track || []).filter(p => p.tournament === L.tournament) : [];
  const golds = perf.filter(t => t.place === 1).length, silv = perf.filter(t => t.place === 2).length, bron = perf.filter(t => t.place === 3).length;
  const years = {};
  perf.forEach(t => { const y = t.year || (t.date || '').slice(0, 4); (years[y] = years[y] || { n: 0, g: 0, s: 0, b: 0 }).n++; if (t.place === 1) years[y].g++; if (t.place === 2) years[y].s++; if (t.place === 3) years[y].b++; });
  const yKeys = Object.keys(years).sort(), yMax = Math.max(...yKeys.map(y => years[y].n), 1);
  const bestYear = yKeys.reduce((a, b) => (years[b].n > years[a].n ? b : a), yKeys[0]);
  const partners = ttPartners(perf), pMax = partners.length ? partners[0][1] : 1;
  const rh = d.rating_history || [];
  const short = dt => new Date(dt).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }).replace(' г.', '');
  const ratingPts = rh.filter(h => h.rating).map(h => ({ y: h.rating, label: ttDate(h.date), short: short(h.date) }));
  const placePts = rh.filter(h => h.place).map(h => ({ y: h.place, label: ttDate(h.date), short: short(h.date) }));
  const clubSorted = (d.club_mb || []).filter(c => /^\d{4}-\d{2}$/.test(c.month)).sort((a, b) => a.month.localeCompare(b.month));
  let acc = 0; const clubPts = clubSorted.map(c => { acc += (c.mb || 0) + (c.online_mb || 0); return { y: acc, label: c.month, short: c.month.slice(2).replace('-', '.') }; });
  const trend = rh.length >= 2 ? rh[rh.length - 1].rating - rh[rh.length - 2].rating : null;
  const facts = [
    last && `📢 Последний выход: <b>${last.name}</b> — ${last.place ? last.place + '-е место' : 'место уточняется'} ${medal(last.place)}`,
    trend !== null && (trend >= 0 ? `📈 Рейтинг за месяц: <b>+${trend}</b>. Иван разогревается.` : `📉 Рейтинг за месяц: <b>${trend}</b>. Тактическое отступление перед рывком.`),
    bestYear && `🔥 Самый урожайный год: <b>${bestYear}</b> — ${years[bestYear].n} турниров.`,
    partners[0] && `🤝 Самый частый партнёр: <b>${partners[0][0]}</b> (${partners[0][1]} турниров вместе).`,
    I.best_place && `🏔 Лучшее место в рейтинге ФСБР: <b>${I.best_place}</b>.`,
    `🃏 Ники: BBO — <b>${I.nick_bbo || '—'}</b>, Гамблер — <b>${I.nick_gambler || '—'}</b>.`,
  ].filter(Boolean);
  let yearFilter = 'all';
  const listHtml = () => perf.filter(t => yearFilter === 'all' || String(t.year) === yearFilter).map((t, i) => `
    <a class="ttrow" href="${t.link || '#'}" target="_blank" rel="noopener" style="--i:${Math.min(i, 15)}">
      <span class="ttplace p${t.place && t.place <= 3 ? t.place : 0}">${t.place || '—'}</span>
      <div><b>${t.name}</b><small>${ttDate(t.date)} · ${t.partners || ''}</small></div>
      ${t.mb ? `<span class="ttmb">+${t.mb} МБ</span>` : ''}</a>`).join('');
  render(`<div class="tthero">
    <div class="radar big"><i></i><span class="blip"></span></div>
    <div class="ttava">ИТ</div>
    <h2>Татаркин-радар</h2>
    <p>Иван Татаркин · ${I.city || 'Москва'} · разряд ${I.rank ?? '—'}</p>
    <small>Данные ФСБР обновлены ${d.updated ? new Date(d.updated).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'}</small>
  </div>
  ${L ? `<div class="ttonair"><div class="oa-top"><span class="livedot">${L.finished ? 'ИТОГИ' : '● В ЭФИРЕ'}</span><small>${L.dates}${L.round ? ` · тур ${L.round}` : ''}</small></div>
    <b class="oa-name">${L.tournament}</b>
    ${L.team ? `<p class="oa-team">Команда «${L.team}»</p>` : ''}${L.members ? `<small class="oa-mem">${L.members}</small>` : ''}
    ${L.place ? `<div class="oa-place"><span data-count="${L.place}">0</span><div><b>место${L.of ? ' из ' + L.of : ''}</b>${L.score !== null && L.score !== undefined ? `<small>${L.score} VP</small>` : ''}</div>${medal(L.place) ? `<em>${medal(L.place)}</em>` : ''}</div>
    <p class="oa-com">${ttLiveComment(L, track)}</p>` : '<p class="oa-com">Результаты ещё не опубликованы — радар ждёт первых протоколов.</p>'}
    ${track.length >= 2 ? `<div class="oa-chart">${ttLine(track.map(p => ({ y: p.place, label: (p.round ? 'тур ' + p.round : '') + ' ' + new Date(p.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }), short: p.round ? 'т' + p.round : '' })), { color: '#7dffb6', id: 'live', invert: true })}</div>` : ''}
    <div class="oa-links">${L.results_url ? `<a href="${L.results_url}" target="_blank" rel="noopener">Таблица турнира ↗</a>` : ''}<a href="${L.url}" target="_blank" rel="noopener">Страница турнира ↗</a></div>
    <small class="oa-chk">Проверено ${new Date(L.checked).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · обновление каждые 30 мин</small></div>` : ''}
  ${last ? `<div class="ttlive"><span class="livedot">${L ? 'ДО ЭТОГО' : 'LIVE'}</span><div><small>Последний завершённый турнир · ${ttDate(last.date)}</small><b>${last.name}</b><p>${last.partners ? 'С ' + last.partners + '. ' : ''}<b>${last.place ? last.place + '-е место' : ''} ${medal(last.place)}</b></p><em>${ttComment(last.place)}</em></div></div>` : ''}
  <div class="statgrid">
    <div class="stat"><b data-count="${I.rating || 0}">0</b><small>рейтинг ФСБР</small></div>
    <div class="stat"><b data-count="${I.place || 0}">0</b><small>место в рейтинге</small></div>
    <div class="stat"><b data-count="${I.mb || 0}">0</b><small>мастерских баллов</small></div>
    <div class="stat"><b data-count="${perf.length}">0</b><small>турниров в базе</small></div>
  </div>
  <div class="card medals"><div><span>🥇</span><b data-count="${golds}">0</b></div><div><span>🥈</span><b data-count="${silv}">0</b></div><div><span>🥉</span><b data-count="${bron}">0</b></div></div>
  <div class="card"><h3 style="margin-top:0">📰 Сводка радара</h3>${facts.map((f, i) => `<p class="ttfact" style="--i:${i}">${f}</p>`).join('')}</div>
  <div class="card"><h3 style="margin-top:0">📈 Рейтинг ФСБР</h3>${ttLine(ratingPts, { color: '#2fa36b', id: 'r' })}</div>
  <div class="card"><h3 style="margin-top:0">🏔 Место в рейтинге <small class="muted">(выше — лучше)</small></h3>${ttLine(placePts, { color: '#7b2ff7', id: 'p', invert: true })}</div>
  <div class="card"><h3 style="margin-top:0">📅 Турниры по годам</h3><div class="ttyears">${yKeys.map((y, i) => `<div class="ty" style="--i:${i}"><div class="tycol" style="--h:${100 * years[y].n / yMax}%"><span class="tyg" style="--g:${100 * years[y].g / years[y].n}%"></span></div><b>${years[y].n}</b><small>'${String(y).slice(2)}</small></div>`).join('')}</div>
    <p class="muted">Золотом отмечены победы.</p></div>
  <div class="card"><h3 style="margin-top:0">💰 Клубные мастерские баллы (накопительно)</h3>${ttLine(clubPts, { color: '#e0a82e', id: 'm' })}</div>
  <div class="card"><h3 style="margin-top:0">🤝 Партнёры и сокомандники</h3>${partners.slice(0, 8).map(([n, c], i) => `<div class="bar"><span>${n}</span><div><i class="g" style="--w:${100 * c / pMax}%;--i:${i}"></i></div><b>${c}</b></div>`).join('')}</div>
  <div class="card"><h3 style="margin-top:0">🗂 Все выступления</h3>
    <div class="ttchips"><button data-y="all" class="on">Все</button>${yKeys.slice().reverse().map(y => `<button data-y="${y}">${y}</button>`).join('')}</div>
    <div id="ttlist">${listHtml()}</div></div>
  <p class="muted" style="text-align:center">Источник: <a href="${d.profile_url}" target="_blank" rel="noopener">карточка игрока на bridgesport.ru</a>. Раздел обновляется автоматически.</p>`, 'Татаркин-радар', gamesHub);
  $app.querySelectorAll('.ttchips button').forEach(b => b.onclick = () => {
    $app.querySelectorAll('.ttchips button').forEach(x => x.classList.toggle('on', x === b)); yearFilter = b.dataset.y; sfx('card');
    $('ttlist').innerHTML = red('<div>' + listHtml() + '</div>');
  });
  if (last && last.place === 1) setTimeout(() => confetti(120), 600);
}
