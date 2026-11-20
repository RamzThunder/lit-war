// Team opening video. When the teacher starts the opening, every student plays their own
// team's film full screen; when it ends the server is told, and the student waits until the
// teacher starts the game. The lesson timer does not run during this phase.
// The film is downloaded in the background as soon as the student is in a room, so the
// opening usually starts instantly; otherwise a progress bar shows the download.
const VIDEO = { blue: 'openings/guardian', red: 'openings/luddite' };
// H.264 MP4 plays almost everywhere; WebM (VP9) covers browsers built without it.
const probe = document.createElement('video');
const EXT = probe.canPlayType('video/mp4; codecs="avc1.640028"') || !probe.canPlayType('video/webm; codecs="vp9"') ? 'mp4' : 'webm';
const fileFor = team => new URL(`${VIDEO[team]}.${EXT}`, document.baseURI).href;

// One background download per file: { pct, url (object URL when complete), listeners }.
const downloads = new Map();
function download(file) {
  if (downloads.has(file)) return downloads.get(file);
  const job = { pct: 0, url: null, failed: false, listeners: new Set() };
  const notify = () => { for (const fn of job.listeners) fn(job); };
  downloads.set(file, job);
  (async () => {
    try {
      const response = await fetch(file);
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get('Content-Length')) || 0;
      const reader = response.body.getReader(), chunks = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); loaded += value.length;
        const pct = total ? Math.min(99, Math.floor((loaded / total) * 100)) : 0;
        if (pct !== job.pct) { job.pct = pct; notify(); }
      }
      job.url = URL.createObjectURL(new Blob(chunks, { type: EXT === 'mp4' ? 'video/mp4' : 'video/webm' }));
      job.pct = 100;
    } catch {
      // Fall back to streaming straight from the server.
      job.failed = true; job.url = file;
    }
    notify();
  })();
  return job;
}

export function bindOpening(state) {
  const $ = selector => document.querySelector(selector);
  const root = $('#opening'), video = $('#opening-video');
  const playButton = $('#opening-play'), wait = $('#opening-wait'), skip = $('#opening-skip');
  const loading = $('#opening-loading'), bar = $('#opening-bar'), pctLabel = $('#opening-pct');
  let source = '', job = null, reported = '';
  // Tell the teacher what this student is doing (loading %, waiting for a click, watching).
  const report = (status, pct) => {
    const key = `${status}:${pct ?? ''}`;
    if (key === reported || state.openingWatched) return;
    reported = key; state.send({ type: 'opening-status', status, ...(pct != null ? { pct } : {}) });
  };
  const finish = () => { video.pause(); state.finishOpening(); };
  async function play() {
    playButton.hidden = true;
    try { await video.play(); report('playing'); }
    catch (error) {
      // A file that cannot play must not block the class: offer to skip instead.
      if (video.error || error?.name === 'NotSupportedError') { skip.hidden = false; report('error'); return; }
      // Autoplay with sound needs a click on this page (e.g. after a reload): ask for one.
      playButton.hidden = false; report('click');
    }
  }
  function showProgress() {
    if (root.hidden || state.openingWatched || !job) return;
    if (job.url) {
      loading.hidden = true;
      if (source !== job.url) { source = job.url; skip.hidden = true; video.src = job.url; video.currentTime = 0; play(); }
      return;
    }
    loading.hidden = false;
    bar.style.width = `${job.pct}%`; pctLabel.textContent = `${job.pct}%`;
    report('loading', Math.floor(job.pct / 10) * 10);
  }
  function render() {
    const lesson = state.online ? state.lesson : null;
    const team = state.online && state.connected ? state.me?.team : null;
    // Start downloading as soon as the team is known, long before the teacher presses play.
    if (VIDEO[team]) {
      const next = download(fileFor(team));
      if (next !== job) { job?.listeners.delete(showProgress); job = next; job.listeners.add(showProgress); }
    }
    const active = lesson?.phase === 'opening' && Boolean(VIDEO[team]);
    root.hidden = !active;
    if (!active) { if (!video.paused) video.pause(); source = ''; reported = ''; return; }
    root.className = `opening ${team}`;
    const watching = !state.openingWatched;
    video.hidden = !watching;
    wait.hidden = watching;
    if (watching) showProgress();
    else {
      // Clearing the source lets a replay from the teacher start the film again.
      if (source) { source = ''; video.pause(); }
      reported = '';
      playButton.hidden = true; skip.hidden = true; loading.hidden = true;
      const progress = lesson.opening;
      $('#opening-progress').textContent = progress ? `${progress.done} / ${progress.total}명 시청 완료` : '';
    }
  }
  video.addEventListener('ended', finish);
  video.addEventListener('error', () => { if (!root.hidden && !state.openingWatched) { skip.hidden = false; playButton.hidden = true; report('error'); } });
  playButton.addEventListener('click', play);
  skip.addEventListener('click', finish);
  state.events.addEventListener('lesson', render);
  state.subscribeSession(render);
}
