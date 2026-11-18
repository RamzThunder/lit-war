import { ERAS, eraLabel } from '../minigames/wiring.js';
// Contamination alert (bait for Luddites, cleansing for Guardians) and the Guardian trap picker.
// Every outcome ends on the true record, so a fake is never the last thing a student sees.
export function bindContam(state) {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#contam');
  let mode = null, current = null, locked = false;
  const label = (field, value) => (field === 'era' ? eraLabel(value) : value);
  const truthCard = truth => {
    const card = document.createElement('div');
    card.className = 'contam-card truth';
    card.innerHTML = '진짜 기록 · <b></b>';
    card.querySelector('b').textContent = `「${truth.title}」 ${truth.author} · ${eraLabel(truth.era)}`;
    return card;
  };
  const choices = (options, field, onPick) => {
    $('#contam-options').replaceChildren(...options.map(value => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = label(field, value);
      button.addEventListener('click', () => {
        if (locked) return;
        locked = true; button.classList.add('picked');
        $('#contam-options').querySelectorAll('button').forEach(b => { b.disabled = true; });
        $('#contam-feedback').textContent = '판정 중…';
        onPick(value);
      });
      return button;
    }));
  };
  const open = () => { locked = false; $('#contam-done').hidden = true; $('#contam-feedback').textContent = ''; if (!dialog.open) dialog.showModal(); };
  const finish = (message, truth) => {
    $('#contam-feedback').textContent = message;
    $('#contam-options').replaceChildren(truthCard(truth));
    $('#contam-done').hidden = false; $('#close-contam').hidden = false;
  };
  const close = () => { if (dialog.open) dialog.close(); mode = null; current = null; };
  $('#contam-done').addEventListener('click', close);
  $('#close-contam').addEventListener('click', () => { if (mode !== 'bait' || !$('#contam-done').hidden) close(); });
  // The bait offer cannot be dismissed without a choice (it is one minute only).
  dialog.addEventListener('cancel', event => { if (mode === 'bait' && $('#contam-done').hidden) event.preventDefault(); else mode = null; });
  dialog.addEventListener('close', () => $('#game').focus({ preventScroll: true }));

  // Luddite: one bait per mission during the alert.
  state.events.addEventListener('bait-offer', ({ detail: offer }) => {
    mode = 'bait'; current = offer;
    $('#contam-top').textContent = 'LUDDITE / PLANT BAIT';
    $('#contam-eyebrow').textContent = `⚠️ 오염 경보 · 성공 시 +${offer.points}`;
    $('#contam-title').textContent = '🧪 미끼 심기';
    $('#contam-desc').textContent = offer.field === 'era'
      ? '이 기록을 다른 시대 것처럼 바꿔 HUMAN의 아카이브에 심으세요. 진짜 시대를 고르면 실패하고 기회가 사라져요.'
      : '이 작품을 다른 작가의 것처럼 바꿔 심으세요. 진짜 작가를 고르면 실패하고 기회가 사라져요.';
    const card = $('#contam-card');
    card.className = 'contam-card';
    card.innerHTML = offer.field === 'era' ? '「<b></b>」 <span class="a"></span> · <span class="unknown">❓ 시대</span>' : '「<b></b>」 <span class="unknown">❓ 작가</span> · <span class="e"></span>';
    card.querySelector('b').textContent = offer.card.title;
    if (offer.field === 'era') card.querySelector('.a').textContent = offer.card.author;
    else card.querySelector('.e').textContent = eraLabel(offer.card.era);
    $('#close-contam').hidden = true;
    choices(offer.options, offer.field, value => state.plantBait(value));
    open();
  });
  state.events.addEventListener('bait-result', ({ detail }) => {
    if (mode !== 'bait') return;
    if (detail.truth) finish(detail.message, detail.truth);
    else { $('#contam-feedback').textContent = detail.message; $('#contam-done').hidden = false; $('#close-contam').hidden = false; }
  });

  // Guardian: cleanse a contaminated terminal, one try.
  state.events.addEventListener('cleanse-open', ({ detail: { item, at } }) => {
    mode = 'cleanse'; current = item;
    $('#contam-top').textContent = 'GUARDIAN / CLEANSE';
    $('#contam-eyebrow').textContent = '기회는 한 번 · 정화 성공 시 점수 2배';
    $('#contam-title').textContent = '🧪 오염된 기록 정화';
    $('#contam-desc').textContent = `${item.by}이(가) 심은 가짜 기록이에요. ${item.field === 'era' ? '시대' : '작가'} 칸이 변조됐어요. 바른 ${item.field === 'era' ? '시대' : '작가'}를 고르세요.`;
    const card = $('#contam-card');
    card.className = 'contam-card';
    card.innerHTML = '「<b></b>」 <span class="a"></span> · <span class="e"></span> <span class="tag">⚠ 변조됨</span>';
    card.querySelector('b').textContent = item.card.title;
    card.querySelector('.a').textContent = item.card.author;
    card.querySelector('.e').textContent = eraLabel(item.card.era);
    card.querySelector(item.field === 'era' ? '.e' : '.a').className = 'fake';
    $('#close-contam').hidden = false;
    choices(item.options, item.field, value => state.cleanse(item.id, value, at));
    open();
  });
  state.events.addEventListener('cleanse-result', ({ detail }) => {
    if (mode !== 'cleanse') return;
    finish(detail.correct ? `✨ 정화 성공! +${detail.points}` : '틀렸어요. 오염은 지워졌지만 점수는 없어요. 진짜 기록을 확인하세요.', detail.truth);
  });
  state.events.addEventListener('raid', close);

  // Guardian trap picker.
  const trapDialog = $('#trap');
  $('#trap-eras').replaceChildren(...ERAS.map(era => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.era = era; button.textContent = eraLabel(era);
    button.addEventListener('click', () => { state.setTrap(era); $('#trap-feedback').textContent = `${eraLabel(era)} 단말기를 함정으로 지정했어요.`; });
    return button;
  }));
  $('#trap-clear').addEventListener('click', () => { state.setTrap(null); $('#trap-feedback').textContent = '함정을 해제했어요.'; });
  $('#close-trap').addEventListener('click', () => trapDialog.close());
  trapDialog.addEventListener('close', () => $('#game').focus({ preventScroll: true }));
  $('#use-trap').addEventListener('click', () => { $('#trap-feedback').textContent = ''; trapDialog.showModal(); });
  state.subscribeSession(() => {
    const trap = state.me?.trap ?? null;
    trapDialog.querySelectorAll('[data-era]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.era === trap)));
    $('#trap-clear').disabled = !trap;
  });
}
