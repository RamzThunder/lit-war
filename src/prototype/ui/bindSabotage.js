import { teamName } from '../teams.js';
import { map } from '../map.js';
import { eraLabel } from '../minigames/wiring.js';
const pct = (value, total) => `${(value / total) * 100}%`;
// Target picker: a scaled copy of the shared room with clickable doorways and terminals.
export function bindSabotage(state) {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#sabotage');
  const board = $('#sabotage-map');
  const close = () => dialog.close();
  $('#close-sabotage').addEventListener('click', close);
  dialog.addEventListener('close', () => $('#game').focus({ preventScroll: true }));
  for (const w of [...map.walls, ...map.racks, ...map.crates]) {
    const block = document.createElement('i');
    block.className = 'map-block';
    Object.assign(block.style, { left: pct(w.x, map.width), top: pct(w.y, map.height), width: pct(w.width, map.width), height: pct(w.height, map.height) });
    board.append(block);
  }
  const spot = (kind, era, box) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `map-spot ${kind}`; button.dataset.kind = kind; button.dataset.era = era;
    Object.assign(button.style, { left: pct(box.x, map.width), top: pct(box.y, map.height), width: pct(box.width, map.width), height: pct(box.height, map.height) });
    button.addEventListener('click', () => { $('#sabotage-feedback').textContent = '거는 중…'; state.placeSabotage(kind, era); });
    board.append(button); return button;
  };
  const spots = [
    ...map.doors.map(d => spot('barricade', d.era, { x: d.x - 14, y: d.y, width: d.width + 28, height: d.height })),
    ...map.terminals.map(t => spot('broken', t.era, { x: t.x - 40, y: t.y - 26, width: 80, height: 52 })),
  ];
  for (const t of map.terminals) {
    const tag = document.createElement('span');
    tag.className = 'map-era'; tag.textContent = eraLabel(t.era);
    Object.assign(tag.style, { left: pct(t.x, map.width), top: pct(t.y + 46, map.height) });
    board.append(tag);
  }
  const render = target => {
    $('#sabotage-title').textContent = `${teamName(target.team)} · ${target.name}의 방`;
    $('#sabotage-description').textContent = target.kind === 'barricade' ? '상대 방의 통로를 골라 바리케이드를 설치하세요. 120초 뒤 자동 해제되며, 상대가 수리할 수도 있습니다.' : '상대 방의 단말기 한 곳을 골라 고장 내세요. 상대가 수리할 때까지 사용할 수 없습니다.';
    const full = target.sabotages.filter(s => s.kind === target.kind).length >= target.max;
    for (const button of spots) {
      const taken = target.sabotages.some(s => s.kind === button.dataset.kind && s.era === button.dataset.era);
      button.hidden = button.dataset.kind !== target.kind;
      button.disabled = taken || full || button.hidden;
      button.classList.toggle('taken', taken);
      const what = button.dataset.kind === 'barricade' ? '통로 바리케이드' : '단말기 고장';
      button.textContent = button.dataset.kind === 'barricade' ? '🚧' : '💥';
      button.setAttribute('aria-label', `${eraLabel(button.dataset.era)} ${what}${taken ? ' (이미 걸림)' : ''}`);
      button.title = button.getAttribute('aria-label');
    }
    $('#sabotage-feedback').textContent = `${target.kind === 'barricade' ? '바리케이드' : '단말기 고장'} ${target.sabotages.filter(s => s.kind === target.kind).length} / ${target.max}`;
  };
  state.events.addEventListener('sabotage-target', ({ detail }) => { render(detail); if (!dialog.open) dialog.showModal(); });
  state.events.addEventListener('sabotage-done', () => { if (dialog.open) dialog.close(); });
  state.events.addEventListener('raid', () => { if (dialog.open) dialog.close(); });
  state.events.addEventListener('notice', ({ detail }) => { if (dialog.open && detail.tone === 'warn') $('#sabotage-feedback').textContent = detail.message; });
}
