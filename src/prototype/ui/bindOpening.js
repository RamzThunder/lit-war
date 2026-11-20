// Team opening video. When the teacher starts the opening, every student plays their own
// team's film full screen; when it ends the server is told, and the student waits until the
// teacher starts the game. The lesson timer does not run during this phase.
const VIDEO = { blue: 'openings/guardian', red: 'openings/luddite' };
// H.264 MP4 plays almost everywhere; WebM (VP9) covers browsers built without it.
const probe = document.createElement('video');
const EXT = probe.canPlayType('video/mp4; codecs="avc1.640028"') || !probe.canPlayType('video/webm; codecs="vp9"') ? 'mp4' : 'webm';
export function bindOpening(state) {
  const $ = selector => document.querySelector(selector);
  const root = $('#opening'), video = $('#opening-video');
  const playButton = $('#opening-play'), wait = $('#opening-wait'), skip = $('#opening-skip');
  let source = '';
  const finish = () => { video.pause(); state.finishOpening(); };
  async function play() {
    playButton.hidden = true;
    try { await video.play(); }
    catch (error) {
      // A file that cannot play must not block the class: offer to skip instead.
      if (video.error || error?.name === 'NotSupportedError') { skip.hidden = false; return; }
      // Autoplay with sound needs a click on this page (e.g. after a reload): ask for one.
      playButton.hidden = false;
    }
  }
  function render() {
    const lesson = state.online ? state.lesson : null;
    const team = state.me?.team;
    const active = lesson?.phase === 'opening' && Boolean(VIDEO[team]);
    root.hidden = !active;
    if (!active) { if (!video.paused) video.pause(); source = ''; return; }
    root.className = `opening ${team}`;
    const watching = !state.openingWatched;
    video.hidden = !watching;
    wait.hidden = watching;
    if (watching) {
      const url = new URL(`${VIDEO[team]}.${EXT}`, document.baseURI).href;
      if (source !== url) { source = url; skip.hidden = true; video.src = url; video.currentTime = 0; play(); }
    } else {
      // Clearing the source lets a replay from the teacher start the film again.
      if (source) { source = ''; video.pause(); }
      playButton.hidden = true; skip.hidden = true;
      const progress = lesson.opening;
      $('#opening-progress').textContent = progress ? `${progress.done} / ${progress.total}명 시청 완료` : '';
    }
  }
  video.addEventListener('ended', finish);
  video.addEventListener('error', () => { if (!root.hidden && !state.openingWatched) { skip.hidden = false; playButton.hidden = true; } });
  playButton.addEventListener('click', play);
  skip.addEventListener('click', finish);
  state.events.addEventListener('lesson', render);
  state.subscribeSession(render);
}
