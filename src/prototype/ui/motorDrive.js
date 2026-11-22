// Both wheels use the coordinate system of the painted motor so the axles stay
// registered even when the instrument window crops the picture on narrow screens.
const svgNS = 'http://www.w3.org/2000/svg';
const motor = new URL('../assets/instruments/motor.jpg', import.meta.url).href;
export function motorDrive(scene) {
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 768 512');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('motor-drive');
  svg.innerHTML = `<defs>
    <clipPath id="flywheel-face"><ellipse cx="207" cy="220" rx="194" ry="200"/></clipPath>
    <clipPath id="pinion-face"><circle cx="359" cy="362" r="68"/></clipPath>
    <clipPath id="hidden-rim"><circle cx="359" cy="362" r="74"/></clipPath>
    <clipPath id="hidden-teeth"><path d="M330 375 L353 356 L380 368 L388 437 L328 437Z"/></clipPath>
    <image id="motor-paint" href="${motor}" width="768" height="512"/>
    <clipPath id="motor-bracket"><path d="M335 378 L348 365 L375 371 L383 437 L512 437 L512 482 L290 482 L290 439 L332 435Z"/></clipPath>
  </defs>
  <g clip-path="url(#flywheel-face)">
    <g transform="translate(207 220) scale(194 200)"><g class="flywheel">
      <g transform="scale(0.005154639 0.005) translate(-207 -220)">
        <use href="#motor-paint"/>
        <g clip-path="url(#hidden-rim)"><use href="#motor-paint" transform="rotate(144 207 220)"/></g>
      </g>
    </g></g>
  </g>
  <g clip-path="url(#pinion-face)">
    <g transform="translate(359 362)"><g class="pinion"><g transform="translate(-359 -362)">
      <use href="#motor-paint"/>
      <g clip-path="url(#hidden-teeth)"><use href="#motor-paint" transform="rotate(180 359 362)"/></g>
    </g></g></g>
  </g>
  <use href="#motor-paint" clip-path="url(#motor-bracket)"/>`;
  scene.prepend(svg);
  return steps => {
    svg.style.setProperty('--wheel-turn', steps * 18 + 'deg');
    svg.style.setProperty('--pinion-turn', steps * -51 + 'deg');
  };
}
