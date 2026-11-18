import { map, terminalSolid, doorFor, terminalFor } from '../map.js';
// Static archive art shared by the student scene and the teacher's raid spectator.
// `solid` receives each blocking rectangle (the student scene turns them into physics zones).
export function drawArchive(scene, solid = () => {}) {
  scene.add.tileSprite(0, 0, map.width, map.height, 'floor').setOrigin(0);
  const g = scene.add.graphics();
  const r = (x, y, w, h, c, a = 1) => g.fillStyle(c, a).fillRect(x, y, w, h);
  map.walls.forEach(w => { r(w.x, w.y, w.width, w.height, 0x101a25); r(w.x, w.y, w.width, 3, 0x2a3b48); solid(w); });
  r(24, 12, 912, 30, 0x263745); r(24, 45, 912, 4, 0x344c5b); r(24, 60, 912, 4, 0x080f18);
  for (let x = 48; x < 920; x += 112) { r(x, 22, 60, 4, 0x75c3c8); r(x, 26, 60, 20, 0x6ad4d3, .04); }
  // Hall floor guidance and doorway thresholds.
  for (let y = 240; y < map.height - 80; y += 278) r(344, y, 272, 2, 0x38505a);
  for (const d of map.doors) { r(d.x - 4, d.y - 4, d.width + 8, 4, 0x4d6b74); r(d.x - 4, d.y + d.height, d.width + 8, 4, 0x4d6b74); r(d.x, d.y, d.width, d.height, 0x1d2d38); }
  for (const o of map.racks) {
    r(o.x - 6, o.y + 10, o.width + 12, o.height + 4, 0x080f17, .65);
    r(o.x - 4, o.y - 4, o.width + 8, o.height + 8, 0x2a414d);
    r(o.x, o.y, o.width, o.height, 0x0e1722); r(o.x, o.y, o.width, 8, 0x3c5361);
    for (let row = 0; row < 5; row++) {
      const y = o.y + 14 + row * 18;
      r(o.x + 4, y, 48, 14, 0x22333f); r(o.x + 8, y + 3, 25, 2, 0x101b26); r(o.x + 8, y + 8, 25, 2, 0x14232e);
      r(o.x + 41, y + 4, 3, 3, row === 3 ? 0xc4a06a : 0x6ad5c6); r(o.x + 47, y + 4, 2, 3, 0x3f797b);
    }
    solid(o);
  }
  for (const o of map.crates) {
    r(o.x + 4, o.y + 5, o.width, o.height, 0x0b151e);
    r(o.x, o.y, o.width, o.height, 0x36414a); r(o.x + 3, o.y + 3, o.width - 6, o.height - 6, 0x26333c);
    r(o.x + 8, o.y, 4, o.height, 0x52616a); r(o.x + o.width - 12, o.y, 4, o.height, 0x52616a); solid(o);
  }
  const label = (x, y, text, size = 10, color = '#69838c') => scene.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size, color }).setOrigin(.5);
  for (const t of map.terminals) {
    r(t.x - 48, t.y - 38, 96, 88, 0x51d6c3, .035);
    r(t.x - 36, t.y - 26, 72, 52, 0x0a141e); r(t.x - 32, t.y - 24, 64, 38, 0x475e67);
    r(t.x - 27, t.y - 20, 54, 25, 0x112c36); r(t.x - 24, t.y - 17, 48, 19, 0x53bfaf);
    r(t.x - 20, t.y - 13, 30, 2, 0x173b40); r(t.x - 20, t.y - 8, 22, 2, 0x28615d);
    r(t.x - 32, t.y + 14, 64, 10, 0x283d48);
    for (let x = -24; x < 20; x += 6) r(t.x + x, t.y + 16, 4, 2, 0x819c9e);
    solid(terminalSolid(t));
    label(t.x, t.y - 54, `ARCHIVE / ${t.era}`, 14, '#8aa9ad');
    label(t.x, t.y - 38, `${t.era}년대 기록실`, 9, '#77c3b8');
  }
  label(480, 580, 'ARCHIVE HUB', 16, '#8aa9ad'); label(480, 598, 'LITERATURE DATA STORAGE', 8);
  label(480, 1130, 'SERVICE HATCH', 8, '#5d7680');
}
// Barricades and broken terminals of the room on screen. Returns the created labels;
// `onBarricade` receives each barricaded door rectangle.
export function drawSabotages(scene, graphics, list, onBarricade = () => {}) {
  const labels = [];
  const r = (x, y, w, h, c, a = 1) => graphics.fillStyle(c, a).fillRect(x, y, w, h);
  for (const s of list) {
    if (s.kind === 'barricade') {
      const d = doorFor(s.era);
      r(d.x - 2, d.y, d.width + 4, d.height, 0x3a2a12);
      for (let y = d.y; y < d.y + d.height; y += 12) { r(d.x - 2, y, d.width + 4, 6, 0xe0b23c); r(d.x - 2, y + 6, d.width + 4, 6, 0x24221d); }
      onBarricade(d);
      labels.push(scene.add.text(d.x + d.width / 2, d.y - 10, '🚧', { fontSize: '12px' }).setOrigin(.5).setDepth(6));
    } else if (s.kind === 'contam') {
      const t = terminalFor(s.era);
      r(t.x - 24, t.y - 17, 48, 19, 0x4a2a6a);
      for (let x = -22; x < 22; x += 8) r(t.x + x, t.y - 15 + ((x / 8) % 2 ? 6 : 0), 5, 4, 0xc79bff);
      labels.push(scene.add.text(t.x, t.y - 34, '🧪 오염', { fontSize: '10px', fontFamily: 'sans-serif', color: '#e5ccff', backgroundColor: '#2a1440' }).setOrigin(.5).setDepth(6));
    } else if (s.kind === 'trap') {
      const t = terminalFor(s.era);
      labels.push(scene.add.text(t.x + 30, t.y + 6, '🪤', { fontSize: '13px' }).setOrigin(.5).setDepth(6));
    } else {
      const t = terminalFor(s.era);
      r(t.x - 24, t.y - 17, 48, 19, 0x5b1f24);
      r(t.x - 20, t.y - 15, 4, 15, 0xff6b6b); r(t.x - 6, t.y - 15, 3, 12, 0xff6b6b); r(t.x + 10, t.y - 13, 4, 11, 0xff6b6b);
      labels.push(scene.add.text(t.x, t.y - 34, '💥 고장', { fontSize: '10px', fontFamily: 'sans-serif', color: '#ffb3a8', backgroundColor: '#2a1014' }).setOrigin(.5).setDepth(6));
    }
  }
  return labels;
}
