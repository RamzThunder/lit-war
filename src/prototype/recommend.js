// Recommended terminal: where one more mission helps my team the most.
// Display only, computed from the scores every student already receives (no extra messages).
import { ERAS, eraLabel } from './minigames/wiring.js';
import { CLOSE_GAP } from '../shared/eras.js';

// 1 = losing by one mission or less (one win ties or flips it), 2 = losing by more,
// 3 = tied (including 0:0), 4 = leading by one mission or less (defend it), 5 = safely ahead.
export function eraTier(score, team) {
  const other = team === 'blue' ? 'red' : 'blue';
  const diff = score[team] - score[other];
  if (diff < 0) return -diff <= CLOSE_GAP ? 1 : 2;
  if (diff === 0) return 3;
  return diff <= CLOSE_GAP ? 4 : 5;
}

// Best tier first; a random era within that tier so teammates spread out.
export function pickEra(scores, team, blocked = new Set(), random = Math.random) {
  const open = ERAS.filter(era => !blocked.has(era));
  if (!open.length) return null;
  const best = Math.min(...open.map(era => eraTier(scores[era], team)));
  const pool = open.filter(era => eraTier(scores[era], team) === best);
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}

// One line explaining why this era is recommended.
export function reasonFor(score, team) {
  const other = team === 'blue' ? 'red' : 'blue';
  const diff = score[team] - score[other];
  switch (eraTier(score, team)) {
    case 1: return `${-diff}점 차로 밀려요 · 한 판이면 ${-diff === CLOSE_GAP ? '동점' : '역전'}`;
    case 2: return `${-diff}점 차로 밀려요 · 따라잡아요`;
    case 3: return score[team] ? '동점 · 한 판이면 앞서요' : '아직 아무도 점령하지 않았어요';
    case 4: return `${diff}점 차로 앞서요 · 지켜요`;
    default: return '모든 시대에서 앞서요 · 차이를 벌려요';
  }
}

// Keeps one recommendation until it is finished or no longer worth it, so the arrow does
// not swing around every time a classmate scores.
export class Recommender {
  constructor(random = Math.random) { this.random = random; this.era = null; this.key = ''; this.missions = null; }
  blockedEras(state) {
    const blocked = new Set();
    for (const s of state.roomSabotages()) if (s.kind === 'broken' || s.kind === 'barricade') blocked.add(s.era);
    return blocked;
  }
  update(state) {
    const team = state.me?.team, scores = state.scores;
    const phase = state.lesson?.phase;
    const live = state.online && state.connected && team && scores && !state.raid && (!phase || phase === 'playing' || phase === 'free');
    if (!live) { if (!state.online) this.reset(); return null; }
    const key = `${state.room}:${state.name}`;
    if (key !== this.key) { this.reset(); this.key = key; }
    // The guided tutorial points at its own exercise terminal.
    if (state.training) {
      const era = state.training.recommendEra;
      return era ? this.view(era, scores, team) : null;
    }
    const missions = state.me.missions;
    if (this.missions != null && missions > this.missions) this.era = null; // finished one: pick again
    this.missions = missions;
    const blocked = this.blockedEras(state);
    const best = Math.min(...ERAS.filter(era => !blocked.has(era)).map(era => eraTier(scores[era], team)));
    const tier = this.era && eraTier(scores[this.era], team);
    // Keep the current one while it is reachable and still losing or tied (or nothing better exists).
    if (!this.era || blocked.has(this.era) || (tier > 3 && best < tier)) this.era = pickEra(scores, team, blocked, this.random);
    return this.era ? this.view(this.era, scores, team) : null;
  }
  view(era, scores, team) { return { era, label: eraLabel(era), tier: eraTier(scores[era], team), reason: reasonFor(scores[era], team) }; }
  reset() { this.era = null; this.missions = null; this.key = ''; }
}
