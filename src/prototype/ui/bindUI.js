import { bindFrequency } from './bindFrequency.js';
import { bindRepair } from './bindRepair.js';
import { bindSabotage } from './bindSabotage.js';
import { bindHud } from './bindHud.js';
import { frequencyRecords } from '../minigames/frequency.js';
import { bindWiringDrag } from './wiringDrag.js';
import { wiringRecords, eraLabel } from '../minigames/wiring.js';
export function bindUI(state) {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#terminal');
  bindFrequency(state); bindRepair(state); bindSabotage(state);
  const hudTick = bindHud(state);
  let selected = null, previousRound = null, records = [];
  const close = () => { cancelDrag(); selected = null; state.closeTerminal(); };
  $('#close-terminal').addEventListener('click', close);
  $('#return-game').addEventListener('click', close);
  $('#next-round').addEventListener('click', () => { selected = null; state.nextRound(); (state.snapshot.round?.type === 'frequency' ? $('#frequency-slider') : $('#author-ports button'))?.focus(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.snapshot.terminalOpen) { event.preventDefault(); close(); }
  });
  const select = id => {
    selected = id;
    document.querySelectorAll('[data-author]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.author === id)));
    $('#terminal-feedback').textContent = `${records.find(r => r.id === id).author}의 작품을 선택하세요.`;
  };
  const connect = id => {
    if (!selected) { $('#terminal-feedback').textContent = '먼저 왼쪽 작가 포트를 선택하세요.'; return; }
    const author = selected;
    selected = null;
    document.querySelectorAll('[data-author]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    const result = state.connect(author, id);
    if (result === 'incorrect') {
      $('#terminal-feedback').textContent = '연결 정보가 맞지 않습니다. 작가를 다시 선택해 연결하세요. 감점은 없습니다.';
    } else if (result === 'correct') {
      const r = records.find(r => r.id === id);
      $('#terminal-feedback').textContent = `${r.author} — 「${r.title}」 연결 복구. ${r.keyword}`;
    }
  };
  const makePort = (record, side) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'port';
    button.dataset[side] = record.id;
    button.textContent = side === 'author' ? record.author : record.title;
    if (side === 'author') {
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => select(record.id));
    } else button.addEventListener('click', () => connect(record.id));
    return button;
  };
  const cancelDrag = bindWiringDrag($('#wiring-board'), {
    onSelect: select,
    onConnect: (author, work) => { selected = author; connect(work); },
    onCancel: () => {
      selected = null;
      document.querySelectorAll('[data-author]').forEach(button => button.setAttribute('aria-pressed', 'false'));
      $('#terminal-feedback').textContent = '연결을 취소했습니다. 반대편 단자 위에 배선을 놓으세요.';
    },
  });
  for (const type of ['wiring', 'frequency']) {
    $(`#choose-${type}`).addEventListener('click', () => { cancelDrag(); selected = null; state.chooseGame(type); });
  }
  const eraScore = era => {
    const { teams, scores } = state.board;
    const team = state.me?.team ?? 'blue';
    return teams ? `${scores[era][team]}점 (우리 팀)` : `${scores[era].blue}점`;
  };
  state.subscribe(({ terminalOpen, terminal, round: currentRound }) => {
    const missionRound = currentRound && currentRound.type !== 'repair' ? currentRound : null;
    const era = missionRound?.era ?? terminal;
    const open = terminalOpen && Boolean(terminal);
    records = wiringRecords[era] ?? [];
    const round = missionRound?.type === 'wiring' ? missionRound : null;
    const frequency = missionRound?.type === 'frequency';
    if (era) {
      $('#terminal-top').textContent = `SECURE TERMINAL / ARCHIVE ${era}`;
      $('#terminal-eyebrow').textContent = `ARCHIVE REPAIR / ${era}s`;
      $('#terminal-title').textContent = `${eraLabel(era)} 데이터 서버`;
      $('#terminal-coverage').textContent = eraScore(era);
    }
    $('#wiring-panel').hidden = !round;
    for (const type of ['wiring', 'frequency']) $(`#choose-${type}`).setAttribute('aria-pressed', String(missionRound?.type === type));
    $('#mission-note').textContent = frequency ? '슬라이더로 파형 조정 → 신호 복구 · 3단계 완료 시 +10점 · ESC 중단' : '클릭 또는 양방향 드래그로 연결 · 세 쌍 완료 시 +10점 · ESC 중단';
    if (frequency) $('#terminal-feedback').textContent = '';
    // Rebuild only for a new round; preserve focus and DOM on individual connections.
    const signature = round ? `${round.era}:${round.order.join(',')}:${round.matched.length === 0}` : null;
    if (round && (previousRound === null || (round.matched.length === 0 && signature !== previousRound))) {
      selected = null;
      $('#author-ports').replaceChildren(...records.map(r => makePort(r, 'author')));
      $('#work-ports').replaceChildren(...round.order.map(id => makePort(records.find(r => r.id === id), 'work')));
      $('#terminal-feedback').textContent = '작가를 선택한 뒤 알맞은 작품을 선택하세요.';
    }
    previousRound = signature;
    $('#wiring-board').hidden = !round;
    $('#wiring-count').textContent = `${round?.matched.length ?? 0} / 3 연결`;
    document.querySelectorAll('.port').forEach(button => {
      const matched = round?.matched.includes(button.dataset.author ?? button.dataset.work) ?? false;
      button.disabled = matched;
      button.classList.toggle('matched', matched);
    });
    $('#wires').replaceChildren();
    round?.matched.forEach(id => {
      const from = records.findIndex(r => r.id === id) * 78 + 32;
      const to = round.order.indexOf(id) * 78 + 32;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M 0 ${from} C 45 ${from}, 55 ${to}, 100 ${to}`);
      $('#wires').append(path);
    });
    const complete = missionRound?.complete;
    $('#next-round').hidden = !complete;
    $('#return-game').hidden = !complete;
    $('#restored-records').hidden = !complete;
    if (complete) {
      $('#terminal-feedback').textContent = `${frequency ? '주파수' : '배선'} 복구 완료 · ${eraLabel(era)} +10점`;
      $('#restored-records').replaceChildren(...(frequency ? frequencyRecords[era] : records).map(r => {
        const line = document.createElement('p');
        line.textContent = frequency ? `${r.word} — ${r.description}` : `${r.author} — 「${r.title}」 (${r.year}${r.yearNote ? ` ${r.yearNote}` : ''}) · ${r.keyword}`;
        return line;
      }));
    }
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) { cancelDrag(); dialog.close(); $('#game').focus({ preventScroll: true }); }
  });
  let lastContext = '';
  return context => {
    hudTick(context);
    const { open, target, raid, inRange, stunned } = context;
    const key = `${open}:${target?.action}:${target?.kind}:${target?.era}:${raid?.role}:${inRange}:${stunned}`;
    if (key === lastContext) return;
    lastContext = key;
    let prompt = '', status;
    if (raid?.role === 'attacker') {
      prompt = inRange ? '<kbd>SPACE</kbd> 감전!' : '';
      status = inRange ? '사정거리 안! 스페이스바를 누르세요' : '상대에게 다가가세요';
    } else if (raid?.role === 'defender') {
      status = stunned ? '감전! 잠시 움직일 수 없어요' : '침입자에게서 도망가세요!';
    } else if (open) status = '작업 중 · 이동 잠금';
    else if (target?.action === 'open') { prompt = `<kbd>E</kbd> ${eraLabel(target.era)} 데이터 서버 접속`; status = '접속 가능 · E 키를 누르세요'; }
    else if (target?.action === 'repair') { prompt = `<kbd>E</kbd> ${target.kind === 'broken' ? '고장 난 단말기 수리' : '바리케이드 치우기'}`; status = '방해 공작 발견 · E 키로 수리'; }
    else status = '단말기에 접근하세요';
    $('#interaction').innerHTML = prompt;
    $('#interaction').hidden = !prompt;
    $('#status').textContent = status;
  };
}
