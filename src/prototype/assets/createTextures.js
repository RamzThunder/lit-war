import { archiveDepth } from '../scenes/archiveDepth.js';
import Phaser from 'phaser';
import guardianSheet from './guardian-painted.webp';
import ludditeSheet from './luddite-painted.webp';

import guardianActions from './guardian-actions.webp';
import ludditeActions from './luddite-actions.webp';

const ACTIONS = {
  sit: { poses: [0, 1], fps: 7 },
  type: { poses: [2, 3], fps: 4 },
  hit: { poses: [4, 5, 6, 5, 6, 7], fps: 9 },
  cast: { poses: [8, 9, 10, 11], fps: 8 },
};
const WALK_FRAMES = 8;
const FRAMES_PER_DIRECTION = 2 + WALK_FRAMES;

export const CHARACTER_SCALE = 0.25;

export function preloadCharacters(scene) {
  for (const [team, url] of Object.entries({ blue: guardianSheet, red: ludditeSheet })) {
    const frame = { frameWidth: 144, frameHeight: 192 };
    scene.load.spritesheet(team, url, frame);
    scene.load.spritesheet(team + '-actions', team === 'red' ? ludditeActions : guardianActions, frame);
  }
}

export function characterAnimation(team, direction, moving) {
  return `${team === 'red' ? 'red' : 'blue'}-${moving ? 'walk' : 'idle'}-${direction}`;
}

function actionPrefix(sprite, team, target, fallback) {
  const dx = target?.x - sprite.x, dy = target?.y - sprite.y;
  let direction = fallback;
  if (Number.isFinite(dx) && Number.isFinite(dy) && (dx || dy)) {
    direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  sprite.setFlipX(direction === 'left');
  const view = direction === 'up' || direction === 'down' ? direction : 'side';
  return `${team === 'red' ? 'red' : 'blue'}-${view}-`;
}

export function playShock(sprite, team, action, target, facing = 'down') {
  sprite.play(actionPrefix(sprite, team, target, facing) + action);
}

export function animateCharacter(sprite, team, direction, moving, terminal = null) {
  const depth = archiveDepth(sprite.y + 16);
  if (sprite.depth !== depth) sprite.setDepth(depth);
  const current = sprite.anims.currentAnim?.key ?? '';
  if (sprite.anims.isPlaying && (current.endsWith('-cast') || current.endsWith('-hit'))) return;
  if (terminal) {
    const prefix = actionPrefix(sprite, team, terminal, direction);
    if (current === prefix + 'sit' && sprite.anims.isPlaying) return;
    sprite.play(prefix + (current === prefix + 'sit' || current === prefix + 'type' ? 'type' : 'sit'), true);
    return;
  }
  sprite.setFlipX(false).play(characterAnimation(team, direction, moving), true);
}

export function sizeCharacter(sprite) {
  // Feet remain 16 world units below the network position.
  return sprite.setScale(CHARACTER_SCALE).setOrigin(0.5, 2 / 3).setDepth(archiveDepth(sprite.y + 16));
}

export function createTextures(scene) {
  for (const team of ['blue', 'red']) {
    scene.textures.get(team).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const sheet = team + '-actions';
    scene.textures.get(sheet).setFilter(Phaser.Textures.FilterMode.LINEAR);
    ['side', 'down', 'up'].forEach((view, index) => {
      for (const [action, { poses, fps }] of Object.entries(ACTIONS)) {
        scene.anims.create({
          key: `${team}-${view}-${action}`,
          frames: poses.map(frame => ({ key: sheet, frame: index * 12 + frame })),
          frameRate: fps, repeat: action === 'type' ? -1 : 0,
        });
      }
    });
    ['down', 'up', 'left', 'right'].forEach((direction, row) => {
      for (const moving of [false, true]) {
        const poses = moving ? Array.from({ length: WALK_FRAMES }, (_, i) => i + 2) : [0, 1];
        scene.anims.create({
          key: characterAnimation(team, direction, moving),
          frames: poses.map(pose => ({
            key: team,
            frame: row * FRAMES_PER_DIRECTION + pose,
            duration: moving && (pose === 2 || pose === 6) ? 30 : 0,
          })),
          frameRate: moving ? 11 : 2,
          repeat: -1,
        });
      }
    });
  }
}
