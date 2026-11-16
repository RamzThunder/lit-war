import { createFrequencyRound, isTuned, frequencyRecords } from '../minigames/frequency.js';
import { ERAS, wiringRecords, shuffledIds } from '../minigames/wiring.js';
import { createRepairRound, nextRepairId } from '../minigames/repair.js';
export const MISSION_POINTS = 10;
const emptyProgress = () => Object.fromEntries(ERAS.map(era => [era, 0]));
// One student's room: mission rounds, personal progress and the sabotages placed in it.
// Used locally (solo practice) and by the server, which owns the multiplayer copy.
export class GameState {
  #listeners = new Set();
  #state = { terminalOpen: false, terminal: null, round: null, missions: 0, progress: emptyProgress(), sabotages: [] };
  constructor(snapshot) { if (snapshot) this.#state = { ...this.#state, ...structuredClone(snapshot) }; }
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
  #newRound(era, type = 'wiring') {
    if (type === 'frequency') return createFrequencyRound(era);
    return { type: 'wiring', era, order: shuffledIds(era), matched: [], complete: false };
  }
  #complete(round) {
    const { progress, missions } = this.#state;
    this.#publish({ round, missions: missions + 1, progress: { ...progress, [round.era]: progress[round.era] + MISSION_POINTS } });
  }
  openTerminal(era, now = Date.now()) {
    if (this.#state.terminalOpen || !ERAS.includes(era) || this.hasSabotage('broken', era, now)) return false;
    this.#publish({ terminalOpen: true, terminal: era, round: this.#newRound(era) });
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
    this.#publish({ round: this.#newRound(round.era, round.type) });
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
