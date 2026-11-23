import { teamName, teamShort } from '../teams.js';
// Once the game ends the student's screen is covered: first "look at the classroom TV",
// then, when the teacher's reveal arrives, this student's own result card.
const STATS = [['missions', '복원 미션'], ['stolen', '빼앗은 점수'], ['escapes', '공격 회피'], ['cleansed', '오염 정화'], ['baits', '미끼'], ['sabotages', '방해 공작'], ['repairs', '수리']];
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
export function bindGameOver(state) {
  const dialog = document.querySelector('#game-over');
  dialog.addEventListener('cancel', event => event.preventDefault());
  let key = '';
  const waiting = () => {
    const box = el('div', 'go-wait');
    box.append(el('p', 'go-kicker', 'RECORD SEALED'), el('h2', 'go-title', '교실 TV를 보세요'), el('p', 'go-note', '기록 집계가 끝났어요. 결과는 TV에서 함께 공개돼요.'));
    return box;
  };
  const card = ({ results, mine }) => {
    const box = el('div', 'go-card');
    const won = results.winner && results.winner === mine?.team;
    const verdict = !results.winner ? '접전' : won ? '우리 팀 승리!' : `${teamShort(results.winner)} 승리`;
    box.dataset.team = results.winner ?? '';
    box.append(el('p', 'go-kicker', 'MY RECORD'), el('h2', 'go-title', verdict));
    box.append(el('p', 'go-note', `${teamName('blue')} ${results.teams.blue.held} : ${results.teams.red.held} ${teamName('red')}`));
    if (mine?.awards.length) {
      const awards = el('div', 'go-awards');
      for (const award of mine.awards) {
        const badge = el('div', 'go-award');
        badge.append(el('b', '', award.title), el('span', '', `${award.value}${award.unit}`));
        awards.append(badge);
      }
      box.append(awards);
    }
    if (mine) {
      const grid = el('div', 'go-stats');
      for (const [id, label] of STATS) {
        const value = id === 'missions' ? mine.missions : mine.stats[id];
        const cell = el('div'); cell.append(el('b', '', value), el('span', '', label)); grid.append(cell);
      }
      box.append(grid);
    }
    box.append(el('p', 'go-note', '전체 결과는 교실 TV에서 확인하세요.'));
    return box;
  };
  const render = () => {
    const ended = state.online && state.connected && state.lesson?.phase === 'ended';
    const next = !ended ? '' : state.results ? `result:${state.results.at}` : 'wait';
    if (next === key) return;
    key = next;
    if (!ended) { if (dialog.open) dialog.close(); dialog.replaceChildren(); return; }
    for (const open of document.querySelectorAll('dialog[open]')) if (open !== dialog) open.close();
    dialog.replaceChildren(state.results ? card({ results: state.results, mine: state.mine }) : waiting());
    if (!dialog.open) dialog.showModal();
  };
  state.subscribeSession(render);
  state.events.addEventListener('lesson', render);
}
