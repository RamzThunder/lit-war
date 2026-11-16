import { DurableObject } from 'cloudflare:workers';
import { RoomEngine } from './RoomEngine.js';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{4,12})$/);
    if (match) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
      const origin = request.headers.get('Origin');
      if (origin && ![url.origin, 'http://localhost:5173', 'http://127.0.0.1:5173'].includes(origin)) return new Response('Origin rejected', { status: 403 });
      return env.ROOMS.getByName(match[1]).fetch(request);
    }
    if (url.pathname === '/api/health') return Response.json({ ok: true });
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
const HEARTBEAT_MS = 30000;
// One Durable Object per class code. Scores and per-student profiles (team, mission count,
// rights, sabotages) and live raids are stored; open rounds and raid positions survive
// hibernation in socket attachments.
export class Classroom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sockets = new Map();
    ctx.blockConcurrencyWhile(async () => {
      const profiles = await ctx.storage.list({ prefix: 'p:' });
      this.room = new RoomEngine({ scores: await ctx.storage.get('scores'), raids: await ctx.storage.get('raids'), profiles: [...profiles].map(([key, value]) => [key.slice(2), value]) });
      for (const socket of ctx.getWebSockets()) {
        const data = socket.deserializeAttachment();
        if (data && this.room.restore(data)) this.sockets.set(data.id, socket);
        else try { socket.close(4003, 'Session lost'); } catch { /* already closed */ }
      }
    });
  }
  send(socket, data) { try { socket.send(JSON.stringify(data)); } catch { /* close/alarm removes stale peers */ } }
  dispatch(out) {
    for (const { to, data } of out) {
      if (to === '*') for (const socket of this.sockets.values()) this.send(socket, data);
      else if (this.sockets.has(to)) this.send(this.sockets.get(to), data);
    }
  }
  attach(ids) {
    for (const id of ids) if (this.room.sessions.has(id) && this.sockets.has(id)) this.sockets.get(id).serializeAttachment(this.room.serialize(id));
  }
  async flush() { const entries = this.room.takeDirty(); if (entries) await this.ctx.storage.put(entries); }
  async ensureAlarm(at) {
    const current = await this.ctx.storage.getAlarm();
    if (!current || current > at) await this.ctx.storage.setAlarm(at);
  }
  async fetch(request) {
    const url = new URL(request.url);
    const name = (url.searchParams.get('name') ?? '').trim();
    const token = url.searchParams.get('token') ?? '';
    if (!/^[\p{L}\p{N}_ -]{1,12}$/u.test(name) || !/^[a-f0-9-]{36}$/.test(token)) return new Response('Invalid nickname or session', { status: 400 });
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    for (const [id, s] of this.room.sessions) if (s.token === token) this.remove(id, 4000, 'Reconnected');
    const id = crypto.randomUUID();
    try { this.room.join(id, name, token); }
    catch (error) { this.send(server, { type: 'error', fatal: true, message: error.message }); server.close(4001, 'Join rejected'); return new Response(null, { status: 101, webSocket: client }); }
    this.sockets.set(id, server);
    server.serializeAttachment(this.room.serialize(id));
    this.send(server, this.room.welcome(id));
    for (const [other, socket] of this.sockets) if (other !== id) this.send(socket, { type: 'joined', player: this.room.player(id) });
    await this.flush();
    await this.ensureAlarm(Date.now() + HEARTBEAT_MS);
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(socket, raw) {
    const id = socket.deserializeAttachment()?.id;
    if (!this.room.sessions.has(id)) return;
    if (typeof raw !== 'string' || raw.length > 2048) { this.remove(id, 1009, 'Message too large'); return; }
    let message;
    try { message = JSON.parse(raw); } catch { return; }
    const now = Date.now();
    const out = [...this.room.tick(now), ...this.room.command(id, message, now)];
    this.dispatch(out);
    if (message.type !== 'ping') this.attach(new Set([id, ...out.map(o => o.to)].filter(to => to !== '*')));
    await this.flush();
    if (out.some(o => o.data.type === 'raid')) await this.ensureAlarm(this.room.nextDeadline());
  }
  remove(id, code = 1000, reason = 'Left') {
    const socket = this.sockets.get(id);
    if (!socket) return;
    this.sockets.delete(id);
    const out = this.room.remove(id);
    try { socket.close(code, reason); } catch { /* already closed */ }
    this.dispatch(out);
  }
  webSocketClose(socket) { this.remove(socket.deserializeAttachment()?.id); }
  webSocketError(socket) { this.remove(socket.deserializeAttachment()?.id); }
  async alarm() {
    const now = Date.now();
    this.dispatch(this.room.tick(now));
    for (const [id, s] of this.room.sessions) if (now - s.lastSeen > 60000) this.remove(id, 4002, 'Timed out');
    await this.flush();
    if (this.sockets.size) await this.ctx.storage.setAlarm(Math.min(now + HEARTBEAT_MS, this.room.nextDeadline()));
  }
}
