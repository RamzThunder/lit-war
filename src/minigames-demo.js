import { GameState } from './prototype/state/GameState.js';
import { createMissionRound, MISSION_LABEL } from './prototype/minigames/missionTypes.js';
import { ERAS, wiringRecords, shuffledIds, recordById } from './prototype/minigames/wiring.js';
import { frequencyRecords, createFrequencyRound, wavePath, TOLERANCE } from './prototype/minigames/frequency.js';
import { EXTRA_TYPES, COOKING } from './prototype/minigames/extraMissions.js';
import { renderExtraMission, extraProgress } from './prototype/ui/renderExtraMission.js';

const $ = selector => document.querySelector(selector);
const content = $('#mission-content');
const types = ['memory', 'shooter', 'identity', 'filter', 'chronology', 'engine', 'upload', 'truth', 'mail', 'cooking', 'fishing', 'puzzle', 'wiring', 'frequency'];
const instructions = {
  memory: '잠깐 표시되는 키워드 세 개를 순서대로 기억해 누르세요.',
  shooter: '정상 키워드를 참고해 다른 시대의 오염 데이터를 격추하세요.',
  identity: '작가와 작품을 연결한 뒤 신원 카드를 끝까지 밀어 주세요.',
  filter: '작가·작품 카드가 이 기록실의 시대인지 판단하세요.',
  chronology: '오래된 작품부터 누르세요. 같은 연도면 제목 가나다순입니다.',
  engine: '작품의 발표 연도를 골라 엔진 눈금을 맞추세요.',
  upload: '작가와 작품에 맞는 키워드를 빈 기록에 업로드하세요.',
  truth: '작가와 작품의 연결이 참인지 거짓인지 판정하세요.',
  mail: '작품 카드를 해당 시대 우편함으로 배달하세요.',
  cooking: '김유정 「동백꽃」의 사건 카드를 이야기 순서대로 조리하세요.',
  fishing: '이 시대의 키워드만 낚아 데이터망으로 올리세요.',
  puzzle: '흩어진 작품명 조각을 순서대로 이어 붙이세요.',
  wiring: '작가를 누른 뒤 해당 작품을 누르면 배선이 연결됩니다.',
  frequency: '슬라이더로 두 파형을 겹친 뒤 신호를 복구하세요.',
};
let era = '1930', type = 'memory', game, selected = null, memoryTimer;
const node = (tag, className = '', label = '') => { const el = document.createElement(tag); el.className = className; el.textContent = label; return el; };
const button = (label, action) => { const el = node('button', '', label); el.type = 'button'; el.addEventListener('click', action); return el; };
const feedback = message => { $('#feedback').textContent = message; };
const choices = () => { const box = node('div', 'choices'); content.append(box); return box; };
const record = id => recordById(id);
const tryAction = (result, success = '복구 중…') => feedback(result === 'incorrect' ? '다시 확인해 보세요.' : result === 'complete' ? '완료!' : success);

function createRound() {
  if (type === 'wiring') return { type, era, order: shuffledIds(era), matched: [], complete: false };
  if (type === 'frequency') return createFrequencyRound(era);
  return createMissionRound(era, type);
}
function start() {
  if (type === 'cooking' && era !== COOKING.era) { era = COOKING.era; $('#era').value = era; }
  clearTimeout(memoryTimer); selected = null; feedback('');
  game = new GameState({ terminalOpen: true, terminal: era, round: createRound() });
  game.subscribe(render);
  document.querySelectorAll('#mission-list button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
}
function render({ round }) {
  if (!round) return;
  $('#mission-title').textContent = MISSION_LABEL[type];
  $('#mission-code').textContent = `${era} / ${type.toUpperCase()}`;
  $('#mission-instruction').textContent = instructions[type];
  const [progress, total] = EXTRA_TYPES.includes(type) ? extraProgress(round) : [round.matched?.length ?? round.hit?.length ?? round.picked?.length ?? round.stage ?? 0, type === 'filter' ? 6 : 3];
  $('#mission-progress').textContent = `${progress} / ${total}`;
  $('#completed').hidden = !round.complete;
  content.replaceChildren();
  if (round.complete) return;

  if (EXTRA_TYPES.includes(type)) {
    renderExtraMission(content, round, value => game.submitExtra(value));
    return;
  }

  if (type === 'memory') {
    const showing = Date.now() < round.revealUntil;
    content.append(node('div', 'card', showing ? round.order.join('  →  ') : '기록이 가려졌습니다. 기억한 순서대로 선택하세요.'));
    const box = choices();
    for (const word of round.options) {
      const b = button(word, () => tryAction(game.recall(word), '순서를 이어 가세요.'));
      b.disabled = showing; box.append(b);
    }
    if (showing) { clearTimeout(memoryTimer); memoryTimer = setTimeout(() => render(game.snapshot), round.revealUntil - Date.now() + 20); }
  } else if (type === 'shooter') {
    content.append(node('p', 'label', `정상 키워드 · ${frequencyRecords[era].map(r => r.word).join(' / ')}`));
    const box = choices();
    for (const word of round.targets) {
      const b = button(word, () => tryAction(game.shoot(word), '오염 데이터 격추!'));
      b.disabled = round.hit.includes(word); b.classList.toggle('done', b.disabled); box.append(b);
    }
  } else if (type === 'identity') {
    const current = record(round.order[round.stage]);
    content.append(node('div', 'card', current.author));
    const box = choices();
    for (const r of wiringRecords[era]) {
      const b = button(`「${r.title}」`, () => { selected = r.id; box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      box.append(b);
    }
    const label = node('p', 'label', '작품을 선택하고 카드를 오른쪽으로 밀어 주세요');
    const slider = document.createElement('input'); Object.assign(slider, { type: 'range', min: 0, max: 100, value: 0, className: 'meter' });
    slider.addEventListener('input', () => { if (Number(slider.value) < 85) return; if (!selected) { slider.value = 0; feedback('작품을 먼저 선택하세요.'); return; } const answer = selected; selected = null; tryAction(game.verifyIdentity(current.id, answer, true)); slider.value = 0; });
    content.append(label, slider);
  } else if (type === 'filter') {
    const r = record(round.order[round.stage]);
    content.append(node('div', 'card', `${r.author} · 「${r.title}」`));
    const box = choices();
    box.append(button(`${era}년대 기록`, () => tryAction(game.classify(r.id, 'current'))), button('다른 시대 기록', () => tryAction(game.classify(r.id, 'other'))));
  } else if (type === 'chronology') {
    const box = choices();
    for (const id of round.order) {
      const r = record(id);
      const b = button(`「${r.title}」 · ${r.year}${r.yearNote ? ` ${r.yearNote}` : ''}`, () => tryAction(game.shelve(id), '책을 꽂았습니다.'));
      b.disabled = round.picked.includes(id); b.classList.toggle('done', b.disabled); box.append(b);
    }
  } else if (type === 'wiring') {
    const pair = node('div', 'pair'); const authors = node('div', 'choices'); const works = node('div', 'choices');
    authors.style.gridTemplateColumns = works.style.gridTemplateColumns = '1fr';
    for (const r of wiringRecords[era]) {
      const b = button(r.author, () => { selected = r.id; authors.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      b.disabled = round.matched.includes(r.id); authors.append(b);
    }
    for (const id of round.order) {
      const r = record(id);
      const b = button(`「${r.title}」`, () => { if (!selected) { feedback('왼쪽에서 작가를 먼저 고르세요.'); return; } const answer = selected; selected = null; tryAction(game.connect(answer, id)); });
      b.disabled = round.matched.includes(id); works.append(b);
    }
    pair.append(authors, works); content.append(pair);
  } else {
    const stage = round.stage;
    content.append(node('p', 'label', `신호 복구 ${stage + 1} / 3 · ${frequencyRecords[era][stage].word}`));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 360 120'); svg.classList.add('wave');
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'path'); target.classList.add('target'); target.setAttribute('d', wavePath(round.targets[stage]));
    const live = document.createElementNS('http://www.w3.org/2000/svg', 'path'); live.classList.add('live'); live.setAttribute('d', wavePath(round.value)); svg.append(target, live);
    const slider = document.createElement('input'); Object.assign(slider, { type: 'range', min: 0, max: 100, value: round.value, className: 'meter' });
    const output = node('p', 'label', `수신 주파수 ${round.value}`);
    const lock = button('파형을 맞춰 주세요', () => { game.tune(Number(slider.value)); tryAction(game.lockFrequency(), '신호 복구!'); });
    lock.className = 'action'; lock.disabled = Math.abs(round.value - round.targets[stage]) > TOLERANCE;
    slider.addEventListener('input', () => { const value = Number(slider.value); live.setAttribute('d', wavePath(value)); output.textContent = `수신 주파수 ${value}`; lock.disabled = Math.abs(value - round.targets[stage]) > TOLERANCE; lock.textContent = lock.disabled ? '파형을 맞춰 주세요' : '신호 일치 · 복구하기'; });
    content.append(svg, output, slider, lock);
  }
}
for (const value of ERAS) { const option = node('option', '', `${value}년대`); option.value = value; $('#era').append(option); }
$('#era').value = era;
$('#era').addEventListener('change', event => { era = event.target.value; start(); });
for (const value of types) { const b = button(MISSION_LABEL[value], () => { type = value; start(); }); b.dataset.type = value; $('#mission-list').append(b); }
$('#new-round').addEventListener('click', start);
$('#replay').addEventListener('click', start);
start();
