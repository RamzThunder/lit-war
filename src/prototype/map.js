// World units are pixels. Visuals, client physics and server validation share these definitions.
// Every student owns a copy of this room: a central hall and four era rooms, each with one
// terminal and one doorway (the doorway is where a barricade can be placed).
import { ERAS } from './minigames/wiring.js';
export { ERAS };
const T = { width: 64, height: 36, range: 72 };
const wall = (x, y, width, height) => ({ x, y, width, height });
export const map = {
  width: 960, height: 640,
  spawn: { x: 480, y: 360 },
  entry: { x: 480, y: 584 },
  terminals: [
    { era: '1920', x: 162, y: 140, ...T },
    { era: '1930', x: 798, y: 140, ...T },
    { era: '1940', x: 162, y: 530, ...T },
    { era: '1950', x: 798, y: 530, ...T },
  ],
  doors: [
    { era: '1920', ...wall(300, 160, 24, 60) },
    { era: '1930', ...wall(636, 160, 24, 60) },
    { era: '1940', ...wall(300, 440, 24, 60) },
    { era: '1950', ...wall(636, 440, 24, 60) },
  ],
  walls: [
    wall(0, 0, 960, 64), wall(0, 616, 960, 24), wall(0, 0, 24, 640), wall(936, 0, 24, 640),
    // Hall dividers with a doorway gap per era room.
    ...[300, 636].flatMap(x => [wall(x, 64, 24, 96), wall(x, 220, 24, 220), wall(x, 500, 24, 116)]),
    wall(24, 300, 276, 24), wall(660, 300, 276, 24),
  ],
  racks: [wall(400, 92, 56, 112), wall(504, 92, 56, 112)],
  crates: [wall(340, 566, 48, 36), wall(584, 570, 36, 32), wall(40, 572, 40, 32), wall(880, 80, 40, 36)],
};
export const DOOR_RANGE = 52;
export const terminalFor = era => map.terminals.find(t => t.era === era);
export const doorFor = era => map.doors.find(d => d.era === era);
export const terminalSolid = t => ({ x: t.x - 32, y: t.y - 18, width: t.width, height: t.height });
export const solids = [...map.walls, ...map.racks, ...map.crates, ...map.terminals.map(terminalSolid)];
export function movementVector(left, right, up, down, speed = 130) {
  const x = Number(right) - Number(left), y = Number(down) - Number(up);
  const length = Math.hypot(x, y) || 1;
  return { x: x / length * speed, y: y / length * speed };
}
export function isNearTerminal(player, terminal) {
  return Boolean(terminal) && Math.hypot(player.x - terminal.x, player.y - terminal.y) <= terminal.range;
}
export function nearestTerminal(player) {
  return map.terminals.find(t => isNearTerminal(player, t)) ?? null;
}
export function isNearDoor(player, door) {
  return Boolean(door) && Math.hypot(player.x - (door.x + door.width / 2), player.y - (door.y + door.height / 2)) <= DOOR_RANGE;
}
// Foot rectangle matches the Phaser body: sprite origin is its centre.
export function footBox(x, y) { return { x: x - 7, y: y + 5, w: 14, h: 11 }; }
export function validPosition(x, y, extra = []) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const body = footBox(x, y);
  return x >= 31 && x <= 929 && y >= 59 && y <= 600 && ![...solids, ...extra].some(b => body.x < b.x + b.width && body.x + body.w > b.x && body.y < b.y + b.height && body.y + body.h > b.y);
}
