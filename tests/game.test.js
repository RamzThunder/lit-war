import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/prototype/state/GameState.js';
import { map, ERAS, movementVector, nearestTerminal, terminalFor, doorFor, validPosition, isNearDoor } from '../src/prototype/map.js';
import { wiringRecords, allRecords } from '../src/prototype/minigames/wiring.js';
import { frequencyRecords } from '../src/prototype/minigames/frequency.js';
import { createRepairRound, repairAnswer } from '../src/prototype/minigames/repair.js';
const ids = era => wiringRecords[era].map(r => r.id);
const solve = (state, era) => ids(era).forEach(id => state.connect(id, id));
// Flood fill on a 4px grid over valid foot positions.
function reachable(from, extra = []) {
  const step = 4, seen = new Set(), queue = [[from.x, from.y]], out = [];
  while (queue.length) {
    const [x, y] = queue.pop(); const key = `${x},${y}`;
    if (seen.has(key) || !validPosition(x, y, extra)) continue;
    seen.add(key); out.push({ x, y });
    queue.push([x + step, y], [x - step, y], [x, y + step], [x, y - step]);
  }
  return out;
}
test('every era has three wiring pairs and three frequency keywords; ids are unique', () => {
  for (const era of ERAS) { assert.equal(wiringRecords[era].length, 3); assert.equal(frequencyRecords[era].length, 3); }
  assert.equal(new Set(allRecords.map(r => r.id)).size, allRecords.length);
});
test('wiring uses the terminal era, requires three correct pairs and awards once', () => {
  const state = new GameState();
  assert.equal(state.connect('kim', 'kim'), 'ignored');
  assert.equal(state.openTerminal('1999'), false);
  state.openTerminal('1920');
  assert.equal(state.connect('kim', 'kim'), 'ignored', 'records from another era are rejected');
  assert.equal(state.connect('sowol', 'hyeon'), 'incorrect');
  assert.equal(state.connect('sowol', 'sowol'), 'correct');
  assert.equal(state.connect('sowol', 'sowol'), 'ignored');
  state.connect('hyeon', 'hyeon');
  assert.equal(state.connect('manhae', 'manhae'), 'complete');
  assert.equal(state.snapshot.missions, 1); assert.equal(state.snapshot.progress['1920'], 10);
  solve(state, '1920'); assert.equal(state.snapshot.missions, 1);
  state.nextRound(); solve(state, '1920'); assert.equal(state.snapshot.missions, 2);
});
test('closing cancels unfinished work; snapshots cannot inject answers', () => {
  const state = new GameState(); state.openTerminal('1930'); state.connect('kim', 'kim');
  state.nextRound(); assert.deepEqual(state.snapshot.round.matched, ['kim']);
  state.snapshot.round.matched.push('lee', 'yi');
  state.closeTerminal(); assert.equal(state.snapshot.round, null);
  state.openTerminal('1930'); assert.deepEqual(state.snapshot.round.matched, []);
  state.connect('yi', 'yi'); assert.equal(state.snapshot.missions, 0);
});
test('frequency requires three tuned signals per era and rewards once', () => {
  const state = new GameState(); state.openTerminal('1950'); state.chooseGame('frequency');
  assert.equal(state.lockFrequency(), 'incorrect');
  assert.equal(state.connect('son', 'son'), 'ignored');
  for (let stage = 0; stage < 3; stage++) {
    state.tune(state.snapshot.round.targets[stage] + 3);
    assert.equal(state.lockFrequency(), stage === 2 ? 'complete' : 'correct');
  }
  assert.equal(state.snapshot.progress['1950'], 10);
  assert.equal(state.lockFrequency(), 'ignored');
  state.tune(NaN); state.nextRound(); assert.equal(state.snapshot.round.stage, 0);
  state.tune(999); assert.equal(state.snapshot.round.value, 100);
});
test('broken terminals cannot be opened until the chronology repair is solved in order', () => {
  const state = new GameState(); const now = 1000;
  state.addSabotage({ kind: 'broken', era: '1940', by: 'X', until: null });
  assert.equal(state.openTerminal('1940', now), false);
  assert.equal(state.openRepair('broken', '1930', now), false);
  assert.equal(state.openRepair('broken', '1940', now), true);
  const round = state.snapshot.round; assert.equal(round.order.length, 4);
  const answer = repairAnswer(round);
  assert.equal(state.pickRepair(answer[0], now), 'correct');
  assert.equal(state.pickRepair(answer[2], now), 'incorrect');
  assert.deepEqual(state.snapshot.round.picked, []);
  answer.slice(0, 3).forEach(id => state.pickRepair(id, now));
  assert.equal(state.pickRepair(answer[3], now), 'repaired');
  assert.equal(state.snapshot.missions, 0, 'repairs are not missions');
  state.closeTerminal(); assert.equal(state.openTerminal('1940', now), true);
});
test('repair cards come from different eras so the order is unambiguous; barricades expire', () => {
  for (let i = 0; i < 50; i++) {
    const round = createRepairRound(i % 2 ? 'broken' : 'barricade', '1920');
    const years = repairAnswer(round).map(id => allRecords.find(r => r.id === id).era);
    assert.equal(new Set(years).size, round.order.length);
  }
  const state = new GameState(); state.addSabotage({ kind: 'barricade', era: '1920', until: 5000 });
  assert.equal(state.hasSabotage('barricade', '1920', 4999), true);
  assert.equal(state.hasSabotage('barricade', '1920', 5000), false);
  state.prune(6000); assert.equal(state.snapshot.sabotages.length, 0);
});
test('all eight directions have equal speed; opposing keys cancel', () => {
  for (const keys of [[0,1,0,0],[1,0,0,0],[0,0,1,0],[0,0,0,1],[1,0,1,0],[1,0,0,1],[0,1,1,0],[0,1,0,1]]) {
    const v = movementVector(...keys); assert.ok(Math.abs(Math.hypot(v.x, v.y) - 130) < 1e-9);
  }
  assert.deepEqual(movementVector(true,true,true,true), {x:0,y:0});
});
test('every terminal is reachable from spawn; a barricade seals only its own room', () => {
  assert.ok(validPosition(map.spawn.x, map.spawn.y)); assert.ok(validPosition(map.entry.x, map.entry.y));
  assert.equal(nearestTerminal(map.spawn), null);
  const open = reachable(map.spawn);
  for (const era of ERAS) {
    assert.ok(open.some(p => nearestTerminal(p)?.era === era), `${era} terminal reachable`);
    assert.ok(open.some(p => isNearDoor(p, doorFor(era))), `${era} door reachable for repair`);
    const sealed = reachable(map.spawn, [doorFor(era)]);
    assert.equal(sealed.some(p => nearestTerminal(p)?.era === era), false, `${era} sealed by its barricade`);
    for (const other of ERAS.filter(e => e !== era)) assert.ok(sealed.some(p => nearestTerminal(p)?.era === other));
    assert.ok(sealed.some(p => isNearDoor(p, doorFor(era))), 'barricade repairable from the hall');
  }
  assert.ok(terminalFor('1930'));
});
test('subscribers can detach and snapshots cannot mutate authority', () => {
  const state = new GameState(); let calls = 0;
  const off = state.subscribe(() => calls++); off(); state.openTerminal('1920');
  assert.equal(calls, 1); state.snapshot.missions = 99; assert.equal(state.snapshot.missions, 0);
});
