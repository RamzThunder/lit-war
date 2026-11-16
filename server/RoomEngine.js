import { GameState, MISSION_POINTS } from '../src/prototype/state/GameState.js';
import { map, ERAS, validPosition, terminalFor, doorFor, isNearTerminal, isNearDoor } from '../src/prototype/map.js';
export { validPosition };
export const MAX_PLAYERS = 30;
export const TEAMS = ['blue', 'red'];
export const RULES = Object.freeze({
  sabotageEvery: 5, raidEvery: 10,
  raidMs: 15000, shockRange: 40, shockCooldown: 1000, stunMs: 1500, invulnMs: 1000, maxShocks: 5, steal: 5,
  barricadeMs: 90000, maxSabotages: 2,
});
const emptyScores = () => Object.fromEntries(ERAS.map(era => [era, { blue: 0, red: 0 }]));
const newProfile = (name, team) => ({ name, team, sabotageRights: 0, raidRights: 0, game: { missions: 0, sabotages: [] } });
// Room authority. Students roam their own copy of the map without sending positions; the
// server judges missions, awards team points and attack rights, and relays movement only
// between the two players of a live raid. command() returns messages as { to, data } where
// `to` is a session id or '*' for everyone.
export class RoomEngine {
  constructor({ scores, profiles, raids } = {}, random = Math.random) {
    this.scores = scores ?? emptyScores();
    this.profiles = new Map(profiles ?? []);
    this.sessions = new Map(); this.raids = new Map((raids ?? []).map(raid => [raid.id, raid]));
    this.random = random; this.dirty = new Set(); this.scoresDirty = false; this.raidsDirty = false;
  }
  // ---- sessions ------------------------------------------------------------------------
  pickTeam() {
    const count = list => TEAMS.map(team => list.filter(t => t === team).length);
    const live = count([...this.sessions.values()].map(s => s.profile.team));
    if (live[0] !== live[1]) return live[0] < live[1] ? 'blue' : 'red';
    const all = count([...this.profiles.values()].map(p => p.team));
    return all[0] <= all[1] ? 'blue' : 'red';
  }
  join(id, name, token, now = Date.now()) {
    if (this.sessions.size >= MAX_PLAYERS) throw new Error('방 인원이 30명으로 가득 찼습니다.');
    if ([...this.sessions.values()].some(s => s.name === name && s.token !== token)) throw new Error('이미 사용 중인 닉네임입니다.');
    let profile = this.profiles.get(token);
    if (!profile) { profile = newProfile(name, this.pickTeam()); this.profiles.set(token, profile); }
    profile.name = name; this.dirty.add(token);
    return this.#attach({ id, name, token, profile, game: new GameState(profile.game) }, now);
  }
  #attach(session, now, player = null) {
    // Live raids are stored, so a session woken from hibernation rejoins its raid.
    const raid = [...this.raids.values()].find(r => r.attacker === session.id || r.defender === session.id);
    Object.assign(session, { player: raid ? player : null, raid: raid?.id ?? null, pending: null, lastMove: now, lastSeen: now, rateAt: now, rateCount: 0 });
    this.sessions.set(session.id, session); return session;
  }
  restore(data, now = Date.now()) {
    const profile = this.profiles.get(data.token);
    if (!profile) return false;
    this.#attach({ id: data.id, name: data.name, token: data.token, profile, game: new GameState({ ...profile.game, ...data.game }) }, now, data.player ?? null);
    return true;
  }
  // Hibernation attachment: only the open round; persistent fields live in storage profiles.
  serialize(id) {
    const s = this.sessions.get(id); const { terminalOpen, terminal, round } = s.game.snapshot;
    return { id, name: s.name, token: s.token, game: { terminalOpen, terminal, round }, player: s.player };
  }
  takeDirty() {
    const entries = {};
    for (const token of this.dirty) if (this.profiles.has(token)) entries[`p:${token}`] = this.profiles.get(token);
    if (this.scoresDirty) entries.scores = this.scores;
    if (this.raidsDirty) entries.raids = [...this.raids.values()];
    this.dirty.clear(); this.scoresDirty = false; this.raidsDirty = false;
    return Object.keys(entries).length ? entries : null;
  }
  #persist(s) {
    const { missions, sabotages } = s.game.snapshot;
    s.profile.game = { missions, sabotages }; this.dirty.add(s.token);
  }
  player(id) { const s = this.sessions.get(id); return { id, name: s.name, team: s.profile.team }; }
  players() { return [...this.sessions.keys()].map(id => this.player(id)); }
  me(id) {
    const s = this.sessions.get(id); const { missions } = s.game.snapshot;
    const { team, sabotageRights, raidRights } = s.profile;
    return { team, missions, sabotageRights, raidRights };
  }
  // Barricades carry absolute server time; clients receive the remaining milliseconds.
  view(sabotages, now) {
    return sabotages.filter(x => !x.until || x.until > now).map(({ kind, era, by, until }) => ({ kind, era, by, left: until ? until - now : null }));
  }
  state(id, now = Date.now()) {
    const s = this.sessions.get(id); const snapshot = s.game.snapshot;
    return { ...snapshot, sabotages: this.view(snapshot.sabotages, now) };
  }
  stateMessage(id, now, extra = {}) { return { to: id, data: { type: 'state', state: this.state(id, now), me: this.me(id), ...extra } }; }
  welcome(id, now = Date.now()) {
    return { type: 'welcome', id, me: this.me(id), players: this.players(), state: this.state(id, now), scores: this.scores };
  }
  remove(id, now = Date.now()) {
    const s = this.sessions.get(id);
    if (!s) return [];
    const out = s.raid ? this.#endRaid(s.raid, now, '상대가 접속을 끊어 공격이 끝났습니다.') : [];
    this.sessions.delete(id);
    return [...out, { to: '*', data: { type: 'left', id } }];
  }
  // ---- clock -----------------------------------------------------------------------------
  tick(now = Date.now()) {
    const out = [];
    for (const raid of [...this.raids.values()]) if (now >= raid.endsAt) out.push(...this.#endRaid(raid.id, now));
    return out;
  }
  nextDeadline() { return Math.min(Infinity, ...[...this.raids.values()].map(r => r.endsAt)); }
  // ---- commands --------------------------------------------------------------------------
  command(id, message, now = Date.now()) {
    const s = this.sessions.get(id);
    if (!s || !message || typeof message !== 'object') return [];
    s.lastSeen = now;
    if (now - s.rateAt >= 1000) { s.rateAt = now; s.rateCount = 0; }
    if (++s.rateCount > 60) return [];
    const reply = data => [{ to: id, data }];
    const error = text => reply({ type: 'error', message: text });
    if (message.type === 'ping') return reply({ type: 'pong' });
    if (message.type === 'move') return this.#move(s, message, now);
    if (message.type === 'shock') return this.#shock(s, now);
    if (s.raid && ['open', 'repair', 'raid', 'sabotage-start', 'sabotage'].includes(message.type)) return error('공격이 끝난 뒤에 할 수 있어요.');
    const at = { x: message.x, y: message.y };
    let result;
    switch (message.type) {
      case 'open': {
        const terminal = terminalFor(message.era);
        if (!terminal || !validPosition(at.x, at.y) || !isNearTerminal(at, terminal)) return error('단말기 가까이에서 접속하세요.');
        if (s.game.hasSabotage('broken', terminal.era, now)) return error('고장 난 단말기예요. 먼저 수리하세요.');
        s.game.openTerminal(terminal.era, now); break;
      }
      case 'repair': {
        const kind = message.kind;
        const near = kind === 'broken' ? isNearTerminal(at, terminalFor(message.era)) : kind === 'barricade' && isNearDoor(at, doorFor(message.era));
        if (!near || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return error('고장 난 곳 가까이에서 수리하세요.');
        if (!s.game.openRepair(kind, message.era, now, this.random)) return [this.stateMessage(id, now)];
        break;
      }
      case 'pick': result = s.game.pickRepair(message.id, now); if (result === 'repaired') this.#persist(s); break;
      case 'close': s.game.closeTerminal(); break;
      case 'choose': s.game.chooseGame(message.game); break;
      case 'next': s.game.nextRound(); break;
      case 'connect': result = s.game.connect(message.author, message.work); break;
      case 'lock': s.game.tune(message.value); result = s.game.lockFrequency(); break;
      case 'raid': return this.#startRaid(s, now);
      case 'sabotage-start': return this.#sabotageStart(s, now);
      case 'sabotage': return this.#sabotage(s, message, now);
      default: return [];
    }
    const out = [this.stateMessage(id, now, { result })];
    if (result === 'complete') out.push(...this.#award(s, now));
    return out;
  }
  #award(s, now) {
    const { round, missions } = s.game.snapshot;
    this.scores[round.era][s.profile.team] += MISSION_POINTS; this.scoresDirty = true;
    let right = null;
    if (missions % RULES.raidEvery === 0) { s.profile.raidRights++; right = 'raid'; }
    else if (missions % RULES.sabotageEvery === 0) { s.profile.sabotageRights++; right = 'sabotage'; }
    this.#persist(s);
    const out = [{ to: '*', data: { type: 'scores', scores: this.scores } }];
    if (right) out.push({ to: s.id, data: { type: 'right', right, me: this.me(s.id) } });
    return out;
  }
  // ---- live raid ---------------------------------------------------------------------------
  #partner(s) { const raid = this.raids.get(s.raid); return raid && this.sessions.get(raid.attacker === s.id ? raid.defender : raid.attacker); }
  #raidSolids(raid, now) {
    const defender = this.sessions.get(raid.defender);
    return defender.game.activeSabotages(now).filter(x => x.kind === 'barricade').map(x => doorFor(x.era));
  }
  #startRaid(s, now) {
    const error = text => [{ to: s.id, data: { type: 'error', message: text } }];
    if (s.profile.raidRights < 1) return error('실시간 공격권이 없어요. 미션을 10개 깨면 생겨요.');
    const targets = [...this.sessions.values()].filter(t => t.profile.team !== s.profile.team && !t.raid);
    if (!targets.length) return error('지금 공격할 수 있는 상대 진영 학생이 없어요. 공격권은 그대로 남아 있어요.');
    const target = targets[Math.floor(this.random() * targets.length)];
    s.profile.raidRights--; this.dirty.add(s.token);
    const raid = { id: `${now}-${s.id}`, attacker: s.id, defender: target.id, endsAt: now + RULES.raidMs, shocks: 0, stolen: 0, cooldownUntil: 0, stunUntil: 0, invulnUntil: 0 };
    this.raids.set(raid.id, raid); this.raidsDirty = true;
    s.raid = target.raid = raid.id;
    s.game.closeTerminal(); target.game.closeTerminal();
    s.player = { ...map.entry, direction: 'up', moving: false }; s.lastMove = now;
    target.player = null; // learned from the defender's first raid move
    const base = { type: 'raid', ms: RULES.raidMs, maxShocks: RULES.maxShocks };
    return [
      { to: s.id, data: { ...base, role: 'attacker', opponent: this.player(target.id), entry: map.entry, room: this.view(target.game.activeSabotages(now), now), state: this.state(s.id, now), me: this.me(s.id) } },
      { to: target.id, data: { ...base, role: 'defender', opponent: { ...this.player(s.id), ...s.player }, state: this.state(target.id, now) } },
    ];
  }
  #move(s, message, now) {
    if (!s.raid) return [];
    const raid = this.raids.get(s.raid);
    const correction = () => (s.player ? [{ to: s.id, data: { type: 'correction', player: { ...s.player } } }] : []);
    const { x, y, direction, moving } = message;
    if (!['up', 'down', 'left', 'right'].includes(direction) || typeof moving !== 'boolean') return correction();
    if (s.id === raid.defender && now < raid.stunUntil && s.player && (x !== s.player.x || y !== s.player.y)) return correction();
    const extra = this.#raidSolids(raid, now);
    if (!validPosition(x, y, extra)) return correction();
    if (s.player) {
      const distance = Math.hypot(x - s.player.x, y - s.player.y);
      const allowed = 150 * Math.min((now - s.lastMove) / 1000, 1) + 12;
      if (distance > allowed) return correction();
      // Sample the swept path as well, so a delayed packet cannot cross thin solids.
      const steps = Math.max(1, Math.ceil(distance / 4));
      for (let step = 1; step <= steps; step++) if (!validPosition(s.player.x + (x - s.player.x) * step / steps, s.player.y + (y - s.player.y) * step / steps, extra)) return correction();
    }
    s.player = { x, y, direction, moving }; s.lastMove = now;
    const partner = this.#partner(s);
    return partner ? [{ to: partner.id, data: { type: 'peer', player: { id: s.id, ...s.player } } }] : [];
  }
  #shock(s, now) {
    const raid = s.raid && this.raids.get(s.raid);
    if (!raid || raid.attacker !== s.id) return [];
    const defender = this.sessions.get(raid.defender);
    const miss = reason => [{ to: s.id, data: { type: 'shock-miss', reason } }];
    if (raid.shocks >= RULES.maxShocks) return miss('이번 공격의 감전 횟수를 모두 썼어요.');
    if (now < raid.cooldownUntil) return miss('충전 중…');
    if (!s.player || !defender?.player || now < raid.invulnUntil) return miss('지금은 감전되지 않아요.');
    if (Math.hypot(s.player.x - defender.player.x, s.player.y - defender.player.y) > RULES.shockRange) return miss('더 가까이 가야 해요!');
    raid.shocks++; raid.cooldownUntil = now + RULES.shockCooldown; this.raidsDirty = true;
    raid.stunUntil = now + RULES.stunMs; raid.invulnUntil = raid.stunUntil + RULES.invulnMs;
    defender.player.moving = false;
    // Steal from the era where the defending team is strongest.
    const def = defender.profile.team, att = s.profile.team;
    const era = ERAS.reduce((best, e) => (this.scores[e][def] > this.scores[best][def] ? e : best), ERAS[0]);
    const stolen = Math.min(RULES.steal, this.scores[era][def]);
    this.scores[era][def] -= stolen; this.scores[era][att] += stolen; raid.stolen += stolen; this.scoresDirty = true;
    const data = { type: 'shock', shocks: raid.shocks, maxShocks: RULES.maxShocks, stunMs: RULES.stunMs, stolen, era, defender: { id: defender.id, ...defender.player } };
    return [{ to: s.id, data }, { to: defender.id, data }, { to: '*', data: { type: 'scores', scores: this.scores } }];
  }
  #endRaid(raidId, now, reason) {
    const raid = this.raids.get(raidId);
    if (!raid) return [];
    this.raids.delete(raidId); this.raidsDirty = true;
    const out = [];
    for (const id of [raid.attacker, raid.defender]) {
      const s = this.sessions.get(id);
      if (!s) continue;
      s.raid = null; s.player = null;
      const role = id === raid.attacker ? 'attacker' : 'defender';
      out.push({ to: id, data: { type: 'raid-end', role, shocks: raid.shocks, stolen: raid.stolen, reason, me: this.me(id) } });
    }
    return out;
  }
  // ---- sabotage (async) -------------------------------------------------------------------
  #sabotageStart(s, now) {
    const error = text => [{ to: s.id, data: { type: 'error', message: text } }];
    if (s.profile.sabotageRights < 1) return error('사보타주 권한이 없어요. 미션을 5개 깨면 생겨요.');
    const pending = s.pending && this.profiles.get(s.pending);
    let token = pending && this.#activeFor(s.pending, now).length < RULES.maxSabotages ? s.pending : null;
    if (!token) {
      const pool = [...this.profiles.entries()].filter(([t, p]) => p.team !== s.profile.team && this.#activeFor(t, now).length < RULES.maxSabotages).map(([t]) => t);
      if (!pool.length) return error('방해할 수 있는 상대 진영 방이 없어요. 권한은 그대로 남아 있어요.');
      token = pool[Math.floor(this.random() * pool.length)];
    }
    s.pending = token;
    const target = this.profiles.get(token);
    return [{ to: s.id, data: { type: 'sabotage-target', name: target.name, team: target.team, sabotages: this.view(this.#activeFor(token, now), now), max: RULES.maxSabotages } }];
  }
  #liveSession(token) { return [...this.sessions.values()].find(x => x.token === token); }
  #activeFor(token, now) {
    const live = this.#liveSession(token);
    return live ? live.game.activeSabotages(now) : (this.profiles.get(token)?.game.sabotages ?? []).filter(x => !x.until || x.until > now);
  }
  #sabotage(s, message, now) {
    const error = text => [{ to: s.id, data: { type: 'error', message: text } }];
    const { kind, era } = message;
    if (!s.pending || s.profile.sabotageRights < 1) return error('먼저 사보타주 대상을 정하세요.');
    if (!['barricade', 'broken'].includes(kind) || !ERAS.includes(era)) return error('잘못된 위치예요.');
    const active = this.#activeFor(s.pending, now);
    if (active.length >= RULES.maxSabotages) return error('이 방에는 더 이상 방해 공작을 걸 수 없어요.');
    if (active.some(x => x.kind === kind && x.era === era)) return error('이미 방해 공작이 걸린 곳이에요.');
    const blocked = new Set([...active, { era }].map(x => x.era));
    if (blocked.size >= ERAS.length) return error('모든 단말기를 막을 수는 없어요.');
    const sabotage = { kind, era, by: s.name, until: kind === 'barricade' ? now + RULES.barricadeMs : null };
    const token = s.pending; s.pending = null;
    s.profile.sabotageRights--; this.dirty.add(s.token);
    const target = this.profiles.get(token); const live = this.#liveSession(token);
    const out = [{ to: s.id, data: { type: 'sabotage-done', name: target.name, kind, era, me: this.me(s.id) } }];
    if (live) {
      live.game.prune(now); live.game.addSabotage(sabotage);
      const round = live.game.snapshot.round;
      if (kind === 'broken' && round && round.type !== 'repair' && round.era === era) live.game.closeTerminal();
      this.#persist(live);
      out.push({ to: live.id, data: { type: 'sabotaged', by: s.name, kind, era, state: this.state(live.id, now) } });
    } else {
      target.game.sabotages = [...active, sabotage]; this.dirty.add(token);
    }
    return out;
  }
}
