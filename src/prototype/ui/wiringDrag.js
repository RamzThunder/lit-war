// Capture on the originating button so release is delivered even outside its bounds.
// Hit-test by coordinates: pointer capture deliberately keeps event.target at the source.
export function bindWiringDrag(board, { onConnect, onSelect, onCancel }) {
  const doc = board.ownerDocument;
  const svg = board.querySelector('svg');
  let drag = null;
  let suppressClick = false;
  const portAt = event => doc.elementFromPoint(event.clientX, event.clientY)?.closest('.port');
  const clear = () => {
    if (!drag) return;
    const current = drag;
    drag = null;
    current.line.remove();
    board.querySelectorAll('.drop-target').forEach(port => port.classList.remove('drop-target'));
    if (current.source.hasPointerCapture(current.pointerId)) current.source.releasePointerCapture(current.pointerId);
  };
  board.addEventListener('pointerdown', event => {
    const source = event.target.closest('.port');
    if (!source || source.disabled || event.button !== 0 || drag) return;
    suppressClick = false;
    const line = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.classList.add('pending-wire');
    svg.append(line);
    drag = { source, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, line };
    source.setPointerCapture(event.pointerId);
    source.focus({ preventScroll: true });
    if (source.dataset.author) onSelect(source.dataset.author);
  });
  board.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8;
    if (!drag.moved) return;
    event.preventDefault();
    const box = svg.getBoundingClientRect();
    const sourceBox = drag.source.getBoundingClientRect();
    const fromX = drag.source.dataset.author ? 0 : 100;
    const fromY = ((sourceBox.top + sourceBox.height / 2 - box.top) / box.height) * 220;
    const x = (event.clientX - box.left) / box.width * 100;
    const y = (event.clientY - box.top) / box.height * 220;
    drag.line.setAttribute('d', `M ${fromX} ${fromY} C 50 ${fromY}, 50 ${y}, ${x} ${y}`);
    const target = portAt(event);
    board.querySelectorAll('.port').forEach(port => port.classList.toggle('drop-target', port === target && !port.disabled && Boolean(port.dataset.author) !== Boolean(drag.source.dataset.author)));
  });
  board.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { source } = drag;
    const moved = drag.moved || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8;
    const target = portAt(event);
    // Prevent the synthesized click after a drag from reselecting the source.
    suppressClick = moved;
    clear();
    if (!moved) return;
    if (target && board.contains(target) && !target.disabled && Boolean(source.dataset.author) !== Boolean(target.dataset.author)) {
      onConnect(source.dataset.author ?? target.dataset.author, source.dataset.work ?? target.dataset.work);
    } else onCancel();
  });
  board.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
  const cancel = () => { if (drag) { clear(); onCancel(); } };
  board.addEventListener('pointercancel', cancel);
  board.addEventListener('lostpointercapture', cancel);
  board.addEventListener('dragstart', event => event.preventDefault());
  doc.defaultView.addEventListener('blur', cancel);
  return cancel;
}
