import { ERAS, eraLabel } from '../minigames/wiring.js';
const TEAM_NAME = { blue: '청팀', red: '홍팀' };
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
    toast(detail.role === 'attacker' ? `⚡ ${detail.opponent.name}의 방에 침입! 15초 안에 감전시키세요.` : `⚡ 침입자! ${detail.opponent.name}에게서 도망가세요!`, detail.role === 'attacker' ? 'good' : 'bad');
  });
  $('#use-raid').addEventListener('click', () => { state.startRaid(); $('#game').focus({ preventScroll: true }); });
  $('#use-sabotage').addEventListener('click', () => state.startSabotage());
  const renderBoard = () => {
    const { teams, scores } = state.board;
    $('#board-title').textContent = teams ? '연도별 점령 현황' : '내 복원 점수 (연습)';
    const total = team => ERAS.reduce((sum, era) => sum + scores[era][team], 0);
    $('#board-total').innerHTML = teams ? `<b class="blue">청 ${total('blue')}</b> : <b class="red">${total('red')} 홍</b>` : `<b>${total('blue')}점</b>`;
    $('#board-rows').replaceChildren(...ERAS.map(era => {
      const { blue, red } = scores[era];
      const row = document.createElement('div');
      row.className = 'board-row';
      const owner = !teams ? '' : blue > red ? 'blue' : red > blue ? 'red' : '';
      const share = teams ? (blue + red ? (blue / (blue + red)) * 100 : 50) : Math.min(100, blue);
      row.innerHTML = `<span class="board-era"></span><span class="board-bar ${teams ? 'versus' : 'solo'}"><i style="width:${share}%"></i></span><span class="board-owner ${owner}"></span>`;
      row.querySelector('.board-era').textContent = eraLabel(era);
      row.querySelector('.board-owner').textContent = teams ? (owner ? `${TEAM_NAME[owner]} ${owner === 'blue' ? blue : red}:${owner === 'blue' ? red : blue}` : `동점 ${blue}:${red}`) : `${blue}점`;
      return row;
    }));
  };
  let boardKey = '';
  const renderSession = () => {
    const me = state.online ? state.me : null;
    const badge = $('#team-badge');
    badge.textContent = me ? TEAM_NAME[me.team] : state.online ? '배정 중…' : '혼자 연습';
    badge.className = `team-badge ${me?.team ?? ''}`;
    const missions = me?.missions ?? state.local.snapshot.missions;
    $('#mission-count').textContent = missions;
    if (me) {
      const toSabotage = 5 - (missions % 5);
      const toRaid = 10 - (missions % 10);
      $('#next-right').textContent = `🛠 ${me.team === 'blue' ? '바리케이드' : '단말기 고장'}까지 ${toSabotage}개 · ⚡ 공격까지 ${toRaid}개`;
    } else $('#next-right').textContent = '교실에 입장하면 5개마다 공격권이 생겨요';
    const busy = !state.connected || Boolean(state.raid);
    $('#use-sabotage').querySelector('b').textContent = me?.sabotageRights ?? 0;
    $('#use-sabotage').firstChild.textContent = `🛠 ${me?.team === 'blue' ? '바리케이드' : me?.team === 'red' ? '단말기 고장' : '방해 권한'} `;
    $('#use-raid').querySelector('b').textContent = me?.raidRights ?? 0;
    $('#use-sabotage').disabled = busy || !me?.sabotageRights;
    $('#use-raid').disabled = busy || !me?.raidRights;
    const counts = { blue: 0, red: 0 };
    for (const player of state.players.values()) if (counts[player.team] !== undefined) counts[player.team]++;
    $('#player-count').textContent = state.online ? `ROOM ${state.room} / 청 ${counts.blue} · 홍 ${counts.red}` : 'OFFLINE / 1 PLAYER';
    const key = JSON.stringify(state.board);
    if (key !== boardKey) { boardKey = key; renderBoard(); }
  };
  state.subscribeSession(renderSession);
  state.subscribe(renderSession);
  let bannerKey = '';
  return function tick({ raid, stunned }) {
    const banner = $('#raid-banner');
    $('#room-owner').textContent = raid?.role === 'attacker' ? `${raid.opponent.name}의 기록실 (침입 중)` : '내 기록실';
    if (!raid) { if (!banner.hidden) { banner.hidden = true; bannerKey = ''; renderSession(); } return; }
    const seconds = Math.max(0, Math.ceil((raid.endsAt - performance.now()) / 1000));
    const key = `${raid.role}:${seconds}:${raid.shocks}:${stunned}`;
    if (key === bannerKey) return;
    if (banner.hidden) renderSession();
    bannerKey = key; banner.hidden = false;
    banner.className = raid.role;
    $('#raid-title').textContent = raid.role === 'attacker' ? `⚡ ${raid.opponent.name} 감전시키기` : stunned ? '⚡ 감전!' : `🏃 ${raid.opponent.name}에게서 도망가기`;
    $('#raid-detail').textContent = `감전 ${raid.shocks} / ${raid.maxShocks}`;
    $('#raid-seconds').textContent = seconds;
  };
}
