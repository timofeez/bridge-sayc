// 🎧 Подкаст «Спутник с нуля»: 10 выпусков, озвученных по сценарию data/podcast.json.
// timings.json — секунда начала каждого абзаца (0-й — название выпуска): по ним работает перелистывание.
let PODCAST = null, PODDUR = {}, PODTIME = {};
async function podLoad() {
  if (PODCAST) return PODCAST;
  try { PODCAST = await (await fetch('data/podcast.json')).json(); } catch { PODCAST = []; }
  try { PODDUR = await (await fetch('podcast/durations.json', { cache: 'no-cache' })).json(); } catch { PODDUR = {}; }
  try { PODTIME = await (await fetch('podcast/timings.json', { cache: 'no-cache' })).json(); } catch { PODTIME = {}; }
  return PODCAST;
}
const podFile = id => `podcast/ep${String(id).padStart(2, '0')}.mp3`;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let podAudio = null;

async function podcastPage() {
  if (podAudio) podAudio.pause();
  const eps = await podLoad(), heard = store.get('podHeard', {}), pos = store.get('podPos', {});
  render(`<div class="pod-hero"><div class="pod-wave">${'<i></i>'.repeat(18)}</div><div class="pod-ico">🎧</div>
    <h2>Спутник с нуля</h2><p>Подкаст из ${eps.length} выпусков: от «что такое взятка» до виста. Слушайте по порядку — каждое слово объясняется при первом появлении.</p>
    <small>Прослушано: ${Object.keys(heard).length} из ${eps.length}</small></div>
  <div class="podlist">${eps.map((e, i) => { const d = PODDUR[`ep${String(e.id).padStart(2, '0')}.mp3`]; return `<a href="#" class="podrow ${heard[e.id] ? 'heard' : ''}" data-id="${e.id}" style="--i:${i}">
    <span class="podnum">${heard[e.id] ? '✓' : e.id}</span><div><b>${e.title}</b><small>${d ? mmss(d) : ''}${pos[e.id] && !heard[e.id] ? ` · остановились на ${mmss(pos[e.id])}` : ''}</small></div><i>▶</i></a>`; }).join('')}</div>
  <p class="muted">Озвучено нейросетевым голосом. На странице выпуска можно нажать любой абзац текста, чтобы перейти к нему.</p>`, 'Подкаст', spHome);
  $app.querySelectorAll('.podrow').forEach(a => a.onclick = e => { e.preventDefault(); podEpisode(+a.dataset.id); });
}

async function podEpisode(id) {
  const eps = await podLoad(), ep = eps.find(e => e.id === id);
  if (!ep) return podcastPage();
  if (podAudio) podAudio.pause();
  const file = podFile(id);
  // Сохранить выпуск для прослушивания без интернета (и для перемотки из кэша)
  if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'cache-audio', path: '/' + location.pathname.replace(/[^/]*$/, '').replace(/^\//, '') + file });
  podAudio = new Audio(file);
  podAudio.preload = 'auto';
  const a = podAudio, pos = store.get('podPos', {}), next = eps.find(e => e.id === id + 1);
  const starts = PODTIME[id] || [], dur0 = PODDUR[`ep${String(id).padStart(2, '0')}.mp3`] || 0;
  const paras = ep.text.map((p, i) => ({ t: starts[i + 1], p }));
  render(`<div class="pod-player"><div class="pod-wave big" id="pwave">${'<i></i>'.repeat(28)}</div>
    <small class="pod-ep">Выпуск ${id} из ${eps.length}</small><h2>${ep.title}</h2>
    <div class="pod-seekwrap"><div class="pod-marks">${starts.slice(1).map(t => dur0 ? `<i style="left:${100 * t / dur0}%"></i>` : '').join('')}</div>
      <input type="range" id="pseek" min="0" max="${dur0 || 100}" step="0.1" value="0" class="pod-seek"></div>
    <div class="pod-time"><span id="pcur">0:00</span><span id="pdur">${dur0 ? mmss(dur0) : '—'}</span></div>
    <div class="pod-ctl"><button id="pprev" title="Предыдущий абзац">⏮</button><button id="pback" title="Назад 15 секунд">↺15</button><button id="pplay" class="main">▶</button><button id="pfwd" title="Вперёд 15 секунд">15↻</button><button id="pnextp" title="Следующий абзац">⏭</button></div>
    <div class="seg pod-speed" data-n="sp">${[0.8, 1, 1.25, 1.5].map(v => `<button data-v="${v}" class="${(store.get('podRate', 1)) === v ? 'on' : ''}">×${v}</button>`).join('')}</div></div>
  ${next ? `<button class="btn block" id="pnext">Следующий: ${next.title} →</button>` : ''}
  <div class="card pod-text"><h3 style="margin-top:0">Текст выпуска</h3><p class="muted" style="margin-top:-4px">Нажмите на абзац, чтобы перейти к нему.</p>
    ${paras.map((x, i) => `<p class="pp" data-i="${i}" ${x.t !== undefined ? `data-t="${x.t}"` : ''}>${x.t !== undefined ? `<span class="ppt">${mmss(x.t)}</span>` : ''}${x.p}</p>`).join('')}</div>`, `Выпуск ${id}`, () => { a.pause(); podcastPage(); });
  a.playbackRate = store.get('podRate', 1);
  const seek = $('pseek'), play = $('pplay'), wave = $('pwave');
  const total = () => (isFinite(a.duration) && a.duration > 0 ? a.duration : dur0);
  let dragging = false, lastPara = -1;

  const save = () => { const p = store.get('podPos', {}); p[id] = Math.floor(a.currentTime); store.set('podPos', p); };
  // Перейти к секунде: работает и до загрузки метаданных
  const goTo = t => {
    const T = total(); t = Math.max(0, T ? Math.min(t, T - 0.3) : t);
    a.currentTime = t; seek.value = t; $('pcur').textContent = mmss(t); highlight(t); save();
  };
  const paraAt = t => { let k = -1; paras.forEach((x, i) => { if (x.t !== undefined && x.t <= t + 0.05) k = i; }); return k; };
  const highlight = t => {
    const k = paraAt(t); if (k === lastPara) return; lastPara = k;
    $app.querySelectorAll('.pp').forEach((el, i) => el.classList.toggle('now', i === k));
    const el = $app.querySelector(`.pp[data-i="${k}"]`);
    if (el && !a.paused) { const r = el.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  };

  a.addEventListener('loadedmetadata', () => {
    seek.max = total(); $('pdur') && ($('pdur').textContent = mmss(total()));
    if (pos[id] && pos[id] < total() - 5) goTo(pos[id]);
  });
  a.addEventListener('timeupdate', () => {
    if (!$('pseek')) { a.pause(); return; }
    if (!dragging) { seek.value = a.currentTime; $('pcur').textContent = mmss(a.currentTime); }
    highlight(a.currentTime);
    if (Math.floor(a.currentTime) % 5 === 0) save();
  });
  a.addEventListener('play', () => { play.textContent = '❚❚'; wave.classList.add('on'); });
  a.addEventListener('pause', () => { if (!$('pplay')) return; play.textContent = '▶'; wave.classList.remove('on'); save(); });
  a.addEventListener('ended', () => {
    const h = store.get('podHeard', {}); if (!h[id]) { h[id] = 1; store.set('podHeard', h); addXP(25); }
    const p = store.get('podPos', {}); delete p[id]; store.set('podPos', p);
    if (next && $('pnext')) setTimeout(() => podEpisode(next.id), 1200);
  });

  // Ползунок: пока тянем — только показываем время, отпустили — перематываем
  seek.addEventListener('pointerdown', () => { dragging = true; });
  seek.addEventListener('input', () => { dragging = true; $('pcur').textContent = mmss(+seek.value); });
  seek.addEventListener('change', () => { dragging = false; goTo(+seek.value); });
  seek.addEventListener('pointerup', () => { if (dragging) { dragging = false; goTo(+seek.value); } });

  play.onclick = () => (a.paused ? a.play() : a.pause());
  $('pback').onclick = () => goTo(a.currentTime - 15);
  $('pfwd').onclick = () => goTo(a.currentTime + 15);
  // По абзацам: «назад» в начале абзаца ведёт к предыдущему, иначе — к началу текущего
  $('pprev').onclick = () => {
    const k = paraAt(a.currentTime), cur = paras[k];
    const target = cur && a.currentTime - cur.t > 2 ? cur.t : (paras[k - 1] ? paras[k - 1].t : 0);
    goTo(target || 0);
  };
  $('pnextp').onclick = () => { const k = paraAt(a.currentTime), nx = paras[k + 1]; if (nx && nx.t !== undefined) goTo(nx.t); };
  $app.querySelectorAll('.pp[data-t]').forEach(el => el.onclick = () => { goTo(+el.dataset.t); if (a.paused) a.play().catch(() => {}); });
  wireSeg($app, () => { const v = +segVal($app, 'sp'); a.playbackRate = v; store.set('podRate', v); });
  if (next) $('pnext').onclick = () => podEpisode(next.id);
  // Клавиатура: пробел — пауза, стрелки — ±15 секунд
  const key = ev => {
    if (!$('pseek')) return document.removeEventListener('keydown', key);
    if (ev.code === 'Space') { ev.preventDefault(); play.click(); }
    if (ev.code === 'ArrowLeft') goTo(a.currentTime - 15);
    if (ev.code === 'ArrowRight') goTo(a.currentTime + 15);
  };
  document.addEventListener('keydown', key);
  a.play().catch(() => {});
}
