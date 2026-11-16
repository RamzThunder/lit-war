import { frequencyRecords as byEra, isTuned, wavePath } from '../minigames/frequency.js';
import { eraLabel } from '../minigames/wiring.js';
export function bindFrequency(state) {
  const $ = selector => document.querySelector(selector);
  const slider = $('#frequency-slider');
  slider.addEventListener('input', () => state.tune(Number(slider.value)));
  $('#lock-frequency').addEventListener('click', () => {
    state.lockFrequency();
    if (!state.snapshot.round?.complete) slider.focus();
  });
  let previousStage = -1;
  state.subscribe(({ round }) => {
    const active = round?.type === 'frequency';
    $('#frequency-panel').hidden = !active;
    if (!active) { previousStage = -1; return; }
    const frequencyRecords = byEra[round.era];
    $('#frequency-label').textContent = `${round.era}s / SIGNAL RECOVERY`;
    const stage = Math.min(round.stage, frequencyRecords.length - 1);
    const tuned = isTuned(round);
    $('#frequency-stage').textContent = round.complete ? '3 / 3 복구' : `${stage + 1} / 3`;
    slider.value = round.value;
    slider.disabled = round.complete;
    $('#frequency-value').textContent = round.value;
    $('#target-wave').setAttribute('d', wavePath(round.targets[stage]));
    $('#live-wave').setAttribute('d', wavePath(round.value));
    $('#frequency-wave').classList.toggle('tuned', tuned || round.complete);
    $('#lock-frequency').disabled = !tuned;
    $('#lock-frequency').textContent = round.complete ? '모든 신호 복구 완료' : tuned ? '신호 일치 · 복구하기' : '파형을 맞춰주세요';
    $('#frequency-hint').textContent = round.complete ? `${eraLabel(round.era)} 문학의 흐름이 복원되었습니다.` : tuned ? '안정적인 신호입니다! 복구 버튼을 누르세요.' : '슬라이더를 움직여 점선과 실선을 겹치세요. 방향키로도 조정할 수 있습니다.';
    $('#frequency-keywords').replaceChildren(...frequencyRecords.map((record, index) => {
      const chip = document.createElement('span');
      chip.className = index < round.stage ? 'recovered' : '';
      chip.textContent = index < round.stage ? `✓ ${record.word}` : `${index + 1} / 미복구`;
      return chip;
    }));
    if (previousStage !== round.stage) {
      $('#frequency-feedback').textContent = round.stage ? `${frequencyRecords[round.stage - 1].word} 복구 — ${frequencyRecords[round.stage - 1].description}` : '노이즈 속에서 첫 번째 기록을 찾아보세요.';
      previousStage = round.stage;
    }
  });
}
