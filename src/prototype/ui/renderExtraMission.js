import { fishingField } from './directControls.js';
import { motorDrive } from './motorDrive.js';
import { instrumentScene } from './recordInstruments.js';
import { ERAS, eraLabel, recordById } from '../minigames/wiring.js';
import { COOKING, uploadOptions } from '../minigames/extraMissions.js';

const el = (tag, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; };
const button = (text, action) => { const node = el('button', text); node.type = 'button'; node.addEventListener('click', action); return node; };
const grid = root => { const box = el('div', '', 'mission-choices'); root.append(box); return box; };

export function extraProgress(round) {
  if (round.type === 'truth') return [round.stage, round.claims.length];
  if (round.type === 'fishing') return [round.caught.length, 3];
  if (round.type === 'cooking') return [round.picked.length, COOKING.steps.length];
  if (round.type === 'puzzle') return [round.picked.length, round.pieces.length];
  return [round.stage, round.order.length];
}

function recordCard(board, kind, label, title, detail) {
  const card = el('div', '', 'bench-record');
  card.append(el('small', label), el('strong', title), el('span', detail));
  const scene = instrumentScene(kind, card);
  board.append(scene);
  return scene;
}

function rack(board, kind, items, size) {
  const tray = el('ol', '', 'bench-rack');
  for (let index = 0; index < size; index++) {
    const slot = el('li', items[index] ?? '·');
    if (index < items.length) slot.className = 'filled';
    tray.append(slot);
  }
  board.append(instrumentScene(kind, tray));
}

function mountChipReader(reader, drive, options, send) {
  const chip = el('span', '', 'reader-chip');
  chip.setAttribute('aria-hidden', 'true');
  const display = el('output', '장착할 칩을 선택하세요', 'bench-socket');
  const bay = grid(drive);
  let selected;
  let mountTimer;
  const mounted = () => {
    reader.dataset.phase = 'mounted';
    display.textContent = selected + ' · 장착 완료';
    commit.disabled = false;
  };
  const commit = button('장착한 칩 전송', () => {
    if (reader.dataset.phase !== 'mounted') return;
    reader.dataset.phase = 'sending';
    display.textContent = selected + ' · 데이터 전송 중';
    commit.disabled = true;
    for (const key of bay.children) key.disabled = true;
    setTimeout(() => {
      // Leaving the terminal or switching missions cancels the pending transfer.
      if (reader.isConnected && reader.getClientRects().length) send(selected);
      if (!reader.isConnected) return;
      for (const key of bay.children) key.disabled = false;
      mounted();
    }, 520);
  });
  commit.disabled = true;
  for (const value of options) {
    const key = button(value, () => {
      clearTimeout(mountTimer);
      selected = value;
      chip.textContent = value;
      reader.append(chip);
      chip.getAnimations().forEach(animation => animation.cancel());
      reader.dataset.phase = 'mounting';
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        chip.animate([{ transform: 'translateY(65%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 360, easing: 'ease-out' });
      }
      display.textContent = value + ' · 장착 중';
      commit.disabled = true;
      for (const other of bay.children) other.setAttribute('aria-pressed', String(other === key));
      mountTimer = setTimeout(mounted, 380);
    });
    key.setAttribute('aria-pressed', 'false');
    bay.append(key);
  }
  drive.prepend(display);
  drive.append(commit);
}

export function renderExtraMission(root, round, submit) {
  const board = el('div', '', 'mission-bench bench-' + round.type);
  const status = el('p', '', 'extra-status');
  status.setAttribute('role', 'status');
  root.replaceChildren(board, status);
  const send = value => {
    const result = submit(value);
    // An incorrect submission can synchronously redraw the board.
    if (result === 'incorrect') {
      const feedback = root.querySelector('.extra-status');
      if (feedback) feedback.textContent = ['cooking', 'puzzle'].includes(round.type)
        ? '순서가 어긋났어요. 첫 칸부터 다시 채우세요.' : '기록을 다시 확인해 주세요.';
    }
  };
  if (round.type === 'engine') {
    const work = recordById(round.order[round.stage]);
    const turn = motorDrive(recordCard(board, 'motor', '연도 보정', work.title, work.author));
    const instrument = el('div', '', 'bench-instrument');
    const face = el('div', '', 'bench-dial');
    face.setAttribute('aria-hidden', 'true');
    const output = el('output', round.era + '년');
    const slider = el('input');
    Object.assign(slider, { type: 'range', min: round.era, max: Number(round.era) + 9, value: round.era });
    slider.setAttribute('aria-label', '작품의 ' + (work.yearNote ?? '발표') + ' 연도');
    const read = () => {
      turn(Number(slider.value) - Number(round.era));
      face.style.setProperty('--angle', (-108 + (slider.value - Number(round.era)) * 24) + 'deg');
      output.textContent = slider.value + '년';
      slider.setAttribute('aria-valuetext', output.textContent);
    };
    read();
    slider.addEventListener('input', read);
    instrument.append(face, output, slider, button('눈금 고정', () => send(Number(slider.value))));
    board.append(instrument);
  } else if (round.type === 'upload') {
    const work = recordById(round.order[round.stage]);
    const reader = recordCard(board, 'reader', '업로드 대상', work.title, work.author);
    const drive = el('div', '', 'bench-drive');
    mountChipReader(reader, drive, uploadOptions(round), send);
    board.append(drive);
  } else if (round.type === 'truth') {
    const claim = round.claims[round.stage];
    recordCard(board, 'inspection', '저자 확인서', recordById(claim.id).title, '등록 저자 · ' + claim.author);
    const stamps = grid(board);
    stamps.append(button('✓ 일치 · 승인', () => send(true)), button('× 불일치 · 반려', () => send(false)));
  } else if (round.type === 'mail') {
    const letter = recordById(round.order[round.stage]);
    recordCard(board, 'sorter', '배달할 서신', letter.title, letter.author);
    const boxes = grid(board);
    boxes.setAttribute('aria-label', '시대별 우편함');
    for (const era of ERAS) boxes.append(button(eraLabel(era), () => send(era)));
  } else if (round.type === 'cooking') {
    board.append(el('p', '사건을 이야기 순서대로 조리대에 올리세요.'));
    const tray = el('ol', '', 'bench-recipe');
    for (let i = 0; i < COOKING.steps.length; i++) {
      tray.append(el('li', COOKING.steps[round.picked[i]] ?? '재료 대기', i < round.picked.length ? 'filled' : ''));
    }
    board.append(instrumentScene('kitchen', tray));
    const box = grid(board);
    for (const index of round.order) {
      const key = button(COOKING.steps[index], () => send(index));
      key.disabled = round.picked.includes(index);
      box.append(key);
    }
  } else if (round.type === 'fishing') {
    board.append(el('p', eraLabel(round.era) + ' 키워드가 헤엄쳐 오면 눌러 낚으세요.'));
    board.append(fishingField(round, send));
    const basket = el('ol', '', 'bench-rack');
    basket.setAttribute('aria-label', '낚은 키워드');
    for (let i = 0; i < 3; i++) basket.append(el('li', round.caught[i] ?? '·', i < round.caught.length ? 'filled' : ''));
    board.append(basket);
  } else if (round.type === 'puzzle') {
    board.append(el('p', recordById(round.work).author + '의 작품명을 왼쪽부터 조립하세요.'));
    rack(board, 'tools', round.picked.map(id => round.pieces.find(piece => piece.id === id).text), round.pieces.length);
    const box = grid(board);
    for (const piece of round.pieces) {
      const key = button(piece.text, () => send(piece.id));
      key.disabled = round.picked.includes(piece.id);
      box.append(key);
    }
  }
}
