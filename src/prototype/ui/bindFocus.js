// Keeps students on the game during the opening and the game, which a browser cannot enforce:
//  - Full screen is required. Joining the classroom turns it on (that click is the browser's
//    permission). If it is off, a gate covers everything and the game ignores input until the
//    student presses "back to full screen". ESC must be held to leave (keyboard lock, Chrome).
//  - Leaving is reported so the teacher console and the TV can warn: another tab/window or a
//    minimised window ("tab"), or full screen switched off ("fullscreen"). Only whether the
//    game is on screen is sent — never where they went. Blips shorter than AWAY_MS are ignored.
//  - A reload or reconnect drops full screen by itself, so turning it off is only counted
//    GRACE_MS after the game/opening starts or after connecting (the gate shows at once).
export const AWAY_MS = 1500;
export const GRACE_MS = 10000;
const GATED_PHASES = new Set(['opening', 'playing']);

export function bindFocus(state) {
  const $ = selector => document.querySelector(selector);
  const gate = $('#fs-gate'), video = $('#opening-video');
  const supported = Boolean(document.documentElement.requestFullscreen);
  let reported = false, timer = null, graceUntil = 0, graceTimer = null, lastPhase = null, wasConnected = false, offSince = null;

  const required = () => supported && state.online && state.connected && GATED_PHASES.has(state.lesson?.phase);
  const fullscreenOff = () => required() && !document.fullscreenElement;
  const tabAway = () => document.hidden || !document.hasFocus();
  const reason = () => (tabAway() ? 'tab' : fullscreenOff() && performance.now() >= graceUntil ? 'fullscreen' : null);

  async function enter() {
    if (!supported) return;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await navigator.keyboard?.lock?.(['Escape']);
    } catch { /* the browser refused (no click yet); the gate stays */ }
  }
  function renderGate() {
    const show = fullscreenOff();
    state.gated = show;
    if (show && !gate.open) {
      gate.showModal();
      if (!video.paused) video.pause();
    } else if (!show && gate.open) {
      gate.close();
      // Resume the opening film if it was interrupted.
      if (!$('#opening').hidden && !video.hidden && video.src && !video.ended && video.paused) video.play().catch(() => {});
      $('#game').focus({ preventScroll: true });
    }
  }
  function check() {
    renderGate();
    // When the game actually went off screen, so the teacher sees the real duration.
    const off = tabAway() || fullscreenOff();
    if (off && offSince == null) offSince = performance.now(); else if (!off) offSince = null;
    clearTimeout(timer);
    if (!state.online || !state.connected) { reported = false; return; }
    if (reason()) {
      timer = setTimeout(() => {
        const why = reason();
        if (why && !reported && state.connected) { reported = true; state.send({ type: 'focus', away: true, reason: why, ms: Math.round(performance.now() - (offSince ?? performance.now())) }); }
      }, AWAY_MS);
    } else if (reported) { reported = false; state.send({ type: 'focus', away: false }); }
  }
  const startGrace = () => { graceUntil = performance.now() + GRACE_MS; clearTimeout(graceTimer); graceTimer = setTimeout(check, GRACE_MS + 50); };

  document.addEventListener('visibilitychange', check);
  addEventListener('blur', check); addEventListener('focus', check);
  document.addEventListener('fullscreenchange', () => { label(); check(); });
  // The server only counts during the opening and the game: re-report when the phase changes,
  // and after a reconnect (the new session starts clean).
  state.events.addEventListener('lesson', () => {
    const phase = state.lesson?.phase;
    if (GATED_PHASES.has(phase) && !GATED_PHASES.has(lastPhase)) startGrace();
    lastPhase = phase; reported = false; check();
  });
  state.subscribeSession(() => {
    if (state.connected && !wasConnected) startGrace();
    if (!state.connected) reported = false;
    wasConnected = state.connected;
    renderGate();
  });

  // Joining the classroom is a click, so full screen can start right there.
  $('#join-form').addEventListener('submit', () => { if (supported) enter(); });
  $('#fs-gate-enter').addEventListener('click', enter);
  gate.addEventListener('cancel', event => event.preventDefault()); // ESC must not dismiss the gate

  const button = $('#fullscreen');
  const label = () => { button.textContent = document.fullscreenElement ? '⤢ 전체 화면 끄기' : '⛶ 전체 화면'; };
  if (!supported) { button.hidden = true; return; }
  button.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {}); else await enter();
    $('#game').focus({ preventScroll: true });
  });
  label();
}
