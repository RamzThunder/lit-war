// Records a live raid as positions and shocks, then cuts the part worth replaying on the TV.
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const ROLES = ['attacker', 'defender'];
const MIN_GAP_MS = 80, MAX_MOVES = 600, CLIP_MS = 9000, AFTER_SHOCK_MS = 1800;

export const newTrack = ({ attacker, defender, room, entry, now }) => ({
  attacker, defender, room, entry, start: now, moves: [], shocks: [], last: { attacker: -Infinity, defender: -Infinity },
});
export function recordMove(track, role, now, { x, y, direction, moving }) {
  const t = now - track.start;
  if (t - track.last[role] < MIN_GAP_MS || track.moves.length >= MAX_MOVES) return;
  track.last[role] = t;
  track.moves.push([t, ROLES.indexOf(role), Math.round(x), Math.round(y), DIRECTIONS.indexOf(direction), moving ? 1 : 0]);
}
export function recordShock(track, now, stolen, defender) {
  track.shocks.push({ t: now - track.start, stolen, x: Math.round(defender.x), y: Math.round(defender.y) });
}
const pose = move => ({ x: move[2], y: move[3], direction: DIRECTIONS[move[4]], moving: Boolean(move[5]) });

// Keeps up to 9 seconds ending just after the last shock, or at the end of a clean escape.
export function clipTrack(track, endedAt, weight) {
  const duration = endedAt - track.start;
  const lastShock = track.shocks.at(-1);
  const end = lastShock ? Math.min(duration, lastShock.t + AFTER_SHOCK_MS) : duration;
  const start = Math.max(0, end - CLIP_MS);
  const before = role => track.moves.filter(m => m[1] === role && m[0] <= start).at(-1);
  const opening = role => { const move = before(role); return move ? pose(move) : role === 0 ? { ...track.entry, direction: 'up', moving: false } : null; };
  return {
    weight,
    kind: lastShock ? 'shock' : 'escape',
    durationMs: end - start,
    room: track.room,
    attacker: { ...track.attacker, player: opening(0) },
    defender: { ...track.defender, player: opening(1) },
    moves: track.moves.filter(m => m[0] > start && m[0] <= end).map(([t, ...rest]) => [t - start, ...rest]),
    shocks: track.shocks.filter(s => s.t > start && s.t <= end).map(s => ({ ...s, t: s.t - start })),
    totalShocks: track.shocks.length,
    totalStolen: track.shocks.reduce((sum, s) => sum + s.stolen, 0),
  };
}
export const replayPose = move => ({ role: ROLES[move[1]], player: pose(move) });
