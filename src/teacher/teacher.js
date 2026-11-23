import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '../shared/system.css';
import './teacher.css';
import qrcode from 'qrcode-generator';
import { ERAS, eraLabel } from '../prototype/minigames/wiring.js';
import { teamName, teamShort } from '../prototype/teams.js';
import { eraOwner, isClose, teamTotal, heldCount } from '../shared/eras.js';
import { createRoom, savedLogin, clock, timeLeft, feedTime, joinUrl, awayList } from './room.js';
// Teacher console. The classroom TV is a separate view-only page (tv.html).
const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
// Old links used ?tv on this page; the TV now has its own page.
if (params.has('tv')) location.replace(`/tv.html${params.get('room') ? `?room=${params.get('room')}` : ''}`);
const room = createRoom();
const { view } = room;
const PHASE_LABEL = { free: '자유 진행', lobby: '시작 대기', opening: '오프닝 상영', playing: '진행 중', paused: '잠시 멈춤', ended: '종료' };
const ENDING_NAME = { guardian: '보존관 승리', luddite: '러다이트 승리', draw: '접전' };
let spectator = null, spectatorLoading = null, menuTarget = null;
for (const el of document.querySelectorAll('.team-name')) el.textContent = teamName(el.dataset.team);

// ---- toast: server replies such as "아직 영상을 보는 학생이 있어요" must be seen -------
let toastTimer = null;
function flash(message) {
  const toast = $('#toast'); toast.textContent = message; toast.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
  if (view.lesson) renderLesson();
}

// ---- state + controls (only what works in this phase) -----------------------------------
function renderTimer() {
  const { lesson } = view; if (!lesson) return;
  const left = timeLeft(view);
  $('#timer').textContent = left == null ? (lesson.phase === 'ended' ? '00:00' : '--:--') : clock(left);
  const total = lesson.durationMs;
  $('#progress').style.width = total && left != null ? `${Math.min(100, ((total - left) / total) * 100)}%` : lesson.phase === 'ended' ? '100%' : '0';
  $('#state-note').textContent = total ? `${Math.round(total / 60000)}분 수업${left != null ? ` · ${clock(total - left)} 지남` : ''}` : '시작하면 시간이 흘러요';
  const chip = $('#event-chip');
  chip.hidden = view.eventEndsAt == null;
  if (!chip.hidden) chip.textContent = `⚠ 오염 경보 진행 중 · ${Math.max(0, Math.ceil((view.eventEndsAt - performance.now()) / 1000))}초`;
}
function renderLesson() {
  const { phase } = view.lesson;
  $('#phase').textContent = PHASE_LABEL[phase]; $('#phase').className = `pill ${phase}`;
  const idle = phase === 'lobby' || phase === 'ended' || phase === 'free' || phase === 'opening';
  const opening = phase === 'opening' ? view.lesson.opening : null;
  $('#opening').hidden = !idle; $('#opening').disabled = false; $('#opening').textContent = opening ? '🎬 오프닝 다시 재생' : '🎬 오프닝 재생';
  $('#minutes-row').hidden = !idle; $('#start').hidden = !idle;
  $('#start').disabled = Boolean(opening && !opening.ready);
  $('#force-start').hidden = !opening || opening.ready;
  $('#pause').hidden = phase !== 'playing';
  $('#resume').hidden = phase !== 'paused';
  $('#event').hidden = phase !== 'playing'; $('#event').disabled = Boolean(view.lesson.event);
  $('#end').hidden = idle;
  const awaiting = phase === 'ended' && view.lesson.sealed;
  $('#ending').hidden = !awaiting; $('#reveal').hidden = !awaiting;
  $('#ending').textContent = view.ending ? '🎬 엔딩 처음부터 다시' : '🎬 엔딩 재생';
  const seal = $('#seal-chip');
  seal.hidden = !view.lesson.sealed;
  seal.textContent = view.ending ? `🎬 TV에서 ${ENDING_NAME[view.ending.film]} 엔딩 재생 중` : awaiting ? '🔒 TV와 학생에게 결과를 가려 뒀어요' : '🔒 마지막 30초 · 점수는 교사에게만 보여요';
  const chip = $('#opening-chip');
  chip.hidden = !opening;
  if (opening) {
    chip.textContent = opening.ready ? `🎬 모두 준비 완료 (${opening.total}명) · 시작할 수 있어요` : `🎬 ${openingBreakdown()} · ${opening.done} / ${opening.total}명 완료`;
    chip.className = `chip${opening.ready ? ' ready' : ''}`;
  }
  renderTimer();
}
setInterval(() => { renderTimer(); renderRaidTimer(); }, 250);
// Away durations tick live while someone is off the game tab.
setInterval(() => { if (awayList(view).length) renderRoster(); }, 1000);

// Per-student opening status reported by each student's browser.
const OPENING_TAG = { waiting: '⏳ 대기', click: '👆 재생 버튼 대기', playing: '▶ 시청 중', tutorial: '🎮 튜토리얼 중', done: '✓ 준비 완료', error: '⚠ 재생 오류' };
const openingTag = o => (!o ? '' : o.status === 'loading' ? `⬇ ${o.pct}%` : OPENING_TAG[o.status] ?? '');
function openingBreakdown() {
  const online = view.roster.filter(p => p.online && p.opening);
  const count = test => online.filter(p => test(p.opening.status)).length;
  const parts = [[count(s => s === 'loading' || s === 'waiting'), '불러오는 중'], [count(s => s === 'playing'), '시청 중'], [count(s => s === 'tutorial'), '튜토리얼 중'], [count(s => s === 'click' || s === 'error'), '확인 필요']];
  return parts.filter(([n]) => n).map(([n, label]) => `${label} ${n}`).join(' · ') || '준비 중';
}

// ---- scores + era map ------------------------------------------------------------------
function renderScores() {
  const scores = view.scores; if (!scores) return;
  const total = { blue: teamTotal(scores, ERAS, 'blue'), red: teamTotal(scores, ERAS, 'red') };
  const held = { blue: heldCount(scores, ERAS, 'blue'), red: heldCount(scores, ERAS, 'red') };
  $('#total-blue').textContent = total.blue; $('#total-red').textContent = total.red;
  const sum = total.blue + total.red;
  $('#tug').classList.toggle('empty', !sum); $('#tug i').style.width = `${sum ? (total.blue / sum) * 100 : 50}%`;
  const gap = total.blue - total.red;
  $('#lead').textContent = `${gap ? `${teamShort(gap > 0 ? 'blue' : 'red')} 우세 +${Math.abs(gap)}` : '동점'} · 점령 ${held.blue} : ${held.red}`;
  $('#eras').replaceChildren(...ERAS.map(era => {
    const s = scores[era], owner = eraOwner(s), all = s.blue + s.red;
    const contam = view.contam.some(c => c.era === era && c.status === 'planted');
    const tile = document.createElement('div');
    tile.className = `era-tile ${owner}`;
    tile.title = `${eraLabel(era)}${contam ? ' · 오염된 기록 있음' : ''}${isClose(s) ? ' · 접전(10점 이내)' : ''}`;
    const flags = (contam ? '<span class="flag contam"></span>' : '') + (isClose(s) ? '<span class="flag close"></span>' : '');
    tile.innerHTML = `${flags ? `<span class="flags">${flags}</span>` : ''}<span class="sys yr">${era}</span><span class="owner"></span><span class="split"><i style="width:${all ? (s.blue / all) * 100 : 0}%"></i></span><span class="nums"><span class="sys c-blue">${s.blue}</span><span class="sys c-red">${s.red}</span></span>`;
    tile.querySelector('.owner').textContent = { empty: '-', tie: '동점', blue: teamShort('blue'), red: teamShort('red') }[owner];
    return tile;
  }));
}

// ---- roster: fixed 가나다 order so rows never jump; disconnected rows stay in place ------
// 수업 이탈 (any reason: another tab/window, minimised, full screen off) stays on screen in a
// red banner at the bottom until the student is back.
const awayTime = p => clock(performance.now() - p.awaySince).replace(/^0/, '');
function renderAway() {
  const away = awayList(view), banner = $('#away-banner');
  banner.hidden = !away.length;
  if (away.length) $('#away-names').textContent = `${away.length}명 · ${away.map(p => `${p.name} ${awayTime(p)}`).join(' · ')}`;
}
function renderRoster() {
  renderAway();
  const online = view.roster.filter(p => p.online).length, off = view.roster.length - online, away = awayList(view).length;
  $('#online-count').innerHTML = `접속 <b>${online}</b> / ${view.roster.length}${away ? ` · <b class="c-danger">🚨 수업 이탈 ${away}명</b>` : ''}${off ? ` · <b>끊김 ${off}명</b>` : ''}`;
  for (const team of ['blue', 'red']) {
    const list = view.roster.filter(p => p.team === team).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    $(`#count-${team}`).textContent = `접속 ${list.filter(p => p.online).length} / ${list.length}`;
    const ul = $(`#roster-${team}`);
    if (!list.length) { ul.innerHTML = '<li class="empty-note">아직 없어요</li>'; continue; }
    ul.replaceChildren(...list.map(p => {
      const li = document.createElement('li');
      li.className = !p.online ? 'off' : p.away ? 'away' : '';
      if (p.awayCount) li.title = `게임 화면 이탈 ${p.awayCount}번`;
      li.innerHTML = `<span class="dot ${p.online ? 'on' : ''}"></span><span class="name"></span><span class="st"></span><span class="m">${p.missions}</span>`;
      li.querySelector('.name').textContent = p.name;
      li.querySelector('.st').textContent = !p.online ? '끊김' : p.away ? `🚨 수업 이탈 ${awayTime(p)}` : p.raiding ? '⚡ 공격 중' : openingTag(p.opening) || (p.awayCount ? `이탈 ${p.awayCount}회` : '');
      if (p.online) {
        const more = document.createElement('button'); more.type = 'button'; more.className = 'more'; more.textContent = '⋯';
        more.setAttribute('aria-label', `${p.name} 학생 메뉴`);
        more.addEventListener('click', event => { event.stopPropagation(); openMenu(more, p.name); });
        li.append(more);
      }
      return li;
    }));
  }
}
// Kick lives in a small menu so 30 red buttons don't sit next to the names.
function openMenu(anchor, name) {
  menuTarget = name;
  const menu = $('#menu'), rect = anchor.getBoundingClientRect();
  menu.hidden = false;
  menu.style.left = `${Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8)}px`;
  menu.style.top = `${rect.bottom + 4}px`;
}
document.addEventListener('click', () => { $('#menu').hidden = true; });
$('#menu-kick').addEventListener('click', () => { if (menuTarget && confirm(`${menuTarget} 학생의 접속을 끊을까요?`)) room.send({ type: 'kick', name: menuTarget }); });

// ---- feed + contamination ----------------------------------------------------------------
function renderFeed() {
  const list = [...view.feed].reverse();
  if (!list.length) { $('#feed').innerHTML = '<li class="empty">아직 소식이 없어요</li>'; return; }
  $('#feed').replaceChildren(...list.map(item => {
    const li = document.createElement('li'); li.className = item.tone;
    const time = document.createElement('time'); time.textContent = feedTime(item.at);
    const text = document.createElement('span'); text.textContent = item.text;
    li.append(time, text); return li;
  }));
}
const CONTAM_STATUS = { planted: ['정화 대기', 'open'], fixed: ['✓ 정화됨', 'fixed'], missed: ['정화 실패', 'missed'] };
function renderContam() {
  const list = view.contam;
  $('#contam-panel').hidden = !list.length;
  $('#contam-log').replaceChildren(...[...list].reverse().map(item => {
    const li = document.createElement('li');
    const [status, tone] = CONTAM_STATUS[item.status] ?? ['', ''];
    li.className = tone;
    const show = value => (item.field === 'era' ? eraLabel(value) : value);
    li.innerHTML = '<span class="what"></span><span class="status"></span><span class="who"></span>';
    const what = li.querySelector('.what');
    what.append(`「${item.title}」 ${item.field === 'era' ? '시대' : '작가'} `);
    const fake = document.createElement('s'); fake.textContent = show(item.fake);
    const truth = document.createElement('b'); truth.textContent = show(item.truth);
    what.append(fake, ' → ', truth);
    li.querySelector('.status').textContent = status;
    li.querySelector('.who').textContent = `${item.by} → ${item.target}의 방`;
    return li;
  }));
  renderScores();
}

// ---- live raid spectator (queue: never interrupted, then the next one) -------------------
async function ensureSpectator() {
  if (spectator) return spectator;
  spectatorLoading ??= import('./spectator.js').then(({ createSpectator }) => (spectator = createSpectator($('#arena'))));
  return spectatorLoading;
}
function renderRaid() {
  const raid = view.raids.get(view.watching) ?? view.result?.raid;
  // Keep the Phaser spectator sized while no raid is shown (0×0 breaks WebGL).
  $('#arena-panel').classList.toggle('offstage', !raid);
  const all = [...view.raids.values()];
  $('#raid-count').textContent = all.length ? `${all.length}건` : '';
  $('#arena-tabs').replaceChildren(...(all.length > 1 ? all : []).map(r => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = r.id === view.watching ? 'on' : '';
    button.textContent = `${r.attacker.name} → ${r.defender.name}`;
    button.addEventListener('click', () => room.watch(r.id));
    return button;
  }));
  if (!raid) return;
  const shocks = view.result ? view.result.shocks : raid.shocks;
  const stolen = view.result ? view.result.stolen : raid.stolen;
  $('#arena-stats').innerHTML = `${raid.attacker.name} → ${raid.defender.name} · 감전 <b>${shocks}</b>/${raid.maxShocks}${stolen ? ` · <span class="c-red">${stolen}점 탈취</span>` : ''}`;
  const result = $('#arena-result');
  result.hidden = !view.result;
  if (view.result) {
    result.className = `result ${shocks ? raid.attacker.team : raid.defender.team}`;
    result.textContent = shocks ? `${raid.attacker.name} 승! ${stolen}점 탈취` : `${raid.defender.name} 완벽 회피!`;
  }
}
function renderRaidTimer() {
  const raid = view.raids.get(view.watching);
  if (raid) $('#arena-timer').textContent = clock(raid.endsAt - performance.now());
  else if (view.result) $('#arena-timer').textContent = '00:00';
}

// ---- join code + QR ------------------------------------------------------------------
function renderEntry() {
  const qr = qrcode(0, 'M'); qr.addData(joinUrl(view.room)); qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  $('#entry-qr').innerHTML = svg; $('#qr-dialog-code').innerHTML = svg;
  $('#entry-code').textContent = view.room; $('#qr-dialog-room').textContent = view.room;
  $('#qr-dialog-host').textContent = `${location.host} → 교실 입장`;
  $('#room-label').innerHTML = '입장 코드 <b class="sys"></b>'; $('#room-label b').textContent = view.room;
}
$('#qr-big').addEventListener('click', () => $('#qr-dialog').showModal());
$('#qr-close').addEventListener('click', () => $('#qr-dialog').close());
$('#copy-code').addEventListener('click', async () => { try { await navigator.clipboard.writeText(view.room); flash('입장 코드를 복사했어요.'); } catch { flash(`입장 코드: ${view.room}`); } });
// The TV window inherits this tab's sessionStorage (room + password), so it logs in by itself.
$('#open-tv').addEventListener('click', () => window.open(`/tv.html?room=${view.room}`, 'lit-war-tv'));

// ---- socket events -------------------------------------------------------------------
room.subscribe(async (type, detail) => {
  switch (type) {
    case 'status': $('#conn').textContent = detail.text; $('#conn').className = `conn${detail.ok ? ' ok' : ''}`; break;
    case 'welcome':
      $('#join').hidden = true; $('#dash').hidden = false; $('#open-tv').hidden = false;
      renderEntry(); renderLesson(); renderScores(); renderRoster(); renderFeed(); renderContam(); renderRaid();
      break;
    case 'lesson': renderLesson(); break;
    case 'scores': renderScores(); break;
    case 'ending': renderLesson(); break;
    case 'roster': renderRoster(); renderScores(); if (view.lesson?.phase === 'opening') renderLesson(); break;
    case 'feed': renderFeed(); break;
    case 'contam': renderContam(); break;
    case 'raids': case 'raid-result': renderRaid(); break;
    case 'watch':
      renderRaid();
      if (detail.raid) (await ensureSpectator()).show(detail.raid); else spectator?.clear();
      break;
    case 'watch-move': spectator?.move(detail.role, detail.player); break;
    case 'watch-shock': spectator?.shock(detail); renderRaid(); break;
    case 'error':
      if (detail.fatal) { $('#join').hidden = false; $('#dash').hidden = true; $('#open-tv').hidden = true; $('#join-error').textContent = detail.message; $('#conn').textContent = '접속 전'; $('#conn').className = 'conn'; }
      else flash(detail.message);
      break;
  }
});

// ---- controls ------------------------------------------------------------------------
const minutes = () => Number($('#minutes').value);
$('#start').addEventListener('click', () => room.send({ type: 'start', minutes: minutes() }));
$('#opening').addEventListener('click', () => {
  if (view.lesson?.phase === 'opening' && !confirm('모든 학생의 오프닝 영상을 처음부터 다시 틀까요?')) return;
  if (!room.send({ type: 'opening' })) { flash('서버와 연결이 끊겨 있어요. 잠시 후 다시 눌러 주세요.'); return; }
  $('#opening').disabled = true; $('#opening').textContent = '⏳ 보내는 중…';
});
$('#force-start').addEventListener('click', () => { if (confirm('아직 영상이나 튜토리얼을 진행 중인 학생이 있어요. 기다리지 않고 바로 시작할까요?')) room.send({ type: 'start', minutes: minutes(), force: true }); });
$('#pause').addEventListener('click', () => room.send({ type: 'pause' }));
$('#resume').addEventListener('click', () => room.send({ type: 'resume' }));
$('#end').addEventListener('click', () => { if (confirm('게임을 끝낼까요? 남은 시간이 사라집니다.')) room.send({ type: 'end' }); });
$('#ending').addEventListener('click', () => { if (!room.send({ type: 'ending' })) flash('서버와 연결이 끊겨 있어요. 잠시 후 다시 눌러 주세요.'); });
$('#reveal').addEventListener('click', () => { if (confirm('엔딩을 건너뛰고 TV와 학생에게 최종 결과를 공개할까요?')) room.send({ type: 'reveal' }); });
$('#event').addEventListener('click', () => { if (confirm('지금 1분 오염 경보를 발동할까요?')) room.send({ type: 'event' }); });
$('#reset').addEventListener('click', () => { if (confirm('모든 점수와 학생 미션 기록을 0으로 되돌릴까요? 팀 배정은 유지됩니다.')) room.send({ type: 'reset' }); });
$('#join-form').addEventListener('submit', event => {
  event.preventDefault();
  $('#join-error').textContent = '';
  room.connect($('#room').value.trim().toUpperCase(), $('#key').value);
});
// Random code without look-alike characters (0/O, 1/I/L) so students can type it from the TV.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
$('#new-room').addEventListener('click', () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  $('#room').value = [...bytes].map(b => CODE_CHARS[b % CODE_CHARS.length]).join('');
});
const saved = savedLogin();
$('#room').value = params.get('room') ?? saved.room;
if ($('#room').value && saved.key && !params.has('tv')) { $('#key').value = saved.key; $('#join-form').requestSubmit(); }
