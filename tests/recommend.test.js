import test from 'node:test';
import assert from 'node:assert/strict';
import { eraTier, pickEra, reasonFor, Recommender } from '../src/prototype/recommend.js';
import { ERAS } from '../src/prototype/minigames/wiring.js';

const board = (overrides = {}, base = { blue: 30, red: 0 }) => Object.fromEntries(ERAS.map(era => [era, { ...(overrides[era] ?? base) }]));

test('tiers: flippable deficit, bigger deficit, tie, narrow lead, safe lead', () => {
  assert.equal(eraTier({ blue: 20, red: 25 }, 'blue'), 1);
  assert.equal(eraTier({ blue: 20, red: 30 }, 'blue'), 1);
  assert.equal(eraTier({ blue: 0, red: 40 }, 'blue'), 2);
  assert.equal(eraTier({ blue: 0, red: 0 }, 'blue'), 3);
  assert.equal(eraTier({ blue: 15, red: 10 }, 'blue'), 4);
  assert.equal(eraTier({ blue: 40, red: 10 }, 'blue'), 5);
  assert.equal(eraTier({ blue: 20, red: 25 }, 'red'), 4);
});

test('pickEra prefers the flippable era over a larger deficit, random within the tier', () => {
  const scores = board({ 1920: { blue: 0, red: 50 }, 1950: { blue: 20, red: 25 }, 1970: { blue: 10, red: 15 } });
  assert.equal(pickEra(scores, 'blue', new Set(), () => 0), '1950');
  assert.equal(pickEra(scores, 'blue', new Set(), () => .99), '1970');
  assert.equal(pickEra(scores, 'blue', new Set(['1950', '1970']), () => 0), '1920');
  assert.equal(pickEra(board(), 'blue', new Set(ERAS)), null);
});

test('reason text explains the gap', () => {
  assert.equal(reasonFor({ blue: 20, red: 25 }, 'blue'), '5점 차로 밀려요 · 한 판이면 역전');
  assert.equal(reasonFor({ blue: 20, red: 30 }, 'blue'), '10점 차로 밀려요 · 한 판이면 동점');
  assert.equal(reasonFor({ blue: 0, red: 0 }, 'red'), '아직 아무도 점령하지 않았어요');
});

test('Recommender keeps its pick until finished, blocked or already won back', () => {
  const scores = board({ 1950: { blue: 20, red: 25 }, 1970: { blue: 10, red: 15 } });
  const state = { online: true, connected: true, room: 'R', name: 'n', me: { team: 'blue', missions: 0 }, scores, raid: null, lesson: { phase: 'playing' }, sabotages: [], roomSabotages() { return this.sabotages; } };
  const rec = new Recommender(() => 0);
  assert.equal(rec.update(state).era, '1950');
  // A teammate's score changes the ranking, but a losing pick stays put.
  scores[1920] = { blue: 0, red: 5 };
  rec.random = () => .99;
  assert.equal(rec.update(state).era, '1950');
  // Broken terminal: pick again.
  state.sabotages = [{ kind: 'broken', era: '1950' }];
  assert.equal(rec.update(state).era, '1970');
  state.sabotages = [];
  // Won back by someone else while better options exist: move on.
  scores[1970] = { blue: 40, red: 15 };
  assert.equal(rec.update(state).era, '1950');
  // Finishing a mission picks again even if the era is still losing.
  scores[1950] = { blue: 0, red: 30 };
  state.me.missions = 1;
  assert.equal(rec.update(state).era, '1920');
  // Hidden during a raid or before the teacher starts.
  assert.equal(rec.update({ ...state, raid: {} }), null);
  assert.equal(rec.update({ ...state, lesson: { phase: 'lobby' } }), null);
});
