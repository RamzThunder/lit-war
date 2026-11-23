// Keywords introduce a literary tendency; they are not exclusive classifications.
import { conceptBank } from './worksheet.js';
import { drawWorks, shuffle } from './wiring.js';
const freeze = list => Object.freeze(list.map(record => Object.freeze(record)));
export const frequencyRecords = Object.freeze(Object.fromEntries(Object.entries(conceptBank).map(([era, list]) => [era, freeze(list)])));
export const drawConcepts = (era, random = Math.random, count = 3) => shuffle(frequencyRecords[era], random).slice(0, count);
export const TOLERANCE = 3;
export function createFrequencyRound(era = '1930', random = Math.random) {
  return { type: 'frequency', era, works: drawWorks(era, random), concepts: drawConcepts(era, random), targets: [20 + Math.floor(random() * 16), 65 + Math.floor(random() * 16), 40 + Math.floor(random() * 16)], stage: 0, value: 0, complete: false };
}
export function isTuned(round) {
  return round?.type === 'frequency' && !round.complete && Math.abs(round.value - round.targets[round.stage]) <= TOLERANCE;
}
export function wavePath(value) {
  const cycles = 1 + value / 20;
  return Array.from({ length: 181 }, (_, i) => {
    const x = i * 2;
    const y = 60 - Math.sin(i / 180 * Math.PI * 2 * cycles) * 35;
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
