// Real WebSocket integration against the local Wrangler runtime (no browser required).
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { wiringRecords } from '../src/prototype/minigames/wiring.js';
import { repairAnswer } from '../src/prototype/minigames/repair.js';
import { terminalFor, doorFor } from '../src/prototype/map.js';
const base = process.env.TEST_WS_URL ?? 'ws://127.0.0.1:8787';
const room = `T${Date.now().toString(36).toUpperCase()}`;
const clients = [];
const near = era => ({ x: terminalFor(era).x, y: terminalFor(era).y < 300 ? terminalFor(era).y + 50 : terminalFor(era).y - 60 });
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
  client.send({ type: 'open', era, ...near(era) }); await client.wait('state', m => m.state.terminal === era);
  for (const r of wiringRecords[era]) { client.send({ type: 'connect', author: r.id, work: r.id }); await client.wait('state'); }
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
  assert.equal((await a.wait('right', m => m.right === 'raid')).me.sabotageRights, 1);
  assert.equal(other.messages.some(m => m.type === 'scores'), false, 'rooms are isolated');
  // Sabotage B's room, B repairs it.
  a.send({ type: 'sabotage-start' }); assert.equal((await a.wait('sabotage-target')).name, '학생B');
  a.send({ type: 'sabotage', kind: 'broken', era: '1940' }); await a.wait('sabotage-done');
  assert.equal((await b.wait('sabotaged')).state.sabotages[0].kind, 'broken');
  b.send({ type: 'open', era: '1940', ...near('1940') }); await b.wait('error');
  b.send({ type: 'repair', kind: 'broken', era: '1940', ...near('1940') });
  const repair = (await b.wait('state', m => m.state.round?.type === 'repair')).state.round;
  for (const id of repairAnswer(repair)) b.send({ type: 'pick', id });
  assert.equal((await b.wait('state', m => m.result === 'repaired')).state.sabotages.length, 0);
  b.send({ type: 'close' }); await b.wait('state');
  // Live raid: A attacks B.
  a.send({ type: 'raid' });
  const raid = await a.wait('raid'); assert.equal(raid.opponent.name, '학생B');
  assert.equal((await b.wait('raid')).role, 'defender');
  b.send({ type: 'move', x: 480, y: 545, direction: 'down', moving: false });
  await a.wait('peer'); await delay(400);
  a.send({ type: 'move', x: 480, y: 565, direction: 'up', moving: true }); await b.wait('peer');
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
