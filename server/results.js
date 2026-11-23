import { eraOwner, heldCount, teamTotal } from '../src/shared/eras.js';
// End-of-game summary: per-student counters, awards, team comparison and the best moment.
export const newStats = () => ({ points: 0, shocks: 0, stolen: 0, lost: 0, escapes: 0, sabotages: 0, repairs: 0, cleansed: 0, baits: 0, traps: 0, clutch: 0 });
export const AWARDS = Object.freeze([
  { id: 'restorer', title: '기록 복원왕', desc: '미션을 가장 많이 복원했어요', unit: '개', value: p => p.game?.missions ?? 0 },
  { id: 'hunter', title: '번개 사냥꾼', desc: '감전으로 점수를 가장 많이 빼앗았어요', unit: '점', value: p => p.stats.stolen },
  { id: 'clutch', title: '막판의 손', desc: '마지막 30초에 미션을 가장 많이 깼어요', unit: '개', value: p => p.stats.clutch },
  { id: 'cleanser', title: '오염 정화사', desc: '가짜 기록을 가장 많이 바로잡았어요', unit: '건', value: p => p.stats.cleansed },
  { id: 'baiter', title: '미끼 장인', desc: '가짜 기록을 가장 많이 심었어요', unit: '건', value: p => p.stats.baits },
  { id: 'escape', title: '철벽 회피', desc: '공격을 한 번도 안 맞고 가장 많이 버텼어요', unit: '번', value: p => p.stats.escapes },
  { id: 'trapper', title: '함정 설계자', desc: '함정으로 상대를 가장 많이 잡았어요', unit: '번', value: p => p.stats.traps },
  { id: 'saboteur', title: '그림자 공작원', desc: '방해 공작을 가장 많이 성공했어요', unit: '번', value: p => p.stats.sabotages },
  { id: 'mechanic', title: '수리 장인', desc: '고장 난 곳을 가장 많이 고쳤어요', unit: '번', value: p => p.stats.repairs },
]);
const MAX_AWARDS = 6;
const TEAM_KEYS = ['shocks', 'stolen', 'escapes', 'sabotages', 'repairs', 'cleansed', 'baits'];

export function buildResults({ scores, eras, profiles, contam, highlight, film, at }) {
  const players = [...profiles].map(([token, profile]) => ({ token, profile: { ...profile, stats: { ...newStats(), ...profile.stats } } }));
  const team = side => {
    const list = players.filter(p => p.profile.team === side);
    const sum = pick => list.reduce((total, p) => total + pick(p.profile), 0);
    return {
      total: teamTotal(scores, eras, side), held: heldCount(scores, eras, side), players: list.length,
      missions: sum(p => p.game?.missions ?? 0),
      ...Object.fromEntries(TEAM_KEYS.map(key => [key, sum(p => p.stats[key])])),
    };
  };
  const teams = { blue: team('blue'), red: team('red') };
  const winner = teams.blue.held > teams.red.held ? 'blue' : teams.red.held > teams.blue.held ? 'red' : null;
  // The true leader always wins an award. A tie goes to someone with fewer awards so far.
  const count = new Map(), awards = [], awardTokens = {};
  for (const award of AWARDS) {
    const best = Math.max(0, ...players.map(p => award.value(p.profile)));
    if (!best || awards.length >= MAX_AWARDS) continue;
    const [pick] = players.filter(p => award.value(p.profile) === best)
      .sort((a, b) => (count.get(a.token) ?? 0) - (count.get(b.token) ?? 0) || a.profile.name.localeCompare(b.profile.name, 'ko'));
    count.set(pick.token, (count.get(pick.token) ?? 0) + 1);
    awardTokens[award.id] = pick.token;
    awards.push({ id: award.id, title: award.title, desc: award.desc, unit: award.unit, value: best, name: pick.profile.name, team: pick.profile.team });
  }
  return {
    results: {
      at, film, winner, teams, awards,
      eras: eras.map(era => ({ era, ...scores[era], owner: eraOwner(scores[era]) })),
      highlight: highlight ? { text: highlight.text, team: highlight.team, kind: highlight.kind, flip: highlight.flip ?? null } : null,
      contam: contam.map(({ title, field, fake, truth, status, by, target }) => ({ title, field, fake, truth, status, by, target })),
    },
    awardTokens,
  };
}
export function personalResult(results, awardTokens, profile, token) {
  if (!results || !profile) return null;
  return {
    team: profile.team, missions: profile.game?.missions ?? 0, stats: { ...newStats(), ...profile.stats },
    awards: results.awards.filter(award => awardTokens?.[award.id] === token),
  };
}
