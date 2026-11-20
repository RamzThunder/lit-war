export function bindSession(state) {
  const dialog = document.querySelector('#join-room');
  const error = document.querySelector('#join-feedback');
  document.querySelector('#open-join').addEventListener('click', () => dialog.showModal());
  document.querySelector('#cancel-join').addEventListener('click', () => dialog.close());
  document.querySelector('#leave-room').addEventListener('click', () => { state.leave(); dialog.close(); });
  document.querySelector('#join-form').addEventListener('submit', event => {
    event.preventDefault();
    const room = document.querySelector('#room-code').value.trim().toUpperCase();
    const name = document.querySelector('#nickname').value.trim();
    if (!/^[A-Z0-9]{4,12}$/.test(room)) { error.textContent = '방 코드는 영문·숫자 4~12자리로 입력하세요.'; return; }
    if (!/^[\p{L}\p{N}_ -]{1,12}$/u.test(name)) { error.textContent = '닉네임은 한글·영문·숫자 등 1~12자로 입력하세요.'; return; }
    state.join(room, name);
  });
  let wasConnected = false;
  state.subscribeSession(session => {
    document.querySelector('#connection-label').textContent = session.online ? session.status : 'LOCAL SESSION';
    document.querySelector('#connection-mode').textContent = session.online ? `${session.room} · ${session.players.size}/30명` : '싱글플레이';
    document.querySelector('#open-join').textContent = session.online ? '접속 관리' : '교실 입장';
    document.querySelector('#leave-room').hidden = !session.online;
    error.textContent = session.online ? session.status : '';
    if (session.connected && !wasConnected && dialog.open) dialog.close();
    wasConnected = session.connected;
  });
  dialog.addEventListener('close', () => document.querySelector('#game').focus({ preventScroll: true }));
  // QR / link from the classroom TV: /?room=CODE opens the dialog with the code filled in.
  const linked = new URLSearchParams(location.search).get('room')?.trim().toUpperCase();
  if (linked && /^[A-Z0-9]{4,12}$/.test(linked)) {
    document.querySelector('#room-code').value = linked;
    dialog.showModal();
    document.querySelector('#nickname').focus();
  }
}
