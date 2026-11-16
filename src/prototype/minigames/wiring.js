// Teaching content is independent of the renderer. Sources and keywords can be replaced.
// Ids are unique across eras: the repair minigame mixes cards from every era.
export const ERAS = Object.freeze(['1920', '1930', '1940', '1950']);
export const eraLabel = era => `${era}년대`;
const freeze = list => Object.freeze(list.map(record => Object.freeze(record)));
export const wiringRecords = Object.freeze({
  1920: freeze([
    { id: 'sowol', author: '김소월', title: '진달래꽃', year: 1922, keyword: '민요조 · 이별의 정한' },
    { id: 'hyeon', author: '현진건', title: '운수 좋은 날', year: 1924, keyword: '사실주의 · 반어' },
    { id: 'manhae', author: '한용운', title: '님의 침묵', year: 1926, keyword: '역설 · 님을 향한 기다림' },
  ]),
  1930: freeze([
    { id: 'kim', author: '김유정', title: '동백꽃', year: 1936, keyword: '농촌 · 해학', source: 'https://encykorea.aks.ac.kr/Article/E0016498' },
    { id: 'lee', author: '이효석', title: '메밀꽃 필 무렵', year: 1936, keyword: '서정적 묘사 · 장돌뱅이', source: 'https://encykorea.aks.ac.kr/Article/E0018494' },
    { id: 'yi', author: '이상', title: '날개', year: 1936, keyword: '내면 심리 · 실험', source: 'https://encykorea.aks.ac.kr/Article/E0011736' },
  ]),
  1940: freeze([
    { id: 'yun', author: '윤동주', title: '서시', year: 1941, yearNote: '창작', keyword: '성찰 · 부끄러움' },
    { id: 'yuksa', author: '이육사', title: '광야', year: 1945, keyword: '저항 · 미래를 향한 의지' },
    { id: 'chae', author: '채만식', title: '논 이야기', year: 1946, keyword: '풍자 · 광복 직후 현실' },
  ]),
  1950: freeze([
    { id: 'son', author: '손창섭', title: '비 오는 날', year: 1953, keyword: '전후 현실 · 무기력' },
    { id: 'ha', author: '하근찬', title: '수난이대', year: 1957, keyword: '부자 2대의 수난 · 극복' },
    { id: 'beom', author: '이범선', title: '오발탄', year: 1959, keyword: '전후 현실 · 방향 상실' },
  ]),
});
export const allRecords = Object.freeze(ERAS.flatMap(era => wiringRecords[era].map(record => ({ ...record, era }))));
export const recordById = id => allRecords.find(record => record.id === id);
export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function shuffledIds(era = '1930', random = Math.random) {
  return shuffle(wiringRecords[era].map(record => record.id), random);
}
