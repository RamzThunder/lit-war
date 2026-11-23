import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/prototype/state/GameState.js';
import { map, ERAS, movementVector, nearestTerminal, terminalFor, doorFor, validPosition, isNearDoor } from '../src/prototype/map.js';
import { wiringRecords, allRecords, drawWorks, recordById, samePeriod } from '../src/prototype/minigames/wiring.js';
import { frequencyRecords } from '../src/prototype/minigames/frequency.js';
import { createMissionRound, MISSION_POOL } from '../src/prototype/minigames/missionTypes.js';
import { createExtraRound, extraTarget, COOKING } from '../src/prototype/minigames/extraMissions.js';
import { createRepairRound, repairAnswer } from '../src/prototype/minigames/repair.js';
const solve = state => state.snapshot.round.works.forEach(id => state.connect(id, id));
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
const mulberry = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
test('the worksheet bank can deal every era three distinct works and keywords', () => {
  for (const era of ERAS) {
    assert.ok(wiringRecords[era].length >= 4, era);
    assert.ok(frequencyRecords[era].length >= 6, era);
    assert.equal(COOKING[era].steps.length, 4);
    for (let seed = 0; seed < 40; seed++) {
      const random = mulberry(seed);
      for (const options of [{}, { dated: true }, { minTitle: 3 }]) {
        const works = drawWorks(era, random, options).map(recordById);
        assert.equal(works.length, 3, `${era} ${JSON.stringify(options)}`);
        assert.equal(new Set(works.map(r => r.author)).size, 3);
        if (options.dated) assert.equal(new Set(works.map(r => r.year)).size, 3);
      }
    }
  }
  assert.equal(new Set(allRecords.map(r => r.id)).size, allRecords.length);
  for (const record of allRecords) assert.ok(record.author && record.title && record.keyword, record.id);
  const words = ERAS.flatMap(era => frequencyRecords[era].map(r => r.word));
  assert.equal(new Set(words).size, words.length, 'a keyword must belong to one era');
});
test('1960 and 1970 count as one period, and decoys never come from it', () => {
  assert.ok(samePeriod('1960', '1970'));
  assert.ok(!samePeriod('1950', '1960'));
  for (let seed = 0; seed < 30; seed++) {
    const filter = createMissionRound('1970', 'filter', mulberry(seed), 0);
    for (const id of filter.order.filter(id => !filter.works.includes(id))) assert.ok(!samePeriod(recordById(id).era, '1970'), id);
    const shooter = createMissionRound('1960', 'shooter', mulberry(seed), 0);
    for (const word of shooter.wrong) assert.ok(!frequencyRecords[1960].concat(frequencyRecords[1970]).some(r => r.word === word), word);
  }
  const round = createExtraRound('1960', 'mail', () => .3);
  const id = round.order.find(item => round.works.includes(item));
  const state = new GameState({ terminalOpen: true, terminal: '1960', round: { ...round, order: [id, ...round.order.filter(item => item !== id)] } });
  assert.equal(state.submitExtra('1970'), 'correct');
});
test('random era missions include the five new types and reward once', () => {
  assert.ok(['memory', 'shooter', 'identity', 'filter', 'chronology'].every(type => MISSION_POOL.includes(type)));
  for (const era of ERAS) for (const type of ['memory', 'shooter', 'identity', 'filter', 'chronology']) {
    const round = createMissionRound(era, type, () => .4, 1000);
    const state = new GameState({ terminalOpen: true, terminal: era, round });
    if (type === 'memory') {
      assert.equal(state.recall(round.order[0], 1001), 'ignored');
      round.order.forEach(word => state.recall(word, 3500));
    } else if (type === 'shooter') {
      assert.equal(state.shoot(round.concepts[0].word), 'incorrect');
      round.wrong.forEach(word => state.shoot(word));
    } else if (type === 'identity') {
      assert.equal(state.verifyIdentity(round.order[0], round.order[0], false), 'ignored');
      round.order.forEach(id => state.verifyIdentity(id, id, true));
    } else if (type === 'filter') {
      round.order.forEach(id => state.classify(id, wiringRecords[era].some(r => r.id === id) ? 'current' : 'other'));
    } else {
      [...round.order].sort((a, b) => {
        const left = allRecords.find(r => r.id === a), right = allRecords.find(r => r.id === b);
        return left.year - right.year || left.title.localeCompare(right.title, 'ko');
      }).forEach(id => state.shelve(id));
    }
    assert.equal(state.snapshot.missions, 1, `${era} ${type}`);
    assert.equal(state.snapshot.progress[era], 10);
  }
});
test('seven additional mini games use era data and each award only once', () => {
  for (const era of ERAS) for (const type of ['engine', 'upload', 'truth', 'mail', 'fishing', 'puzzle', 'cooking']) {
    const round = createExtraRound(era, type, () => .3);
    const state = new GameState({ terminalOpen: true, terminal: era, round });
    const total = type === 'truth' ? round.claims.length : type === 'mail' ? round.order.length : type === 'cooking' ? COOKING[era].steps.length : type === 'puzzle' ? round.pieces.length : 3;
    for (let step = 0; step < total; step++) {
      const current = state.snapshot.round;
      const answer = type === 'fishing' ? current.concepts[step].word : extraTarget(current);
      assert.equal(state.submitExtra(answer), step === total - 1 ? 'complete' : 'correct', `${era} ${type} ${step}`);
    }
    assert.equal(state.snapshot.missions, 1);
    assert.equal(state.snapshot.progress[era], 10);
    assert.equal(state.submitExtra(extraTarget(round)), 'ignored');
  }
});
test('wiring uses the terminal era, requires three correct pairs and awards once', () => {
  const state = new GameState(undefined, () => .92);
  assert.equal(state.connect('dongbaek', 'dongbaek'), 'ignored');
  assert.equal(state.openTerminal('1999'), false);
  state.openTerminal('1920');
  const [first, second, third] = state.snapshot.round.works;
  assert.equal(state.connect('dongbaek', 'dongbaek'), 'ignored', 'records from another era are rejected');
  assert.equal(state.connect(first, second), 'incorrect');
  assert.equal(state.connect(first, first), 'correct');
  assert.equal(state.connect(first, first), 'ignored');
  state.connect(second, second);
  assert.equal(state.connect(third, third), 'complete');
  assert.equal(state.snapshot.missions, 1); assert.equal(state.snapshot.progress['1920'], 10);
  solve(state); assert.equal(state.snapshot.missions, 1);
  state.nextRound(); solve(state); assert.equal(state.snapshot.missions, 2);
});
test('closing cancels unfinished work; snapshots cannot inject answers', () => {
  const state = new GameState(undefined, () => .92); state.openTerminal('1930');
  const [first, second, third] = state.snapshot.round.works; state.connect(first, first);
  state.nextRound(); assert.deepEqual(state.snapshot.round.matched, [first]);
  state.snapshot.round.matched.push(second, third);
  state.closeTerminal(); assert.equal(state.snapshot.round, null);
  state.openTerminal('1930'); assert.deepEqual(state.snapshot.round.matched, []);
  state.connect(state.snapshot.round.works[0], state.snapshot.round.works[0]); assert.equal(state.snapshot.missions, 0);
});
test('frequency requires three tuned signals per era and rewards once', () => {
  const state = new GameState(undefined, () => .78); state.openTerminal('1950'); state.chooseGame('frequency');
  assert.equal(state.lockFrequency(), 'incorrect');
  assert.equal(state.connect('son', 'son'), 'ignored');
  for (let stage = 0; stage < 3; stage++) {
    state.tune(state.snapshot.round.targets[stage] + 3);
    assert.equal(state.lockFrequency(), stage === 2 ? 'complete' : 'correct');
  }
  assert.equal(state.snapshot.progress['1950'], 10);
  assert.equal(state.lockFrequency(), 'ignored');
  state.tune(NaN); state.nextRound(); state.chooseGame('frequency'); assert.equal(state.snapshot.round.stage, 0);
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
