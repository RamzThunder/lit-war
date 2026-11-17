import { createFrequencyRound, isTuned, frequencyRecords } from '../minigames/frequency.js';
import { ERAS, wiringRecords, shuffledIds } from '../minigames/wiring.js';
import { createRepairRound, nextRepairId } from '../minigames/repair.js';
import { createMissionRound, MISSION_POOL } from '../minigames/missionTypes.js';
import { EXTRA_TYPES, extraTarget, COOKING } from '../minigames/extraMissions.js';
export const MISSION_POINTS = 10;
const emptyProgress = () => Object.fromEntries(ERAS.map(era => [era, 0]));
// One student's room: mission rounds, personal progress and the sabotages placed in it.
// Used locally (solo practice) and by the server, which owns the multiplayer copy.
export class GameState {
  #listeners = new Set();
  #state = { terminalOpen: false, terminal: null, round: null, missions: 0, progress: emptyProgress(), sabotages: [] };
  constructor(snapshot, random = Math.random) { if (snapshot) this.#state = { ...this.#state, ...structuredClone(snapshot) }; this.random = random; }
  get snapshot() { return structuredClone(this.#state); }
  subscribe(listener) {
    this.#listeners.add(listener); listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }
  #publish(patch) {
    this.#state = { ...this.#state, ...patch };
    this.#listeners.forEach(listener => listener(this.snapshot));
  }
  activeSabotages(now = Date.now()) { return this.#state.sabotages.filter(s => !s.until || s.until > now); }
  hasSabotage(kind, era, now = Date.now()) { return this.activeSabotages(now).some(s => s.kind === kind && s.era === era); }
  prune(now = Date.now()) {
    const active = this.activeSabotages(now);
    if (active.length !== this.#state.sabotages.length) this.#publish({ sabotages: active });
  }
  addSabotage(sabotage) { this.#publish({ sabotages: [...this.#state.sabotages, sabotage] }); }
  #newRound(era, type = null, now = Date.now()) {
    if (!type) { const pool = era === COOKING.era ? MISSION_POOL : MISSION_POOL.filter(item => item !== 'cooking'); type = pool[Math.floor(this.random() * pool.length)]; }
    if (type === 'frequency') return createFrequencyRound(era, this.random);
    if (type === 'wiring') return { type: 'wiring', era, order: shuffledIds(era, this.random), matched: [], complete: false };
    return createMissionRound(era, type, this.random, now);
  }
  #complete(round) {
    const { progress, missions } = this.#state;
    this.#publish({ round, missions: missions + 1, progress: { ...progress, [round.era]: progress[round.era] + MISSION_POINTS } });
  }
  openTerminal(era, now = Date.now()) {
    if (this.#state.terminalOpen || !ERAS.includes(era) || this.hasSabotage('broken', era, now)) return false;
    this.#publish({ terminalOpen: true, terminal: era, round: this.#newRound(era, null, now) });
    return true;
  }
  openRepair(kind, era, now = Date.now(), random = Math.random) {
    if (this.#state.terminalOpen || !this.hasSabotage(kind, era, now)) return false;
    this.#publish({ terminalOpen: true, terminal: null, round: createRepairRound(kind, era, random) });
    return true;
  }
  closeTerminal() { this.#publish({ terminalOpen: false, terminal: null, round: null }); }
  nextRound() {
    const { terminalOpen, round } = this.#state;
    if (!terminalOpen || !round?.complete || round.type === 'repair') return;
    this.#publish({ round: this.#newRound(round.era) });
  }
  chooseGame(type) {
    const { terminalOpen, terminal, round } = this.#state;
    if (!['wiring', 'frequency'].includes(type) || !terminalOpen || !terminal || round?.type === type) return;
    this.#publish({ round: this.#newRound(terminal, type) });
  }
  tune(value) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || round?.type !== 'frequency' || round.complete || !Number.isFinite(value)) return;
    this.#publish({ round: { ...round, value: Math.max(0, Math.min(100, Math.round(value))) } });
  }
  lockFrequency() {
    const { round, terminalOpen } = this.#state;
    if (!terminalOpen || round?.type !== 'frequency' || round.complete) return 'ignored';
    if (!isTuned(round)) return 'incorrect';
    const stage = round.stage + 1;
    const complete = stage === frequencyRecords[round.era].length;
    const next = { ...round, stage, complete, value: complete ? round.value : 0 };
    if (complete) this.#complete(next); else this.#publish({ round: next });
    return complete ? 'complete' : 'correct';
  }
  connect(authorId, workId) {
    const { round, terminalOpen } = this.#state;
    const records = wiringRecords[round?.era] ?? [];
    if (!terminalOpen || round?.type !== 'wiring' || round.complete || !records.some(r => r.id === authorId) || round.matched.includes(authorId)) return 'ignored';
    if (authorId !== workId) return 'incorrect';
    const matched = [...round.matched, authorId];
    const complete = matched.length === records.length;
    const next = { ...round, matched, complete };
    if (complete) this.#complete(next); else this.#publish({ round: next });
    return complete ? 'complete' : 'correct';
  }
  recall(word, now = Date.now()) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || round?.type !== 'memory' || round.complete || now < round.revealUntil || !round.options.includes(word)) return 'ignored';
    if (word !== round.order[round.stage]) { this.#publish({ round: { ...round, stage: 0 } }); return 'incorrect'; }
    const stage = round.stage + 1, next = { ...round, stage, complete: stage === round.order.length };
    if (next.complete) this.#complete(next); else this.#publish({ round: next });
    return next.complete ? 'complete' : 'correct';
  }
  shoot(word) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || round?.type !== 'shooter' || round.complete || !round.targets.includes(word) || round.hit.includes(word)) return 'ignored';
    if (!round.wrong.includes(word)) return 'incorrect';
    const hit = [...round.hit, word], next = { ...round, hit, complete: hit.length === round.wrong.length };
    if (next.complete) this.#complete(next); else this.#publish({ round: next });
    return next.complete ? 'complete' : 'correct';
  }
  verifyIdentity(authorId, workId, swiped) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || round?.type !== 'identity' || round.complete || !swiped || authorId !== round.order[round.stage]) return 'ignored';
    if (authorId !== workId) return 'incorrect';
    const stage = round.stage + 1, next = { ...round, stage, complete: stage === round.order.length };
    if (next.complete) this.#complete(next); else this.#publish({ round: next });
    return next.complete ? 'complete' : 'correct';
  }
  classify(id, era) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || round?.type !== 'filter' || round.complete || id !== round.order[round.stage] || !['current', 'other'].includes(era)) return 'ignored';
    const isCurrent = wiringRecords[round.era].some(record => record.id === id);
    if (era !== (isCurrent ? 'current' : 'other')) return 'incorrect';
    const stage = round.stage + 1, next = { ...round, stage, complete: stage === round.order.length };
    if (next.complete) this.#complete(next); else this.#publish({ round: next });
    return next.complete ? 'complete' : 'correct';
  }
  shelve(id) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || round?.type !== 'chronology' || round.complete || !round.order.includes(id) || round.picked.includes(id)) return 'ignored';
    const remaining = round.order.filter(item => !round.picked.includes(item));
    const expected = [...remaining].sort((a, b) => {
      const left = wiringRecords[round.era].find(r => r.id === a);
      const right = wiringRecords[round.era].find(r => r.id === b);
      return left.year - right.year || left.title.localeCompare(right.title, 'ko');
    })[0];
    if (id !== expected) { this.#publish({ round: { ...round, picked: [] } }); return 'incorrect'; }
    const picked = [...round.picked, id], next = { ...round, picked, complete: picked.length === round.order.length };
    if (next.complete) this.#complete(next); else this.#publish({ round: next });
    return next.complete ? 'complete' : 'correct';
  }
  submitExtra(value) {
    const round = this.#state.round;
    if (!this.#state.terminalOpen || !EXTRA_TYPES.includes(round?.type) || round.complete) return 'ignored';
    const expected = extraTarget(round);
    let correct = false, next;
    if (round.type === 'fishing') {
      if (typeof value !== 'string' || !round.pond.includes(value) || round.caught.includes(value)) return 'ignored';
      correct = frequencyRecords[round.era].some(r => r.word === value);
      if (correct) next = { ...round, caught: [...round.caught, value] };
    } else if (round.type === 'cooking' || round.type === 'puzzle') {
      if (!Number.isInteger(value)) return 'ignored';
      if (round.type === 'cooking' && !round.order.includes(value)) return 'ignored';
      if (round.type === 'puzzle' && !round.pieces.some(p => p.id === value)) return 'ignored';
      correct = value === expected;
      next = { ...round, picked: correct ? [...round.picked, value] : [] };
    } else {
      if (round.type === 'engine' && (!Number.isInteger(value) || value < Number(round.era) || value > Number(round.era) + 9)) return 'ignored';
      if (round.type === 'upload' && typeof value !== 'string') return 'ignored';
      if (round.type === 'truth' && typeof value !== 'boolean') return 'ignored';
      if (round.type === 'mail' && !ERAS.includes(value)) return 'ignored';
      correct = value === expected;
      next = { ...round, stage: round.stage + (correct ? 1 : 0) };
    }
    if (!correct) { if (next && next !== round) this.#publish({ round: next }); return 'incorrect'; }
    const total = round.type === 'truth' ? round.claims.length : round.type === 'fishing' ? frequencyRecords[round.era].length : round.type === 'cooking' ? COOKING.steps.length : round.type === 'puzzle' ? round.pieces.length : round.order.length;
    const progress = round.type === 'fishing' ? next.caught.length : ['cooking', 'puzzle'].includes(round.type) ? next.picked.length : next.stage;
    next.complete = progress === total;
    if (next.complete) this.#complete(next); else this.#publish({ round: next });
    return next.complete ? 'complete' : 'correct';
  }
  pickRepair(id, now = Date.now()) {
    const { round, terminalOpen } = this.#state;
    if (!terminalOpen || round?.type !== 'repair' || round.complete || !round.order.includes(id) || round.picked.includes(id)) return 'ignored';
    if (id !== nextRepairId(round)) { this.#publish({ round: { ...round, picked: [] } }); return 'incorrect'; }
    const picked = [...round.picked, id];
    const complete = picked.length === round.order.length;
    const patch = { round: { ...round, picked, complete } };
    if (complete) patch.sabotages = this.activeSabotages(now).filter(s => !(s.kind === round.kind && s.era === round.era));
    this.#publish(patch);
    return complete ? 'repaired' : 'correct';
  }
}
