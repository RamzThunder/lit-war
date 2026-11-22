import './tutorial.css';
export function bindTutorial(state) {
  const frame = document.createElement('iframe');
  frame.title = '기록실 조작 연습';
  const host = document.createElement('dialog');
  host.className = 'training-host';
  host.append(frame);
  document.body.append(host);
  let done;
  function close() {
    if (!host.open) return;
    host.close();
    frame.removeAttribute('src');
    done = null;
    document.querySelector('#game').focus();
  }
  function start(onComplete) {
    done = onComplete;
    frame.src = './?training=1&team=' + (state.me?.team || 'blue') + (done ? '&required=1' : '');
    host.showModal();
    frame.focus();
  }
  host.addEventListener('cancel', event => { if (done) event.preventDefault(); else close(); });
  window.addEventListener('message', event => {
    if (!host.open || event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data === 'training-finished' || (!done && event.data === 'training-exit')) {
      const callback = done; close(); callback?.();
    }
  });
  const help = document.createElement('button');
  help.textContent = '조작 안내'; help.className = 's-join';
  document.querySelector('.s-net').prepend(help);
  help.onclick = () => { if (!state.raid) start(); };

  // In-game reminders never cover the controls or pause a live attack.
  const tip = document.createElement('aside'); tip.className = 'tutorial-tip'; tip.hidden = true;
  tip.innerHTML = '<span role="status"></span><button type="button" aria-label="도움말 닫기">×</button>';
  document.querySelector('#game').append(tip);
  let timer, previous = null, identity = '';
  const hideTip = () => { tip.hidden = true; clearTimeout(timer); };
  tip.querySelector('button').addEventListener('click', hideTip);
  const showTip = text => { clearTimeout(timer); tip.querySelector('span').textContent = text; tip.hidden = false; timer = setTimeout(hideTip, 14000); };
  state.subscribeSession(() => {
    const key = state.online ? `${state.room}:${state.name}` : '';
    if (key !== identity || !state.connected) { previous = null; identity = key; hideTip(); }
    if (!state.me || !state.connected) return;
    const count = state.me.missions;
    if (previous != null && count > previous && !state.raid) {
      if (Math.floor(count / 10) > Math.floor(previous / 10)) showTip('⚡ 미션 10개 달성! 실시간 공격권 +1 · 아래 「실시간 공격」 또는 2를 두 번 눌러 출발해요. 방해 권한도 +1!');
      else if (Math.floor(count / 5) > Math.floor(previous / 5)) showTip(`🛠 미션 5개 달성! ${state.me.team === 'red' ? '단말기 고장' : '바리케이드'} 권한 +1 · 아래 방해 버튼 또는 1을 누르고 상대 방의 위치를 고르세요.`);
    }
    previous = count;
  });
  state.events.addEventListener('raid', ({ detail }) => {
    close();
    if (detail.role === 'defender') showTip('🏃 상대가 침입했어요! WASD·방향키 또는 조이스틱으로 15초 동안 피하세요. 감전이 풀리면 다시 이동하세요!');
    else showTip('⚡ 상대 가까이에서 SPACE 또는 「감전」! 15초 동안 최대 5번 감전시킬 수 있어요.');
  });
  state.events.addEventListener('raid-end', hideTip);
  return { start, cancel: () => close(), get active() { return host.open; } };
}
