// On-screen controls for phones and tablets: a joystick (left) and one context button (right).
// Shown on coarse pointers, or as soon as the game area is touched.
export function bindTouch() {
  const $ = selector => document.querySelector(selector);
  const root = $('#touch-controls'), pad = $('#joystick'), stick = $('#stick'), button = $('#touch-action');
  const input = { x: 0, y: 0, onAction: null, update };
  const show = () => { root.hidden = false; document.body.classList.add('touch'); };
  if (matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch')) show();
  $('#game').addEventListener('touchstart', show, { passive: true });
  let active = null;
  const move = event => {
    const box = pad.getBoundingClientRect();
    const radius = box.width / 2;
    let x = (event.clientX - box.left - radius) / radius, y = (event.clientY - box.top - radius) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    // Small dead zone so a resting thumb does not drift.
    if (length < 0.2) { input.x = 0; input.y = 0; } else { input.x = x; input.y = y; }
    stick.style.transform = `translate(${x * radius * 0.6}px, ${y * radius * 0.6}px)`;
  };
  const release = event => {
    if (event.pointerId !== active) return;
    active = null; input.x = 0; input.y = 0; stick.style.transform = '';
  };
  pad.addEventListener('pointerdown', event => { active = event.pointerId; pad.setPointerCapture(event.pointerId); move(event); event.preventDefault(); });
  pad.addEventListener('pointermove', event => { if (event.pointerId === active) move(event); });
  pad.addEventListener('pointerup', release); pad.addEventListener('pointercancel', release); pad.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => { active = null; input.x = 0; input.y = 0; stick.style.transform = ''; });
  button.addEventListener('pointerdown', event => { event.preventDefault(); input.onAction?.(); });
  let last = '';
  function update({ open, target, raid, inRange }) {
    let label = '', mode = '';
    if (raid?.role === 'attacker') { label = '⚡ 감전'; mode = inRange ? 'shock' : 'idle'; }
    else if (!open && target?.action === 'open') { label = '기록 열기'; mode = 'ready'; }
    else if (!open && target?.action === 'cleanse') { label = '정화'; mode = 'repair'; }
    else if (!open && target?.action === 'repair') { label = '수리'; mode = 'repair'; }
    const key = `${label}:${mode}`;
    if (key === last) return;
    last = key;
    button.textContent = label || '·';
    button.className = mode;
    button.disabled = !label;
  }
  return input;
}
