import { teamName, teamShort } from '../prototype/teams.js';
// The TV's final-result show: winner, best moment, awards, then the stats page, which stays up.
const HOLD = { winner: 4500, moment: 7500, awards: 10000 };
const DIRECTIONS = ['up', 'down', 'left', 'right'];
const LEAD_IN_MS = 1100, LEAD_OUT_MS = 1700, SLOW_RANGE_MS = 650, SLOW_SPEED = .35, LOAD_LIMIT_MS = 6000;
const FILM_TITLE = { guardian: '「참회록」', luddite: '「껍데기는 가라」', draw: '「광야」' };
const STAT_ROWS = [['missions', '복원한 미션'], ['stolen', '빼앗은 점수'], ['shocks', '감전 성공'], ['escapes', '공격 회피'], ['sabotages', '방해 공작'], ['repairs', '수리'], ['cleansed', '오염 정화'], ['baits', '미끼 심기']];
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

function winnerSlide(r) {
  const slide = el('section', `rs-slide rs-winner ${r.winner ?? 'draw'}`);
  slide.append(
    el('p', 'rs-kicker sys', 'FINAL RECORD'),
    el('h1', '', r.winner ? `${teamName(r.winner)} 승리` : '접전'),
    el('p', 'rs-score sys', `점령 ${r.teams.blue.held} : ${r.teams.red.held}`),
    el('p', 'rs-sub', FILM_TITLE[r.film] ?? ''),
  );
  return slide;
}
function momentSlide(r) {
  const slide = el('section', `rs-slide rs-moment ${r.highlight.team ?? ''}`);
  slide.append(el('p', 'rs-kicker sys', 'MOMENT OF THE MATCH'), el('h2', '', '오늘의 명장면'), el('blockquote', '', r.highlight.text));
  return slide;
}
// Plays the recorded raid through the same Phaser view the TV uses for live raids.
function replaySlide(replay) {
  const slide = el('section', 'rs-slide rs-replay');
  const head = el('header');
  const names = el('h2');
  names.append(el('span', `c-${replay.attacker.team === 'blue' ? 'blue' : 'red'}`, replay.attacker.name), el('i', '', ' → '), el('span', `c-${replay.defender.team === 'blue' ? 'blue' : 'red'}`, replay.defender.name));
  head.append(el('p', 'rs-tag sys', 'REPLAY'), el('p', 'rs-kicker sys', '오늘의 명장면'), names);
  const arena = el('div', 'rs-arena');
  const callout = el('div', 'rs-callout');
  callout.hidden = true;
  slide.append(head, arena, callout);
  let spectator = null, ticker = null, limit = null, cancelled = false;
  const slowAt = replay.shocks.at(-1)?.t ?? null;
  const shout = (text, tone) => { callout.textContent = text; callout.className = `rs-callout ${tone}`; callout.hidden = false; callout.style.animation = 'none'; void callout.offsetWidth; callout.style.animation = ''; };
  const play = done => {
    // Shocks cut off before the clip still count toward the running total.
    let stolen = replay.totalStolen - replay.shocks.reduce((sum, shock) => sum + shock.stolen, 0);
    let clock = -LEAD_IN_MS, moveAt = 0, shockAt = 0, last = performance.now();
    ticker = setInterval(() => {
      const current = performance.now(), delta = Math.min(100, current - last); last = current;
      clock += delta * (slowAt != null && Math.abs(clock - slowAt) < SLOW_RANGE_MS ? SLOW_SPEED : 1);
      while (moveAt < replay.moves.length && replay.moves[moveAt][0] <= clock) {
        const [, role, x, y, direction, moving] = replay.moves[moveAt++];
        spectator.move(role ? 'defender' : 'attacker', { x, y, direction: DIRECTIONS[direction], moving: Boolean(moving) });
      }
      while (shockAt < replay.shocks.length && replay.shocks[shockAt].t <= clock) {
        const shock = replay.shocks[shockAt++];
        spectator.shock({ stolen: shock.stolen, defender: { x: shock.x, y: shock.y, direction: 'down', moving: false } });
        stolen += shock.stolen;
        shout(`⚡ 누적 ${stolen}점 탈취!`, 'hit');
      }
      if (replay.kind === 'escape' && clock >= replay.durationMs - 900 && callout.hidden) shout('완벽 회피!', 'safe');
      if (clock >= replay.durationMs + LEAD_OUT_MS) { clearInterval(ticker); ticker = null; done(); }
    }, 33);
  };
  return {
    node: slide,
    enter(done) {
      cancelled = false; callout.hidden = true;
      limit = setTimeout(done, LOAD_LIMIT_MS);
      import('../teacher/spectator.js').then(({ createSpectator }) => {
        if (cancelled) return;
        spectator = createSpectator(arena);
        spectator.ready(() => {
          if (cancelled) return;
          clearTimeout(limit);
          spectator.show({ room: replay.room, attacker: replay.attacker, defender: replay.defender });
          play(done);
        });
      }).catch(() => { if (!cancelled) { clearTimeout(limit); done(); } });
    },
    leave() {
      cancelled = true; clearTimeout(limit); clearInterval(ticker); ticker = null;
      spectator?.destroy(); spectator = null; arena.replaceChildren();
    },
  };
}
// Missions keep no movement record, so this scene is labelled as a reenactment, not a replay.
function flipSlide(r) {
  const { flip, team } = r.highlight;
  const slide = el('section', 'rs-slide rs-replay');
  const head = el('header');
  head.append(el('p', 'rs-tag staged sys', '재현'), el('p', 'rs-kicker sys', '오늘의 명장면 · 막판 역전'), el('h2', `c-${team === 'blue' ? 'blue' : 'red'}`, `종료 ${flip.seconds}초 전, ${flip.name}`));
  const arena = el('div', 'rs-arena');
  const callout = el('div', 'rs-callout');
  callout.hidden = true;
  slide.append(head, arena, callout);
  let spectator = null, limit = null, cancelled = false;
  const shout = (text, tone) => { callout.textContent = text; callout.className = `rs-callout ${tone}`; callout.hidden = false; callout.style.animation = 'none'; void callout.offsetWidth; callout.style.animation = ''; };
  return {
    node: slide,
    enter(done) {
      cancelled = false; callout.hidden = true;
      limit = setTimeout(done, LOAD_LIMIT_MS);
      import('../teacher/spectator.js').then(({ createSpectator }) => {
        if (cancelled) return;
        spectator = createSpectator(arena);
        spectator.ready(() => {
          if (cancelled) return;
          clearTimeout(limit);
          spectator.stageFlip({ name: flip.name, team, era: flip.era }, {
            onArrive: () => shout(`${flip.era}년대 복원 중…`, 'typing'),
            onFlip: () => shout(`${flip.era}년대 탈환!`, 'hit'),
            onDone: () => { if (!cancelled) done(); },
          });
        });
      }).catch(() => { if (!cancelled) { clearTimeout(limit); done(); } });
    },
    leave() { cancelled = true; clearTimeout(limit); spectator?.destroy(); spectator = null; arena.replaceChildren(); },
  };
}
function awardsSlide(r) {
  const slide = el('section', 'rs-slide rs-awards');
  slide.append(el('p', 'rs-kicker sys', 'RECORD KEEPERS'), el('h2', '', '오늘의 기록원'));
  const grid = el('div', 'rs-badges');
  r.awards.forEach((award, index) => {
    const card = el('article', `rs-badge ${award.team}`);
    card.style.animationDelay = `${index * 450}ms`;
    card.append(el('span', 'rs-medal sys', String(index + 1).padStart(2, '0')), el('h3', '', award.title), el('b', '', award.name), el('small', '', teamShort(award.team)), el('p', '', award.desc), el('span', 'rs-value sys', `${award.value}${award.unit}`));
    grid.append(card);
  });
  slide.append(grid);
  return slide;
}
function statsSlide(r) {
  const slide = el('section', 'rs-slide rs-stats');
  const head = el('header');
  const side = key => {
    const box = el('div', `rs-total ${key}`);
    box.append(el('b', 'sys', r.teams[key].total), el('span', '', `${teamName(key)} · ${r.teams[key].held}개 시대`));
    return box;
  };
  head.append(side('blue'), el('h2', '', r.winner ? `${teamShort(r.winner)} 승리` : '접전'), side('red'));
  const compare = el('div', 'rs-compare');
  for (const [key, label] of STAT_ROWS) {
    const blue = r.teams.blue[key], red = r.teams.red[key], sum = blue + red;
    const row = el('div', 'rs-row');
    const bar = el('span', 'rs-bar'); const fill = el('i'); fill.style.width = `${sum ? (blue / sum) * 100 : 50}%`; bar.append(fill);
    row.append(el('b', 'sys c-blue', blue), el('span', 'rs-label', label), el('b', 'sys c-red', red), bar);
    compare.append(row);
  }
  const eras = el('div', 'rs-eras');
  for (const item of r.eras) {
    const tile = el('div', `rs-era ${item.owner}`);
    tile.append(el('b', 'sys', item.era), el('span', 'sys', `${item.blue} : ${item.red}`));
    eras.append(tile);
  }
  const contam = el('div', 'rs-contam');
  contam.append(el('h3', '', '오늘 심어진 가짜 기록'));
  if (!r.contam.length) contam.append(el('p', 'rs-none', '이번 판에는 가짜 기록이 없었어요.'));
  for (const item of r.contam.slice(0, 4)) {
    const line = el('p');
    line.append(el('span', '', `「${item.title}」`), el('del', '', item.fake), el('span', 'rs-arrow', '→'), el('ins', '', item.truth));
    contam.append(line);
  }
  const lower = el('div', 'rs-lower');
  const left = el('div'); left.append(eras, contam);
  lower.append(compare, left);
  slide.append(head, lower);
  return slide;
}

export function createResults(root) {
  let slides = [], index = 0, timer = null, shownAt = null;
  const dots = el('div', 'rs-dots');
  const show = next => {
    clearTimeout(timer);
    slides[index]?.leave?.();
    index = Math.min(next, slides.length - 1);
    slides.forEach(({ node }, i) => { node.hidden = i !== index; });
    [...dots.children].forEach((dot, i) => dot.classList.toggle('on', i === index));
    const slide = slides[index], at = index;
    if (slide?.enter) slide.enter(() => { if (index === at) show(at + 1); });
    else if (slide?.hold) timer = setTimeout(() => show(index + 1), slide.hold);
  };
  root.addEventListener('click', () => { if (index < slides.length - 1) show(index + 1); });
  addEventListener('keydown', event => {
    if (root.hidden) return;
    if (event.key === 'ArrowRight' || event.key === ' ') show(index + 1);
    if (event.key === 'ArrowLeft') show(Math.max(0, index - 1));
  });
  return {
    render(results, { animate = true } = {}) {
      if (!results) { clearTimeout(timer); slides[index]?.leave?.(); index = 0; shownAt = null; slides = []; root.replaceChildren(); root.hidden = true; return; }
      if (shownAt === results.at) return;
      slides[index]?.leave?.(); index = 0;
      shownAt = results.at;
      slides = [
        { node: winnerSlide(results), hold: HOLD.winner },
        ...(results.replay ? [replaySlide(results.replay)] : []),
        // A last-second comeback gets its own staged scene after any raid replay.
        ...(results.highlight?.flip ? [flipSlide(results)] : results.highlight && !results.replay ? [{ node: momentSlide(results), hold: HOLD.moment }] : []),
        ...(results.awards.length ? [{ node: awardsSlide(results), hold: HOLD.awards }] : []),
        { node: statsSlide(results), hold: null },
      ];
      dots.replaceChildren(...slides.map(() => el('i')));
      root.replaceChildren(...slides.map(s => s.node), dots);
      root.hidden = false;
      // A reconnect lands on the stats page instead of replaying the show.
      show(animate ? 0 : slides.length - 1);
    },
  };
}
