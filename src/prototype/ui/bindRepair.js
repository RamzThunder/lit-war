import { recordById, eraLabel } from '../minigames/wiring.js';
import { repairAnswer } from '../minigames/repair.js';
// Repair dialog: click work cards oldest → newest. The server judges each pick.
export function bindRepair(state) {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#repair');
  const close = () => state.closeTerminal();
  $('#close-repair').addEventListener('click', close);
  $('#repair-done').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  let signature = null, lastPicked = 0;
  state.subscribe(({ terminalOpen, round }) => {
    const repair = terminalOpen && round?.type === 'repair' ? round : null;
    if (!repair) {
      signature = null;
      if (dialog.open) { dialog.close(); $('#game').focus({ preventScroll: true }); }
      return;
    }
    const where = repair.kind === 'broken' ? `${eraLabel(repair.era)} 단말기 수리` : `${eraLabel(repair.era)} 통로 바리케이드 해체`;
    $('#repair-eyebrow').textContent = repair.kind === 'broken' ? 'REPAIR / BROKEN TERMINAL' : 'REPAIR / BARRICADE';
    $('#repair-title').textContent = where;
    const next = `${repair.kind}:${repair.era}:${repair.order.join(',')}`;
    if (next !== signature) {
      signature = next; lastPicked = 0;
      $('#repair-cards').replaceChildren(...repair.order.map(id => {
        const record = recordById(id);
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'repair-card'; button.dataset.id = id;
        button.innerHTML = '<span class="repair-author"></span><strong></strong><small></small>';
        button.querySelector('.repair-author').textContent = record.author;
        button.querySelector('strong').textContent = `「${record.title}」`;
        button.addEventListener('click', () => state.pickRepair(id));
        return button;
      }));
      $('#repair-feedback').textContent = '가장 먼저 발표된 작품부터 누르세요.';
    }
    if (repair.picked.length < lastPicked && !repair.complete) {
      $('#repair-feedback').textContent = '순서가 틀렸어요! 처음부터 다시 맞춰 보세요.';
      dialog.querySelector('.dialog-body').classList.remove('shake'); void dialog.offsetWidth;
      dialog.querySelector('.dialog-body').classList.add('shake');
    } else if (repair.picked.length > lastPicked && !repair.complete) $('#repair-feedback').textContent = '좋아요! 다음으로 오래된 작품은?';
    lastPicked = repair.picked.length;
    dialog.querySelectorAll('.repair-card').forEach(button => {
      const index = repair.picked.indexOf(button.dataset.id);
      button.disabled = index >= 0 || repair.complete;
      button.classList.toggle('picked', index >= 0);
      const record = recordById(button.dataset.id);
      button.querySelector('small').textContent = index >= 0 ? `${index + 1}번째 · ${record.year}${record.yearNote ? ` ${record.yearNote}` : ''}` : '';
    });
    const answer = repairAnswer(repair);
    $('#repair-track').replaceChildren(...answer.map((id, i) => {
      const slot = document.createElement('span');
      slot.className = i < repair.picked.length ? 'filled' : '';
      slot.textContent = i < repair.picked.length ? recordById(repair.picked[i]).year : `${i + 1}`;
      return slot;
    }));
    $('#repair-done').hidden = !repair.complete;
    if (repair.complete) $('#repair-feedback').textContent = repair.kind === 'broken' ? '단말기가 다시 켜졌어요!' : '바리케이드를 치웠어요!';
    if (!dialog.open) dialog.showModal();
  });
}
