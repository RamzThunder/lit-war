import qrcode from 'qrcode-generator';
import { ERAS, eraLabel } from '../prototype/minigames/wiring.js';
import { teamName, teamShort } from '../prototype/teams.js';
// Draft teacher / TV dashboard. Connects to the same room socket with role=teacher.
const $ = selector => document.querySelector(selector);
const PHASE_LABEL = { free: '자유 진행', lobby: '시작 대기', opening: '오프닝 상영', playing: '진행 중', paused: '멈춤', ended: '종료' };
const store = {
  get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } },
};
const params = new URLSearchParams(location.search);
const view = { lesson: null, endsAt: null, scores: null, roster: [], feed: [], raids: new Map(), watching: null };
const TEAM = { blue: teamShort('blue'), red: teamShort('red') };
$('#name-blue').textContent = teamName('blue'); $('#name-red').textContent = teamName('red');
let spectator = null, spectatorLoading = null, resultTimer = null;
let socket = null, room = '', key = '', retry = 0, fatal = false, heartbeat = null;

const setTv = on => { document.body.classList.toggle('tv', on); $('#tv-toggle').textContent = on ? '교사 모드' : 'TV 모드'; };
setTv(params.has('tv'));
$('#tv-toggle').addEventListener('click', () => setTv(!document.body.classList.contains('tv')));

function connect() {
  fatal = false;
  $('#conn').textContent = retry ? `재접속 중 (${retry}/5)…` : '접속 중…'; $('#conn').className = 'conn';
  const url = new URL(`/api/rooms/${room}`, location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('role', 'teacher'); url.searchParams.set('key', key);
  const ws = new WebSocket(url); socket = ws;
  ws.addEventListener('message', ({ data }) => { if (socket === ws) handle(JSON.parse(data)); });
  ws.addEventListener('close', () => {
    if (socket !== ws) return;
    clearInterval(heartbeat);
    if (fatal) return;
    if (retry < 5) { retry++; setTimeout(connect, Math.min(1000 * 2 ** (retry - 1), 8000)); $('#conn').textContent = `재접속 대기 (${retry}/5)…`; }
    else { $('#conn').textContent = '연결 끊김 — 새로고침하세요'; }
  });
}
const send = data => { if (socket?.readyState !== WebSocket.OPEN) return false; socket.send(JSON.stringify(data)); return true; };

function handle(event) {
  switch (event.type) {
    case 'teacher-welcome':
      retry = 0; store.set('teacher-room', room); store.set('teacher-key', key);
      $('#join').hidden = true; $('#dash').hidden = false;
      $('#room-label').textContent = `입장 코드 ${room}`;
      renderEntryInfo();
      $('#conn').textContent = '연결됨'; $('#conn').className = 'conn ok';
      Object.assign(view, { scores: event.scores, roster: event.roster, feed: event.feed });
      setLesson(event.lesson); renderAll();
      view.contam = event.contam ?? []; renderContam();
      view.raids.clear(); view.watching = null;
      for (const raid of event.raids ?? []) addRaid(raid);
      renderArena();
      clearInterval(heartbeat); heartbeat = setInterval(() => send({ type: 'ping' }), 15000);
      break;
    case 'lesson': setLesson(event.lesson); renderLesson(); break;
    case 'scores': view.scores = event.scores; renderScores(); break;
    case 'roster': view.roster = event.roster; renderRoster(); renderScores(); if (view.lesson?.phase === 'opening') renderLesson(); break;
    case 'feed': view.feed = [...view.feed.slice(-29), event.item]; renderFeed(); break;
    case 'watch-start': addRaid(event.raid); watch(event.raid.id); break;
    case 'watch-move': {
      const raid = view.raids.get(event.id); if (!raid) break;
      raid[event.role].player = event.player;
      if (view.watching === event.id) spectator?.move(event.role, event.player);
      break;
    }
    case 'watch-shock': {
      const raid = view.raids.get(event.id); if (!raid) break;
      Object.assign(raid, { shocks: event.shocks, stolen: event.totalStolen });
      if (event.defender) raid.defender.player = event.defender;
      if (view.watching === event.id) { spectator?.shock(event); renderArenaBanner(); }
      break;
    }
    case 'watch-end': endRaid(event); break;
    case 'contam-log': view.contam = event.log; renderContam(); break;
    case 'error':
      if (event.fatal) {
        fatal = true;
        $('#join').hidden = false; $('#dash').hidden = true;
        $('#join-error').textContent = event.message; $('#conn').textContent = '접속 전';
      } else flash(event.message);
      break;
  }
}
function setLesson(lesson) {
  if (lesson.phase !== view.lesson?.phase) view.entryPinned = null;
  view.lesson = lesson; view.endsAt = lesson.left == null ? null : performance.now() + lesson.left;
  view.eventEndsAt = lesson.event ? performance.now() + lesson.event.left : null;
}
// Server replies such as "아직 영상을 보는 학생이 있어요" must be seen, so show them as a toast.
let toastTimer = null;
function flash(message) {
  const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  if (view.lesson) renderLesson();
}

// ---- render --------------------------------------------------------------------------
const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function renderTimer() {
  const { lesson } = view;
  if (!lesson) return;
  const left = view.endsAt != null ? view.endsAt - performance.now() : lesson.left;
  $('#timer').textContent = left == null ? (lesson.phase === 'ended' ? '00:00' : '--:--') : clock(left);
  const chip = $('#event-chip');
  chip.hidden = view.eventEndsAt == null;
  if (!chip.hidden) chip.textContent = `⚠️ 오염 경보 진행 중 · ${Math.max(0, Math.ceil((view.eventEndsAt - performance.now()) / 1000))}초`;
}
function renderLesson() {
  const { phase } = view.lesson;
  $('#phase').textContent = PHASE_LABEL[phase]; $('#phase').className = `phase ${phase}`;
  const idle = phase === 'lobby' || phase === 'ended' || phase === 'free' || phase === 'opening';
  $('#start').hidden = !idle; $('#minutes').closest('label').hidden = !idle;
  // During the opening the timer is stopped; start unlocks once every student finished.
  const opening = phase === 'opening' ? view.lesson.opening : null;
  $('#opening').hidden = !idle; $('#opening').disabled = false; $('#opening').textContent = opening ? '🎬 다시 재생' : '🎬 오프닝 재생';
  $('#start').disabled = Boolean(opening && !opening.ready);
  $('#force-start').hidden = !opening || opening.ready;
  $('#opening-chip').hidden = !opening;
  if (opening) {
    $('#opening-chip').textContent = opening.ready ? `🎬 모두 시청 완료 (${opening.total}명) · 시작할 수 있어요` : `🎬 오프닝 · ${openingBreakdown()} · ${opening.done} / ${opening.total}명 완료`;
    $('#opening-chip').classList.toggle('ready', opening.ready);
  }
  $('#pause').hidden = phase !== 'playing';
  $('#resume').hidden = phase !== 'paused';
  $('#end').hidden = idle;
  $('#event').hidden = phase !== 'playing'; $('#event').disabled = Boolean(view.lesson.event);
  renderTimer(); renderEntry();
}
// Per-student opening status reported by each student's browser.
const OPENING_TAG = { waiting: '⏳ 대기', click: '👆 재생 버튼 대기', playing: '▶ 시청 중', done: '✓ 시청 완료', error: '⚠ 재생 오류' };
const openingTag = o => (!o ? '' : o.status === 'loading' ? `⬇ 불러오는 중 ${o.pct}%` : OPENING_TAG[o.status] ?? '');
function openingBreakdown() {
  const online = view.roster.filter(p => p.online && p.opening);
  const count = test => online.filter(p => test(p.opening.status)).length;
  const parts = [[count(s => s === 'loading' || s === 'waiting'), '불러오는 중'], [count(s => s === 'playing'), '시청 중'], [count(s => s === 'click' || s === 'error'), '확인 필요']];
  return parts.filter(([n]) => n).map(([n, label]) => `${label} ${n}`).join(' · ') || '준비 중';
}
function renderScores() {
  const scores = view.scores; if (!scores) return;
  const total = team => ERAS.reduce((sum, era) => sum + scores[era][team], 0);
  $('#total-blue').textContent = total('blue'); $('#total-red').textContent = total('red');
  $('#eras').replaceChildren(...ERAS.map(era => {
    const { blue, red } = scores[era];
    const owner = blue > red ? 'blue' : red > blue ? 'red' : '';
    const tile = document.createElement('div');
    tile.className = `era ${owner}`;
    tile.innerHTML = `<div class="era-head"><span class="era-name"></span><span class="era-owner"></span></div><div class="era-bar ${blue + red ? '' : 'empty'}"><i style="width:${blue + red ? (blue / (blue + red)) * 100 : 50}%"></i></div><div class="era-score"><span class="b">${blue}</span><span class="r">${red}</span></div>`;
    tile.querySelector('.era-name').textContent = eraLabel(era);
    tile.querySelector('.era-owner').textContent = owner ? `${TEAM[owner]} 점령` : blue ? '동점' : '비어 있음';
    return tile;
  }));
}
function renderRoster() {
  const online = view.roster.filter(p => p.online);
  $('#online-count').textContent = `접속 ${online.length} / 전체 ${view.roster.length}`;
  renderEntry();
  for (const team of ['blue', 'red']) {
    const list = view.roster.filter(p => p.team === team).sort((a, b) => b.online - a.online || b.missions - a.missions);
    $(`#count-${team}`).textContent = `${list.filter(p => p.online).length}명 접속`;
    const ul = $(`#roster-${team}`);
    if (!list.length) { ul.innerHTML = '<li class="empty-note">아직 없어요</li>'; continue; }
    ul.replaceChildren(...list.map(p => {
      const li = document.createElement('li');
      li.className = p.online ? 'online' : 'offline';
      li.innerHTML = '<span class="dot"></span><span class="name"></span><span class="tag"></span><span class="missions"></span>';
      li.querySelector('.name').textContent = p.name;
      li.querySelector('.tag').textContent = p.raiding ? '⚡공격 중' : openingTag(p.opening);
      li.querySelector('.missions').textContent = `미션 ${p.missions}`;
      if (p.online) {
        const kick = document.createElement('button'); kick.type = 'button'; kick.textContent = '퇴장';
        kick.addEventListener('click', () => { if (confirm(`${p.name} 학생의 접속을 끊을까요?`)) send({ type: 'kick', name: p.name }); });
        li.append(kick);
      }
      return li;
    }));
  }
}
function renderFeed() {
  const list = view.feed;
  if (!list.length) { $('#feed').innerHTML = '<li class="empty-note">아직 소식이 없어요</li>'; return; }
  $('#feed').replaceChildren(...list.map(item => {
    const li = document.createElement('li'); li.className = item.tone;
    const time = document.createElement('time');
    time.textContent = new Date(item.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    li.append(time, item.text);
    return li;
  }));
}
// ---- live raid spectator ---------------------------------------------------------------
function addRaid(raid) {
  if (!raid) return;
  view.raids.set(raid.id, { ...raid, endsAt: performance.now() + raid.left });
  if (!view.watching) view.watching = raid.id;
}
async function ensureSpectator() {
  if (spectator) return spectator;
  spectatorLoading ??= import('./spectator.js').then(({ createSpectator }) => (spectator = createSpectator($('#arena'))));
  return spectatorLoading;
}
async function watch(id) {
  view.watching = id;
  clearTimeout(resultTimer); $('#arena-result').hidden = true;
  renderArena();
  const raid = view.raids.get(id);
  if (raid) (await ensureSpectator()).show(raid);
}
function endRaid({ id, shocks, stolen }) {
  const raid = view.raids.get(id); if (!raid) return;
  view.raids.delete(id);
  if (view.watching !== id) { renderArenaTabs(); return; }
  const result = $('#arena-result');
  result.textContent = shocks ? `${raid.attacker.name} 승! 감전 ${shocks}번 · ${stolen}점 탈취` : `${raid.defender.name} 완벽 회피!`;
  result.className = `arena-result ${shocks ? raid.attacker.team : raid.defender.team}`;
  result.hidden = false;
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => {
    result.hidden = true;
    const next = [...view.raids.keys()].at(-1);
    if (next) watch(next); else { view.watching = null; spectator?.clear(); renderArena(); }
  }, 3000);
}
function renderArenaTabs() {
  const tabs = [...view.raids.values()];
  $('#arena-tabs').replaceChildren(...(tabs.length > 1 ? tabs : []).map(raid => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = raid.id === view.watching ? 'active' : 'ghost';
    button.textContent = `${raid.attacker.name} → ${raid.defender.name}`;
    button.addEventListener('click', () => watch(raid.id));
    return button;
  }));
}
function renderArenaBanner() {
  const raid = view.raids.get(view.watching); if (!raid) return;
  $('#arena-title').innerHTML = '<b class="att"></b> → <b class="def"></b>의 기록실';
  $('#arena-title .att').textContent = `${raid.attacker.name}(${TEAM[raid.attacker.team]})`;
  $('#arena-title .def').textContent = `${raid.defender.name}(${TEAM[raid.defender.team]})`;
  $('#arena-title .att').className = `att ${raid.attacker.team}`; $('#arena-title .def').className = `def ${raid.defender.team}`;
  $('#arena-stats').textContent = `감전 ${raid.shocks} / ${raid.maxShocks}${raid.stolen ? ` · ${raid.stolen}점 탈취` : ''}`;
}
function renderArena() {
  const showing = Boolean(view.watching) || !$('#arena-result').hidden;
  $('#arena-panel').hidden = !showing;
  renderArenaTabs(); renderArenaBanner();
}
setInterval(() => {
  const raid = view.raids.get(view.watching);
  if (raid) $('#arena-timer').textContent = Math.max(0, Math.ceil((raid.endsAt - performance.now()) / 1000));
}, 200);

const CONTAM_STATUS = { planted: ['아직 안 고쳐짐', 'open'], fixed: ['✨ 정화됨', 'fixed'], missed: ['정화 실패 (정답 공개됨)', 'missed'] };
function renderContam() {
  const list = view.contam ?? [];
  $('#contam-panel').hidden = !list.length;
  $('#contam-log').replaceChildren(...list.map(item => {
    const li = document.createElement('li');
    const [status, tone] = CONTAM_STATUS[item.status] ?? ['', ''];
    li.className = tone;
    const show = value => (item.field === 'era' ? eraLabel(value) : value);
    li.innerHTML = '<span class="what"></span><span class="swap"><s></s> → <b></b></span><span class="who"></span><span class="status"></span>';
    li.querySelector('.what').textContent = `「${item.title}」 ${item.field === 'era' ? '시대' : '작가'}`;
    li.querySelector('s').textContent = show(item.fake);
    li.querySelector('b').textContent = show(item.truth);
    li.querySelector('.who').textContent = `${item.by} → ${item.target}의 방`;
    li.querySelector('.status').textContent = status;
    return li;
  }));
}

// ---- student entry (code + QR on the classroom TV) -------------------------------------
// Students can only join rooms a teacher opened, so the TV is how they find the room.
// The big panel shows itself while waiting to start; the teacher can toggle it any time.
const joinUrl = () => { const url = new URL('/', location.href); url.searchParams.set('room', room); return url.href; };
function renderEntryInfo() {
  const qr = qrcode(0, 'M'); qr.addData(joinUrl()); qr.make();
  $('#entry-qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
  $('#entry-code').textContent = room;
  $('#entry-url').textContent = new URL('/', location.href).host;
  $('#entry-toggle').hidden = false;
}
function renderEntry() {
  const phase = view.lesson?.phase;
  const auto = phase === 'lobby' || phase === 'free';
  const show = view.entryPinned ?? auto;
  $('#entry').hidden = !show;
  $('#entry-toggle').textContent = show ? '입장 안내 숨기기' : '📱 입장 안내';
  const online = view.roster.filter(p => p.online).length;
  $('#entry-count').textContent = `지금 ${online}명 입장`;
}
$('#entry-toggle').addEventListener('click', () => { view.entryPinned = $('#entry').hidden; renderEntry(); });

function renderAll() { renderLesson(); renderScores(); renderRoster(); renderFeed(); }
setInterval(renderTimer, 250);

// ---- controls ------------------------------------------------------------------------
$('#start').addEventListener('click', () => send({ type: 'start', minutes: Number($('#minutes').value) }));
$('#opening').addEventListener('click', () => {
  if (view.lesson?.phase === 'opening' && !confirm('모든 학생의 오프닝 영상을 처음부터 다시 틀까요?')) return;
  if (!send({ type: 'opening' })) { flash('서버와 연결이 끊겨 있어요. 잠시 후 다시 눌러 주세요.'); return; }
  // Immediate feedback until the server's reply re-renders the controls.
  $('#opening').disabled = true; $('#opening').textContent = '⏳ 보내는 중…';
});
$('#force-start').addEventListener('click', () => { if (confirm('아직 영상을 보는 학생이 있어요. 기다리지 않고 바로 시작할까요?')) send({ type: 'start', minutes: Number($('#minutes').value), force: true }); });
$('#pause').addEventListener('click', () => send({ type: 'pause' }));
$('#resume').addEventListener('click', () => send({ type: 'resume' }));
$('#end').addEventListener('click', () => { if (confirm('게임을 끝낼까요? 남은 시간이 사라집니다.')) send({ type: 'end' }); });
$('#event').addEventListener('click', () => { if (confirm('지금 1분 오염 경보를 발동할까요?')) send({ type: 'event' }); });
$('#reset').addEventListener('click', () => { if (confirm('모든 점수와 학생 미션 기록을 0으로 되돌릴까요? 팀 배정은 유지됩니다.')) send({ type: 'reset' }); });
$('#join-form').addEventListener('submit', event => {
  event.preventDefault();
  room = $('#room').value.trim().toUpperCase(); key = $('#key').value;
  $('#join-error').textContent = ''; retry = 0;
  socket?.close(); connect();
});
// Random code without look-alike characters (0/O, 1/I/L) so students can type it from the TV.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
$('#new-room').addEventListener('click', () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  $('#room').value = [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
});
$('#room').value = params.get('room') ?? store.get('teacher-room') ?? '';
const savedKey = store.get('teacher-key');
if ($('#room').value && savedKey) { $('#key').value = savedKey; $('#join-form').requestSubmit(); }
