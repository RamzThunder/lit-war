import { ERAS, eraLabel, recordById } from '../minigames/wiring.js';
import { frequencyRecords } from '../minigames/frequency.js';
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

export function renderExtraMission(root, round, submit) {
  root.replaceChildren();
  const send = value => { const result = submit(value); if (result === 'incorrect') root.querySelector('.extra-status')?.replaceChildren('다시 확인해 보세요.'); };
  const status = el('p', '', 'extra-status');
  if (round.type === 'engine') {
    const work = recordById(round.order[round.stage]);
    root.append(el('div', `${work.author} · 「${work.title}」`, 'mission-reveal'), el('p', `작품의 ${work.yearNote ?? '발표'} 연도로 엔진 다이얼을 맞추세요. 같은 시대 안에서 고릅니다.`));
    const output = el('output', `${round.era}년`);
    const slider = el('input'); Object.assign(slider, { type: 'range', min: Number(round.era), max: Number(round.era) + 9, value: Number(round.era) });
    slider.className = 'extra-slider'; slider.addEventListener('input', () => output.textContent = `${slider.value}년`);
    root.append(slider, output, button('엔진 정렬', () => send(Number(slider.value))));
  } else if (round.type === 'upload') {
    const work = recordById(round.order[round.stage]);
    root.append(el('div', `${work.author} · 「${work.title}」`, 'mission-reveal'), el('p', '빈 데이터 필드에 맞는 문학사 키워드를 업로드하세요.'));
    const box = grid(root); for (const word of uploadOptions(round)) box.append(button(word, () => send(word)));
  } else if (round.type === 'truth') {
    const claim = round.claims[round.stage], work = recordById(claim.id);
    root.append(el('div', `「${work.title}」의 작가는 ${claim.author}이다`, 'mission-reveal'));
    const box = grid(root); box.append(button('참 · 승인', () => send(true)), button('거짓 · 차단', () => send(false)));
  } else if (round.type === 'mail') {
    const letter = recordById(round.order[round.stage]);
    root.append(el('div', `${letter.author} · 「${letter.title}」`, 'mission-reveal'), el('p', '작품이 발표된 시대의 우편함으로 배달하세요.'));
    const box = grid(root); for (const era of ERAS) box.append(button(eraLabel(era), () => send(era)));
  } else if (round.type === 'cooking') {
    root.append(el('p', `김유정 「${COOKING.title}」의 사건을 발생 순서대로 조리하세요.`));
    const box = grid(root);
    for (const index of round.order) { const b = button(COOKING.steps[index], () => send(index)); b.disabled = round.picked.includes(index); box.append(b); }
  } else if (round.type === 'fishing') {
    root.append(el('p', `${eraLabel(round.era)} 키워드 3개만 낚으세요. 다른 시대 키워드는 놓아주세요.`));
    const box = grid(root); box.classList.add('fishing-pond');
    for (const word of round.pond) { const b = button(`◈ ${word}`, () => send(word)); b.disabled = round.caught.includes(word); if (b.disabled) b.classList.add('hit'); box.append(b); }
  } else if (round.type === 'puzzle') {
    const work = recordById(round.work);
    root.append(el('p', `${work.author}의 작품명을 앞에서부터 이어 붙이세요.`), el('div', round.picked.map(i => round.pieces.find(p => p.id === i)?.text).join(''), 'mission-reveal'));
    const box = grid(root);
    for (const piece of round.pieces) { const b = button(piece.text, () => send(piece.id)); b.disabled = round.picked.includes(piece.id); box.append(b); }
  }
  root.append(status);
}
