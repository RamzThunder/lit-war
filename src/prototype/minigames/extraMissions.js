import { ERAS, allRecords, drawWorks, recordById, samePeriod, shuffle } from './wiring.js';
import { drawConcepts, frequencyRecords } from './frequency.js';
import { storyBank } from './worksheet.js';

export const EXTRA_TYPES = Object.freeze(['engine', 'upload', 'truth', 'mail', 'cooking', 'fishing', 'puzzle']);
// One four-event plot per era, taken from the worksheet summaries.
export const COOKING = storyBank;

const others = era => allRecords.filter(r => !samePeriod(r.era, era));
const keywordOf = record => record.keyword.split(' · ')[0];
const foreignWords = (era, own) => [...new Set(ERAS.filter(e => !samePeriod(e, era)).flatMap(e => frequencyRecords[e].map(r => r.word)))].filter(word => !own.includes(word));
const makePieces = title => {
  const chars = [...title];
  const count = Math.min(4, chars.length);
  return Array.from({ length: count }, (_, i) => ({ id: i, text: chars.slice(Math.floor(i * chars.length / count), Math.floor((i + 1) * chars.length / count)).join('') }));
};
// The engine dial covers the ten years of the work's own decade.
export const decadeOf = year => Math.floor(year / 10) * 10;

export function createExtraRound(era, type, random = Math.random) {
  const concepts = drawConcepts(era, random);
  const works = drawWorks(era, random, { dated: type === 'engine', minTitle: type === 'puzzle' ? 3 : 0 });
  const records = works.map(recordById);
  const base = { type, era, works, concepts };
  if (type === 'engine') return { ...base, order: shuffle(works, random), stage: 0, complete: false };
  if (type === 'upload') {
    const order = shuffle(works, random);
    const options = order.map(id => {
      const correct = keywordOf(recordById(id));
      const wrong = [...new Set(others(era).map(keywordOf))].filter(word => word !== correct);
      return shuffle([correct, ...shuffle(wrong, random).slice(0, 2)], random);
    });
    return { ...base, order, options, stage: 0, complete: false };
  }
  if (type === 'truth') {
    const claims = shuffle(records.map((r, i) => ({ id: r.id, author: (i % 2 ? records[(i + 1) % records.length] : r).author, answer: i % 2 === 0 })), random);
    return { ...base, claims, stage: 0, complete: false };
  }
  if (type === 'mail') return { ...base, order: shuffle([...works, ...shuffle(others(era), random).slice(0, 3).map(r => r.id)], random), stage: 0, complete: false };
  if (type === 'cooking') return { ...base, order: shuffle(COOKING[era].steps.map((_, i) => i), random), picked: [], complete: false };
  if (type === 'fishing') {
    const words = concepts.map(r => r.word);
    return { ...base, pond: shuffle([...words, ...shuffle(foreignWords(era, words), random).slice(0, 3)], random), caught: [], complete: false };
  }
  if (type === 'puzzle') {
    const chosen = records[Math.floor(random() * records.length)];
    return { ...base, work: chosen.id, pieces: shuffle(makePieces(chosen.title), random), picked: [], complete: false };
  }
  return null;
}

export function extraTarget(round) {
  if (round.type === 'engine') return recordById(round.order[round.stage]).year;
  if (round.type === 'upload') return keywordOf(recordById(round.order[round.stage]));
  if (round.type === 'truth') return round.claims[round.stage].answer;
  if (round.type === 'mail') return recordById(round.order[round.stage]).era;
  if (round.type === 'cooking') return round.picked.length;
  if (round.type === 'puzzle') return round.picked.length;
  return null;
}

export function uploadOptions(round) {
  return round.options[round.stage];
}
