// 시안용 가짜 데이터와 공용 렌더링. 실제 게임 데이터 구조(scores[era].blue/red, roster, feed)를 따른다.
const ERAS = [
  ['1910', 40, 20], ['1920', 55, 25], ['1930', 30, 60], ['1940', 35, 35],
  ['1950', 70, 20], ['1960', 10, 50], ['1970', 60, 40], ['1980', 0, 0],
];
const CONTAM = new Set(['1930']);
const owner = (b, r) => (!b && !r ? 'empty' : b > r ? 'blue' : r > b ? 'red' : 'tie');
const OWNER_LABEL = { empty: '비어 있음', blue: '보존관 점령', red: '러다이트 점령', tie: '접전 · 동점' };
const totals = () => ERAS.reduce((t, [, b, r]) => ({ blue: t.blue + b, red: t.red + r }), { blue: 0, red: 0 });
const held = team => ERAS.filter(([, b, r]) => owner(b, r) === team).length;

const FEED = [
  ['14:21:08', 'red', '⚡', '<b>민준</b>이 서연의 기록실 습격 · 감전 3회 · 15점 탈취'],
  ['14:20:52', 'alert', '🧪', '<b>1930년대</b> 기록 오염 감지'],
  ['14:20:40', 'blue', '🚧', '<b>하은</b>이 1950년대 통로 봉쇄'],
  ['14:20:11', 'blue', '✨', '<b>수아</b>가 「진달래꽃」 정화 · +20'],
  ['14:19:47', 'red', '💥', '<b>도윤</b>이 1960년대 단말기 고장'],
  ['14:19:30', 'blue', '⚡', '<b>지우</b> 실시간 공격권 획득'],
  ['14:18:58', 'red', '🛠', '<b>현우</b> 방해 공작 권한 획득'],
];
const NAMES = { blue: ['서연', '하은', '수아', '지우', '예린', '도현', '시우', '채원', '유나', '민서', '태윤', '은채', '건우', '아린'], red: ['민준', '도윤', '현우', '지호', '서준', '하준', '준서', '예준', '지안', '로하', '이안', '유찬', '시아', '다온'] };
const ROSTER = Object.entries(NAMES).flatMap(([team, names]) => names.map((name, i) => ({
  name, team, missions: [23, 18, 17, 15, 14, 12, 11, 9, 9, 8, 6, 5, 3, 0][i] - (team === 'red' && i < 13 ? 2 : 0), online: !(i === 13), raiding: name === '민준' || name === '서연',
})));

function renderEras(el, { compact = false } = {}) {
  el.innerHTML = ERAS.map(([y, b, r]) => {
    const o = owner(b, r), pct = b + r ? (b / (b + r)) * 100 : 0;
    return `<div class="era ${o}${CONTAM.has(y) ? ' contam' : ''}">
      ${CONTAM.has(y) ? '<span class="flag">오염</span>' : ''}
      <span class="sys yr">${y}</span><span class="owner">${compact ? { empty: '-', blue: '보존관', red: '러다이트', tie: '동점' }[o] : OWNER_LABEL[o]}</span>
      <span class="split"><i style="width:${pct}%"></i><u style="flex:1"></u></span>
      <span class="nums"><span class="sys c-blue">${b}</span><span class="sys c-red">${r}</span></span>
    </div>`;
  }).join('');
}
function renderFeed(el, count = FEED.length) {
  el.innerHTML = FEED.slice(0, count).map(([t, tone, , text]) => `<li class="${tone}"><time>${t}</time><span>${text}</span></li>`).join('');
}
function renderQR(el, text = 'https://lit-war-multiplayer.gugeo.workers.dev/?room=AH7FHG') {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  el.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

// 화면 HTML에서 D.renderEras(...)처럼 쓴다. QR은 qrcode-generator(UMD)를 먼저 불러온다.
window.D = { ERAS, CONTAM, owner, OWNER_LABEL, totals, held, FEED, ROSTER, renderEras, renderFeed, renderQR };
