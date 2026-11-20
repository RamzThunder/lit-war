import Phaser from 'phaser';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '../shared/system.css';
import './style.css';
import { SessionState } from './network/SessionState.js';
import { bindSession } from './ui/bindSession.js';
import { DataCenter } from './scenes/DataCenter.js';
import { bindUI } from './ui/bindUI.js';
import { bindTouch } from './ui/bindTouch.js';
import { bindOpening } from './ui/bindOpening.js';
import { bindShortcuts } from './ui/bindShortcuts.js';
import { bindFocus } from './ui/bindFocus.js';
const state = new SessionState();
bindSession(state);
// Dev-only handle for automated browser checks; not included in production builds.
if (import.meta.env.DEV) window.__litwar = state;
const updateContext = bindUI(state);
const touch = bindTouch();
bindOpening(state);
bindShortcuts(state);
bindFocus(state);
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#101b25',
  pixelArt: true, roundPixels: true, antialias: false,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [new DataCenter(state, updateContext, touch)],
});
