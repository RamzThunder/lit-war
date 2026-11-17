import { GameState } from '../state/GameState.js';
import { ERAS } from '../minigames/wiring.js';
const tokenKey = (room, name) => `lit-war:token:${room}:${name}`;
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } },
};
// Server sabotages carry remaining milliseconds; convert to the local clock once on receipt.
const localize = list => (list ?? []).map(({ left, ...rest }) => ({ ...rest, expiresAt: left == null ? null : performance.now() + left }));
// Online commands go to the room authority. Solo mode retains the local model.
export class SessionState {
  constructor() {
    this.local = new GameState(); this.listeners = new Set(); this.sessionListeners = new Set();
    this.online = false; this.connected = false; this.players = new Map(); this.status = '혼자 연습 중';
    this.remote = this.local.snapshot; this.me = null; this.scores = null; this.raid = null; this.sabotageTarget = null;
    this.local.subscribe(() => { if (!this.online) this.publish(); });
    this.correction = null; this.retry = 0;
    this.events = new EventTarget();
  }
  get snapshot() { return this.online ? structuredClone(this.remote) : this.local.snapshot; }
  get inputBlocked() { return this.online && !this.connected; }
  subscribe(fn) { this.listeners.add(fn); fn(this.snapshot); return () => this.listeners.delete(fn); }
  publish() { for (const fn of this.listeners) fn(this.snapshot); }
  subscribeSession(fn) { this.sessionListeners.add(fn); fn(this); return () => this.sessionListeners.delete(fn); }
  sessionChanged() { for (const fn of this.sessionListeners) fn(this); }
  emit(type, detail = {}) { this.events.dispatchEvent(new CustomEvent(type, { detail })); }
  notice(message, tone = 'info') { this.emit('notice', { message, tone }); }
  send(message) { if (this.connected && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  // Team points while online; personal progress in solo practice.
  get board() {
    if (this.online && this.scores) return { teams: true, scores: this.scores };
    const { progress } = this.local.snapshot;
    return { teams: false, scores: Object.fromEntries(ERAS.map(era => [era, { blue: progress[era] ?? 0, red: 0 }])) };
  }
  // Sabotages of the room currently on screen: the raid target's while attacking, else mine.
  roomSabotages(now = performance.now()) {
    const list = this.raid?.role === 'attacker' ? this.raid.room : this.online ? this.remote.sabotages : [];
    return (list ?? []).filter(s => s.expiresAt == null || s.expiresAt > now);
  }
  setRemote(state) { this.remote = { ...state, sabotages: localize(state.sabotages) }; }
  join(room, name) {
    this.stopSocket(); this.online = true; this.connected = false;
    this.token = storage.get(tokenKey(room, name)) ?? crypto.randomUUID();
    storage.set(tokenKey(room, name), this.token);
    this.room = room; this.name = name; this.players.clear(); this.raid = null; this.me = null; this.scores = null;
    this.remote = { ...this.local.snapshot, terminalOpen: false, terminal: null, round: null, sabotages: [] };
    this.retry = 0; this.publish(); this.connectSocket();
  }
  connectSocket() {
    this.status = this.retry ? '연결이 끊겨 재접속 중…' : '교실에 접속 중…'; this.sessionChanged();
    const url = new URL(`/api/rooms/${this.room}`, location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('name', this.name); url.searchParams.set('token', this.token);
    const socket = new WebSocket(url); this.socket = socket;
    let fatal = false;
    const timeout = setTimeout(() => socket.close(), 10000);
    socket.addEventListener('message', ({ data }) => {
      if (this.socket !== socket) return;
      const event = JSON.parse(data);
      this.lastReceived = Date.now();
      if (event.me) this.me = event.me;
      switch (event.type) {
        case 'welcome':
          clearTimeout(timeout); this.connected = true; this.retry = 0; this.id = event.id;
          this.players = new Map(event.players.map(player => [player.id, player]));
          this.setRemote(event.state); this.scores = event.scores; this.raid = null;
          this.status = '연결됨';
          clearInterval(this.heartbeat);
          this.heartbeat = setInterval(() => {
            if (Date.now() - this.lastReceived > 45000) socket.close();
            else this.send({ type: 'ping' });
          }, 15000);
          this.publish(); break;
        case 'state':
          this.setRemote(event.state); this.publish();
          if (event.result === 'repaired') this.notice('수리 완료! 다시 사용할 수 있어요.', 'good');
          break;
        case 'scores': this.scores = event.scores; break;
        case 'right':
          this.notice(event.right === 'raid' ? '⚡ 실시간 공격권 획득! 상대 진영 방에 쳐들어갈 수 있어요.' : '🛠 사보타주 권한 획득! 상대 방에 방해 공작을 걸 수 있어요.', 'good');
          break;
        case 'joined': this.players.set(event.player.id, event.player); break;
        case 'left': this.players.delete(event.id); break;
        case 'raid':
          this.setRemote(event.state); this.publish();
          this.raid = {
            role: event.role, opponent: { ...event.opponent, receivedAt: performance.now() }, endsAt: performance.now() + event.ms,
            shocks: 0, maxShocks: event.maxShocks, stunnedUntil: 0, entry: event.entry, room: localize(event.room), started: performance.now(),
          };
          this.emit('raid', this.raid);
          break;
        case 'peer': if (this.raid) this.raid.opponent = { ...this.raid.opponent, ...event.player, receivedAt: performance.now() }; break;
        case 'shock':
          if (this.raid) {
            this.raid.shocks = event.shocks; this.raid.stunnedUntil = performance.now() + event.stunMs;
            if (this.raid.role === 'attacker') this.raid.opponent = { ...this.raid.opponent, ...event.defender };
          }
          this.emit('shock', event);
          break;
        case 'shock-miss': this.notice(event.reason, 'warn'); break;
        case 'raid-end': {
          const role = this.raid?.role ?? event.role; this.raid = null;
          const points = event.stolen ? ` · ${event.stolen}점` : '';
          if (event.reason) this.notice(event.reason, 'warn');
          else if (role === 'attacker') this.notice(`공격 종료! ${event.shocks}번 감전시켰어요${points ? `${points} 빼앗음` : ''}.`, 'good');
          else this.notice(event.shocks ? `공격이 끝났어요. ${event.shocks}번 감전당했어요${points ? `${points} 빼앗김` : ''}.` : '공격을 완벽하게 피했어요!', event.shocks ? 'warn' : 'good');
          this.emit('raid-end', event);
          break;
        }
        case 'sabotage-target': this.sabotageTarget = { ...event, sabotages: localize(event.sabotages) }; this.emit('sabotage-target', this.sabotageTarget); break;
        case 'sabotage-done': this.sabotageTarget = null; this.emit('sabotage-done', event); this.notice(`${event.name}의 방에 ${event.kind === 'broken' ? '단말기 고장' : '바리케이드'}를 걸었어요!`, 'good'); break;
        case 'sabotaged':
          this.setRemote(event.state); this.publish();
          this.notice(`⚠️ ${event.by}이(가) ${event.era}년대 ${event.kind === 'broken' ? '단말기를 고장 냈어요!' : '통로에 바리케이드를 쳤어요!'}`, 'bad');
          break;
        case 'correction': this.correction = event.player; break;
        case 'error':
          if (event.fatal) { this.status = event.message; fatal = true; }
          else this.notice(event.message, 'warn');
          break;
      }
      this.sessionChanged();
    });
    socket.addEventListener('close', () => {
      clearTimeout(timeout);
      if (this.socket !== socket) return;
      clearInterval(this.heartbeat); this.connected = false; this.players.clear();
      if (this.raid) { this.raid = null; this.emit('raid-end', { aborted: true }); }
      this.remote.terminalOpen = false; this.remote.round = null; this.publish();
      if (!fatal && this.online && this.retry < 5) {
        this.retry++; this.status = `재접속 대기 (${this.retry}/5)…`;
        this.reconnectTimer = setTimeout(() => this.connectSocket(), Math.min(1000 * 2 ** (this.retry - 1), 8000));
      } else if (!fatal) this.status = '연결할 수 없습니다. 서버 실행을 확인하고 다시 입장하세요.';
      this.sessionChanged();
    });
    socket.addEventListener('error', () => { /* close drives the reconnect state */ });
  }
  stopSocket() {
    clearTimeout(this.reconnectTimer); clearInterval(this.heartbeat);
    const socket = this.socket; this.socket = null; socket?.close();
  }
  leave() {
    this.stopSocket(); this.online = false; this.connected = false; this.players.clear();
    if (this.raid) { this.raid = null; this.emit('raid-end', { aborted: true }); }
    this.me = null; this.scores = null; this.sabotageTarget = null;
    this.status = '혼자 연습 중'; this.correction = null;
    this.publish(); this.sessionChanged();
  }
  // Safety net if the server's raid-end never arrives (e.g. the room restarted).
  checkRaidTimeout(now = performance.now()) {
    if (this.raid && now > this.raid.endsAt + 3000) { this.raid = null; this.emit('raid-end', { aborted: true }); this.sessionChanged(); }
  }
  openTerminal(era, at) { if (this.online) this.send({ type: 'open', era, x: at.x, y: at.y }); else this.local.openTerminal(era); }
  openRepair(kind, era, at) { if (this.online) this.send({ type: 'repair', kind, era, x: at.x, y: at.y }); }
  closeTerminal() {
    if (this.online) { this.remote.terminalOpen = false; this.remote.round = null; this.publish(); this.send({ type: 'close' }); }
    else this.local.closeTerminal();
  }
  nextRound() { if (this.online) this.send({ type: 'next' }); else this.local.nextRound(); }
  recall(word) { if (this.online) this.send({ type: 'recall', word }); else return this.local.recall(word); }
  shoot(word) { if (this.online) this.send({ type: 'shoot', word }); else return this.local.shoot(word); }
  verifyIdentity(author, work, swiped) { if (this.online) this.send({ type: 'identify', author, work, swiped }); else return this.local.verifyIdentity(author, work, swiped); }
  classify(id, era) { if (this.online) this.send({ type: 'classify', id, era }); else return this.local.classify(id, era); }
  shelve(id) { if (this.online) this.send({ type: 'shelve', id }); else return this.local.shelve(id); }
  submitExtra(value) { if (this.online) this.send({ type: 'extra', value }); else return this.local.submitExtra(value); }
  tune(value) {
    if (!this.online) return this.local.tune(value);
    if (this.remote.round?.type === 'frequency' && !this.remote.round.complete && Number.isFinite(value)) { this.remote.round.value = Math.max(0, Math.min(100, Math.round(value))); this.publish(); }
  }
  lockFrequency() { if (this.online) this.send({ type: 'lock', value: this.remote.round?.value }); else return this.local.lockFrequency(); }
  connect(author, work) {
    if (!this.online) return this.local.connect(author, work);
    this.send({ type: 'connect', author, work });
    return author === work ? 'correct' : 'incorrect';
  }
  pickRepair(id) { if (this.online) this.send({ type: 'pick', id }); }
  startRaid() { this.send({ type: 'raid' }); }
  shock() { this.send({ type: 'shock' }); }
  startSabotage() { this.send({ type: 'sabotage-start' }); }
  placeSabotage(kind, era) { this.send({ type: 'sabotage', kind, era }); }
}
