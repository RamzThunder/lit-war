import { ERAS, eraLabel } from '../minigames/wiring.js';
import { TEAM_INFO, SOLO_INFO, teamName, teamShort } from '../teams.js';
import { eraOwner, isClose } from '../../shared/eras.js';
// Team badge, attack buttons, era scoreboard, raid banner and toasts.
export function bindHud(state) {
  const $ = selector => document.querySelector(selector);
  const toast = (message, tone = 'info') => {
    const item = document.createElement('div');
    item.className = `toast ${tone}`; item.textContent = message;
    $('#toasts').append(item);
    setTimeout(() => item.classList.add('leaving'), 3600);
    setTimeout(() => item.remove(), 4000);
    while ($('#toasts').children.length > 4) $('#toasts').firstElementChild.remove();
  };
  state.events.addEventListener('notice', ({ detail }) => toast(detail.message, detail.tone));
  state.events.addEventListener('raid', ({ detail }) => {
    const counter = detail.counter ? '🪤 반격! ' : '';
    toast(detail.role === 'attacker' ? `${counter}⚡ ${detail.opponent.name}의 방에 침입! 15초 안에 감전시키세요.` : `${counter}⚡ 침입자! ${detail.opponent.name}에게서 도망가세요!`, detail.role === 'attacker' ? 'good' : 'bad');
  });
  $('#use-raid').addEventListener('click', () => { state.startRaid(); $('#game').focus({ preventScroll: true }); });
  $('#use-sabotage').addEventListener('click', () => state.startSabotage());
  // Compact era map (top right of the game): 8 cells coloured by the leading team, with a
  // yellow ring for a close match (<=10 points). Solo practice shows personal points instead.
  const renderBoard = () => {
    const { teams, scores } = state.board;
    $('#board-title').textContent = teams ? '점령 현황' : '내 복원 점수';
    const total = team => ERAS.reduce((sum, era) => sum + scores[era][team], 0);
    $('#board-total').innerHTML = teams ? `<b class="c-blue">${total('blue')}</b> : <b class="c-red">${total('red')}</b>` : `<b>${total('blue')}점</b>`;
    $('#board-rows').replaceChildren(...ERAS.map(era => {
      const s = scores[era];
      const cell = document.createElement('span');
      const owner = teams ? eraOwner(s) : s.blue ? 'blue' : 'empty';
      cell.className = `s-cell ${owner}${teams && isClose(s) ? ' close' : ''}`;
      cell.textContent = era.slice(2);
      cell.title = teams ? `${eraLabel(era)} · ${teamShort('blue')} ${s.blue} : ${s.red} ${teamShort('red')}${isClose(s) ? ' · 접전' : ''}` : `${eraLabel(era)} · ${s.blue}점`;
      return cell;
    }));
  };
  let boardKey = '';
  const renderSession = () => {
    const me = state.online ? state.me : null;
    const badge = $('#team-badge');
    badge.textContent = me ? teamName(me.team) : state.online ? '배정 중…' : '혼자 연습';
    const info = (me && TEAM_INFO[me.team]) || SOLO_INFO;
    $('#role-code').textContent = info.mark; $('#role-caption').textContent = info.terminal; $('#role-caption').title = info.role;
    // The outer frame follows the team: light HUMAN terminal for guardians, hacked terminal for Luddites.
    document.body.dataset.team = me?.team ?? 'solo';
    badge.className = `s-badge ${me?.team ?? ''}`;
    const missions = me?.missions ?? state.local.snapshot.missions;
    $('#mission-count').textContent = missions;
    // Five pips = progress to the next right (one every 5 missions).
    $('#mission-pips').replaceChildren(...Array.from({ length: 5 }, (_, i) => { const pip = document.createElement('span'); if (me && i < missions % 5) pip.className = 'on'; return pip; }));
    if (me) {
      const toSabotage = 5 - (missions % 5);
      const toRaid = 10 - (missions % 10);
      $('#next-right').textContent = `미션 · ${me.team === 'blue' ? '바리케이드' : '단말기 고장'}까지 ${toSabotage}개 · 공격권까지 ${toRaid}개`;
    } else $('#next-right').textContent = '교실에 입장하면 5개마다 공격권이 생겨요';
    const busy = !state.connected || Boolean(state.raid);
    $('#use-sabotage').querySelector('b').textContent = me?.sabotageRights ?? 0;
    $('#use-sabotage').firstChild.textContent = `🛠 ${me?.team === 'blue' ? '바리케이드' : me?.team === 'red' ? '단말기 고장' : '방해 권한'} `;
    $('#use-raid').querySelector('b').textContent = me?.raidRights ?? 0;
    $('#use-sabotage').disabled = busy || !me?.sabotageRights;
    $('#use-raid').disabled = busy || !me?.raidRights;
    $('#use-trap').hidden = me?.team !== 'blue';
    $('#use-trap').querySelector('b').textContent = me?.trap ? `${me.trap}s` : '없음';
    $('#use-trap').disabled = busy;
    const counts = { blue: 0, red: 0 };
    for (const player of state.players.values()) if (counts[player.team] !== undefined) counts[player.team]++;
    $('#player-count').textContent = state.online ? `ROOM ${state.room} / ${teamShort('blue')} ${counts.blue} · ${teamShort('red')} ${counts.red}` : 'OFFLINE / 1 PLAYER';
    const key = JSON.stringify(state.board);
    if (key !== boardKey) { boardKey = key; renderBoard(); }
  };
  state.subscribeSession(renderSession);
  state.subscribe(renderSession);
  let bannerKey = '', lessonKey = '';
  const renderLesson = () => {
    const lesson = state.online ? state.lesson : null;
    const show = lesson && lesson.phase !== 'free';
    const seconds = lesson?.endsAt ? Math.max(0, Math.ceil((lesson.endsAt - performance.now()) / 1000)) : lesson?.left != null ? Math.ceil(lesson.left / 1000) : null;
    const eventLeft = lesson?.event ? Math.max(0, Math.ceil((lesson.event.endsAt - performance.now()) / 1000)) : null;
    const key = show ? `${lesson.phase}:${seconds}:${eventLeft}` : '';
    if (key === lessonKey) return;
    lessonKey = key;
    // Centre of the top bar: remaining time (pixel digits) + phase. The contamination alert
    // gets the event slot over the game instead (a live raid banner takes priority there).
    const chip = $('#lesson-chip'); chip.hidden = !show;
    $('#alert-slot').dataset.on = eventLeft != null ? '1' : '';
    renderAlertSlot(eventLeft);
    if (!show) return;
    const clock = seconds == null ? '--:--' : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    const label = { lobby: '시작 대기', opening: '오프닝 영상', playing: '진행 중', paused: '잠시 멈춤', ended: '게임 끝' }[lesson.phase];
    chip.innerHTML = `<b class="sys">${lesson.phase === 'lobby' || lesson.phase === 'opening' ? '--:--' : clock}</b><span>${label}</span>`;
    chip.className = `s-clock ${lesson.phase}`;
  };
  const renderAlertSlot = eventLeft => {
    const slot = $('#alert-slot');
    slot.hidden = eventLeft == null || !$('#raid-banner').hidden;
    if (slot.hidden) return;
    $('#alert-seconds').textContent = eventLeft;
    $('#alert-detail').textContent = state.me?.team === 'red' ? '미션을 깨면 미끼를 심을 수 있어요 · 점수 2배' : '오염된 단말기를 찾아 정화하세요 · 점수 2배';
  };
  return function tick({ raid, stunned }) {
    renderLesson();
    const banner = $('#raid-banner');
    $('#room-owner').textContent = raid?.role === 'attacker' ? `${raid.opponent.name}의 기록실 (침입 중)` : '내 기록실';
    if (!raid) { if (!banner.hidden) { banner.hidden = true; bannerKey = ''; renderSession(); lessonKey = ''; } return; }
    const seconds = Math.max(0, Math.ceil((raid.endsAt - performance.now()) / 1000));
    const key = `${raid.role}:${seconds}:${raid.shocks}:${stunned}`;
    if (key === bannerKey) return;
    if (banner.hidden) renderSession();
    bannerKey = key; banner.hidden = false; $('#alert-slot').hidden = true;
    banner.className = `s-chip s-event ${raid.role}`;
    $('#raid-title').textContent = raid.role === 'attacker' ? `⚡ ${raid.opponent.name} 감전시키기` : stunned ? '⚡ 감전!' : `🏃 ${raid.opponent.name}에게서 도망가기`;
    $('#raid-detail').textContent = `감전 ${raid.shocks} / ${raid.maxShocks}`;
    $('#raid-seconds').textContent = seconds;
  };
}
