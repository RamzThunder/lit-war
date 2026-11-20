import { GameState, MISSION_POINTS } from '../src/prototype/state/GameState.js';
import { map, ERAS, validPosition, terminalFor, doorFor, isNearTerminal, isNearDoor } from '../src/prototype/map.js';
import { wiringRecords, shuffle } from '../src/prototype/minigames/wiring.js';
export { validPosition };
export const MAX_PLAYERS = 30;
export const TEAMS = ['blue', 'red'];
export const RULES = Object.freeze({
  sabotageEvery: 5, raidEvery: 10,
  raidMs: 15000, shockRange: 40, shockCooldown: 1000, stunMs: 1500, invulnMs: 1000, maxShocks: 5, steal: 5,
  barricadeMs: 120000, maxBarricades: 3, maxBroken: 1,
  trapSteal: 10,
  // Contamination alert: a 1-minute event. Luddites may plant one bait per mission,
  // Guardians cleanse it; both get one try and double points.
  eventMs: 60000, eventAutoBefore: 600000, baitPoints: 20, cleansePoints: 20, maxContam: 3,
});
const emptyScores = () => Object.fromEntries(ERAS.map(era => [era, { blue: 0, red: 0 }]));
const newProfile = (name, team) => ({ name, team, sabotageRights: 0, raidRights: 0, trap: null, game: { missions: 0, sabotages: [] } });
const BLOCKING = new Set(['barricade', 'broken']);
const recordOf = (era, id) => wiringRecords[era].find(r => r.id === id);
// Lesson flow. `free` = no teacher has claimed the room yet, so students play right away.
// Once a teacher connects the room waits in `lobby` until the teacher starts the timer.
// `opening` = students watch their team's opening video; the timer does not run and the
// teacher can start once every connected student has finished it.
export const PHASES = ['free', 'lobby', 'opening', 'playing', 'paused', 'ended'];
const ACTIVE = new Set(['free', 'playing']);
const newLesson = () => ({ phase: 'free', endsAt: null, remainMs: null, durationMs: null, keyHash: null, event: null, eventFired: false, opening: null });
const PHASE_BLOCKED = { lobby: '선생님이 게임을 시작하면 할 수 있어요.', opening: '오프닝 영상이 끝나면 선생님이 게임을 시작해요.', paused: '선생님이 게임을 잠시 멈췄어요.', ended: '게임이 끝났어요.' };
// Room authority. Students roam their own copy of the map without sending positions; the
// server judges missions, awards team points and attack rights, and relays movement only
// between the two players of a live raid. command() returns messages as { to, data } where
// `to` is a session id or '*' for everyone.
export class RoomEngine {
  constructor({ scores, profiles, raids, lesson } = {}, random = Math.random) {
    this.scores = scores ?? emptyScores();
    this.lesson = { ...newLesson(), ...lesson }; this.lessonDirty = false;
    this.teachers = new Map(); this.feedLog = []; this.contamLog = [];
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
  // Students enter only rooms a teacher has opened; the classroom TV shows the code and QR.
  get open() { return Boolean(this.lesson.keyHash); }
  assertOpen() { if (!this.open) throw new Error('아직 열리지 않은 방이에요. 교실 TV에 나온 방 코드를 확인하세요.'); }
  join(id, name, token, now = Date.now()) {
    if (this.sessions.size >= MAX_PLAYERS) throw new Error('방 인원이 30명으로 가득 찼습니다.');
    if ([...this.sessions.values()].some(s => s.name === name && s.token !== token)) throw new Error('이미 사용 중인 닉네임입니다.');
    let profile = this.profiles.get(token);
    if (!profile) { profile = newProfile(name, this.pickTeam()); this.profiles.set(token, profile); }
    profile.name = name; this.dirty.add(token);
    return this.#attach({ id, name, token, profile, game: new GameState(profile.game, this.random) }, now);
  }
  #attach(session, now, player = null) {
    // Live raids are stored, so a session woken from hibernation rejoins its raid.
    const raid = [...this.raids.values()].find(r => r.attacker === session.id || r.defender === session.id);
    Object.assign(session, { player: raid ? player : null, raid: raid?.id ?? null, pending: null, lastMove: now, lastSeen: now, rateAt: now, rateCount: 0 });
    this.sessions.set(session.id, session); return session;
  }
  // ---- teacher -------------------------------------------------------------------------
  // The first teacher sets the room password (hashed by the worker); later teachers must match.
  joinTeacher(id, keyHash, now = Date.now()) {
    if (this.lesson.keyHash && this.lesson.keyHash !== keyHash) throw new Error('교사 비밀번호가 달라요.');
    if (!this.lesson.keyHash) {
      this.lesson.keyHash = keyHash;
      if (this.lesson.phase === 'free') this.lesson.phase = 'lobby';
      this.lessonDirty = true;
    }
    this.teachers.set(id, { id, lastSeen: now });
    return this.teacherWelcome(now);
  }
  isTeacher(id) { return this.teachers.has(id); }
  lessonView(now = Date.now()) {
    const { phase, endsAt, remainMs, durationMs, event } = this.lesson;
    return { phase, durationMs, left: phase === 'playing' ? Math.max(0, endsAt - now) : phase === 'paused' ? remainMs : null, event: event ? { left: Math.max(0, event.endsAt - now) } : null, opening: phase === 'opening' ? this.openingProgress() : null };
  }
  // Opening progress counts only students connected right now; finished ones are kept by token
  // so a reload does not make them watch again.
  openingProgress() {
    const done = new Set(this.lesson.opening?.done ?? []);
    const online = [...this.sessions.values()];
    const finished = online.filter(s => done.has(s.token)).length;
    // `id` changes on every replay so clients know to watch again.
    return { id: this.lesson.opening?.at ?? 0, done: finished, total: online.length, ready: finished === online.length };
  }
  // What the teacher sees per student during the opening: done, or the last status the
  // student reported (loading %, waiting for a click, playing, error).
  #openingStatus(token, s) {
    if (this.lesson.phase !== 'opening' || !s) return null;
    if (this.openingWatched(token)) return { status: 'done' };
    return s.opening ?? { status: 'waiting' };
  }
  openingWatched(token) { return Boolean(this.lesson.opening?.done.includes(token)); }
  // Joins and leaves change the opening head count; the worker calls this after a join.
  openingUpdate(now = Date.now()) { return this.lesson.phase === 'opening' ? [this.#lessonMessage(now)] : []; }
  get active() { return ACTIVE.has(this.lesson.phase); }
  roster() {
    const live = new Map([...this.sessions.values()].map(s => [s.token, s]));
    return [...this.profiles.entries()].map(([token, p]) => {
      const s = live.get(token);
      return { name: p.name, team: p.team, missions: s ? s.game.snapshot.missions : p.game.missions, sabotageRights: p.sabotageRights, raidRights: p.raidRights, online: Boolean(s), raiding: Boolean(s?.raid), opening: this.#openingStatus(token, s) };
    });
  }
  teacherWelcome(now = Date.now()) {
    return { type: 'teacher-welcome', lesson: this.lessonView(now), scores: this.scores, roster: this.roster(), feed: this.feedLog, contam: this.contamLog, raids: [...this.raids.keys()].map(id => this.watchView(id, now)).filter(Boolean) };
  }
  // Spectator snapshot of a live raid for teachers: both players, the defender's room
  // sabotages (the map the raid happens in), timer and shocks.
  watchView(raidId, now = Date.now()) {
    const raid = this.raids.get(raidId);
    const attacker = raid && this.sessions.get(raid.attacker), defender = raid && this.sessions.get(raid.defender);
    if (!attacker || !defender) return null;
    const actor = s => ({ name: s.name, team: s.profile.team, player: s.player });
    return { id: raid.id, attacker: actor(attacker), defender: actor(defender), left: Math.max(0, raid.endsAt - now), shocks: raid.shocks, maxShocks: RULES.maxShocks, stolen: raid.stolen, room: this.view(defender.game.activeSabotages(now), now) };
  }
  #toTeachers(data) { return [...this.teachers.keys()].map(to => ({ to, data })); }
  teacherUpdate() { return this.#toTeachers({ type: 'roster', roster: this.roster() }); }
  #feed(text, tone = 'info', now = Date.now()) {
    const item = { at: now, text, tone };
    this.feedLog = [...this.feedLog.slice(-29), item];
    return this.#toTeachers({ type: 'feed', item });
  }
  #lessonMessage(now) { return { to: '*', data: { type: 'lesson', lesson: this.lessonView(now) } }; }
  // Pausing/ending closes every terminal and stops live raids so nobody keeps scoring.
  #halt(now, reason) {
    const out = this.lesson.event ? this.#endEvent(now) : [];
    for (const raid of [...this.raids.values()]) out.push(...this.#endRaid(raid.id, now, reason));
    for (const [id, s] of this.sessions) {
      s.pending = null; s.bait = null;
      if (s.game.snapshot.terminalOpen) { s.game.closeTerminal(); out.push(this.stateMessage(id, now)); }
    }
    return out;
  }
  #setPhase(phase, now, patch = {}) {
    Object.assign(this.lesson, { phase, ...patch }); this.lessonDirty = true;
    const label = { opening: '🎬 오프닝 영상 재생', playing: '▶ 게임 시작', paused: '⏸ 잠시 멈춤', ended: '■ 게임 종료', lobby: '↺ 대기 상태' }[phase];
    return [this.#lessonMessage(now), ...this.#feed(label, 'lesson', now)];
  }
  #reset(now) {
    const out = this.#halt(now, '선생님이 게임을 초기화했어요.');
    this.scores = emptyScores(); this.scoresDirty = true;
    for (const [token, p] of this.profiles) { Object.assign(p, { sabotageRights: 0, raidRights: 0, trap: null, game: { missions: 0, sabotages: [] } }); this.dirty.add(token); }
    this.contamLog = []; out.push(...this.#toTeachers({ type: 'contam-log', log: this.contamLog }));
    for (const [id, s] of this.sessions) { s.game = new GameState(s.profile.game, this.random); out.push(this.stateMessage(id, now)); }
    this.feedLog = [];
    out.push({ to: '*', data: { type: 'scores', scores: this.scores } });
    for (const id of this.sessions.keys()) out.push({ to: id, data: { type: 'me', me: this.me(id) } });
    return [...out, ...this.#setPhase('lobby', now, { endsAt: null, remainMs: null, opening: null }), ...this.teacherUpdate()];
  }
  #teacherCommand(id, message, now) {
    const t = this.teachers.get(id); t.lastSeen = now;
    const error = text => [{ to: id, data: { type: 'error', message: text } }];
    const { phase } = this.lesson;
    switch (message.type) {
      case 'ping': return [{ to: id, data: { type: 'pong' } }];
      case 'event':
        if (phase !== 'playing') return error('게임이 진행 중일 때만 발동할 수 있어요.');
        if (this.lesson.event) return error('이미 오염 경보가 진행 중이에요.');
        return this.#startEvent(now);
      case 'opening':
        if (phase === 'playing' || phase === 'paused') return error('게임 중에는 오프닝을 틀 수 없어요.');
        for (const s of this.sessions.values()) s.opening = null;
        return [...this.#setPhase('opening', now, { endsAt: null, remainMs: null, opening: { done: [], at: now } }), ...this.teacherUpdate()];
      case 'start': {
        if (phase === 'playing' || phase === 'paused') return error('이미 진행 중이에요.');
        if (phase === 'opening' && !this.openingProgress().ready && !message.force) {
          const { done, total } = this.openingProgress();
          return error(`아직 오프닝 영상을 보는 학생이 있어요. (${done}/${total}명 완료)`);
        }
        const minutes = Math.round(Number(message.minutes));
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 90) return error('시간은 1~90분 사이로 정하세요.');
        const durationMs = minutes * 60000;
        return this.#setPhase('playing', now, { durationMs, endsAt: now + durationMs, remainMs: null, event: null, eventFired: false, opening: null });
      }
      case 'pause':
        if (phase !== 'playing') return error('진행 중일 때만 멈출 수 있어요.');
        return [...this.#halt(now, '선생님이 게임을 잠시 멈췄어요.'), ...this.#setPhase('paused', now, { remainMs: Math.max(0, this.lesson.endsAt - now), endsAt: null })];
      case 'resume':
        if (phase !== 'paused') return error('멈춘 상태가 아니에요.');
        return this.#setPhase('playing', now, { endsAt: now + this.lesson.remainMs, remainMs: null });
      case 'end':
        if (phase !== 'playing' && phase !== 'paused') return error('진행 중인 게임이 없어요.');
        return [...this.#halt(now, '게임이 끝났어요.'), ...this.#setPhase('ended', now, { endsAt: null, remainMs: null })];
      case 'reset': return this.#reset(now);
      case 'kick': {
        const target = [...this.sessions.values()].find(s => s.name === message.name);
        if (!target) return error('지금 접속 중인 학생이 아니에요.');
        return [{ to: target.id, data: { type: 'error', fatal: true, message: '선생님이 접속을 끊었어요.' }, close: 4004 }, ...this.#feed(`${target.name} 퇴장`, 'info', now)];
      }
      default: return [];
    }
  }
  // ---- contamination alert ------------------------------------------------------------
  #eventAutoAt() {
    const { endsAt, durationMs } = this.lesson;
    return endsAt - Math.min(RULES.eventAutoBefore, durationMs / 2);
  }
  #startEvent(now) {
    this.lesson.event = { endsAt: now + RULES.eventMs }; this.lesson.eventFired = true; this.lessonDirty = true;
    return [this.#lessonMessage(now), ...this.#feed('⚠️ 오염 경보 발동! 1분 동안 미끼·정화 점수 2배', 'lesson', now)];
  }
  #endEvent(now) {
    this.lesson.event = null; this.lessonDirty = true;
    for (const s of this.sessions.values()) s.bait = null;
    return [this.#lessonMessage(now), ...this.#feed('오염 경보 종료', 'lesson', now)];
  }
  #logContam(entry) {
    this.contamLog = [...this.contamLog, entry];
    return this.#toTeachers({ type: 'contam-log', log: this.contamLog });
  }
  #updateContam(id, status) {
    const entry = this.contamLog.find(e => e.id === id);
    if (entry) entry.status = status;
    return this.#toTeachers({ type: 'contam-log', log: this.contamLog });
  }
  // A Luddite who finishes a mission during the alert is offered one bait from that era:
  // a real record with one field (era or author) to overwrite with a wrong value.
  #offerBait(s, era) {
    const record = shuffle(wiringRecords[era], this.random)[0];
    const field = this.random() < .5 ? 'era' : 'author';
    const others = field === 'era'
      ? shuffle(ERAS.filter(e => e !== era), this.random).slice(0, 3)
      : shuffle(ERAS.filter(e => e !== era).flatMap(e => wiringRecords[e].map(r => r.author)), this.random).slice(0, 3);
    const truth = field === 'era' ? era : record.author;
    s.bait = { era, recordId: record.id, field, truth, options: shuffle([truth, ...others], this.random) };
    const card = field === 'era' ? { title: record.title, author: record.author } : { title: record.title, era };
    return [{ to: s.id, data: { type: 'bait-offer', offer: { field, card, options: s.bait.options, points: RULES.baitPoints } } }];
  }
  #plantBait(s, message, now) {
    const reply = data => [{ to: s.id, data }];
    const bait = s.bait;
    if (!bait || !this.lesson.event) return reply({ type: 'bait-result', ok: false, message: '오염 경보가 끝나 미끼를 심을 수 없어요.' });
    s.bait = null;
    const record = recordOf(bait.era, bait.recordId);
    const truth = { title: record.title, author: record.author, era: bait.era };
    if (!bait.options.includes(message.value)) return reply({ type: 'bait-result', ok: false, truth, message: '선택지에 없는 값이에요.' });
    if (message.value === bait.truth) return [...reply({ type: 'bait-result', ok: false, truth, message: '그건 진짜 정보예요! 미끼 실패 — 기회가 사라졌어요.' }), ...this.#feed(`🧪 ${s.name}의 미끼 실패 (진짜 정보를 골랐어요)`, 'red', now)];
    const canHold = token => (this.#activeFor(token, now).filter(x => x.kind === 'contam').length < RULES.maxContam);
    const guardians = [...this.profiles.entries()].filter(([t, p]) => p.team !== s.profile.team && canHold(t));
    const online = guardians.filter(([t]) => this.#liveSession(t));
    const pool = online.length ? online : guardians;
    if (!pool.length) return reply({ type: 'bait-result', ok: false, truth, message: '미끼를 심을 상대 방이 없어요.' });
    const [token, target] = pool[Math.floor(this.random() * pool.length)];
    const fake = { ...truth, [bait.field]: message.value };
    const terminalEra = bait.field === 'era' ? message.value : bait.era;
    const others = bait.field === 'era'
      ? shuffle(ERAS.filter(e => e !== bait.era && e !== message.value), this.random).slice(0, 2)
      : shuffle(ERAS.flatMap(e => wiringRecords[e].map(r => r.author)).filter(a => a !== record.author && a !== message.value), this.random).slice(0, 2);
    const id = `${now}-${s.id}`;
    const contam = { kind: 'contam', era: terminalEra, by: s.name, until: null, id, field: bait.field, card: fake, trueEra: bait.era, truth: bait.truth, options: shuffle([bait.truth, message.value, ...others], this.random) };
    const live = this.#liveSession(token);
    if (live) { live.game.prune(now); live.game.addSabotage(contam); this.#persist(live); }
    else { target.game.sabotages = [...this.#activeFor(token, now), contam]; this.dirty.add(token); }
    this.scores[bait.era][s.profile.team] += RULES.baitPoints; this.scoresDirty = true;
    const out = [
      ...reply({ type: 'bait-result', ok: true, name: target.name, truth, fake, message: `미끼 성공! ${target.name}의 방에 심었어요 (+${RULES.baitPoints})` }),
      { to: '*', data: { type: 'scores', scores: this.scores } },
      ...this.#feed(`🧪 ${s.name} → ${target.name}의 방에 미끼 (「${truth.title}」 ${bait.field === 'era' ? '시대' : '작가'} 변조)`, 'red', now),
      ...this.#logContam({ id, era: bait.era, by: s.name, target: target.name, title: truth.title, field: bait.field, fake: message.value, truth: bait.truth, status: 'planted' }),
    ];
    if (live) out.push({ to: live.id, data: { type: 'contaminated', by: s.name, era: terminalEra, state: this.state(live.id, now) } });
    return out;
  }
  #cleanse(s, message, now) {
    const error = text => [{ to: s.id, data: { type: 'error', message: text } }];
    const contam = s.game.activeSabotages(now).find(x => x.kind === 'contam' && x.id === message.id);
    if (!contam) return error('이미 정리된 기록이에요.');
    if (!isNearTerminal({ x: message.x, y: message.y }, terminalFor(contam.era))) return error('오염된 단말기 가까이에서 정화하세요.');
    s.game.removeSabotage(x => x.kind === 'contam' && x.id === contam.id); this.#persist(s);
    const correct = message.value === contam.truth;
    const record = wiringRecords[contam.trueEra].find(r => r.title === contam.card.title);
    const truth = { title: record.title, author: record.author, era: contam.trueEra };
    if (correct) { this.scores[contam.trueEra][s.profile.team] += RULES.cleansePoints; this.scoresDirty = true; }
    return [
      { to: s.id, data: { type: 'cleanse-result', correct, truth, field: contam.field, points: correct ? RULES.cleansePoints : 0, state: this.state(s.id, now) } },
      ...(correct ? [{ to: '*', data: { type: 'scores', scores: this.scores } }] : []),
      ...this.#feed(correct ? `✨ ${s.name}이(가) 「${truth.title}」 오염을 정화했어요` : `${s.name}의 정화 실패 — 「${truth.title}」 정답 공개`, s.profile.team, now),
      ...this.#updateContam(contam.id, correct ? 'fixed' : 'missed'),
    ];
  }
  restore(data, now = Date.now()) {
    if (data.teacher) { this.teachers.set(data.id, { id: data.id, lastSeen: now }); return true; }
    const profile = this.profiles.get(data.token);
    if (!profile) return false;
    this.#attach({ id: data.id, name: data.name, token: data.token, profile, game: new GameState({ ...profile.game, ...data.game }, this.random) }, now, data.player ?? null);
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
    if (this.lessonDirty) entries.lesson = this.lesson;
    this.dirty.clear(); this.scoresDirty = false; this.raidsDirty = false; this.lessonDirty = false;
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
    const { team, sabotageRights, raidRights, trap } = s.profile;
    return { team, missions, sabotageRights, raidRights, trap: trap ?? null };
  }
  // Barricades carry absolute server time; clients receive the remaining milliseconds.
  view(sabotages, now) {
    return sabotages.filter(x => !x.until || x.until > now).map(({ until, truth, trueEra, ...rest }) => ({ ...rest, left: until ? until - now : null }));
  }
  state(id, now = Date.now()) {
    const s = this.sessions.get(id); const snapshot = s.game.snapshot;
    return { ...snapshot, sabotages: this.view(snapshot.sabotages, now) };
  }
  stateMessage(id, now, extra = {}) { return { to: id, data: { type: 'state', state: this.state(id, now), me: this.me(id), ...extra } }; }
  welcome(id, now = Date.now()) {
    return { type: 'welcome', id, me: this.me(id), players: this.players(), state: this.state(id, now), scores: this.scores, lesson: this.lessonView(now), openingWatched: this.openingWatched(this.sessions.get(id)?.token) };
  }
  remove(id, now = Date.now()) {
    if (this.teachers.delete(id)) return [];
    const s = this.sessions.get(id);
    if (!s) return [];
    const out = s.raid ? this.#endRaid(s.raid, now, '상대가 접속을 끊어 공격이 끝났습니다.') : [];
    this.sessions.delete(id);
    return [...out, { to: '*', data: { type: 'left', id } }, ...this.teacherUpdate(), ...this.openingUpdate(now)];
  }
  #openingDone(s, now) {
    const opening = this.lesson.opening;
    if (this.lesson.phase !== 'opening' || !opening || opening.done.includes(s.token)) return [];
    opening.done.push(s.token); this.lessonDirty = true; s.opening = null;
    const progress = this.openingProgress();
    return [this.#lessonMessage(now), ...this.teacherUpdate(), ...(progress.ready ? this.#feed(`🎬 모든 학생이 오프닝을 봤어요 (${progress.total}명)`, 'lesson', now) : [])];
  }
  #openingReport(s, { status, pct }) {
    if (this.lesson.phase !== 'opening' || !['loading', 'click', 'playing', 'error'].includes(status)) return [];
    s.opening = status === 'loading' ? { status, pct: Math.max(0, Math.min(100, Math.round(Number(pct) || 0))) } : { status };
    return this.teacherUpdate();
  }
  // ---- clock -----------------------------------------------------------------------------
  tick(now = Date.now()) {
    const out = [];
    for (const raid of [...this.raids.values()]) if (now >= raid.endsAt) out.push(...this.#endRaid(raid.id, now));
    if (this.lesson.event && now >= this.lesson.event.endsAt) out.push(...this.#endEvent(now));
    if (this.lesson.phase === 'playing' && !this.lesson.eventFired && now >= this.#eventAutoAt() && now < this.lesson.endsAt) out.push(...this.#startEvent(now));
    if (this.lesson.phase === 'playing' && now >= this.lesson.endsAt) out.push(...this.#halt(now, '시간이 다 됐어요!'), ...this.#setPhase('ended', now, { endsAt: null, remainMs: null }));
    return out;
  }
  nextDeadline() {
    const playing = this.lesson.phase === 'playing';
    const lessonEnd = playing ? [this.lesson.endsAt, ...(this.lesson.eventFired ? [] : [this.#eventAutoAt()]), ...(this.lesson.event ? [this.lesson.event.endsAt] : [])] : [];
    return Math.min(Infinity, ...lessonEnd, ...[...this.raids.values()].map(r => r.endsAt));
  }
  // ---- commands --------------------------------------------------------------------------
  command(id, message, now = Date.now()) {
    if (this.teachers.has(id)) return message && typeof message === 'object' ? this.#teacherCommand(id, message, now) : [];
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
    if (message.type === 'opening-done') return this.#openingDone(s, now);
    if (message.type === 'opening-status') return this.#openingReport(s, message);
    if (!this.active && message.type !== 'close') return error(PHASE_BLOCKED[this.lesson.phase]);
    if (s.raid && ['open', 'repair', 'raid', 'sabotage-start', 'sabotage', 'cleanse', 'bait'].includes(message.type)) return error('공격이 끝난 뒤에 할 수 있어요.');
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
      // Mission selection is random. A client cannot change the issued round.
      case 'next': s.game.nextRound(); break;
      case 'connect': result = s.game.connect(message.author, message.work); break;
      case 'lock': s.game.tune(message.value); result = s.game.lockFrequency(); break;
      case 'recall': result = s.game.recall(message.word, now); break;
      case 'shoot': result = s.game.shoot(message.word); break;
      case 'identify': result = s.game.verifyIdentity(message.author, message.work, message.swiped); break;
      case 'classify': result = s.game.classify(message.id, message.era); break;
      case 'shelve': result = s.game.shelve(message.id); break;
      case 'extra': result = s.game.submitExtra(message.value); break;
      case 'raid': return this.#startRaid(s, now);
      case 'trap': return this.#setTrap(s, message);
      case 'bait': return this.#plantBait(s, message, now);
      case 'cleanse': return this.#cleanse(s, message, now);
      case 'sabotage-start': return this.#sabotageStart(s, now);
      case 'sabotage': return this.#sabotage(s, message, now);
      default: return [];
    }
    const out = [this.stateMessage(id, now, { result })];
    if (result === 'complete') {
      out.push(...this.#award(s, now));
      if (this.lesson.event && s.profile.team === 'red' && !s.bait) out.push(...this.#offerBait(s, s.game.snapshot.round.era));
    }
    return out;
  }
  #award(s, now) {
    const { round, missions } = s.game.snapshot;
    this.scores[round.era][s.profile.team] += MISSION_POINTS; this.scoresDirty = true;
    let right = null;
    if (missions % RULES.sabotageEvery === 0) { s.profile.sabotageRights++; right = 'sabotage'; }
    if (missions % RULES.raidEvery === 0) { s.profile.raidRights++; right = 'raid'; }
    this.#persist(s);
    const out = [{ to: '*', data: { type: 'scores', scores: this.scores } }, ...this.teacherUpdate()];
    if (right) out.push({ to: s.id, data: { type: 'right', right, me: this.me(s.id) } }, ...this.#feed(`${s.name} ${right === 'raid' ? '⚡ 공격권' : '🛠 방해 권한'} 획득`, s.profile.team, now));
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
    return this.#beginRaid(s, target, now);
  }
  #beginRaid(s, target, now, counter = false) {
    const raid = { id: `${now}-${s.id}`, attacker: s.id, defender: target.id, endsAt: now + RULES.raidMs, shocks: 0, stolen: 0, cooldownUntil: 0, stunUntil: 0, invulnUntil: 0 };
    this.raids.set(raid.id, raid); this.raidsDirty = true;
    s.raid = target.raid = raid.id;
    s.game.closeTerminal(); target.game.closeTerminal();
    s.player = { ...map.entry, direction: 'up', moving: false }; s.lastMove = now;
    target.player = null; // learned from the defender's first raid move
    const base = { type: 'raid', ms: RULES.raidMs, maxShocks: RULES.maxShocks, counter };
    return [...this.#feed(`${counter ? '🪤 반격! ' : '⚡ '}${s.name} → ${target.name}의 방 침입!`, s.profile.team, now), ...this.teacherUpdate(), ...this.#toTeachers({ type: 'watch-start', raid: this.watchView(raid.id, now) }),
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
    const watch = this.#toTeachers({ type: 'watch-move', id: raid.id, role: s.id === raid.attacker ? 'attacker' : 'defender', player: s.player });
    return [...(partner ? [{ to: partner.id, data: { type: 'peer', player: { id: s.id, ...s.player } } }] : []), ...watch];
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
    return [{ to: s.id, data }, { to: defender.id, data }, ...this.#toTeachers({ type: 'watch-shock', id: raid.id, shocks: raid.shocks, stolen, totalStolen: raid.stolen, era, stunMs: RULES.stunMs, defender: defender.player }), { to: '*', data: { type: 'scores', scores: this.scores } }, ...this.#feed(`⚡ ${s.name}이(가) ${defender.name} 감전${stolen ? ` · ${era}년대 ${stolen}점 탈취` : ''}`, att, now)];
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
    return [...out, ...this.#toTeachers({ type: 'watch-end', id: raidId, shocks: raid.shocks, stolen: raid.stolen }), ...this.teacherUpdate()];
  }
  // ---- sabotage (async) -------------------------------------------------------------------
  #sabotageStart(s, now) {
    const error = text => [{ to: s.id, data: { type: 'error', message: text } }];
    if (s.profile.sabotageRights < 1) return error('사보타주 권한이 없어요. 미션을 5개 깨면 생겨요.');
    const kind = s.profile.team === 'blue' ? 'barricade' : 'broken';
    const canTarget = token => this.#activeFor(token, now).filter(x => x.kind === kind).length < (kind === 'barricade' ? RULES.maxBarricades : RULES.maxBroken);
    const pending = s.pending && this.profiles.get(s.pending);
    let token = pending && canTarget(s.pending) ? s.pending : null;
    if (!token) {
      const pool = [...this.profiles.entries()].filter(([t, p]) => p.team !== s.profile.team && canTarget(t)).map(([t]) => t);
      if (!pool.length) return error('방해할 수 있는 상대 진영 방이 없어요. 권한은 그대로 남아 있어요.');
      token = pool[Math.floor(this.random() * pool.length)];
    }
    s.pending = token;
    const target = this.profiles.get(token);
    return [{ to: s.id, data: { type: 'sabotage-target', name: target.name, team: target.team, kind, sabotages: this.view(this.#activeFor(token, now), now), max: kind === 'barricade' ? RULES.maxBarricades : RULES.maxBroken } }];
  }
  // ---- trap (Guardians) ---------------------------------------------------------------------
  #setTrap(s, message) {
    if (s.profile.team !== 'blue') return [{ to: s.id, data: { type: 'error', message: '함정은 보존관만 설치할 수 있어요.' } }];
    const era = message.era ?? null;
    if (era !== null && !ERAS.includes(era)) return [];
    s.profile.trap = era; this.dirty.add(s.token);
    return [{ to: s.id, data: { type: 'me', me: this.me(s.id) } }];
  }
  // A Luddite broke the Guardian's decoy terminal: the breakage fails and the owner strikes back
  // with a free raid, or (owner offline/busy) the points are taken automatically.
  #springTrap(s, token, era, now) {
    const owner = this.profiles.get(token); owner.trap = null; this.dirty.add(token);
    const live = this.#liveSession(token);
    const out = [{ to: s.id, data: { type: 'sabotage-done', trapped: true, name: owner.name, kind: 'broken', era, me: this.me(s.id) } }];
    if (live) out.push({ to: live.id, data: { type: 'trap-sprung', by: s.name, era, me: this.me(live.id) } });
    if (live && !live.raid && !s.raid) return [...out, ...this.#feed(`🪤 ${s.name}이(가) ${owner.name}의 함정에 걸렸어요!`, 'blue', now), ...this.#beginRaid(live, s, now, true)];
    const def = s.profile.team, att = owner.team;
    const best = ERAS.reduce((b, e) => (this.scores[e][def] > this.scores[b][def] ? e : b), ERAS[0]);
    const stolen = Math.min(RULES.trapSteal, this.scores[best][def]);
    this.scores[best][def] -= stolen; this.scores[best][att] += stolen; this.scoresDirty = true;
    return [...out, { to: s.id, data: { type: 'trap-penalty', stolen, era: best } }, { to: '*', data: { type: 'scores', scores: this.scores } }, ...this.#feed(`🪤 ${s.name}이(가) ${owner.name}의 함정에 걸려 ${stolen}점을 빼앗겼어요`, 'blue', now)];
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
    if (kind !== (s.profile.team === 'blue' ? 'barricade' : 'broken') || !ERAS.includes(era)) return error('진영 권한에 맞지 않는 방해 공작이에요.');
    const active = this.#activeFor(s.pending, now);
    if (active.filter(x => x.kind === kind).length >= (kind === 'barricade' ? RULES.maxBarricades : RULES.maxBroken)) return error('이 방에는 더 이상 방해 공작을 걸 수 없어요.');
    if (active.some(x => x.kind === kind && x.era === era)) return error('이미 방해 공작이 걸린 곳이에요.');
    const blocked = new Set([...active.filter(x => BLOCKING.has(x.kind)), { era }].map(x => x.era));
    if (blocked.size >= ERAS.length) return error('모든 단말기를 막을 수는 없어요.');
    const sabotage = { kind, era, by: s.name, until: kind === 'barricade' ? now + RULES.barricadeMs : null };
    const token = s.pending; s.pending = null;
    s.profile.sabotageRights--; this.dirty.add(s.token);
    const target = this.profiles.get(token); const live = this.#liveSession(token);
    if (kind === 'broken' && target.trap === era) return this.#springTrap(s, token, era, now);
    const out = [{ to: s.id, data: { type: 'sabotage-done', name: target.name, kind, era, me: this.me(s.id) } }, ...this.#feed(`${kind === 'broken' ? '💥' : '🚧'} ${s.name} → ${target.name}의 ${era}년대 ${kind === 'broken' ? '단말기 고장' : '바리케이드'}`, s.profile.team, now)];
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
