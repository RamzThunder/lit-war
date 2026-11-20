import test from 'node:test';
import assert from 'node:assert/strict';
import { eraOwner, isClose, teamTotal, heldCount, CLOSE_GAP } from '../src/shared/eras.js';
test('era ownership and close-match marker (display only)', () => {
  assert.equal(eraOwner({ blue: 0, red: 0 }), 'empty');
  assert.equal(eraOwner({ blue: 30, red: 30 }), 'tie');
  assert.equal(eraOwner({ blue: 40, red: 30 }), 'blue');
  assert.equal(eraOwner({ blue: 10, red: 50 }), 'red');
  assert.equal(CLOSE_GAP, 10);
  assert.equal(isClose({ blue: 60, red: 52 }), true, 'one mission apart');
  assert.equal(isClose({ blue: 60, red: 50 }), true, 'exactly 10 points');
  assert.equal(isClose({ blue: 61, red: 50 }), false);
  assert.equal(isClose({ blue: 35, red: 35 }), false, 'a tie is shown as 동점, not 접전');
  const scores = { 1910: { blue: 40, red: 20 }, 1920: { blue: 0, red: 0 }, 1930: { blue: 30, red: 60 } };
  assert.equal(teamTotal(scores, ['1910', '1920', '1930'], 'blue'), 70);
  assert.equal(heldCount(scores, ['1910', '1920', '1930'], 'red'), 1);
});
