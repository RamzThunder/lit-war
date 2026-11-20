// Number-key shortcuts for the HUD actions, so Chromebook players keep their hands on the
// keyboard: 1 sabotage, 2 live raid, 3 trap (guardians only). Each key clicks the existing
// button, so the usual checks (rights, busy, raid in progress) still apply.
// A raid spends a right immediately, so 2 must be pressed twice within ARM_MS.
export const ARM_MS = 2500;
const KEYS = { 1: '#use-sabotage', 2: '#use-raid', 3: '#use-trap' };
const typing = el => Boolean(el) && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export function bindShortcuts(state) {
  const $ = selector => document.querySelector(selector);
  let armedUntil = 0, armTimer = null;
  const disarm = () => { armedUntil = 0; clearTimeout(armTimer); $('#use-raid').classList.remove('armed'); };
  // Never fire while the student is typing, a window is open, or the opening film plays.
  const blocked = () => typing(document.activeElement) || Boolean(document.querySelector('dialog[open]'))
    || state.snapshot.terminalOpen || !$('#opening').hidden || Boolean(state.gated);

  document.addEventListener('keydown', event => {
    const selector = KEYS[event.key];
    if (!selector || event.repeat || event.ctrlKey || event.metaKey || event.altKey || blocked()) return;
    const button = $(selector);
    if (button.hidden) return; // 3 does nothing for Luddites
    event.preventDefault();
    if (button.disabled) {
      // Solo practice or a raid in progress: the rights message would be misleading.
      if (!state.online || !state.connected || state.raid) { disarm(); return; }
      if (event.key === '1') state.notice('아직 방해 공작 권한이 없어요. 미션 5개마다 생겨요.', 'info');
      if (event.key === '2') state.notice('아직 실시간 공격권이 없어요. 미션 10개마다 생겨요.', 'info');
      disarm(); return;
    }
    if (event.key !== '2') { disarm(); button.click(); return; }
    if (performance.now() < armedUntil) { disarm(); button.click(); return; }
    armedUntil = performance.now() + ARM_MS;
    button.classList.add('armed');
    clearTimeout(armTimer); armTimer = setTimeout(disarm, ARM_MS);
    state.notice('⚡ 정말 실시간 공격을 출발할까요? 2를 한 번 더 누르면 출발해요.', 'warn');
  });
  // Rights can change (e.g. a raid starts) while armed; drop the pending confirmation.
  state.subscribeSession(() => { if (armedUntil && $('#use-raid').disabled) disarm(); });
}
