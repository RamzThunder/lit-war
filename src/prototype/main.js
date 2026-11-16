import Phaser from 'phaser';
import './style.css';
import { SessionState } from './network/SessionState.js';
import { bindSession } from './ui/bindSession.js';
import { DataCenter } from './scenes/DataCenter.js';
import { bindUI } from './ui/bindUI.js';
const state = new SessionState();
bindSession(state);
const updateContext = bindUI(state);
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#101b25',
  pixelArt: true, roundPixels: true, antialias: false,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [new DataCenter(state, updateContext)],
});
