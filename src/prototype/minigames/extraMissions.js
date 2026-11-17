import { ERAS, wiringRecords, allRecords, shuffle } from './wiring.js';
import { frequencyRecords } from './frequency.js';

export const EXTRA_TYPES = Object.freeze(['engine', 'upload', 'truth', 'mail', 'cooking', 'fishing', 'puzzle']);
export const COOKING = Object.freeze({
  era: '1930', title: '동백꽃', author: '김유정',
  source: 'https://encykorea.aks.ac.kr/Article/E0016498',
  steps: [
    '점순이가 감자를 건네지만 소년이 거절한다',
    '점순네 닭이 소년의 닭을 괴롭힌다',
    '소년이 자기 닭에게 고추장을 먹인다',
    '두 사람이 동백꽃 속에 함께 파묻힌다',
  ],
});

const keywords = era => frequencyRecords[era].map(r => r.word);
const others = era => allRecords.filter(r => r.era !== era);
const keywordOf = record => record.keyword.split(' · ')[0];
const makePieces = title => {
  const chars = [...title];
  const count = Math.min(4, chars.length);
  return Array.from({ length: count }, (_, i) => ({ id: i, text: chars.slice(Math.floor(i * chars.length / count), Math.floor((i + 1) * chars.length / count)).join('') }));
};

export function createExtraRound(era, type, random = Math.random) {
  const records = wiringRecords[era];
  if (type === 'engine') return { type, era, order: shuffle(records.map(r => r.id), random), stage: 0, complete: false };
  if (type === 'upload') {
    const order = shuffle(records.map(r => r.id), random);
    const options = order.map(id => {
      const correct = keywordOf(records.find(r => r.id === id));
      const wrong = [...new Set(allRecords.map(keywordOf))].filter(word => word !== correct);
      return shuffle([correct, ...shuffle(wrong, random).slice(0, 2)], random);
    });
    return { type, era, order, options, stage: 0, complete: false };
  }
  if (type === 'truth') {
    const claims = shuffle(records.map((r, i) => ({ id: r.id, author: (i % 2 ? records[(i + 1) % records.length] : r).author, answer: i % 2 === 0 })), random);
    return { type, era, claims, stage: 0, complete: false };
  }
  if (type === 'mail') return { type, era, order: shuffle([...records.map(r => r.id), ...shuffle(others(era), random).slice(0, 3).map(r => r.id)], random), stage: 0, complete: false };
  if (type === 'cooking') return { type, era: COOKING.era, order: shuffle(COOKING.steps.map((_, i) => i), random), picked: [], complete: false };
  if (type === 'fishing') {
    const foreign = [...new Set(ERAS.filter(e => e !== era).flatMap(keywords))].filter(w => !keywords(era).includes(w));
    return { type, era, pond: shuffle([...keywords(era), ...shuffle(foreign, random).slice(0, 3)], random), caught: [], complete: false };
  }
  if (type === 'puzzle') {
    const chosen = records[Math.floor(random() * records.length)];
    return { type, era, work: chosen.id, pieces: shuffle(makePieces(chosen.title), random), picked: [], complete: false };
  }
  return null;
}

export function extraTarget(round) {
  if (round.type === 'engine') return wiringRecords[round.era].find(r => r.id === round.order[round.stage]).year;
  if (round.type === 'upload') return keywordOf(wiringRecords[round.era].find(r => r.id === round.order[round.stage]));
  if (round.type === 'truth') return round.claims[round.stage].answer;
  if (round.type === 'mail') return allRecords.find(r => r.id === round.order[round.stage]).era;
  if (round.type === 'cooking') return round.picked.length;
  if (round.type === 'puzzle') return round.picked.length;
  return null;
}

export function uploadOptions(round) {
  return round.options[round.stage];
}
