import { RoomEngine } from '../server/RoomEngine.js';
import { GameState } from './prototype/state/GameState.js';
import { map, doorFor, validPosition } from './prototype/map.js';
import { wiringRecords } from './prototype/minigames/wiring.js';
import './tutorial-preview.css';

export function startTraining(state) {
  const params = new URLSearchParams(location.search);
  const red = params.get('team') === 'red';
  const room = new RoomEngine();
  const joinBot = () => room.join('bot', '연습 상대', 'bot');
  if (red) joinBot();
  room.join('student', '기록원', 'student');
  if (!red) joinBot();
  const student = room.sessions.get('student');
  const bot = room.sessions.get('bot');
  student.game = new GameState({ missions: 4 });
  const firstTerminal = map.terminals[4];
  // Practice scoreboard: my team leads everywhere except the exercise era, which it trails
  // by 5 points, so the real recommendation rule picks that terminal.
  const mine = student.profile.team, theirs = mine === 'blue' ? 'red' : 'blue';
  for (const era of Object.keys(room.scores)) Object.assign(room.scores[era], era === firstTerminal.era ? { [mine]: 20, [theirs]: 25 } : { [mine]: 30, [theirs]: 10 });
  Object.assign(state, { online: true, connected: true, name: student.name, room: '연습', status: '튜토리얼',
    me: room.me('student'), scores: room.scores, players: room.sessions });
  state.setRemote(room.state('student'));
  state.correction = { x: 218, y: firstTerminal.y };
  const guide = document.createElement('aside');
  guide.className = 'training-guide';
  guide.setAttribute('role','status');
  document.querySelector('#game').append(guide);
  const heading = document.createElement('strong');
  const instruction = document.createElement('span');
  guide.append(heading, instruction);
  function say(title, text = '') {
    heading.textContent = title;
    instruction.textContent = text;
    guide.getAnimations().forEach(animation => animation.cancel());
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      guide.animate([{ top: '50%', opacity: .5 }, { top: '50%', opacity: 1, offset: .75 }, { top: '24%', opacity: 1 }], { duration: 2400 });
  }
  let phase = 'move';
  const start = { ...state.correction };
  state.training = {
    goal: null,
    recommendEra: null,
    canInteract(target) {
      return target.era === firstTerminal.era && (((phase === 'terminal' || phase === 'alert-mission') && target.action === 'open') || (phase === 'cleanse' && target.action === 'cleanse') || (phase === 'repair' && target.action === 'repair'));
    },
    onPosition(player) {
      if (phase !== 'move' || Math.hypot(player.x - start.x, player.y - start.y) < 24) return;
      phase = 'terminal';
      this.goal = firstTerminal;
      this.recommendEra = firstTerminal.era;
      say('② 화살표를 따라 추천 단말기로', `화살표는 우리 진영이 밀리는 시대의 단말기를 가리켜요. ${firstTerminal.era}년대는 5점 차라 한 판이면 역전! 다가가 E를 누르세요. 터치 화면에서는 「기록 열기」예요.`);
    },
  };
  say('① 기록실을 걸어 보세요', '방향키나 WASD를 잠깐 눌러 이동하세요. 터치 화면에서는 왼쪽 조이스틱을 밀어요.');
  const miniHint = document.createElement('p');
  miniHint.className = 'training-mini-hint';
  document.querySelector('#mission-type').after(miniHint);
  const updateMiniHint = round => {
    if (phase === 'alert-mission') {
      miniHint.textContent = '⑦ 오염 경보 · 세 쌍을 연결하면 미끼를 심을 기회가 생겨요.';
      return;
    }
    if (round.complete) {
      const score = room.scores[firstTerminal.era], lead = score[mine] - score[theirs];
      const flipped = lead > 0 ? `${firstTerminal.era}년대를 ${lead}점 차로 되찾았어요! 실전에서는 화살표가 다음 추천 단말기로 옮겨 가요. ` : '';
      miniHint.textContent = `④ 다섯 번째 미션 완료! ${flipped}「기록실로 돌아가기」를 누르면 방해 공작을 사용할 수 있어요.`;
    }
    else {
      const count = round.matched.length;
      miniHint.textContent = count ? `③ ${count} / 3쌍 연결! 남은 작가와 작품도 연결하세요.` :
        '③ 배선 복원 · 왼쪽에서 작가 한 명을 누르고, 오른쪽에서 그 작가의 작품을 누르세요. 세 쌍을 연결하면 완료예요.';
    }
  };
  document.querySelector('#open-join').hidden = true;
  document.querySelector('#fullscreen').hidden = true;
  const nav = document.querySelector('.s-net');
  function button(label, fn) {
    const el = document.createElement('button');
    el.className = 's-join'; el.textContent = label; el.onclick = fn; nav.append(el);
  }
  function exit() {
    if (parent !== window) parent.postMessage('training-exit', location.origin);
    else location.assign('./');
  }
  if (!params.has('required')) button('연습 나가기', exit);

  function startContamination() {
    state.correction = { ...start };
    state.training.goal = firstTerminal;
    // Keep the classroom event open while the learner reads or retries the exercise.
    room.lesson.event = { endsAt: Infinity };
    if (red) {
      phase = 'alert-mission';
      say('⑦ 오염 경보 · 미끼 심기', '실전 경보는 1분이에요. 왼쪽 단말기에서 미션을 마치고 작가나 시대를 틀린 값으로 바꿔 보세요.');
      return;
    }
    phase = 'cleanse';
    const record = wiringRecords[firstTerminal.era][0];
    const fake = Object.values(wiringRecords).flat().find(other => other.author !== record.author);
    bot.bait = { era: firstTerminal.era, recordId: record.id, field: 'author', truth: record.author, options: [record.author, fake.author] };
    deliver(room.command('bot', { type: 'bait', value: fake.author }));
    say('⑦ 오염 경보 · 진짜 기록 되찾기', '러다이트가 경보 중 미션을 끝내고 가짜 작가를 심었어요. 왼쪽 보라색 단말기에서 E 또는 「정화」를 누르고 진짜 작가를 고르세요.');
  }

  function completeTraining() {
    phase = 'done';
    room.lesson.event = null;
    state.training.goal = null;
    say('훈련 완료!', red ? '가짜 기록을 상대 방에 심는 데 성공했어요.' : '가짜 정보를 찾아 기록을 정화했어요.');
    if (parent !== window) button('준비 완료', () => parent.postMessage('training-finished', location.origin));
    else button('다시 연습', () => location.reload());
  }

  function deliver(messages) {
    for (const {to, data} of messages) {
      if (to !== 'student' && to !== '*') continue;
      if (data.type === 'error') state.notice(data.message, 'warn');
      else state.applyGameEvent(data);
      if (data.type === 'state' && data.state.round?.type === 'wiring') updateMiniHint(data.state.round);
      if (data.type === 'state' && phase === 'mission' && !data.state.terminalOpen) {
        phase = 'terminal';
        state.training.goal = firstTerminal;
        state.training.recommendEra = firstTerminal.era;
        say('② 추천 단말기를 다시 열어 보세요', '화살표가 가리키는 단말기에서 E 또는 「기록 열기」를 누르세요.');
      }
      if (data.type === 'bait-offer' && phase === 'alert-mission') {
        // The offer opens over the completed terminal. Return to the map under it.
        deliver(room.command('student', { type: 'close' }));
        phase = 'bait';
      }
      if ((phase === 'bait' && data.type === 'bait-result') || (phase === 'cleanse' && data.type === 'cleanse-result')) {
        if (data.ok || data.correct) completeTraining();
        else {
          startContamination();
          say('⑦ 다시 도전하세요', red ? '방금 본 진짜 기록을 기억하세요. 왼쪽 단말기의 미션을 다시 마치면 새 미끼를 심을 수 있어요.' : '방금 확인한 진짜 작가를 기억하고, 보라색 단말기에서 E를 눌러 다시 정화하세요.');
        }
      }
      if (data.type === 'right' && phase === 'mission') {
        phase = 'sabotage';
        say('④ 미션 5개 · 방해 공작', '숫자 1 또는 아래 방해 버튼을 누르고, 상대 지도에서 방해할 위치를 고르세요.');
      }
      if (data.type === 'sabotage-done' && phase === 'sabotage') {
        phase = 'raid';
        student.profile.raidRights = 1;
        student.profile.sabotageRights = 1;
        student.game = new GameState({ ...student.game.snapshot, missions: 10 });
        state.me = room.me('student');
        say('⑤ 미션 10개 · 실시간 공격', '10개를 달성한 상황이에요. 「실시간 공격」을 누르거나 숫자 2를 두 번 눌러 상대 방에 들어가세요.');
      }
      if (data.type === 'state' && phase === 'repair' && data.result === 'repaired') {
        phase = 'repaired';
        state.training.goal = null;
      }
      if (data.type === 'state' && phase === 'repaired' && !data.state.terminalOpen) {
        phase = 'defend';
        bot.profile.raidRights = 1;
        queueMicrotask(() => deliver(room.command('bot', { type: 'raid' })));
      }
      if (data.type === 'raid') {
        say(data.role === 'attacker' ? '⑤ 상대에게 다가가세요' : '⑥ 상대의 실시간 침입', data.role === 'attacker' ? '가까워지면 SPACE 또는 「감전」을 누르세요.' : '이번에는 상대가 10개 보상으로 들어왔어요! 15초 동안 침입자에게서 멀리 이동하세요.');
        if (data.role === 'defender') state.correction = { x: map.entry.x, y: map.entry.y - 90 };
      }
      if (data.type === 'raid-end') {
        if (phase === 'raid') {
          phase = 'repair';
          const kind = red ? 'barricade' : 'broken';
          const door = doorFor(firstTerminal.era);
          state.training.goal = red ? { x: door.x + door.width / 2, y: door.y + door.height / 2 } : firstTerminal;
          state.correction = { ...start };
          bot.profile.sabotageRights = 1;
          room.command('bot', { type: 'sabotage-start' });
          deliver(room.command('bot', { type: 'sabotage', era: firstTerminal.era, kind }));
          // Keep the practice obstacle available even if the learner takes a break.
          if (kind === 'barricade') {
            student.game.removeSabotage(item => item.kind === kind);
            student.game.addSabotage({ kind, era: firstTerminal.era, by: bot.name, until: null });
            state.setRemote(room.state('student'));
          }
          say('⑥ 상대의 방해 공작을 수리하세요', red ? '상대가 5개 보상으로 왼쪽 통로를 막았어요. 빛나는 바리케이드 앞에서 E 또는 「수리」를 누르세요.' : '상대가 5개 보상으로 단말기를 고장 냈어요. 빛나는 단말기 앞에서 E 또는 「수리」를 누르세요.');
        } else if (phase === 'defend') {
          startContamination();
        }
      }
    }
    state.sessionChanged();
  }
  state.send = message => {
    if (message.type === 'next' || message.type === 'trap' || message.type === 'sabotage-start' && phase !== 'sabotage') return;
    if (message.type === 'open') {
      if ((phase !== 'terminal' && phase !== 'alert-mission') || message.era !== firstTerminal.era) return;
      const result = room.command('student', message);
      if (!student.game.snapshot.terminalOpen) { deliver(result); return; }
      student.game.chooseGame('wiring');
      if (phase !== 'alert-mission') phase = 'mission';
      state.training.goal = null;
      state.training.recommendEra = null;
      deliver([{ to: 'student', data: { type: 'state', state: room.state('student') } }]);
      return;
    }
    deliver(room.command('student', message));
  };
  document.body.classList.add('guided-training');
  if (parent === window && params.get('step') === 'contamination') startContamination();
  const timer = setInterval(() => {
    if (!state.raid) return;
    deliver(room.tick());
    if (!state.raid) return;
    if (phase === 'raid' && !bot.player) {
      deliver(room.command('bot', { type: 'move', x: map.entry.x, y: map.entry.y - 60, moving: false, direction: 'down' }));
    } else if (phase === 'raid' && student.player && bot.player) {
      // Short, slower strides give the student time to catch up and use SPACE.
      const dx = bot.player.x - student.player.x, dy = bot.player.y - student.player.y;
      if (Math.hypot(dx, dy) < 115) {
        const away = Math.atan2(dy, dx);
        for (const angle of [away, away + .7, away - .7, away + 1.5, away - 1.5]) {
          const vx = Math.cos(angle), vy = Math.sin(angle);
          const x = bot.player.x + vx * 6, y = bot.player.y + vy * 6;
          if (!validPosition(x, y)) continue;
          const direction = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
          deliver(room.command('bot', { type: 'move', x, y, moving: true, direction }));
          break;
        }
      }
    } else if (phase === 'defend' && student.player && bot.player) {
      const dx = student.player.x - bot.player.x, dy = student.player.y - bot.player.y;
      const dist = Math.hypot(dx,dy) || 1;
      const x = bot.player.x + dx / dist * 9, y = bot.player.y + dy / dist * 9;
      if (validPosition(x,y)) deliver(room.command('bot', { type: 'move', x, y, moving: true, direction: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') }));
      if (dist <= 40) deliver(room.command('bot', { type: 'shock' }));
    }
  }, 100);
  window.addEventListener('pagehide', () => clearInterval(timer), {once:true});
}
