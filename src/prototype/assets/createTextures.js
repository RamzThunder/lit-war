import guardianSheet from './guardian.png';
import ludditeSheet from './luddite.png';

export function preloadCharacters(scene) {
  for (const [team, url] of Object.entries({ blue: guardianSheet, red: ludditeSheet })) {
    scene.load.spritesheet(team, url, { frameWidth: 24, frameHeight: 32 });
  }
}

export function characterAnimation(team, direction, moving) {
  const faction = team === 'red' || team === 'blue' ? team + '-' : '';
  return faction + (moving ? 'walk-' : 'idle-') + direction;
}

export function createTextures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const rect = (x, y, w, h, color) => g.fillStyle(color).fillRect(x, y, w, h);
  for (const direction of ['down', 'up', 'left', 'right']) {
    for (let frame = 0; frame < 4; frame++) {
      g.clear();
      const bob = frame === 1 ? 1 : 0;
      const stride = frame >= 2 ? (frame === 2 ? -2 : 2) : 0;
      rect(5, 28, 15, 3, 0x080e16);
      rect(7, 22, 4, 7 + stride, 0x263649);
      rect(14, 22, 4, 7 - stride, 0x263649);
      rect(6, 27 + stride, 5, 3, 0x91a4ae);
      rect(14, 27 - stride, 5, 3, 0x91a4ae);
      rect(6, 12 + bob, 13, 12, 0x718692);
      rect(8, 13 + bob, 9, 9, 0x42596c);
      rect(4, 14 + bob + stride / 2, 3, 10, 0x98a9ad);
      rect(19, 14 + bob - stride / 2, 3, 10, 0x98a9ad);
      rect(7, 2 + bob, 12, 11, 0xb2c3c7);
      rect(9, bob, 8, 3, 0x839ca7);
      if (direction === 'up') {
        rect(8, 4 + bob, 10, 7, 0x6b8491);
        rect(9, 15 + bob, 7, 7, 0x233644);
        rect(10, 16 + bob, 5, 2, 0x64c7be);
      } else {
        const eyeX = direction === 'left' ? 6 : direction === 'right' ? 13 : 8;
        rect(eyeX, 5 + bob, direction === 'down' ? 10 : 6, 5, 0x152d3b);
        rect(eyeX, 6 + bob, direction === 'down' ? 9 : 5, 2, 0x70e0d0);
        rect(9, 15 + bob, 3, 3, 0xd1ddd6);
      }
      g.generateTexture(`player-${direction}-${frame}`, 24, 32);
    }
    scene.anims.create({ key: `idle-${direction}`, frames: [0, 1].map(n => ({ key: `player-${direction}-${n}` })), frameRate: 2, repeat: -1 });
    scene.anims.create({ key: `walk-${direction}`, frames: [2, 0, 3, 0].map(n => ({ key: `player-${direction}-${n}` })), frameRate: 9, repeat: -1 });
  }
  for (const team of ['blue', 'red']) {
    ['down', 'up', 'left', 'right'].forEach((direction, row) => {
      for (const moving of [false, true]) {
        const poses = moving ? [2, 3, 4, 5] : [0, 1];
        scene.anims.create({
          key: characterAnimation(team, direction, moving),
          frames: poses.map(pose => ({ key: team, frame: row * 6 + pose })),
          frameRate: moving ? 9 : 2,
          repeat: -1,
        });
      }
    });
  }
  g.clear();
  rect(0, 0, 32, 32, 0x17232e); rect(1, 1, 30, 30, 0x1b2934);
  rect(2, 2, 28, 1, 0x22323f); rect(29, 29, 2, 2, 0x101b25);
  g.generateTexture('floor', 32, 32);
  g.destroy();
}
