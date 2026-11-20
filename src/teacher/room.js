// Shared teacher-socket model for the teacher console and the view-only TV page.
// Owns the connection (retry + heartbeat) and the room view; pages subscribe and render.
// Live raids form a queue: the one being watched is never interrupted by a newer raid;
// when it ends its result shows for RESULT_MS, then the oldest waiting raid is watched.
export const RESULT_MS = 3000;
const store = {
  get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } },
};
export const savedLogin = () => ({ room: store.get('teacher-room') ?? '', key: store.get('teacher-key') ?? '' });

// Students away from the game tab: the server sends how long; keep a local start time.
const stampAway = roster => roster.map(p => ({ ...p, awaySince: p.away ? performance.now() - (p.awayFor ?? 0) : null }));
export const awayList = view => view.roster.filter(p => p.online && p.away).sort((a, b) => a.awaySince - b.awaySince);

export function createRoom() {
  const listeners = new Set();
  const emit = (type, detail = {}) => { for (const fn of listeners) fn(type, detail); };
  const view = { room: '', lesson: null, endsAt: null, eventEndsAt: null, scores: null, roster: [], feed: [], contam: [], raids: new Map(), watching: null, result: null };
  let socket = null, key = '', retry = 0, fatal = false, heartbeat = null, resultTimer = null;

  const send = data => { if (socket?.readyState !== WebSocket.OPEN) return false; socket.send(JSON.stringify(data)); return true; };
  function connect(room = view.room, password = key) {
    view.room = room; key = password; fatal = false;
    emit('status', { text: retry ? `재접속 중 (${retry}/5)…` : '접속 중…', ok: false });
    const url = new URL(`/api/rooms/${room}`, location.href);
    url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    url.searchParams.set('role', 'teacher'); url.searchParams.set('key', key);
    socket?.close();
    const ws = new WebSocket(url); socket = ws;
    ws.addEventListener('message', ({ data }) => { if (socket === ws) handle(JSON.parse(data)); });
    ws.addEventListener('close', () => {
      if (socket !== ws) return;
      clearInterval(heartbeat);
      if (fatal) return;
      if (retry < 5) { retry++; setTimeout(() => connect(), Math.min(1000 * 2 ** (retry - 1), 8000)); emit('status', { text: `재접속 대기 (${retry}/5)…`, ok: false }); }
      else emit('status', { text: '연결 끊김 — 새로고침하세요', ok: false });
    });
  }
  function setLesson(lesson) {
    view.lesson = lesson;
    view.endsAt = lesson.left == null ? null : performance.now() + lesson.left;
    view.eventEndsAt = lesson.event ? performance.now() + lesson.event.left : null;
  }
  // ---- raid queue --------------------------------------------------------------------
  const addRaid = raid => { if (raid) view.raids.set(raid.id, { ...raid, endsAt: performance.now() + raid.left }); };
  function watchNext() {
    view.result = null;
    const next = [...view.raids.keys()][0] ?? null;
    view.watching = next;
    emit('watch', { raid: next ? view.raids.get(next) : null });
  }
  function watch(id) {
    if (!view.raids.has(id)) return;
    clearTimeout(resultTimer); view.result = null; view.watching = id;
    emit('watch', { raid: view.raids.get(id) });
  }
  function endRaid({ id, shocks, stolen }) {
    const raid = view.raids.get(id); if (!raid) return;
    view.raids.delete(id);
    if (view.watching !== id) { emit('raids'); return; }
    view.result = { raid, shocks, stolen };
    emit('raid-result', view.result);
    clearTimeout(resultTimer); resultTimer = setTimeout(watchNext, RESULT_MS);
  }
  function handle(event) {
    switch (event.type) {
      case 'teacher-welcome':
        retry = 0; store.set('teacher-room', view.room); store.set('teacher-key', key);
        Object.assign(view, { scores: event.scores, roster: stampAway(event.roster), feed: event.feed ?? [], contam: event.contam ?? [] });
        setLesson(event.lesson);
        view.raids.clear(); view.watching = null; view.result = null;
        for (const raid of event.raids ?? []) addRaid(raid);
        clearInterval(heartbeat); heartbeat = setInterval(() => send({ type: 'ping' }), 15000);
        emit('status', { text: '연결됨', ok: true });
        emit('welcome');
        if (view.raids.size) watchNext();
        break;
      case 'lesson': setLesson(event.lesson); emit('lesson'); break;
      case 'scores': view.scores = event.scores; emit('scores'); break;
      case 'roster': view.roster = stampAway(event.roster); emit('roster'); break;
      case 'feed': view.feed = [...view.feed.slice(-29), event.item]; emit('feed', event.item); break;
      case 'contam-log': view.contam = event.log; emit('contam'); break;
      case 'watch-start':
        addRaid(event.raid);
        if (!view.watching && !view.result) watch(event.raid.id); else emit('raids');
        break;
      case 'watch-move': {
        const raid = view.raids.get(event.id); if (!raid) break;
        raid[event.role].player = event.player;
        if (view.watching === event.id) emit('watch-move', event);
        break;
      }
      case 'watch-shock': {
        const raid = view.raids.get(event.id); if (!raid) break;
        Object.assign(raid, { shocks: event.shocks, stolen: event.totalStolen });
        if (event.defender) raid.defender.player = event.defender;
        if (view.watching === event.id) emit('watch-shock', event);
        break;
      }
      case 'watch-end': endRaid(event); break;
      case 'error':
        if (event.fatal) { fatal = true; clearInterval(heartbeat); }
        emit('error', { message: event.message, fatal: Boolean(event.fatal) });
        break;
    }
  }
  return { view, send, connect, watch, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); } };
}

// ---- shared formatting -----------------------------------------------------------------
export const clock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const timeLeft = view => (view.endsAt != null ? view.endsAt - performance.now() : view.lesson?.left ?? null);
export const feedTime = at => new Date(at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export const joinUrl = room => { const url = new URL('/', location.href); url.searchParams.set('room', room); return url.href; };
