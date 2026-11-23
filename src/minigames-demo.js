import { bookBoard, identityBoard, shooterBoard } from './prototype/ui/directControls.js';
import { instrumentScene, showSequence, showSignal } from './prototype/ui/recordInstruments.js';
import { GameState } from './prototype/state/GameState.js';
import { createMissionRound, MISSION_LABEL } from './prototype/minigames/missionTypes.js';
import { ERAS, createWiringRound, eraLabel, recordById, roundRecords } from './prototype/minigames/wiring.js';
import { createFrequencyRound, wavePath, TOLERANCE } from './prototype/minigames/frequency.js';
import { EXTRA_TYPES } from './prototype/minigames/extraMissions.js';
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
  cooking: '작품의 사건 카드를 일어난 순서대로 놓으세요.',
  fishing: '이 시대의 키워드만 낚아 데이터망으로 올리세요.',
  puzzle: '흩어진 작품명 조각을 순서대로 이어 붙이세요.',
  wiring: '작가를 누른 뒤 해당 작품을 누르면 배선이 연결됩니다.',
  frequency: '슬라이더로 두 파형을 겹친 뒤 신호를 복구하세요.',
};
const requestedMission = new URLSearchParams(location.search).get('mission');
let era = '1930', type = types.includes(requestedMission) ? requestedMission : 'memory', game, selected = null, memoryTimer;
const node = (tag, className = '', label = '') => { const el = document.createElement(tag); el.className = className; el.textContent = label; return el; };
const button = (label, action) => { const el = node('button', '', label); el.type = 'button'; el.addEventListener('click', action); return el; };
const feedback = message => { $('#feedback').textContent = message; };
const choices = () => { const box = node('div', 'choices'); content.append(box); return box; };
const record = id => recordById(id);
const tryAction = (result, success = '복구 중…') => feedback(result === 'incorrect' ? '다시 확인해 보세요.' : result === 'complete' ? '완료!' : success);

function createRound() {
  if (type === 'wiring') return createWiringRound(era);
  if (type === 'frequency') return createFrequencyRound(era);
  return createMissionRound(era, type);
}
function start() {
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
  content.dataset.mission = type;
  content.replaceChildren();
  if (round.complete) return;

  if (EXTRA_TYPES.includes(type)) {
    renderExtraMission(content, round, value => game.submitExtra(value));
    return;
  }

  if (type === 'memory') {
    const showing = Date.now() < round.revealUntil;
    const display = node('div', 'card');
    showSequence(display, round, showing);
    content.append(instrumentScene('memory', display));
    const box = choices();
    for (const word of round.options) {
      const b = button(word, () => tryAction(game.recall(word), '순서를 이어 가세요.'));
      b.disabled = showing; box.append(b);
    }
    if (showing) { clearTimeout(memoryTimer); memoryTimer = setTimeout(() => render(game.snapshot), round.revealUntil - Date.now() + 20); }
  } else if (type === 'shooter') {
    content.append(shooterBoard(round, word => tryAction(game.shoot(word), '오염 신호 격추!')));
  } else if (type === 'identity') {
    content.append(identityBoard(round, (...args) => game.verifyIdentity(...args)));
  } else if (type === 'filter') {
    const r = record(round.order[round.stage]);
    content.append(instrumentScene('sort-chutes', node('div', 'card', `${r.author} · 「${r.title}」`)));
    const box = choices();
    box.append(button(`${eraLabel(era)} 기록`, () => tryAction(game.classify(r.id, 'current'))), button('다른 시대 기록', () => tryAction(game.classify(r.id, 'other'))));
  } else if (type === 'chronology') {
    content.append(bookBoard(round, id => tryAction(game.shelve(id), '책을 꽂았습니다.')));
  } else if (type === 'wiring') {
    const pair = node('div', 'pair'); const authors = node('div', 'choices'); const works = node('div', 'choices');
    authors.style.gridTemplateColumns = works.style.gridTemplateColumns = '1fr';
    for (const r of roundRecords(round)) {
      const b = button(r.author, () => { selected = r.id; authors.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      b.disabled = round.matched.includes(r.id); authors.append(b);
    }
    for (const id of round.order) {
      const r = record(id);
      const b = button(`「${r.title}」`, () => { if (!selected) { feedback('왼쪽에서 작가를 먼저 고르세요.'); return; } const answer = selected; selected = null; tryAction(game.connect(answer, id)); });
      b.disabled = round.matched.includes(id); works.append(b);
    }
    const cables = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    cables.setAttribute('viewBox', '0 0 100 300');
    cables.setAttribute('preserveAspectRatio', 'none');
    cables.setAttribute('aria-hidden', 'true');
    for (const id of round.matched) {
      const left = round.works.indexOf(id) * 100 + 50;
      const right = round.order.indexOf(id) * 100 + 50;
      const cable = document.createElementNS(cables.namespaceURI, 'path');
      cable.setAttribute('d', `M0 ${left} C55 ${left} 45 ${right} 100 ${right}`);
      cables.append(cable);
    }
    pair.classList.add('patchbay');
    pair.append(authors, cables, works); content.append(pair);
  } else {
    const stage = round.stage;
    content.append(node('p', 'label', `신호 복구 ${stage + 1} / 3 · ${round.concepts[stage].word}`));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 360 120'); svg.classList.add('wave');
    const target = document.createElementNS('http://www.w3.org/2000/svg', 'path'); target.classList.add('target'); target.setAttribute('d', wavePath(round.targets[stage]));
    const live = document.createElementNS('http://www.w3.org/2000/svg', 'path'); live.classList.add('live'); live.setAttribute('d', wavePath(round.value)); svg.append(target, live);
    const slider = document.createElement('input'); Object.assign(slider, { type: 'range', min: 0, max: 100, value: round.value, className: 'meter' });
    const meter = node('meter');
    showSignal(meter, round.value, round.targets[stage]);
    const output = node('p', 'label', `수신 주파수 ${round.value}`);
    const lock = button('파형을 맞춰 주세요', () => { game.tune(Number(slider.value)); tryAction(game.lockFrequency(), '신호 복구!'); });
    lock.className = 'action'; lock.disabled = Math.abs(round.value - round.targets[stage]) > TOLERANCE;
    slider.addEventListener('input', () => { const value = Number(slider.value); live.setAttribute('d', wavePath(value)); showSignal(meter, value, round.targets[stage]); output.textContent = `수신 주파수 ${value}`; lock.disabled = Math.abs(value - round.targets[stage]) > TOLERANCE; lock.textContent = lock.disabled ? '파형을 맞춰 주세요' : '신호 일치 · 복구하기'; });
    content.append(instrumentScene('receiver', svg), meter, output, slider, lock);
  }
}
for (const value of ERAS) { const option = node('option', '', eraLabel(value)); option.value = value; $('#era').append(option); }
$('#era').value = era;
$('#era').addEventListener('change', event => { era = event.target.value; start(); });
for (const value of types) { const b = button(MISSION_LABEL[value], () => { type = value; start(); }); b.dataset.type = value; $('#mission-list').append(b); }
$('#new-round').addEventListener('click', start);
$('#replay').addEventListener('click', start);
start();
