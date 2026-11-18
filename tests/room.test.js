import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomEngine, RULES } from '../server/RoomEngine.js';
import { map, terminalFor, doorFor, validPosition, isNearTerminal } from '../src/prototype/map.js';
import { wiringRecords } from '../src/prototype/minigames/wiring.js';
import { repairAnswer } from '../src/prototype/minigames/repair.js';
import { createMissionRound } from '../src/prototype/minigames/missionTypes.js';
import { GameState } from '../src/prototype/state/GameState.js';
import { createExtraRound, extraTarget, COOKING } from '../src/prototype/minigames/extraMissions.js';
import { frequencyRecords } from '../src/prototype/minigames/frequency.js';
const near = era => { const t=terminalFor(era); return [-58,50].map(dy=>({x:t.x,y:t.y+dy})).find(p=>validPosition(p.x,p.y)&&isNearTerminal(p,t)); };
const data = (out, type, to) => out.find(o => o.data.type === type && (to === undefined || o.to === to))?.data;
function mission(room, id, era = '1920', now = 1000) {
  room.command(id, { type: 'open', era, ...near(era) }, now);
  let out = [];
  for (const r of wiringRecords[era]) out = room.command(id, { type: 'connect', author: r.id, work: r.id }, now);
  room.command(id, { type: 'close' }, now);
  return out;
}
const setup = () => {
  const room = new RoomEngine({}, () => .92);
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
  assert.deepEqual({ s: room.me('a').sabotageRights, r: room.me('a').raidRights }, { s: 2, r: 1 });
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
test('server judges filter and chronology without accepting a direct score command', () => {
  const room = setup();
  const player = room.sessions.get('a');
  for (const type of ['filter', 'chronology']) {
    player.game = new GameState({ terminalOpen: true, terminal: '1930', round: createMissionRound('1930', type, () => .4) });
    const round = player.game.snapshot.round;
    if (type === 'filter') {
      for (const id of round.order) room.command('a', { type: 'classify', id, era: wiringRecords['1930'].some(r => r.id === id) ? 'current' : 'other' });
    } else {
      const order = [...round.order].sort((a, b) => {
        const left = wiringRecords['1930'].find(r => r.id === a), right = wiringRecords['1930'].find(r => r.id === b);
        return left.year - right.year || left.title.localeCompare(right.title, 'ko');
      });
      for (const id of order) room.command('a', { type: 'shelve', id });
    }
  }
  assert.equal(room.scores['1930'].blue, 20);
  assert.deepEqual(room.command('a', { type: 'score', amount: 999 }), []);
  assert.equal(room.scores['1930'].blue, 20);
});
test('server judges every additional mission before awarding points', () => {
  const room = setup();
  const player = room.sessions.get('a');
  for (const type of ['engine', 'upload', 'truth', 'mail', 'cooking', 'fishing', 'puzzle']) {
    player.game = new GameState({ terminalOpen: true, terminal: '1930', round: createExtraRound('1930', type, () => .3) });
    let round = player.game.snapshot.round;
    const total = type === 'truth' ? round.claims.length : type === 'mail' ? round.order.length : type === 'cooking' ? COOKING.steps.length : type === 'puzzle' ? round.pieces.length : 3;
    for (let i = 0; i < total; i++) {
      const value = type === 'fishing' ? frequencyRecords['1930'][i].word : extraTarget(round);
      const out = room.command('a', { type: 'extra', value });
      round = data(out, 'state').state.round;
      assert.equal(data(out, 'state').result, i === total - 1 ? 'complete' : 'correct');
    }
  }
  assert.equal(room.scores['1930'].blue, 70);
  assert.deepEqual(room.command('a', { type: 'score', amount: 9999 }), []);
  assert.equal(room.scores['1930'].blue, 70);
});
test('team sabotage types, caps and broken terminal repair', () => {
  const room = setup();
  const red = room.sessions.get('b'); red.profile.sabotageRights = 2;
  const target = data(room.command('b', { type: 'sabotage-start' }, 10), 'sabotage-target');
  assert.equal(target.kind, 'broken'); assert.equal(target.max, 1);
  const victim = [...room.sessions.values()].find(x => x.name === target.name);
  room.command(victim.id, { type: 'open', era: '1940', ...near('1940') }, 10);
  assert.ok(data(room.command('b', { type: 'sabotage', kind: 'barricade', era: '1940' }, 11), 'error'));
  const out = room.command('b', { type: 'sabotage', kind: 'broken', era: '1940' }, 20);
  assert.equal(data(out, 'sabotaged', victim.id).state.terminalOpen, false);
  assert.ok(data(room.command(victim.id, { type: 'open', era: '1940', ...near('1940') }, 40), 'error'));
  assert.ok(data(room.command(victim.id, { type: 'repair', kind: 'broken', era: '1940', ...map.spawn }, 40), 'error'));
  const opened = data(room.command(victim.id, { type: 'repair', kind: 'broken', era: '1940', ...near('1940') }, 40), 'state').state.round;
  let last;
  for (const id of repairAnswer(opened)) last = room.command(victim.id, { type: 'pick', id }, 41);
  assert.equal(data(last, 'state').result, 'repaired');
  assert.equal(room.state(victim.id, 50).sabotages.length, 0);
  const blue = room.sessions.get('a'); blue.profile.sabotageRights = 4;
  for (const era of ['1910','1920','1930']) {
    const pick = data(room.command('a', { type: 'sabotage-start' }, 60), 'sabotage-target');
    assert.equal(pick.kind, 'barricade'); assert.equal(pick.max, 3);
    assert.ok(data(room.command('a', { type: 'sabotage', kind: 'barricade', era }, 61), 'sabotage-done'));
  }
  assert.equal(RULES.barricadeMs, 120000);
  assert.ok(doorFor('1920'));
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
  room.command(defenderId, { type: 'move', x: 480, y: map.entry.y - 44, direction: 'down', moving: false }, 1100);
  assert.equal(data(room.command('a', { type: 'shock' }, 1100), 'shock-miss').reason.includes('가까이'), true);
  const step = room.command('a', { type: 'move', x: 480, y: map.entry.y - 24, direction: 'up', moving: true }, 1300);
  assert.equal(step[0].to, defenderId, 'move relayed to the defender only');
  assert.equal(data(room.command('a', { type: 'move', x: 480, y: 100, direction: 'up', moving: true }, 1350), 'correction').player.y, map.entry.y - 24);
  const shock = room.command('a', { type: 'shock' }, 1400);
  assert.equal(data(shock, 'shock', defenderId).shocks, 1);
  assert.equal(data(shock, 'shock', defenderId).stolen, 5);
  assert.ok(data(room.command(defenderId, { type: 'move', x: 480, y: map.entry.y - 64, direction: 'up', moving: true }, 1500), 'correction'), 'stunned');
  assert.equal(data(room.command('a', { type: 'shock' }, 2500), 'shock-miss').reason.includes('감전되지'), true, 'invulnerable right after stun');
  assert.equal(data(room.command('a', { type: 'shock' }, 4000), 'shock', 'a').shocks, 2);
  const blue = room.scores['1950'][a.profile.team]; assert.equal(blue, 10);
  assert.deepEqual(room.tick(15999), []);
  const end = room.tick(16000);
  assert.equal(data(end, 'raid-end', 'a').shocks, 2); assert.equal(data(end, 'raid-end', defenderId).stolen, 10);
  assert.deepEqual(room.command('a', { type: 'move', x: 480, y: map.entry.y - 44, direction: 'up', moving: true }, 16100), []);
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
test('teacher claims room: lobby blocks missions, start/pause/resume/end timer, wrong key rejected', () => {
  const room = new RoomEngine({}, () => .92);
  room.join('a', 'A', 'ta', 0);
  assert.equal(room.welcome('a', 0).lesson.phase, 'free');
  assert.equal(room.command('a', { type: 'open', era: '1920', ...near('1920') }, 0)[0].data.type, 'state', 'free room plays without a teacher');
  room.command('a', { type: 'close' }, 0);
  const welcome = room.joinTeacher('t', 'hash', 0);
  assert.equal(welcome.lesson.phase, 'lobby');
  assert.equal(welcome.roster[0].name, 'A');
  assert.throws(() => room.joinTeacher('t2', 'other', 0));
  assert.doesNotThrow(() => room.joinTeacher('t3', 'hash', 0));
  assert.equal(data(room.command('a', { type: 'open', era: '1920', ...near('1920') }, 10), 'error').message, '선생님이 게임을 시작하면 할 수 있어요.');
  assert.equal(data(room.command('a', { type: 'start' }, 10), 'error').message, '선생님이 게임을 시작하면 할 수 있어요.', 'students cannot send teacher commands');
  assert.equal(data(room.command('t', { type: 'start', minutes: 0 }, 10), 'error').message, '시간은 1~90분 사이로 정하세요.');
  const start = room.command('t', { type: 'start', minutes: 5 }, 1000);
  assert.deepEqual(data(start, 'lesson', '*').lesson, { phase: 'playing', durationMs: 300000, left: 300000, event: null });
  assert.equal(room.nextDeadline(), 151000, 'auto alert at half of a short lesson');
  room.command('a', { type: 'open', era: '1920', ...near('1920') }, 2000);
  const paused = room.command('t', { type: 'pause' }, 61000);
  assert.equal(data(paused, 'lesson', '*').lesson.left, 240000);
  assert.equal(data(paused, 'state', 'a').state.terminalOpen, false, 'pause closes open terminals');
  assert.equal(room.nextDeadline(), Infinity);
  assert.equal(data(room.command('t', { type: 'resume' }, 100000), 'lesson', '*').lesson.left, 240000);
  assert.equal(room.tick(339999).filter(o => o.data.type === 'lesson' && o.data.lesson.phase === 'ended').length, 0);
  assert.equal(room.tick(340000).filter(o => o.data.type === 'lesson').at(-1).data.lesson.phase, 'ended', 'timer ends the lesson (and any running alert)');
  assert.equal(room.lesson.event, null);
  assert.ok(data(room.command('a', { type: 'open', era: '1920', ...near('1920') }, 340001), 'error'));
  assert.equal(room.takeDirty().lesson.phase, 'ended');
  assert.equal(room.remove('t3').length, 0);
  assert.equal(room.teachers.size, 1);
});
test('teacher reset zeroes scores and rights, kick closes a student, feed reports rights', () => {
  const room = setup();
  room.joinTeacher('t', 'hash', 0); room.command('t', { type: 'start', minutes: 30 }, 0);
  let feed = [];
  for (let i = 0; i < 5; i++) feed.push(...mission(room, 'a', '1920', 1000));
  assert.equal(room.scores['1920'][room.profiles.get('ta').team], 50);
  assert.ok(feed.some(o => o.to === 't' && o.data.type === 'feed' && o.data.item.text.includes('방해 권한')));
  assert.equal(room.roster().find(p => p.name === 'A').missions, 5);
  room.command('t', { type: 'end' }, 2000);
  const reset = room.command('t', { type: 'reset' }, 3000);
  assert.equal(data(reset, 'lesson', '*').lesson.phase, 'lobby');
  assert.equal(room.scores['1920'].blue + room.scores['1920'].red, 0);
  assert.equal(room.me('a').missions, 0); assert.equal(room.me('a').sabotageRights, 0);
  const kick = room.command('t', { type: 'kick', name: 'B' }, 3000);
  assert.equal(kick[0].to, 'b'); assert.equal(kick[0].close, 4004); assert.equal(kick[0].data.fatal, true);
  assert.ok(data(room.command('t', { type: 'kick', name: '없음' }, 3000), 'error'));
});
test('teachers spectate live raids: start snapshot, moves, shocks, end, and mid-raid welcome', () => {
  const room = setup();
  room.joinTeacher('t', 'hash', 0); room.command('t', { type: 'start', minutes: 30 }, 0);
  for (let i = 0; i < 10; i++) mission(room, 'a', '1920', 1000);
  const start = room.command('a', { type: 'raid' }, 2000);
  const watch = data(start, 'watch-start', 't').raid;
  assert.equal(watch.attacker.name, 'A'); assert.equal(watch.left, RULES.raidMs);
  assert.deepEqual({ x: watch.attacker.player.x, y: watch.attacker.player.y }, map.entry);
  const defender = start.find(o => o.data.role === 'defender').to;
  const move = room.command(defender, { type: 'move', x: 480, y: map.entry.y - 30, direction: 'down', moving: false }, 2100);
  assert.equal(data(move, 'watch-move', 't').role, 'defender');
  assert.equal(room.teacherWelcome(2200).raids[0].defender.player.y, map.entry.y - 30, 'a teacher joining mid-raid sees positions');
  const shock = room.command('a', { type: 'shock' }, 2600);
  assert.equal(data(shock, 'watch-shock', 't').shocks, 1);
  const end = room.tick(2000 + RULES.raidMs);
  assert.equal(data(end, 'watch-end', 't').shocks, 1);
  assert.equal(room.teacherWelcome(20000).raids.length, 0);
});
test('guardian trap: breaking the decoy fails and triggers a counter raid, or auto-steal when the owner is away', () => {
  const room = setup();
  assert.equal(room.profiles.get('ta').team, 'blue'); assert.equal(room.profiles.get('tb').team, 'red');
  assert.equal(data(room.command('b', { type: 'trap', era: '1930' }, 0), 'error').message, '함정은 보존관만 설치할 수 있어요.');
  assert.equal(data(room.command('a', { type: 'trap', era: '1930' }, 0), 'me').me.trap, '1930');
  for (let i = 0; i < 5; i++) mission(room, 'b', '1920', 1000);
  room.command('b', { type: 'sabotage-start' }, 1000); room.sessions.get('b').pending = 'ta';
  const sprung = room.command('b', { type: 'sabotage', kind: 'broken', era: '1930' }, 1000);
  assert.equal(data(sprung, 'sabotage-done', 'b').trapped, true);
  assert.equal(data(sprung, 'trap-sprung', 'a').by, 'B');
  const counter = data(sprung, 'raid', 'a');
  assert.equal(counter.role, 'attacker'); assert.equal(counter.counter, true); assert.equal(counter.opponent.name, 'B');
  assert.equal(room.me('b').sabotageRights, 0); assert.equal(room.me('a').trap, null);
  assert.equal(room.sessions.get('a').game.hasSabotage('broken', '1930', 1000), false, 'the decoy is not broken');
  room.tick(1000 + RULES.raidMs);
  // Owner away: points are taken automatically.
  room.profiles.get('tc').trap = '1940'; room.remove('c');
  for (let i = 0; i < 5; i++) mission(room, 'b', '1920', 20000);
  room.command('b', { type: 'sabotage-start' }, 20000); room.sessions.get('b').pending = 'tc';
  const before = room.scores['1920'].red;
  const away = room.command('b', { type: 'sabotage', kind: 'broken', era: '1940' }, 20000);
  assert.equal(data(away, 'trap-penalty', 'b').stolen, RULES.trapSteal);
  assert.equal(room.scores['1920'].red, before - RULES.trapSteal);
});
test('contamination alert: luddite bait (one try) lands in a guardian room, guardian cleanses once for double points', () => {
  const room = setup();
  room.joinTeacher('t', 'hash', 0); room.command('t', { type: 'start', minutes: 30 }, 0);
  assert.equal(data(room.command('t', { type: 'event' }, 1000), 'lesson', '*').lesson.event.left, RULES.eventMs);
  const done = mission(room, 'b', '1920', 2000);
  const offer = data(done, 'bait-offer', 'b').offer;
  assert.equal(offer.options.length, 4);
  const { truth } = room.sessions.get('b').bait;
  const wrong = offer.options.find(v => v !== truth);
  const red = room.scores['1920'].red;
  const planted = room.command('b', { type: 'bait', value: wrong }, 2000);
  assert.equal(data(planted, 'bait-result', 'b').ok, true);
  assert.equal(room.scores['1920'].red, red + RULES.baitPoints);
  const victimId = planted.find(o => o.data.type === 'contaminated').to;
  const contam = room.state(victimId, 2000).sabotages.find(x => x.kind === 'contam');
  assert.equal(contam.truth, undefined, 'the answer is not sent to clients');
  assert.ok(contam.options.includes(truth));
  assert.equal(room.teacherWelcome(2000).contam[0].status, 'planted');
  const blue = room.scores['1920'].blue;
  const fixed = room.command(victimId, { type: 'cleanse', id: contam.id, value: truth, ...near(contam.era) }, 3000);
  assert.equal(data(fixed, 'cleanse-result', victimId).correct, true);
  assert.equal(room.scores['1920'].blue, blue + RULES.cleansePoints);
  assert.equal(room.state(victimId, 3000).sabotages.some(x => x.kind === 'contam'), false);
  // Picking the true value wastes the bait.
  const again = mission(room, 'b', '1920', 4000);
  assert.ok(data(again, 'bait-offer', 'b'));
  const failed = room.command('b', { type: 'bait', value: room.sessions.get('b').bait.truth }, 4000);
  assert.equal(data(failed, 'bait-result', 'b').ok, false);
  assert.equal(room.sessions.get('b').bait, null);
  // The alert ends by itself after a minute; no more offers.
  assert.equal(room.tick(1000 + RULES.eventMs).filter(o => o.data.type === 'lesson').at(-1).data.lesson.event, null);
  assert.equal(data(mission(room, 'b', '1920', 70000), 'bait-offer', 'b'), undefined);
});
