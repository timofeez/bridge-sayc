// 🎧 Подкаст «Спутник с нуля»: 10 выпусков, озвученных по сценарию data/podcast.json.
let PODCAST = null, PODDUR = {};
async function podLoad() {
  if (PODCAST) return PODCAST;
  try { PODCAST = await (await fetch('data/podcast.json')).json(); } catch { PODCAST = []; }
  try { PODDUR = await (await fetch('podcast/durations.json')).json(); } catch { PODDUR = {}; }
  return PODCAST;
}
const podFile = id => `podcast/ep${String(id).padStart(2, '0')}.mp3`;
const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let podAudio = null;

async function podcastPage() {
  const eps = await podLoad(), heard = store.get('podHeard', {}), pos = store.get('podPos', {});
  render(`<div class="pod-hero"><div class="pod-wave">${'<i></i>'.repeat(18)}</div><div class="pod-ico">🎧</div>
    <h2>Спутник с нуля</h2><p>Подкаст из ${eps.length} выпусков: от «что такое взятка» до виста. Слушайте по порядку — каждое слово объясняется при первом появлении.</p>
    <small>Прослушано: ${Object.keys(heard).length} из ${eps.length}</small></div>
  <div class="podlist">${eps.map((e, i) => { const d = PODDUR[`ep${String(e.id).padStart(2, '0')}.mp3`]; return `<a href="#" class="podrow ${heard[e.id] ? 'heard' : ''}" data-id="${e.id}" style="--i:${i}">
    <span class="podnum">${heard[e.id] ? '✓' : e.id}</span><div><b>${e.title}</b><small>${d ? mmss(d) : ''}${pos[e.id] && !heard[e.id] ? ` · остановились на ${mmss(pos[e.id])}` : ''}</small></div><i>▶</i></a>`; }).join('')}</div>
  <p class="muted">Голос — синтезатор речи. Текст каждого выпуска есть на его странице.</p>`, 'Подкаст', spHome);
  $app.querySelectorAll('.podrow').forEach(a => a.onclick = e => { e.preventDefault(); podEpisode(+a.dataset.id); });
}

async function podEpisode(id) {
  const eps = await podLoad(), ep = eps.find(e => e.id === id);
  if (!ep) return podcastPage();
  if (podAudio) { podAudio.pause(); }
  podAudio = new Audio(podFile(id));
  const a = podAudio, pos = store.get('podPos', {});
  const next = eps.find(e => e.id === id + 1);
  render(`<div class="pod-player"><div class="pod-wave big ${''}" id="pwave">${'<i></i>'.repeat(28)}</div>
    <small class="pod-ep">Выпуск ${id} из ${eps.length}</small><h2>${ep.title}</h2>
    <input type="range" id="pseek" min="0" max="1000" value="0" class="pod-seek">
    <div class="pod-time"><span id="pcur">0:00</span><span id="pdur">—</span></div>
    <div class="pod-ctl"><button id="pback">↺15</button><button id="pplay" class="main">▶</button><button id="pfwd">15↻</button></div>
    <div class="seg pod-speed" data-n="sp">${[0.8, 1, 1.25, 1.5].map(v => `<button data-v="${v}" class="${(store.get('podRate', 1)) === v ? 'on' : ''}">×${v}</button>`).join('')}</div></div>
  ${next ? `<button class="btn block" id="pnext">Следующий: ${next.title} →</button>` : ''}
  <details class="card pod-text" open><summary>Текст выпуска</summary>${ep.text.map(p => `<p>${p}</p>`).join('')}</details>`, `Выпуск ${id}`, () => { a.pause(); podcastPage(); });
  a.playbackRate = store.get('podRate', 1);
  const seek = $('pseek'), play = $('pplay'), wave = $('pwave');
  const save = () => { const p = store.get('podPos', {}); p[id] = Math.floor(a.currentTime); store.set('podPos', p); };
  a.addEventListener('loadedmetadata', () => { if (pos[id] && pos[id] < a.duration - 5) a.currentTime = pos[id]; $('pdur') && ($('pdur').textContent = mmss(a.duration)); });
  a.addEventListener('timeupdate', () => {
    if (!$('pseek')) { a.pause(); return; }
    if (a.duration) seek.value = 1000 * a.currentTime / a.duration;
    $('pcur').textContent = mmss(a.currentTime);
    if (Math.floor(a.currentTime) % 5 === 0) save();
  });
  a.addEventListener('play', () => { play.textContent = '❚❚'; wave.classList.add('on'); });
  a.addEventListener('pause', () => { if (!$('pplay')) return; play.textContent = '▶'; wave.classList.remove('on'); save(); });
  a.addEventListener('ended', () => {
    const h = store.get('podHeard', {}); if (!h[id]) { h[id] = 1; store.set('podHeard', h); addXP(25); }
    const p = store.get('podPos', {}); delete p[id]; store.set('podPos', p);
    if (next && $('pnext')) setTimeout(() => podEpisode(next.id), 1200);
  });
  play.onclick = () => (a.paused ? a.play() : a.pause());
  $('pback').onclick = () => { a.currentTime = Math.max(0, a.currentTime - 15); };
  $('pfwd').onclick = () => { a.currentTime = Math.min(a.duration || 0, a.currentTime + 15); };
  seek.oninput = () => { if (a.duration) a.currentTime = a.duration * seek.value / 1000; };
  wireSeg($app, () => { const v = +segVal($app, 'sp'); a.playbackRate = v; store.set('podRate', v); });
  if (next) $('pnext').onclick = () => podEpisode(next.id);
  a.play().catch(() => {});
}
