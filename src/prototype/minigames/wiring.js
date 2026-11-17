// 1910–1980s teaching records. Each entry keeps its source for editorial review.
export const ERAS = Object.freeze(['1910','1920','1930','1940','1950','1960','1970','1980']);
export const eraLabel = era => `${era}년대`;
const freeze = list => Object.freeze(list.map(record => Object.freeze(record)));
export const wiringRecords = Object.freeze({
  1910: freeze([
    { id:'gwangsu', author:'이광수', title:'무정', year:1917, keyword:'근대 장편소설 · 계몽', source:'https://encykorea.aks.ac.kr/Article/E0019237' },
    { id:'hyebak', author:'현상윤', title:'핍박', year:1917, keyword:'식민지 지식인의 내면', source:'https://encykorea.aks.ac.kr/Article/E0019725' },
    { id:'donginseul', author:'김동인', title:'약한 자의 슬픔', year:1919, keyword:'문예 동인지 「창조」', source:'https://encykorea.aks.ac.kr/Article/E0066708' },
  ]),
  1920: freeze([
    { id:'sowol', author:'김소월', title:'진달래꽃', year:1922, keyword:'민요조 · 이별의 정한' },
    { id:'hyeon', author:'현진건', title:'운수 좋은 날', year:1924, keyword:'사실주의 · 반어' },
    { id:'manhae', author:'한용운', title:'님의 침묵', year:1926, keyword:'역설 · 님을 향한 기다림' },
  ]),
  1930: freeze([
    { id:'kim', author:'김유정', title:'동백꽃', year:1936, keyword:'농촌 · 해학', source:'https://encykorea.aks.ac.kr/Article/E0016498' },
    { id:'lee', author:'이효석', title:'메밀꽃 필 무렵', year:1936, keyword:'서정적 묘사 · 장돌뱅이', source:'https://encykorea.aks.ac.kr/Article/E0018494' },
    { id:'yi', author:'이상', title:'날개', year:1936, keyword:'내면 심리 · 실험', source:'https://encykorea.aks.ac.kr/Article/E0011736' },
  ]),
  1940: freeze([
    { id:'yun', author:'윤동주', title:'서시', year:1941, yearNote:'창작', keyword:'성찰 · 부끄러움' },
    { id:'yuksa', author:'이육사', title:'광야', year:1945, keyword:'저항 · 미래를 향한 의지' },
    { id:'chae', author:'채만식', title:'논 이야기', year:1946, keyword:'풍자 · 광복 직후 현실' },
  ]),
  1950: freeze([
    { id:'son', author:'손창섭', title:'비 오는 날', year:1953, keyword:'전후 현실 · 무기력' },
    { id:'ha', author:'하근찬', title:'수난이대', year:1957, keyword:'부자 2대의 수난 · 극복' },
    { id:'beom', author:'이범선', title:'오발탄', year:1959, keyword:'전후 현실 · 방향 상실' },
  ]),
  1960: freeze([
    { id:'gwangjang', author:'최인훈', title:'광장', year:1960, keyword:'분단 · 중립국', source:'https://encykorea.aks.ac.kr/Article/E0005204' },
    { id:'capitan', author:'전광용', title:'꺼삐딴 리', year:1962, keyword:'변절 · 풍자', source:'https://encykorea.aks.ac.kr/Article/E0011236' },
    { id:'mujin', author:'김승옥', title:'무진기행', year:1964, keyword:'도시인의 내면', source:'https://encykorea.aks.ac.kr/Article/E0071832' },
  ]),
  1970: freeze([
    { id:'samppo', author:'황석영', title:'삼포 가는 길', year:1973, keyword:'산업화 · 실향', source:'https://encykorea.aks.ac.kr/Article/E0026915' },
    { id:'nanjang', author:'조세희', title:'난장이가 쏘아올린 작은 공', year:1976, keyword:'산업화 · 계층 갈등', source:'https://encykorea.aks.ac.kr/Article/E0011711' },
    { id:'otjok', author:'김지하', title:'오적', year:1970, keyword:'풍자 · 부패 비판', source:'https://encykorea.aks.ac.kr/Article/E0025781' },
  ]),
  1980: freeze([
    { id:'nodong', author:'박노해', title:'노동의 새벽', year:1984, keyword:'노동 현실 · 민중 문학', source:'https://encykorea.aks.ac.kr/Article/E0070722' },
    { id:'wonmi', author:'양귀자', title:'원미동 사람들', year:1987, keyword:'소시민 · 도시 변두리', source:'https://encykorea.aks.ac.kr/Article/E0070478' },
    { id:'hero', author:'이문열', title:'우리들의 일그러진 영웅', year:1987, keyword:'권력 · 집단', source:'https://encykorea.aks.ac.kr/Article/E0071827' },
  ]),
});
export const allRecords = Object.freeze(ERAS.flatMap(era => wiringRecords[era].map(record => ({ ...record, era }))));
export const recordById = id => allRecords.find(record => record.id === id);
export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i],out[j]] = [out[j],out[i]]; }
  return out;
}
export function shuffledIds(era='1930',random=Math.random) { return shuffle(wiringRecords[era].map(r=>r.id),random); }
