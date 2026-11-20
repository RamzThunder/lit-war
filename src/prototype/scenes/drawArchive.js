import { map, solids, doorFor, terminalFor } from '../map.js';
import { archiveDepth } from './archiveDepth.js';
import serverCabinet from '../assets/server-cabinet.webp';
import serviceDoor from '../assets/service-door.webp';
import driveCase from '../assets/drive-case.webp';

import serverFloor from '../assets/server-floor.webp';
import archiveGlass from '../assets/archive-glass.webp';
import archiveWalls from '../assets/archive-walls.webp';
import restorationConsole from '../assets/restoration-console.webp';

export function preloadArchive(scene) {
  scene.load.image('server-floor', serverFloor);
  scene.load.image('archive-glass', archiveGlass);
  scene.load.image('archive-walls', archiveWalls);
  scene.load.image('restoration-console', restorationConsole);
  scene.load.image('server-cabinet', serverCabinet);
  scene.load.image('service-door', serviceDoor);
  scene.load.image('drive-case', driveCase);
}

export function drawArchive(scene, solid = () => {}) {
  const prop = (box, key) => scene.add.image(box.x, box.y, key).setOrigin(0).setDisplaySize(box.width, box.height);
  const mid = map.spawn.x;
  scene.add.image(0, 0, 'server-floor').setOrigin(0).setDisplaySize(map.width, map.height).setDepth(-2);
  const walls = scene.add.image(0, 0, 'archive-walls').setOrigin(0).setDisplaySize(map.width, map.height);
  const gateWidth = 104;
  const scaleX = walls.frame.width / map.width;
  const scaleY = walls.frame.height / map.height;
  function wallFace(x, top, width, base) {
    scene.add.image(0, 0, 'archive-walls').setOrigin(0).setDisplaySize(map.width, map.height)
      .setCrop(x * scaleX, top * scaleY, width * scaleX, (base - top) * scaleY)
      .setDepth(archiveDepth(base));
  }
  const perimeterRails = map.walls.filter(wall => wall.height === map.height);
  for (const wall of map.walls) {
    const base = wall.y + wall.height;
    // The two perimeter rails run parallel to the player's path.
    if (wall.height === map.height) continue;
    // The wall artwork projects 34 units up from each horizontal partition's base.
    const top = wall.width > wall.height ? Math.min(wall.y, base - 34) : wall.y;
    if (base === map.height && wall.width === map.width) {
      const gap = map.entry.x - gateWidth / 2;
      wallFace(0, top, gap, base);
      wallFace(gap + gateWidth, top, map.width - gap - gateWidth, base);
    } else {
      let left = wall.x;
      let right = wall.x + wall.width;
      // Include the painted corner joint where a partition meets a perimeter rail.
      if (wall.width > wall.height) {
        for (const rail of perimeterRails) {
          if (rail.x + rail.width === wall.x) left = rail.x;
          if (rail.x === wall.x + wall.width) right = rail.x + rail.width;
        }
      }
      wallFace(left, top, right - left, base);
    }
  }
  const mount = scene.add.graphics();
  function contactShadow(x, y, width) {
    mount.fillStyle(0x11191b, .15).fillEllipse(x + 1, y, width + 3, 7);
    mount.fillStyle(0x0c1214, .34).fillEllipse(x, y - 1, width - 4, 4);
  }
  for (const o of map.racks) {
    contactShadow(o.x + o.width / 2, o.y + o.height - 1, o.width);
    prop(o, 'server-cabinet');
  }
  for (const o of map.crates) {
    contactShadow(o.x + o.width / 2, o.y + o.height - 1, o.width);
    prop(o, 'drive-case');
  }

  for (const [i, t] of map.terminals.entries()) {
    const d = doorFor(t.era);
    const northWall = map.walls.find(w => w.width > w.height &&
      w.x <= t.x && t.x < w.x + w.width && w.y + w.height <= t.y &&
      t.y - (w.y + w.height) < 90);
    const base = northWall.y + northWall.height;
    // Mount the insert on the room-facing rack rail, clear of the doorway.
    const signX = d.x < mid ? d.x - 23 : d.x + d.width + 23;
    const signY = base - 11;
    scene.add.rectangle(signX, signY, 41, 13, 0x111b23).setStrokeStyle(0.6, 0x45575e).setDepth(archiveDepth(base));
    scene.add.text(signX, signY, t.era + '년대', {
      fontFamily: 'sans-serif', fontSize: '9px', color: '#b2cfc9', resolution: 4,
    }).setOrigin(.5).setDepth(archiveDepth(base));

    // The raised floor carries the feed; only the short lead at the inlet is exposed.
    const inlet = t.x + (t.x < mid ? -18 : 18);
    mount.lineStyle(1.5, 0x1c282e, .8).beginPath()
      .moveTo(inlet - 3, t.y - 21).lineTo(inlet, t.y - 20).lineTo(inlet + 1, t.y - 16).strokePath();
    contactShadow(t.x, t.y + t.height / 2 - 1, t.width);
    scene.add.image(t.x, t.y, 'restoration-console').setDisplaySize(t.width, t.height);
    const scan = scene.add.rectangle(t.x, t.y - 14, 38, 1, 0x8dcebd, .65);
    scene.tweens.add({ targets: scan, y: t.y - 1, duration: 1300, delay: i * 220, repeatDelay: 2900, repeat: -1 });
  }
  const panelY = map.spawn.y - 24;
  scene.add.image(mid, panelY, 'archive-glass').setDisplaySize(64, 64);
  scene.add.text(mid, panelY + 26, 'HUMAN · 중앙 기록보존소', {
    fontFamily: 'sans-serif', fontSize: 5, color: '#a4b5b9', resolution: 4,
    shadow: { offsetY: -0.5, color: '#161c1e', fill: true },
  }).setOrigin(.5);
  // Walkable grate behind the actors; only the foreground jambs occlude their feet.
  const doorX = map.entry.x;
  const doorTop = map.height - 34;
  const gate = scene.add.image(doorX, doorTop, 'service-door').setOrigin(.5, 0).setDisplaySize(gateWidth, 34);
  const { width, height } = gate.frame;
  const pocket = Math.round(width * .27);
  for (const left of [0, width - pocket]) {
    scene.add.image(doorX, doorTop, 'service-door').setOrigin(.5, 0).setDisplaySize(gateWidth, 34)
      .setCrop(left, 0, pocket, height).setDepth(12);
  }
  scene.add.text(doorX + 44, doorTop + 20, '남측 정비구', {
    fontFamily: 'sans-serif', fontSize: 3.4, resolution: 4, color: '#bac6c7',
  }).setOrigin(.5).setDepth(13);
  solids.forEach(solid);
}
// Barricades and broken terminals of the room on screen. Returns the created labels;
// `onBarricade` receives each barricaded door rectangle.
export function drawSabotages(scene, graphics, list, onBarricade = () => {}) {
  const labels = [];
  const r = (x, y, w, h, c, a = 1) => graphics.fillStyle(c, a).fillRect(x, y, w, h);
  for (const s of list) {
    if (s.kind === 'barricade') {
      const d = doorFor(s.era);
      r(d.x - 2, d.y, d.width + 4, d.height, 0x322919);
      for (let y = d.y; y < d.y + d.height; y += 12) { r(d.x - 2, y, d.width + 4, 6, 0xd7a344); r(d.x - 2, y + 6, d.width + 4, 6, 0x1b2328); }
      onBarricade(d);
      labels.push(scene.add.text(d.x + d.width / 2, d.y - 10, '🚧', { fontSize: '12px' }).setOrigin(.5).setDepth(6));
    } else if (s.kind === 'contam') {
      const t = terminalFor(s.era);
      r(t.x - 24, t.y - 17, 48, 19, 0x39294f);
      for (let x = -22; x < 22; x += 8) r(t.x + x, t.y - 15 + ((x / 8) % 2 ? 6 : 0), 5, 4, 0xbb98eb);
      labels.push(scene.add.text(t.x, t.y - 34, '🧪 오염', { fontSize: '10px', fontFamily: 'sans-serif', color: '#e5ccff', backgroundColor: '#211a31' }).setOrigin(.5).setDepth(6));
    } else if (s.kind === 'trap') {
      const t = terminalFor(s.era);
      labels.push(scene.add.text(t.x + 30, t.y + 6, '🪤', { fontSize: '13px' }).setOrigin(.5).setDepth(6));
    } else {
      const t = terminalFor(s.era);
      r(t.x - 24, t.y - 17, 48, 19, 0x49232b);
      r(t.x - 20, t.y - 15, 4, 15, 0xee7977); r(t.x - 6, t.y - 15, 3, 12, 0xee7977); r(t.x + 10, t.y - 13, 4, 11, 0xee7977);
      labels.push(scene.add.text(t.x, t.y - 34, '💥 고장', { fontSize: '10px', fontFamily: 'sans-serif', color: '#ffb3a8', backgroundColor: '#24191e' }).setOrigin(.5).setDepth(6));
    }
  }
  return labels;
}
