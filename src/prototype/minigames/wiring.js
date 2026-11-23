// Works by era come from the worksheet bank; each round draws its own set of three.
import { workBank } from './worksheet.js';
export const ERAS = Object.freeze(['1910','1920','1930','1940','1950','1960','1970','1980']);
const ERA_NAMES = Object.freeze({ 1910: '1900~1910년대', 1980: '1980년대 이후' });
export const eraLabel = era => ERA_NAMES[era] ?? `${era}년대`;
// The worksheet teaches 1960~1970년대 as one period, so either room counts as right.
const periodOf = era => (era === '1970' ? '1960' : era);
export const samePeriod = (a, b) => periodOf(a) === periodOf(b);
const freeze = list => Object.freeze(list.map(record => Object.freeze(record)));
export const wiringRecords = Object.freeze(Object.fromEntries(ERAS.map(era => [era, freeze(workBank[era].map(record => ({ ...record, era: periodOf(era) === '1960' && record.year == null ? '1960' : era })))])));
const uniqueRecords = new Map(ERAS.flatMap(era => wiringRecords[era]).map(record => [record.id, record]));
export const allRecords = Object.freeze([...uniqueRecords.values()]);
export const recordById = id => uniqueRecords.get(id);
export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i],out[j]] = [out[j],out[i]]; }
  return out;
}
// Three works with different authors and titles; `dated` also needs distinct known years.
export function drawWorks(era, random = Math.random, { dated = false, count = 3, minTitle = 0 } = {}) {
  const picked = [];
  for (const record of shuffle(wiringRecords[era], random)) {
    if (dated && record.year == null) continue;
    if ([...record.title].length < minTitle) continue;
    if (picked.some(other => other.author === record.author || other.title === record.title || (dated && other.year === record.year))) continue;
    picked.push(record);
    if (picked.length === count) break;
  }
  return picked.map(record => record.id);
}
export function createWiringRound(era, random = Math.random) {
  const works = drawWorks(era, random);
  return { type: 'wiring', era, works, order: shuffle(works, random), matched: [], complete: false };
}
export const roundRecords = round => (round?.works ?? []).map(recordById);
