import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '../shared/system.css';
import './tv.css';
import qrcode from 'qrcode-generator';
import { ERAS } from '../prototype/minigames/wiring.js';
import { teamName, teamShort } from '../prototype/teams.js';
import { eraOwner, isClose, teamTotal, heldCount } from '../shared/eras.js';
import { createRoom, savedLogin, clock, timeLeft, feedTime, joinUrl, awayList } from '../teacher/room.js';
// View-only classroom TV. Same teacher socket as the console, but no controls.
// Screens: lobby (waiting / opening), board (playing, paused, ended), raid (live spectate).
const $ = selector => document.querySelector(selector);
const room = createRoom();
const { view } = room;
let spectator = null, spectatorLoading = null, lastOwners = {}, knownNames = null;

for (const el of document.querySelectorAll('.team-name')) el.textContent = teamName(el.dataset.team);

// ---- fit the 1920×1080 stage to any screen ------------------------------------------
const fit = () => { $('#stage').style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
addEventListener('resize', fit); fit();

// ---- login (only when opened directly; the console passes the login via sessionStorage)
const params = new URLSearchParams(location.search);
const login = savedLogin();
const roomParam = params.get('room')?.toUpperCase();
function start(code, key) { $('#login').hidden = true; $('#frame').hidden = false; $('#conn').hidden = false; room.connect(code, key); }
$('#login-form').addEventListener('submit', event => { event.preventDefault(); $('#login-error').textContent = ''; start($('#room').value.trim().toUpperCase(), $('#key').value); });
if (login.key && (!roomParam || roomParam === login.room)) start(login.room, login.key);
else { $('#login').hidden = false; $('#room').value = roomParam ?? login.room; }

// ---- which screen ---------------------------------------------------------------------
function screen() {
  const phase = view.lesson?.phase;
  const raiding = Boolean(view.watching || view.result) && (phase === 'playing' || phase === 'paused');
  const which = !phase ? null : raiding ? 'raid' : phase === 'lobby' || phase === 'free' || phase === 'opening' ? 'lobby' : 'board';
  for (const id of ['lobby', 'board']) $(`#${id}`).hidden = id !== which;
  // The raid screen hosts the Phaser spectator: hide it without collapsing it (0×0 breaks WebGL).
  $('#raid').classList.toggle('off', which !== 'raid');
  return which;
}
function renderAll() { renderJoin(); renderLobby(); renderBoard(); renderRaidSide(); screen(); }

// ---- join code + QR --------------------------------------------------------------------
function renderJoin() {
  const qr = qrcode(0, 'M'); qr.addData(joinUrl(view.room)); qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  $('#lobby-qr').innerHTML = svg; $('#board-qr').innerHTML = svg;
  $('#lobby-code').textContent = view.room; $('#board-code').textContent = view.room;
  $('#lobby-host').textContent = location.host;
  for (const el of document.querySelectorAll('.sector')) el.textContent = view.room;
}

// ---- lobby / opening ---------------------------------------------------------------------
function renderLobby() {
  const opening = view.lesson?.phase === 'opening' ? view.lesson.opening : null;
  $('#lobby-title').textContent = opening ? (opening.ready ? '모두 오프닝을 봤어요' : '오프닝 영상 시청 중') : '기록원 접속을 기다리는 중';
  $('#lobby-state').textContent = opening ? '오프닝 상영' : '대기 중';
  $('#lobby-sector').textContent = opening ? '오프닝 상영' : '기록원 소집';
  $('#lobby-foot').textContent = opening ? `시청 완료 ${opening.done} / ${opening.total}명 · 다 보면 선생님이 게임을 시작해요` : '모두 들어오면 선생님이 오프닝을 시작해요. 영상은 각자 기기에서 나와요.';
  const names = new Set();
  for (const team of ['blue', 'red']) {
    const list = view.roster.filter(p => p.team === team).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    $(`#count-${team}`).textContent = list.filter(p => p.online).length;
    $(`#names-${team}`).replaceChildren(...list.map(p => {
      names.add(p.name);
      const chip = document.createElement('span'); chip.textContent = p.name;
      if (!p.online) chip.className = 'off';
      else if (p.away) { chip.className = 'away'; chip.textContent = `🚨 ${p.name}`; }
      else if (opening && p.opening?.status === 'done') chip.className = 'done';
      else if (knownNames && !knownNames.has(p.name)) chip.className = 'new';
      return chip;
    }));
  }
  knownNames = names;
}

// ---- board -------------------------------------------------------------------------------
const PHASE_LABEL = { playing: '진행 중 · 남은 시간', paused: '잠시 멈춤', ended: '게임 종료' };
function renderBoard() {
  const scores = view.scores; if (!scores || !view.lesson) return;
  const total = { blue: teamTotal(scores, ERAS, 'blue'), red: teamTotal(scores, ERAS, 'red') };
  const held = { blue: heldCount(scores, ERAS, 'blue'), red: heldCount(scores, ERAS, 'red') };
  const online = team => view.roster.filter(p => p.team === team && p.online).length;
  $('#total-blue').textContent = total.blue; $('#total-red').textContent = total.red;
  $('#sub-blue').textContent = `${online('blue')}명 접속 · ${held.blue}개 시대 점령`;
  $('#sub-red').textContent = `${held.red}개 시대 점령 · ${online('red')}명 접속`;
  const sum = total.blue + total.red;
  for (const bar of [$('#tug'), $('#raid-tug')]) { bar.classList.toggle('empty', !sum); bar.firstElementChild.style.width = `${sum ? (total.blue / sum) * 100 : 50}%`; }
  $('#raid-blue').textContent = total.blue; $('#raid-red').textContent = total.red;
  const gap = total.blue - total.red, leader = gap > 0 ? 'blue' : gap < 0 ? 'red' : null;
  const prefix = view.lesson.phase === 'ended' ? '최종 · ' : '';
  $('#lead').innerHTML = `${prefix}${leader ? `<b class="c-${leader}"></b>` : '<b>동점</b>'} · 점령 ${held.blue} : ${held.red}`;
  if (leader) $('#lead b').textContent = `${teamShort(leader)} ${view.lesson.phase === 'ended' ? '승리' : '우세'} +${Math.abs(gap)}`;
  // Era tiles; a tile whose owner changed flashes once.
  $('#eras').replaceChildren(...ERAS.map(era => {
    const s = scores[era], owner = eraOwner(s), sum = s.blue + s.red;
    const tile = document.createElement('div');
    tile.className = `era-tile ${owner}${lastOwners[era] && lastOwners[era] !== owner ? ' flip' : ''}`;
    const contam = view.contam.some(c => c.era === era && c.status === 'planted');
    const flags = (contam ? '<span class="flag contam">🧪 오염</span>' : '') + (isClose(s) ? '<span class="flag close">접전</span>' : '');
    tile.innerHTML = `${flags ? `<span class="flags">${flags}</span>` : ''}<span class="sys yr">${era}</span><span class="owner"></span><span class="split"><i style="width:${sum ? (s.blue / sum) * 100 : 0}%"></i></span><span class="nums"><span class="sys c-blue">${s.blue}</span><span class="sys c-red">${s.red}</span></span>`;
    tile.querySelector('.owner').textContent = { empty: '비어 있음', tie: '동점', blue: `${teamShort('blue')} 점령`, red: `${teamShort('red')} 점령` }[owner];
    lastOwners[era] = owner;
    return tile;
  }));
  $('#paused').hidden = view.lesson.phase !== 'paused';
  renderFeed(); renderClock();
}
function renderFeed() {
  const list = [...view.feed].reverse().slice(0, 8);
  if (!list.length) { $('#feed').innerHTML = '<li class="empty">아직 소식이 없어요</li>'; return; }
  $('#feed').replaceChildren(...list.map(item => {
    const li = document.createElement('li'); li.className = item.tone;
    const time = document.createElement('time'); time.textContent = feedTime(item.at);
    const text = document.createElement('span'); text.textContent = item.text;
    li.append(time, text); return li;
  }));
}
function renderClock() {
  if (!view.lesson) return;
  const left = timeLeft(view), phase = view.lesson.phase;
  const text = left == null ? (phase === 'ended' ? '00:00' : '--:--') : clock(left);
  $('#timer').textContent = text; $('#raid-clock').textContent = text;
  $('#phase-label').textContent = PHASE_LABEL[phase] ?? '';
  const alert = view.eventEndsAt != null;
  $('#alert').hidden = !alert;
  if (alert) $('#alert-left').textContent = clock(view.eventEndsAt - performance.now()).replace(/^0/, '');
  const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  for (const el of document.querySelectorAll('.clock-now')) el.textContent = now;
  const raid = view.raids.get(view.watching);
  if (raid) $('#raid-seconds').textContent = String(Math.max(0, Math.ceil((raid.endsAt - performance.now()) / 1000))).padStart(2, '0');
}
setInterval(renderClock, 250);
// Warning on every screen while someone is off the game tab (opening or game only).
function renderAway() {
  const away = awayList(view);
  $('#away-bar').hidden = !away.length;
  if (away.length) $('#away-names').textContent = `${away.length}명 · ${away.map(p => `${p.name} ${clock(performance.now() - p.awaySince).replace(/^0/, '')}`).join(' · ')}`;
}
setInterval(renderAway, 1000);

// ---- raid ----------------------------------------------------------------------------
async function ensureSpectator() {
  if (spectator) return spectator;
  spectatorLoading ??= import('../teacher/spectator.js').then(({ createSpectator }) => (spectator = createSpectator($('#arena'))));
  return spectatorLoading;
}
const nameTag = (el, actor) => { el.textContent = `[${teamShort(actor.team)}] ${actor.name}`; el.className = actor.team; };
function renderRaidSide() {
  const raid = view.raids.get(view.watching) ?? view.result?.raid;
  if (!raid) return;
  nameTag($('#raid-att'), raid.attacker); nameTag($('#raid-def'), raid.defender);
  const shocks = view.result ? view.result.shocks : raid.shocks;
  $('#shocks').replaceChildren(...Array.from({ length: raid.maxShocks }, (_, i) => { const pip = document.createElement('i'); if (i < shocks) pip.className = 'on'; return pip; }));
  $('#shock-label').textContent = `감전 ${shocks} / ${raid.maxShocks} · 한 번에 5점씩 빼앗아요`;
  $('#raid-stolen').textContent = view.result ? view.result.stolen : raid.stolen ?? 0;
  $('#raid-def-name').textContent = raid.defender.name;
  $('#raid-def-state').textContent = view.result ? (shocks ? '감전당했어요' : '피했어요!') : '도망치는 중';
  const result = $('#raid-result');
  result.hidden = !view.result;
  if (view.result) {
    const win = shocks ? raid.attacker : raid.defender;
    result.className = `result ${win.team}`;
    result.textContent = shocks ? `${raid.attacker.name} 승! ${view.result.stolen}점 탈취` : `${raid.defender.name} 완벽 회피!`;
    $('#raid-seconds').textContent = '00';
  }
  const waiting = [...view.raids.values()].filter(r => r.id !== view.watching);
  $('#raid-queue').textContent = waiting.length ? `다음 중계 대기 ${waiting.length}건 · ${waiting.map(r => `${r.attacker.name} → ${r.defender.name}`).join(', ')}` : '';
}

// ---- events --------------------------------------------------------------------------
room.subscribe(async (type, detail) => {
  switch (type) {
    case 'status': $('#conn').textContent = detail.text; break;
    case 'welcome': lastOwners = {}; knownNames = null; renderAll(); renderAway(); break;
    case 'lesson': renderLobby(); renderBoard(); screen(); break;
    case 'scores': case 'contam': renderBoard(); break;
    case 'roster': renderLobby(); renderBoard(); renderAway(); break;
    case 'feed': renderFeed(); break;
    case 'raids': renderRaidSide(); break;
    case 'watch':
      screen(); renderRaidSide();
      if (detail.raid) (await ensureSpectator()).show(detail.raid); else spectator?.clear();
      break;
    case 'watch-move': spectator?.move(detail.role, detail.player); break;
    case 'watch-shock': spectator?.shock(detail); renderRaidSide(); break;
    case 'raid-result': renderRaidSide(); screen(); break;
    case 'error':
      if (detail.fatal) { $('#frame').hidden = true; $('#conn').hidden = true; $('#login').hidden = false; $('#login-error').textContent = detail.message; }
      break;
  }
});
