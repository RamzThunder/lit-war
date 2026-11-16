import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomEngine, RULES } from '../server/RoomEngine.js';
import { map, terminalFor, doorFor } from '../src/prototype/map.js';
import { wiringRecords } from '../src/prototype/minigames/wiring.js';
import { repairAnswer } from '../src/prototype/minigames/repair.js';
const near = era => ({ x: terminalFor(era).x, y: terminalFor(era).y < 300 ? terminalFor(era).y + 50 : terminalFor(era).y - 60 });
const data = (out, type, to) => out.find(o => o.data.type === type && (to === undefined || o.to === to))?.data;
function mission(room, id, era = '1920', now = 1000) {
  room.command(id, { type: 'open', era, ...near(era) }, now);
  let out = [];
  for (const r of wiringRecords[era]) out = room.command(id, { type: 'connect', author: r.id, work: r.id }, now);
  room.command(id, { type: 'close' }, now);
  return out;
}
const setup = () => {
  const room = new RoomEngine({}, () => 0);
  room.join('a', 'A', 'ta', 0); room.join('b', 'B', 'tb', 0); room.join('c', 'C', 'tc', 0); room.join('d', 'D', 'td', 0);
  return room;
};
test('capacity, duplicate names, alternating teams and profile reuse on rejoin', () => {
  const room = new RoomEngine();
  room.join('one', '학생1', 'token1', 0);
  assert.throws(() => room.join('two', '학생1', 'token2', 0));
  for (let i = 2; i <= 30; i++) room.join(String(i), `학생${i}`, `token${i}`, 0);
  assert.throws(() => room.join('31', '학생31', 'token31', 0));
  const teams = room.players().map(p => p.team);
  assert.equal(teams.filter(t => t === 'blue').length, 15);
  const team = room.me('one').team;
  room.remove('one'); room.join('again', '학생1', 'token1', 0);
  assert.equal(room.me('again').team, team, 'same token keeps its team');
});
test('missions award team points per era and rights at 5 (sabotage) and 10 (raid, upgraded)', () => {
  const room = setup();
  const team = room.me('a').team;
  let out;
  for (let i = 1; i <= 10; i++) {
    out = mission(room, 'a', i % 2 ? '1920' : '1950', 1000 + i);
    if (i === 5) assert.equal(data(out, 'right').right, 'sabotage');
    if (i === 10) assert.equal(data(out, 'right').right, 'raid');
  }
  assert.equal(room.scores['1920'][team], 50); assert.equal(room.scores['1950'][team], 50);
  assert.deepEqual({ s: room.me('a').sabotageRights, r: room.me('a').raidRights }, { s: 1, r: 1 });
  assert.ok(data(out, 'scores', '*'));
  const dirty = room.takeDirty(); assert.ok(dirty['p:ta'] && dirty.scores);
});
test('server checks the claimed position against the requested terminal', () => {
  const room = setup();
  assert.equal(data(room.command('a', { type: 'open', era: '1920', ...map.spawn }), 'error').message.includes('가까이'), true);
  assert.equal(data(room.command('a', { type: 'open', era: '1920', ...near('1950') }), 'error').message.includes('가까이'), true);
  assert.equal(data(room.command('a', { type: 'open', era: '1920', ...near('1920') }), 'state').state.terminal, '1920');
  assert.deepEqual(room.command('a', { type: 'move', x: 480, y: 360, direction: 'up', moving: true }), [], 'no position relay outside raids');
});
test('sabotage: random enemy target, max two per room, broken terminal blocks until repaired', () => {
  const room = setup();
  const s = room.sessions.get('a'); s.profile.sabotageRights = 3;
  const target = data(room.command('a', { type: 'sabotage-start' }, 10), 'sabotage-target');
  const victim = [...room.sessions.values()].find(x => x.name === target.name);
  assert.notEqual(victim.profile.team, s.profile.team);
  room.command(victim.id, { type: 'open', era: '1940', ...near('1940') }, 10);
  const out = room.command('a', { type: 'sabotage', kind: 'broken', era: '1940' }, 20);
  assert.equal(data(out, 'sabotaged', victim.id).state.terminalOpen, false, 'open terminal force-closed');
  assert.equal(data(room.command('a', { type: 'sabotage', kind: 'broken', era: '1940' }, 21), 'error').message.includes('먼저'), true, 'needs a new target pick');
  room.command('a', { type: 'sabotage-start' }, 22);
  assert.ok(data(room.command('a', { type: 'sabotage', kind: 'barricade', era: '1920' }, 23), 'sabotage-done'));
  assert.ok(data(room.command('a', { type: 'sabotage-start' }, 24), 'sabotage-target'), 'other enemy still has room');
  assert.equal(room.state(victim.id, 30).sabotages.length, 2);
  assert.equal(room.state(victim.id, 30).sabotages.find(x => x.kind === 'barricade').left, RULES.barricadeMs - 7);
  assert.ok(data(room.command(victim.id, { type: 'open', era: '1940', ...near('1940') }, 40), 'error'));
  assert.ok(data(room.command(victim.id, { type: 'repair', kind: 'broken', era: '1940', ...map.spawn }, 40), 'error'));
  const opened = data(room.command(victim.id, { type: 'repair', kind: 'broken', era: '1940', ...near('1940') }, 40), 'state').state.round;
  let last;
  for (const id of repairAnswer(opened)) last = room.command(victim.id, { type: 'pick', id }, 41);
  assert.equal(data(last, 'state').result, 'repaired');
  assert.equal(room.state(victim.id, 50).sabotages.length, 1);
  assert.equal(room.state(victim.id, 23 + RULES.barricadeMs).sabotages.length, 0, 'barricade expires');
  const door = doorFor('1920');
  assert.ok(door);
});
test('sabotage reaches offline enemies through their stored profile', () => {
  const room = setup();
  const s = room.sessions.get('a'); s.profile.sabotageRights = 1;
  for (const x of [...room.sessions.values()]) if (x.id !== 'a' && x.profile.team !== s.profile.team) room.remove(x.id);
  const target = data(room.command('a', { type: 'sabotage-start' }, 10), 'sabotage-target');
  assert.ok(data(room.command('a', { type: 'sabotage', kind: 'barricade', era: '1930' }, 11), 'sabotage-done'));
  const token = [...room.profiles.entries()].find(([, p]) => p.name === target.name)[0];
  assert.equal(room.profiles.get(token).game.sabotages.length, 1);
  room.join('back', target.name, token, 12);
  assert.equal(room.state('back', 12).sabotages[0].era, '1930');
});
test('live raid: positions relayed only between the pair, shock range/cooldown/stun/limit, steal, end', () => {
  const room = setup();
  const a = room.sessions.get('a'); a.profile.raidRights = 1;
  for (let i = 0; i < 3; i++) mission(room, [...room.sessions.values()].find(x => x.profile.team !== a.profile.team).id, '1950', 5);
  const out = room.command('a', { type: 'raid' }, 1000);
  const attack = data(out, 'raid', 'a'); assert.equal(attack.role, 'attacker');
  const defenderId = out.find(o => o.data.role === 'defender').to;
  assert.equal(room.me('a').raidRights, 0);
  assert.ok(data(room.command('a', { type: 'open', era: '1920', ...near('1920') }, 1001), 'error'), 'no terminals during raid');
  // Defender syncs its position with the first move; attacker walks up from the entry.
  room.command(defenderId, { type: 'move', x: 480, y: 540, direction: 'down', moving: false }, 1100);
  assert.equal(data(room.command('a', { type: 'shock' }, 1100), 'shock-miss').reason.includes('가까이'), true);
  const step = room.command('a', { type: 'move', x: 480, y: 560, direction: 'up', moving: true }, 1300);
  assert.equal(step[0].to, defenderId, 'move relayed to the defender only');
  assert.equal(data(room.command('a', { type: 'move', x: 480, y: 100, direction: 'up', moving: true }, 1350), 'correction').player.y, 560);
  const shock = room.command('a', { type: 'shock' }, 1400);
  assert.equal(data(shock, 'shock', defenderId).shocks, 1);
  assert.equal(data(shock, 'shock', defenderId).stolen, 5);
  assert.ok(data(room.command(defenderId, { type: 'move', x: 480, y: 520, direction: 'up', moving: true }, 1500), 'correction'), 'stunned');
  assert.equal(data(room.command('a', { type: 'shock' }, 2500), 'shock-miss').reason.includes('감전되지'), true, 'invulnerable right after stun');
  assert.equal(data(room.command('a', { type: 'shock' }, 4000), 'shock', 'a').shocks, 2);
  const blue = room.scores['1950'][a.profile.team]; assert.equal(blue, 10);
  assert.deepEqual(room.tick(15999), []);
  const end = room.tick(16000);
  assert.equal(data(end, 'raid-end', 'a').shocks, 2); assert.equal(data(end, 'raid-end', defenderId).stolen, 10);
  assert.deepEqual(room.command('a', { type: 'move', x: 480, y: 540, direction: 'up', moving: true }, 16100), []);
});
test('raid without a free target keeps the right; disconnect ends the raid for the partner', () => {
  const room = new RoomEngine({}, () => 0);
  room.join('a', 'A', 'ta', 0); room.sessions.get('a').profile.raidRights = 1;
  assert.ok(data(room.command('a', { type: 'raid' }, 10), 'error'));
  assert.equal(room.me('a').raidRights, 1);
  room.join('b', 'B', 'tb', 0);
  room.command('a', { type: 'raid' }, 20);
  assert.equal(data(room.remove('b', 30), 'raid-end', 'a').reason.includes('끊어'), true);
  assert.equal(room.raids.size, 0);
});
test('hibernation restore keeps open rounds and profiles', () => {
  const room = setup();
  room.command('a', { type: 'open', era: '1930', ...near('1930') }, 1);
  const stored = room.takeDirty();
  const profiles = Object.entries(stored).filter(([k]) => k.startsWith('p:')).map(([k, v]) => [k.slice(2), structuredClone(v)]);
  const restored = new RoomEngine({ scores: stored.scores, profiles });
  assert.equal(restored.restore(room.serialize('a')), true);
  assert.equal(restored.state('a').round.era, '1930');
  assert.equal(restored.me('a').team, room.me('a').team);
  assert.equal(restored.restore({ id: 'x', name: 'X', token: 'missing', game: {} }), false);
});
