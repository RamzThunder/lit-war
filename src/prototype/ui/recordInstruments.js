import { recordById } from '../minigames/wiring.js';

export function showSequence(display, round, showing) {
  display.classList.add('sequence-bank');
  display.replaceChildren(...round.order.map((word, index) => {
    const slot = document.createElement('span');
    const recalled = index < round.stage;
    slot.className = recalled ? 'registered' : '';
    slot.textContent = showing || recalled ? word : '•••';
    return slot;
  }));
}

export function showShelf(shelf, round) {
  shelf.className = 'record-shelf';
  shelf.setAttribute('aria-label', '꽂은 책');
  shelf.replaceChildren(...round.order.map((_, index) => {
    const spine = document.createElement('span');
    spine.textContent = index < round.picked.length ? recordById(round.picked[index]).title : '·';
    if (index < round.picked.length) spine.className = 'registered';
    return spine;
  }));
}

export function showSignal(meter, value, target) {
  meter.min = 0;
  meter.max = 100;
  meter.value = 100 - Math.abs(target - value);
  meter.setAttribute('aria-label', '목표 파형과의 일치도');
  meter.className = 'signal-meter';
}

// Place live controls on the unoccupied half of the illustrated workstation.
export function instrumentScene(kind, ...controls) {
  const frame = document.createElement('div');
  frame.className = 'instrument-scene scene-' + kind;
  frame.append(...controls);
  return frame;
}
