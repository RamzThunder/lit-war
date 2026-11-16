// Repair: press work cards from different eras in publication order (oldest first).
// One card per era keeps the order unambiguous; barricades use 3 cards, broken terminals 4.
import { ERAS, wiringRecords, recordById, shuffle } from './wiring.js';
export const REPAIR_CARDS = Object.freeze({ barricade: 3, broken: 4 });
export function createRepairRound(kind, era, random = Math.random) {
  const eras = shuffle(ERAS, random).slice(0, REPAIR_CARDS[kind]);
  const ids = eras.map(e => { const list = wiringRecords[e]; return list[Math.floor(random() * list.length)].id; });
  return { type: 'repair', kind, era, order: shuffle(ids, random), picked: [], complete: false };
}
export function repairAnswer(round) {
  return [...round.order].sort((a, b) => recordById(a).year - recordById(b).year);
}
export function nextRepairId(round) {
  return repairAnswer(round)[round.picked.length];
}
