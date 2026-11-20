// Real WebSocket integration against the local Wrangler runtime (no browser required).
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { wiringRecords } from '../src/prototype/minigames/wiring.js';
import { repairAnswer } from '../src/prototype/minigames/repair.js';
import { EXTRA_TYPES, extraTarget, COOKING } from '../src/prototype/minigames/extraMissions.js';
import { frequencyRecords } from '../src/prototype/minigames/frequency.js';
import { map, terminalFor, doorFor, validPosition, isNearTerminal } from '../src/prototype/map.js';
const base = process.env.TEST_WS_URL ?? 'ws://127.0.0.1:8787';
const room = `T${Date.now().toString(36).toUpperCase()}`;
const clients = [];
const near = era => { const t = terminalFor(era); return [-58, 50].map(dy => ({ x: t.x, y: t.y + dy })).find(p => validPosition(p.x, p.y) && isNearTerminal(p, t)); };
async function connect(name, code = room, token = crypto.randomUUID()) {
  const socket = new WebSocket(`${base}/api/rooms/${code}?name=${encodeURIComponent(name)}&token=${token}`);
  const messages = []; socket.addEventListener('message', e => messages.push(JSON.parse(e.data)));
  const client = { socket, messages, token, name, send: data => socket.send(JSON.stringify(data)), async wait(type, predicate = () => true, ms = 8000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const index = messages.findIndex(m => m.type === type && predicate(m)); if (index >= 0) return messages.splice(index, 1)[0]; await delay(15); }
    throw new Error(`Timeout: ${name} ${type}; received ${JSON.stringify(messages)}`);
  }};
  clients.push(client); return client;
}
async function mission(client, era) {
  client.send({ type: 'open', era, ...near(era) });
  let round = (await client.wait('state', m => m.state.terminal === era)).state.round;
  if (round.type === 'memory') {
    await delay(Math.max(0, round.revealUntil - Date.now()) + 30);
    for (const word of round.order) { client.send({ type: 'recall', word }); round = (await client.wait('state')).state.round; }
  } else if (round.type === 'shooter') {
    for (const word of round.wrong) { client.send({ type: 'shoot', word }); round = (await client.wait('state')).state.round; }
  } else if (round.type === 'identity') {
    for (const id of round.order) { client.send({ type: 'identify', author: id, work: id, swiped: true }); round = (await client.wait('state')).state.round; }
  } else if (round.type === 'filter') {
    for (const id of round.order) { client.send({ type: 'classify', id, era: wiringRecords[era].some(r => r.id === id) ? 'current' : 'other' }); round = (await client.wait('state')).state.round; }
  } else if (round.type === 'chronology') {
    const order = [...round.order].sort((a, b) => {
      const left = wiringRecords[era].find(r => r.id === a), right = wiringRecords[era].find(r => r.id === b);
      return left.year - right.year || left.title.localeCompare(right.title, 'ko');
    });
    for (const id of order) { client.send({ type: 'shelve', id }); round = (await client.wait('state')).state.round; }
  } else if (EXTRA_TYPES.includes(round.type)) {
    const total = round.type === 'mail' ? round.order.length : round.type === 'truth' ? round.claims.length : round.type === 'cooking' ? COOKING.steps.length : round.type === 'puzzle' ? round.pieces.length : 3;
    for (let step = 0; step < total; step++) {
      const value = round.type === 'fishing' ? frequencyRecords[era][step].word : extraTarget(round);
      client.send({ type: 'extra', value }); round = (await client.wait('state')).state.round;
    }
  } else if (round.type === 'frequency') {
    for (const target of round.targets) { client.send({ type: 'lock', value: target }); round = (await client.wait('state')).state.round; }
  } else for (const r of wiringRecords[era]) { client.send({ type: 'connect', author: r.id, work: r.id }); round = (await client.wait('state')).state.round; }
  assert.equal(round.complete, true);
  client.send({ type: 'close' }); await client.wait('state', m => !m.state.terminalOpen);
}
try {
  const a = await connect('학생A'); const wa = await a.wait('welcome');
  const b = await connect('학생B'); const wb = await b.wait('welcome');
  assert.notEqual(wa.me.team, wb.me.team, 'teams alternate');
  await a.wait('joined');
  const other = await connect('다른반', `${room}X`); assert.equal((await other.wait('welcome')).players.length, 1);
  // Solo roaming sends nothing to others.
  a.send({ type: 'move', x: 480, y: 360, direction: 'up', moving: true }); await delay(200);
  assert.equal(b.messages.some(m => m.type === 'peer'), false);
  for (let i = 1; i <= 10; i++) { await mission(a, i % 2 ? '1920' : '1930'); await delay(20); }
  assert.equal((await b.wait('scores', m => m.scores['1930'][wa.me.team] === 50)).scores['1920'][wa.me.team], 50);
  assert.equal((await a.wait('right', m => m.right === 'raid')).me.sabotageRights, 2);
  assert.equal(other.messages.some(m => m.type === 'scores'), false, 'rooms are isolated');
  // Sabotage B's room, B repairs it.
  a.send({ type: 'sabotage-start' }); const target = await a.wait('sabotage-target'); assert.equal(target.name, '학생B');
  const kind = target.kind;
  a.send({ type: 'sabotage', kind, era: '1940' }); await a.wait('sabotage-done');
  assert.equal((await b.wait('sabotaged')).state.sabotages[0].kind, kind);
  if (kind === 'broken') { b.send({ type: 'open', era: '1940', ...near('1940') }); await b.wait('error'); }
  const door = doorFor('1940');
  const atRepair = kind === 'broken' ? near('1940') : { x: door.x < map.width / 2 ? door.x + 40 : door.x - 16, y: door.y + 30 };
  b.send({ type: 'repair', kind, era: '1940', ...atRepair });
  const repair = (await b.wait('state', m => m.state.round?.type === 'repair')).state.round;
  for (const id of repairAnswer(repair)) b.send({ type: 'pick', id });
  assert.equal((await b.wait('state', m => m.result === 'repaired')).state.sabotages.length, 0);
  b.send({ type: 'close' }); await b.wait('state');
  // Live raid: A attacks B.
  a.send({ type: 'raid' });
  const raid = await a.wait('raid'); assert.equal(raid.opponent.name, '학생B');
  assert.equal((await b.wait('raid')).role, 'defender');
  b.send({ type: 'move', x: map.entry.x, y: map.entry.y - 44, direction: 'down', moving: false });
  await a.wait('peer'); await delay(400);
  a.send({ type: 'move', x: map.entry.x, y: map.entry.y - 24, direction: 'up', moving: true }); await b.wait('peer');
  a.send({ type: 'shock' });
  assert.equal((await b.wait('shock')).shocks, 1);
  assert.equal((await a.wait('shock')).shocks, 1);
  const end = await b.wait('raid-end', () => true, 20000);
  assert.equal(end.shocks, 1);
  console.log('  raid ended by server alarm after ~15s');
  const duplicate = await connect('학생B'); assert.equal((await duplicate.wait('error')).fatal, true);
  for (let i = 2; i < 30; i++) { const client = await connect(`학생${i}`); const welcome = await client.wait('welcome'); assert.equal(welcome.players.length, i + 1); }
  const extra = await connect('초과인원'); assert.equal((await extra.wait('error')).fatal, true);
  const blues = clients.filter(c => c.socket.readyState === WebSocket.OPEN && c !== other && c !== duplicate && c !== extra).length;
  assert.equal(blues, 30);
  b.socket.close(); await a.wait('left', m => m.id === wb.id);
  const rejoined = await connect('학생B', room, b.token); const welcome = await rejoined.wait('welcome');
  assert.equal(welcome.me.team, wb.me.team, 'rejoin keeps team'); assert.equal(welcome.players.length, 30);
  assert.ok(doorFor('1920'));
  console.log('PASS: team split, solo roaming silence, era scores, rights at 5/10, sabotage + repair, live raid relay/shock/auto-end, room isolation, duplicate prevention, 30 capacity, rejoin keeps team');
} finally { for (const client of clients) client.socket.close(); }
