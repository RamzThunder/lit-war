import { wiringRecords, recordById } from '../minigames/wiring.js';
import { frequencyRecords } from '../minigames/frequency.js';
import { instrumentScene, showShelf } from './recordInstruments.js';

function element(tag, name, text = '') {
  const node = document.createElement(tag);
  node.className = name;
  node.textContent = text;
  return node;
}

function control(name, text) {
  const key = element('button', name, text);
  key.type = 'button';
  return key;
}

function movingField(kind, words, removed, onPick) {
  const field = element('div', 'moving-field ' + kind);
  field.setAttribute('role', 'group');
  field.setAttribute('aria-label', kind === 'aquarium' ? '키워드 수조' : '추적 레이더');
  words.forEach((word, i) => {
    const lane = element('div', 'target-lane');
    field.append(lane);
    if (removed.includes(word)) return;
    const target = control('moving-target', word);
    target.style.setProperty('--period', (5 + i * .68) + 's');
    target.style.animationDelay = -(performance.now() / 1000 + i * 2.37) + 's';
    target.addEventListener('click', () => onPick(word, target));
    lane.append(target);
  });
  return field;
}

// Keep the impact visible even if submitting the answer replaces the entire round UI.
function impact(target, text, kind) {
  const host = target.closest('dialog[open]') ?? document.body;
  const box = target.getBoundingClientRect();
  const mark = element('span', 'field-impact ' + kind, text);
  mark.setAttribute('aria-hidden', 'true');
  mark.style.left = box.left + box.width / 2 + 'px';
  mark.style.top = box.top + box.height / 2 + 'px';
  host.append(mark);
  setTimeout(() => mark.remove(), 480);
}

export function fishingField(round, submit) {
  return movingField('aquarium', round.pond, round.caught, (word, target) => {
    const correct = frequencyRecords[round.era].some(record => record.word === word);
    impact(target, correct ? word : '놓아주기', correct ? 'reel-up' : 'miss');
    submit(word);
  });
}

export function shooterBoard(round, shoot) {
  const board = element('div', 'tracking-console');
  board.append(element('p', 'tracking-reference', '정상 신호 · ' + frequencyRecords[round.era].map(r => r.word).join(' / ')));
  board.append(movingField('tracking-radar', round.targets, round.hit, (word, target) => {
    const wrong = round.wrong.includes(word);
    impact(target, wrong ? '✳' : '정상 신호', wrong ? 'burst' : 'miss');
    shoot(word);
  }));
  return board;
}

export function bookBoard(round, shelve) {
  const board = element('div', 'book-station');
  const shelf = element('div', '');
  showShelf(shelf, round);
  const stack = element('div', 'book-stack');
  for (const id of round.order) {
    const record = recordById(id);
    const spine = control('bound-book', '');
    spine.append(element('strong', '', '「' + record.title + '」'),
      element('span', '', record.year + '년' + (record.yearNote ? ' ' + record.yearNote : '')));
    spine.disabled = round.picked.includes(id);
    spine.addEventListener('click', () => shelve(id));
    stack.append(spine);
  }
  board.append(instrumentScene('shelf', shelf), stack);
  return board;
}

export function identityBoard(round, verify) {
  const author = recordById(round.order[round.stage]);
  const board = element('div', 'identity-station');
  const options = element('div', 'identity-options');
  const track = element('div', 'badge-track');
  const card = control('swipe-badge', author.author);
  const hint = element('p', 'badge-hint', '작품을 고른 뒤 카드를 오른쪽 판독구로 밀어 주세요.');
  hint.setAttribute('role', 'status');
  const slot = element('span', 'badge-slot', '판독구');
  let selected, pointer, start, offset = 0;
  const setOffset = value => {
    offset = value;
    card.style.transform = 'translateX(' + offset + 'px)';
  };
  const travel = () => Math.max(1, track.clientWidth - card.offsetWidth - 16);
  function read() {
    setOffset(0);
    if (!selected) { hint.textContent = '먼저 작품을 선택하세요.'; return; }
    const result = verify(author.id, selected, true);
    if (result === 'incorrect' || selected !== author.id) hint.textContent = '신원이 일치하지 않아요. 작품을 다시 골라 주세요.';
  }
  for (const record of wiringRecords[round.era]) {
    const key = control('identity-work', '「' + record.title + '」');
    key.setAttribute('aria-pressed', 'false');
    key.addEventListener('click', () => {
      selected = record.id;
      for (const other of options.children) other.setAttribute('aria-pressed', String(key === other));
      hint.textContent = '카드를 오른쪽으로 밀어 판독하세요. 키보드는 카드에서 Enter.';
    });
    options.append(key);
  }
  card.setAttribute('aria-label', author.author + ' 신원카드. 오른쪽으로 밀거나 Enter로 판독');
  card.ondragstart = () => false;
  card.onpointerdown = e => {
    if (pointer != null || e.button !== 0) return;
    if (!selected) { hint.textContent = '먼저 작품을 선택하세요.'; return; }
    e.preventDefault();
    card.focus({ preventScroll: true });
    pointer = e.pointerId; start = e.clientX;
    card.setPointerCapture(pointer);
    card.classList.add('dragging');
  };
  card.onpointermove = e => {
    if (pointer === e.pointerId) setOffset(Math.max(0, Math.min(travel(), e.clientX - start)));
  };
  const reset = () => { pointer = null; card.classList.remove('dragging'); setOffset(0); };
  card.onpointerup = e => {
    if (pointer !== e.pointerId) return;
    const finished = Math.max(offset, e.clientX - start) >= travel() * .84;
    reset();
    if (finished) read();
  };
  card.onlostpointercapture = card.onpointercancel = reset;
  card.addEventListener('click', e => { if (e.detail === 0) read(); });
  track.append(slot, card);
  board.append(options, track, hint);
  return board;
}
